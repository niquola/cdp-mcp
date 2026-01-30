#!/usr/bin/env bun

const HTTP_PORT = process.env.CDP_PORT || 2229;
const BROWSER_URL = "http://127.0.0.1:9222";
const DEBUG_PORT = 9222;

let ws = null;
let msgId = 0;
const pending = new Map();
let chromeProcess = null;

function getChromePath() {
  if (process.platform === "darwin") {
    return "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  } else if (process.platform === "win32") {
    return "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  }
  return "google-chrome";
}

async function startChrome() {
  const chromePath = getChromePath();
  process.stderr.write(`Starting Chrome with debugging port ${DEBUG_PORT}...\n`);

  chromeProcess = Bun.spawn([chromePath, `--remote-debugging-port=${DEBUG_PORT}`], {
    stdout: "ignore",
    stderr: "ignore",
  });

  // Wait for Chrome to be ready
  for (let i = 0; i < 30; i++) {
    await Bun.sleep(200);
    try {
      const res = await fetch(`${BROWSER_URL}/json/version`);
      if (res.ok) {
        process.stderr.write(`Chrome started successfully\n`);
        return true;
      }
    } catch {}
  }
  throw new Error("Failed to start Chrome");
}

async function ensureBrowserRunning() {
  try {
    const res = await fetch(`${BROWSER_URL}/json/version`);
    return res.ok;
  } catch {
    return await startChrome();
  }
}

async function connectToBrowser() {
  if (ws?.readyState === WebSocket.OPEN) return ws;

  await ensureBrowserRunning();

  const targets = await fetch(`${BROWSER_URL}/json/list`).then(r => r.json());
  const page = targets.find(t => t.type === "page");
  if (!page) throw new Error("No page target found");

  return new Promise((resolve, reject) => {
    const socket = new WebSocket(page.webSocketDebuggerUrl);
    socket.onopen = () => { ws = socket; resolve(socket); };
    socket.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.id && pending.has(data.id)) {
        pending.get(data.id)(data);
        pending.delete(data.id);
      }
    };
    socket.onerror = reject;
    socket.onclose = () => { ws = null; };
  });
}

async function cdp(method, params = {}) {
  const socket = await connectToBrowser();
  const id = ++msgId;
  return new Promise(resolve => {
    pending.set(id, resolve);
    socket.send(JSON.stringify({ id, method, params }));
  });
}

// ============ REST API ============

const server = Bun.serve({
  port: HTTP_PORT,
  async fetch(req) {
    const url = new URL(req.url);

    if (req.method === "POST" && url.pathname === "/cdp") {
      try {
        const { method, params = {} } = await req.json();
        const { result, error } = await cdp(method, params);
        if (error) return Response.json({ error: error.message }, { status: 400 });
        return Response.json(result);
      } catch (e) {
        return Response.json({ error: e.message }, { status: 500 });
      }
    }

    if (url.pathname === "/health") {
      return Response.json({ ok: true, ws: ws?.readyState === WebSocket.OPEN });
    }

    return Response.json({ error: "Not found" }, { status: 404 });
  },
});

process.stderr.write(`HTTP API running on http://localhost:${HTTP_PORT}\n`);

// ============ MCP Protocol (stdio) ============

function respond(id, result) {
  process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, result }) + "\n");
}

function respondError(id, code, message) {
  process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } }) + "\n");
}

async function handle(req) {
  const { id, method, params = {} } = req;

  if (method === "initialize") {
    return respond(id, {
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: { name: "chro", version: "0.0.1" },
    });
  }

  if (method === "notifications/initialized") return;

  if (method === "tools/list") {
    return respond(id, {
      tools: [{
        name: "cdp_send",
        description: "Send CDP command to Chrome",
        inputSchema: {
          type: "object",
          properties: {
            method: { type: "string", description: "CDP method" },
            params: { type: "object", description: "CDP params", default: {} },
            outputFile: { type: "string", description: "Write result to file" },
          },
          required: ["method"],
        },
      }],
    });
  }

  if (method === "tools/call") {
    const { name, arguments: args } = params;
    if (name !== "cdp_send") return respond(id, { content: [{ type: "text", text: `Unknown tool: ${name}` }], isError: true });

    try {
      const result = await cdp(args.method, args.params || {});
      if (result.error) return respond(id, { content: [{ type: "text", text: `CDP Error: ${result.error.message}` }], isError: true });

      const text = JSON.stringify(result.result, null, 2);
      if (args.outputFile) {
        await Bun.write(args.outputFile, text);
        return respond(id, { content: [{ type: "text", text: `Written to: ${args.outputFile}` }] });
      }
      return respond(id, { content: [{ type: "text", text }] });
    } catch (e) {
      return respond(id, { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true });
    }
  }

  respondError(id, -32601, `Unknown method: ${method}`);
}

let buffer = "";
for await (const chunk of Bun.stdin.stream()) {
  buffer += new TextDecoder().decode(chunk);
  let i;
  while ((i = buffer.indexOf("\n")) !== -1) {
    const line = buffer.slice(0, i);
    buffer = buffer.slice(i + 1);
    if (line.trim()) {
      try { await handle(JSON.parse(line)); }
      catch (e) { process.stderr.write(`Parse error: ${e.message}\n`); }
    }
  }
}
