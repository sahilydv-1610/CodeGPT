require("dotenv").config();
const { GoogleGenAI } = require("@google/genai");

const API_KEY = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: API_KEY });

async function debugModels() {
  try {
    console.log("Listing all available models...");
    const response = await ai.models.list();
    console.log("Total models found:", response.models.length);
    
    if (response.models.length > 0) {
      console.log("First 3 models structure:");
      console.log(JSON.stringify(response.models.slice(0, 3), null, 2));
      
      const flash = response.models.find(m => m.name.includes("gemini-1.5-flash"));
      if (flash) {
        console.log("\nGemini 1.5 Flash details:");
        console.log(JSON.stringify(flash, null, 2));
      } else {
        console.log("\ngemini-1.5-flash not found in the list!");
      }
    }
  } catch (err) {
    console.error("Error:", err.message);
    if (err.response) {
      console.error("Response:", await err.response.json());
    }
  }
}

debugModels();
