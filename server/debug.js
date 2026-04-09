const fs = require('fs');
require('dotenv').config();

async function run() {
  const key = process.env.GEMINI_API_KEY;
  let out = "Using Key length: " + (key ? key.length : 0) + "\n";
  
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
    const r = await fetch(url);
    const data = await r.json();
    out += "Status: " + r.status + "\n";
    if(data.error) {
      out += "Error: " + data.error.message + "\n";
    } else {
      out += "Models found: " + data.models?.length + "\n";
      const names = data.models?.filter(m => m.name.includes('flash') || m.name.includes('pro'))
                                .map(m => m.name);
      out += "Flash/Pro Models: " + JSON.stringify(names) + "\n";
    }
  } catch(e) {
    out += "Fetch failed: " + e.message + "\n";
  }
  fs.writeFileSync('debug.txt', out);
}
run();
