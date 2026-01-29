# cdp-mcp

Chrome DevTools Protocol tools for Claude Code. Zero dependencies.

## Structure

```
cdp-mcp/
├── src/
│   ├── index.js    # MCP server + REST API (:2229)
│   └── cli.js      # CLI tool
├── skills/
│   └── cdp/
│       └── skill.md
├── plugin.json
└── package.json
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

### 3. Install Plugin (Claude Code)

```bash
claude plugins add /path/to/cdp-mcp
```

Or manually add to `~/.claude.json`:

```json
{
  "mcpServers": {
    "cdp": {
      "command": "bun",
      "args": ["/path/to/cdp-mcp/src/index.js"]
    }
  }
}
```

## Usage

### CLI

```bash
bun src/cli.js '{"method":"Page.navigate","params":{"url":"https://example.com"}}'
bun src/cli.js '{"method":"Runtime.evaluate","params":{"expression":"document.title"}}'
```

### REST API

```bash
curl localhost:2229/cdp -d '{"method":"Page.navigate","params":{"url":"https://example.com"}}'
curl localhost:2229/health
```

### Skill

```
/cdp navigate to https://example.com and get the page title
```

### MCP Tool

`cdp_send` tool available in Claude Code with params:
- `method` - CDP method
- `params` - CDP parameters
- `outputFile` - save result to file

## Architecture

```
Chrome:9222 ◄── WebSocket ── Server:2229 ◄─┬─ MCP (Claude Code)
                                           ├─ REST (CLI/curl)
                                           └─ Skill (/cdp)
```

## CDP Reference

https://chromedevtools.github.io/devtools-protocol/
