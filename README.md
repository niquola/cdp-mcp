# chro

Chrome DevTools Protocol MCP server for Claude Code. Zero dependencies.

## Structure

```
chro/
├── src/
│   └── index.js    # MCP server + REST API (:2229)
├── skills/
│   └── cdp/
│       └── skill.md
└── plugin.json
```

## Requirements

- [Bun](https://bun.sh)
- Chrome/Chromium

## Setup

### 1. Start Chrome

```bash
# macOS
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --headless=new --remote-debugging-port=9222 --disable-gpu about:blank

# Linux
google-chrome --headless=new --remote-debugging-port=9222 --disable-gpu about:blank
```

### 2. Start Server

```bash
bun src/index.js
```

### 3. Add to Claude Code

```json
{
  "mcpServers": {
    "cdp": {
      "command": "bun",
      "args": ["/path/to/chro/src/index.js"]
    }
  }
}
```

## Usage

### MCP Tool

`cdp_send` in Claude Code:
- `method` - CDP method
- `params` - CDP parameters
- `outputFile` - save result to file

### REST API

```bash
curl localhost:2229/cdp -d '{"method":"Page.navigate","params":{"url":"https://example.com"}}'
curl localhost:2229/cdp -d '{"method":"Runtime.evaluate","params":{"expression":"document.title"}}'
curl localhost:2229/health
```

## Architecture

```
Chrome:9222 ◄── WebSocket ── Server:2229 ◄─┬─ MCP (Claude Code)
                                           └─ REST (curl)
```

## CDP Reference

https://chromedevtools.github.io/devtools-protocol/
