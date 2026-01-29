#!/usr/bin/env bun

const API = process.env.CDP_API || "http://localhost:2229";
const cmd = process.argv[2];

if (!cmd) {
  console.log(`Usage: cdp '{"method":"...", "params":{...}}'

Examples:
  cdp '{"method":"Page.navigate","params":{"url":"https://example.com"}}'
  cdp '{"method":"Runtime.evaluate","params":{"expression":"document.title"}}'
`);
  process.exit(1);
}

const { method, params = {} } = JSON.parse(cmd);
const res = await fetch(`${API}/cdp`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ method, params }),
}).catch(() => null);

if (!res) { console.error("Server not running. Start: bun src/index.js"); process.exit(1); }

const data = await res.json();
if (data.error) { console.error("Error:", data.error); process.exit(1); }
console.log(JSON.stringify(data, null, 2));
