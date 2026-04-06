require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { GoogleGenAI } = require("@google/genai");

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const API_KEY = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: API_KEY });

// ─── Dynamic Model Discovery ────────────────────────────────────────
// Fetches real, working models from the Gemini API and caches them.
let cachedModels = null;
let cacheTimestamp = 0;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

const DEFAULT_MODEL = "gemini-2.5-flash";

/**
 * Fetches all available models from the Gemini REST API,
 * filters to ones that support generateContent, and returns
 * a clean list with display names and tier info.
 */
async function fetchAvailableModels() {
  // Return cache if fresh
  if (cachedModels && (Date.now() - cacheTimestamp) < CACHE_TTL) {
    return cachedModels;
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}&pageSize=100`
    );

    if (!response.ok) {
      console.error("Failed to fetch models:", response.status);
      return getFallbackModels();
    }

    const data = await response.json();
    const allModels = data.models || [];

    // Filter: only models that support generateContent
    const generativeModels = allModels.filter(m =>
      m.supportedGenerationMethods?.includes("generateContent")
    );

    // Exclude non-chat models (TTS, image-only, robotics, music, etc.)
    const EXCLUDE_PATTERNS = [
      "tts",           // text-to-speech
      "image",         // image generation models
      "robotics",      // robotics models
      "lyria",         // music models
      "nano-banana",   // experimental
      "computer-use",  // computer use
      "deep-research", // deep research
      "customtools",   // custom tools variants
      "gemma",         // open-weight models (not Gemini API format)
    ];

    const chatModels = generativeModels.filter(m => {
      const id = m.name.replace("models/", "").toLowerCase();
      return !EXCLUDE_PATTERNS.some(pattern => id.includes(pattern));
    });

    // Build a clean, prioritized list
    const modelList = chatModels
      .map(m => {
        const id = m.name.replace("models/", "");
        return {
          id,
          name: m.displayName || id,
          description: m.description?.substring(0, 80) || "",
          tier: getTier(id),
          free: true, // if visible via API key, it's accessible
          inputTokenLimit: m.inputTokenLimit || 0,
          outputTokenLimit: m.outputTokenLimit || 0,
        };
      })
      // Sort: newest/best first
      .sort((a, b) => {
        const priority = { premium: 0, fast: 1, lite: 2 };
        const aDiff = priority[a.tier] ?? 3;
        const bDiff = priority[b.tier] ?? 3;
        if (aDiff !== bDiff) return aDiff - bDiff;
        return a.id < b.id ? 1 : -1; // higher version numbers first
      });

    cachedModels = modelList;
    cacheTimestamp = Date.now();

    console.log(`Discovered ${modelList.length} available models from API.`);
    return modelList;

  } catch (err) {
    console.error("Error fetching models:", err.message);
    return getFallbackModels();
  }
}

/** Determine tier from model ID */
function getTier(id) {
  if (id.includes("pro")) return "premium";
  if (id.includes("lite")) return "lite";
  return "fast"; // flash, etc.
}

/** Hardcoded fallback if API call fails */
function getFallbackModels() {
  return [
    { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", tier: "fast", free: true, description: "Fast & capable" },
    { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", tier: "fast", free: true, description: "Previous gen fast model" },
    { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", tier: "fast", free: true, description: "Previous gen fast model" },
    { id: "gemini-1.5-pro",   name: "Gemini 1.5 Pro",   tier: "premium", free: true, description: "1M context window" },
  ];
}

// ─── GET /models — return available models ───────────────────────────
app.get("/models", async (req, res) => {
  try {
    const models = await fetchAvailableModels();
    res.json({ models, default: DEFAULT_MODEL });
  } catch (err) {
    res.json({ models: getFallbackModels(), default: DEFAULT_MODEL });
  }
});

// ─── POST /generate — stream AI response ────────────────────────────
app.post("/generate", async (req, res) => {
  try {
    const { prompt, files, language, mode, model } = req.body;

    // Validate model against real available models
    const models = await fetchAvailableModels();
    const modelExists = models.some(m => m.id === model);
    const selectedModel = modelExists ? model : DEFAULT_MODEL;

    console.log("Received request:", {
      prompt: prompt?.substring(0, 50),
      filesCount: files?.length || 0,
      model: selectedModel,
      requested: model,
    });

    if (!prompt && (!files || files.length === 0)) {
      return res.status(400).json({ success: false, error: "Missing prompt or payload" });
    }

    const systemInstruction = `You are a world-class, highly capable AI assistant. 
You are an expert developer, but you are fully capable of discussing any topic, answering general questions, writing essays, analyzing data, predicting trends, and doing absolutely anything the user asks.

If the user asks you to GENERATE AN IMAGE, you MUST output a markdown image using this exact format:
![description](https://image.pollinations.ai/prompt/{URL_ENCODED_PROMPT}?width=1024&height=768&nologo=true)
Replace {URL_ENCODED_PROMPT} with a detailed, url-encoded description. Replace all spaces with %20. Do NOT leave raw spaces in the URL. Output the raw markdown, not inside a code block.

When you write code, always use standard markdown code blocks with the correct language identifier.
Provide clean, accurate, and highly helpful responses.`;

    const userPrompt = `${systemInstruction}\n\nLanguage: ${language}, Mode: ${mode}.\n\nUser: ${prompt || 'Analyze the attached files.'}`;

    // Build content parts
    const parts = [{ text: userPrompt }];

    if (files && files.length > 0) {
      files.forEach(f => {
        try {
          const base64Data = f.base64.split(",")[1];
          parts.push({
            inlineData: {
              mimeType: f.type,
              data: base64Data
            }
          });
        } catch (fileErr) {
          console.error("Error processing file:", f.name, fileErr.message);
        }
      });
    }

    // Set SSE headers
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    });

    console.log(`Starting stream with model: ${selectedModel}...`);

    // ─── Try selected model → fallback to default if it fails ────
    let responseStream;
    let usedModel = selectedModel;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        responseStream = await ai.models.generateContentStream({
          model: usedModel,
          contents: [{ role: "user", parts: parts }]
        });
        break; // success
      } catch (err) {
        attempts++;
        const status = err.status || err.code;

        // Model not found — switch to default
        if (status === 404) {
          console.log(`Model '${usedModel}' not found (404). Falling back to ${DEFAULT_MODEL}...`);
          res.write(`data: ${JSON.stringify({ text: `⚠️ Model \`${usedModel}\` is not available. Switching to **${DEFAULT_MODEL}**...\n\n` })}\n\n`);
          
          // Invalidate cache since this model shouldn't be there
          cachedModels = null;
          usedModel = DEFAULT_MODEL;
          continue;
        }

        // Quota / rate limit — try waiting, then fallback
        if (status === 429 || status === 403) {
          if (usedModel !== DEFAULT_MODEL) {
            console.log(`Quota exceeded for '${usedModel}'. Falling back to ${DEFAULT_MODEL}...`);
            res.write(`data: ${JSON.stringify({ text: `⚠️ Quota exceeded for \`${usedModel}\`. Switching to **${DEFAULT_MODEL}**...\n\n` })}\n\n`);
            usedModel = DEFAULT_MODEL;
            continue;
          }

          // Rate limited on default model — wait and retry
          if (attempts < maxAttempts) {
            const waitTime = attempts * 10;
            console.log(`Rate limited on ${usedModel}. Retrying in ${waitTime}s... (${attempts}/${maxAttempts})`);
            res.write(`data: ${JSON.stringify({ text: `⏳ Rate limited. Retrying in ${waitTime}s...\n\n` })}\n\n`);
            await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
            continue;
          }
        }

        throw err; // unrecoverable
      }
    }

    if (usedModel !== selectedModel) {
      console.log(`Fallback used: ${selectedModel} → ${usedModel}`);
    }
    console.log("Stream created, reading chunks...");

    for await (const chunk of responseStream) {
      try {
        let text = "";
        if (chunk.candidates && chunk.candidates[0]?.content?.parts) {
          for (const part of chunk.candidates[0].content.parts) {
            if (part.text) text += part.text;
          }
        }
        if (text) {
          res.write(`data: ${JSON.stringify({ text })}\n\n`);
        }
      } catch (chunkErr) {
        console.log("Chunk error:", chunkErr.message);
      }
    }

    console.log("Stream complete.");
    res.write(`data: [DONE]\n\n`);
    res.end();

  } catch (error) {
    console.error("AI Error:", error.message);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    } else {
      let userMsg = "Something went wrong. Please try again.";
      if (error.status === 429) userMsg = "Rate limit exceeded. Please wait a minute and try again, or switch to a different model.";
      else if (error.status === 404) userMsg = "Model not available. Please choose a different model.";
      res.write(`data: ${JSON.stringify({ error: userMsg })}\n\n`);
      res.write(`data: [DONE]\n\n`);
      res.end();
    }
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  // Pre-warm the model cache on startup
  fetchAvailableModels().then(models => {
    console.log(`Available models: ${models.map(m => m.id).join(", ")}`);
  });
});
