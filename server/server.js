require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const port = process.env.PORT || 5000;

// ─── CORS Configuration ──────────────────────────────────────────────
const allowedOrigins = [
  "http://localhost:5173",   // Vite dev server
  "http://localhost:5174",   // Vite alt port
  "http://localhost:3000",   // CRA / alt dev server
  "http://127.0.0.1:5173",
];

// If a FRONTEND_URL env var is set (e.g. deployed Vercel/Netlify URL), allow it too
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Postman, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // In production, still allow unknown origins for public API access
    return callback(null, true);
  },
  credentials: true,
}));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ─── Dynamic Model Discovery ────────────────────────────────────────
// Fetches real, working models from the Gemini API and caches them.
let cachedModels = null;
let cacheTimestamp = 0;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

const DEFAULT_MODEL = "gemini-2.5-flash"; // Gemini 2.5 Flash as stable baseline

/**
 * Fetches all available models from the Gemini REST API,
 * filters to ones that support generateContent, and returns
 * a clean list with display names and tier info.
 */
async function fetchAvailableModels() {
  if (cachedModels && (Date.now() - cacheTimestamp) < CACHE_TTL) {
    return cachedModels;
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    const results = await response.json();
    const allModels = results.models || [];
    
    console.log(`Raw models from SDK: ${allModels.length}`);

    const chatModels = allModels.filter(m => {
      const id = m.name.replace("models/", "").toLowerCase();
      
      // Exclude non-chat models
      const EXCLUDE_PATTERNS = ["tts", "image", "robotics", "lyria", "nano-banana", "computer-use", "deep-research", "customtools", "gemma", "embedding"];
      if (EXCLUDE_PATTERNS.some(p => id.includes(p))) return false;

      // Be very permissive: if it's a Gemini model, include it
      return id.includes("gemini");
    });

    const modelList = chatModels.map(m => {
      const id = m.name.replace("models/", "");
      return {
        id,
        name: m.displayName || id,
        description: m.description?.substring(0, 80) || "",
        tier: getTier(id),
        free: true,
      };
    }).sort((a, b) => {
        const priority = { premium: 0, fast: 1, lite: 2 };
        const aDiff = priority[a.tier] ?? 3;
        const bDiff = priority[b.tier] ?? 3;
        if (aDiff !== bDiff) return aDiff - bDiff;
        return a.id < b.id ? 1 : -1;
      });

    cachedModels = modelList;
    cacheTimestamp = Date.now();
    console.log(`Discovered ${modelList.length} filtered models.`);
    return modelList;
  } catch (err) {
    console.error("Discovery error:", err.message);
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
    { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", tier: "fast", free: true, description: "Latest fast & capable model" },
    { id: "gemini-2.5-pro",   name: "Gemini 2.5 Pro",   tier: "premium", free: true, description: "Advanced reasoning" },
    { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", tier: "fast", free: true, description: "Fast & capable" },
    { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", tier: "fast", free: true, description: "Capable legacy node" },
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
        console.log(`Starting fetch attempt ${attempts + 1} for ${usedModel} (v1beta)...`);
        
        // ─── Direct v1beta API Call ──────────
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${usedModel}:streamGenerateContent?alt=sse&key=${process.env.GEMINI_API_KEY}`;
        
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: parts }]
          })
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          const status = response.status;
          const msg = errData.error?.message || response.statusText;
          
          console.error(`API Error (${status}):`, msg);

          if (status === 404 || msg.includes("not found")) {
             if (usedModel !== "gemini-1.5-flash") {
               usedModel = "gemini-1.5-flash";
               continue;
             }
          }
          throw new Error(msg);
        }

        // The response.body is a ReadableStream in Node 22+
        responseStream = response.body; 
        break; 
      } catch (err) {
        attempts++;
        console.error(`Attempt ${attempts} failed:`, err.message);
        if (attempts >= maxAttempts) throw err;
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    if (!responseStream) throw new Error("No stream available.");

    if (usedModel !== selectedModel) {
      console.log(`Fallback used: ${selectedModel} → ${usedModel}`);
    }
    console.log("Stream created, reading chunks...");

    // Node 22 fetch body is a ReadableStream. We can iterate it.
    const decoder = new TextDecoder();
    let buffer = "";

    for await (const chunk of responseStream) {
      const chunkStr = decoder.decode(chunk, { stream: true });
      buffer += chunkStr;

      const lines = buffer.split("\n");
      buffer = lines.pop(); // keep partial line

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const dataStr = line.replace("data: ", "").trim();
          if (dataStr === "[DONE]") continue;

          try {
            const json = JSON.parse(dataStr);
            const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              res.write(`data: ${JSON.stringify({ text })}\n\n`);
            }
          } catch (e) {
            // Partial JSON or unexpected format
          }
        }
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
