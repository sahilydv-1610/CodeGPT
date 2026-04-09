const https = require("https");
require("dotenv").config();

const API_KEY = process.env.GEMINI_API_KEY;

function testKey(version) {
  console.log(`\nTesting version "${version}"...`);
  const url = `https://generativelanguage.googleapis.com/${version}/models?key=${API_KEY}`;
  
  https.get(url, (res) => {
    let data = "";
    res.on("data", (chunk) => data += chunk);
    res.on("end", () => {
      console.log(`Status: ${res.statusCode}`);
      try {
        const json = JSON.parse(data);
        if (json.models) {
          console.log(`Success! Found ${json.models.length} models.`);
          console.log(`First model: ${json.models[0].name}`);
        } else {
          console.log(`No models array found. Error: ${json.error?.message || "Unknown"}`);
        }
      } catch (err) {
        console.log(`Error parsing JSON: ${err.message}`);
        console.log(`Raw: ${data.substring(0, 100)}...`);
      }
    });
  }).on("error", (err) => {
    console.error(`Network Error: ${err.message}`);
  });
}

testKey("v1beta");
testKey("v1");
