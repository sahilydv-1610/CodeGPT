require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const KEY = process.env.GEMINI_API_KEY;

async function testEndpoints() {
  const versions = ["v1", "v1beta"];
  const models = ["gemini-1.5-flash", "gemini-pro", "gemini-1.0-pro"];

  for (const v of versions) {
    console.log(`\n--- Testing Version: ${v} ---`);
    try {
        // We have to use raw fetch or a custom transport to test versions in this SDK easily
        // since the SDK version 0.21.0 is hardcoded to v1beta for most things
        const url = `https://generativelanguage.googleapis.com/${v}/models?key=${KEY}`;
        const resp = await fetch(url);
        const data = await resp.json();
        
        if (resp.ok) {
            console.log(`Success on ${v}! First 3 models:`);
            console.log(data.models?.slice(0, 3).map(m => m.name));
        } else {
            console.log(`Failed on ${v}: Status ${resp.status}`, data.error?.message || "");
        }
    } catch (e) {
        console.error(`Error on ${v}:`, e.message);
    }
  }
}

testEndpoints();
