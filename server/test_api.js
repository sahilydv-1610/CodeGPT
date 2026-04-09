require("dotenv").config();
const { GoogleGenAI } = require("@google/genai");

const API_KEY = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: API_KEY });

async function test() {
  try {
    console.log("Testing API key with gemini-1.5-flash...");
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: 'Say "Working"',
    });
    console.log("Response:", response.text);
    
    console.log("\nTesting model listing...");
    const models = await ai.models.list();
    console.log("Discovered models count:", models.models.length);
  } catch (err) {
    console.error("Error Status:", err.status);
    console.error("Error Message:", err.message);
    if (err.response) {
      console.error("Response data:", await err.response.json());
    }
  }
}

test();
