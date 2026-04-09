const https = require("https");
require("dotenv").config();

const API_KEY = process.env.GEMINI_API_KEY;

function query(version, model) {
    return new Promise((resolve) => {
        console.log(`\nTesting ${version} with ${model}...`);
        const url = `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${API_KEY}`;
        const data = JSON.stringify({ contents: [{ parts: [{ text: "hi" }] }] });

        const req = https.request(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" }
        }, (res) => {
            let body = "";
            res.on("data", (c) => body += c);
            res.on("end", () => {
                console.log(`Status: ${res.statusCode}`);
                console.log(`Body: ${body.substring(0, 500)}`);
                resolve();
            });
        });

        req.on("error", (e) => {
            console.error(`Error: ${e.message}`);
            resolve();
        });

        req.write(data);
        req.end();
    });
}

async function run() {
    await query("v1beta", "gemini-1.5-flash");
    await query("v1", "gemini-1.5-flash");
    await query("v1beta", "gemini-pro");
    await query("v1", "gemini-pro");
}

run();
