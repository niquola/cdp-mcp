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
curl localhost:2229/cdp -d '{"method":"...", "params":{...}}'
curl localhost:2229/health
```

For complex queries use heredoc:

```bash
curl -s localhost:2229/cdp -d @- <<EOF
{
  "method": "Runtime.evaluate",
  "params": {
    "expression": "JSON.stringify([...document.querySelectorAll('a')].map(a => a.href))"
  }
}
EOF
```

## CDP Methods

### Page
```bash
# Navigate
curl localhost:2229/cdp -d '{"method":"Page.navigate","params":{"url":"https://example.com"}}'

# Reload
curl localhost:2229/cdp -d '{"method":"Page.reload"}'

# Screenshot (base64)
curl localhost:2229/cdp -d '{"method":"Page.captureScreenshot","params":{"format":"png"}}'

# PDF
curl localhost:2229/cdp -d '{"method":"Page.printToPDF"}'

# Get HTML
curl localhost:2229/cdp -d '{"method":"Runtime.evaluate","params":{"expression":"document.documentElement.outerHTML"}}'
```

### Runtime (JavaScript)
```bash
# Execute JS
curl localhost:2229/cdp -d '{"method":"Runtime.evaluate","params":{"expression":"document.title"}}'

# Query selector
curl localhost:2229/cdp -d '{"method":"Runtime.evaluate","params":{"expression":"document.querySelector(\"h1\").textContent"}}'

# Click element
curl localhost:2229/cdp -d '{"method":"Runtime.evaluate","params":{"expression":"document.querySelector(\"button\").click()"}}'
```

### Input
```bash
# Type text
curl localhost:2229/cdp -d '{"method":"Input.insertText","params":{"text":"Hello"}}'

# Press key
curl localhost:2229/cdp -d '{"method":"Input.dispatchKeyEvent","params":{"type":"keyDown","key":"Enter"}}'

# Click at x,y
curl localhost:2229/cdp -d '{"method":"Input.dispatchMouseEvent","params":{"type":"mousePressed","x":100,"y":200,"button":"left","clickCount":1}}'
curl localhost:2229/cdp -d '{"method":"Input.dispatchMouseEvent","params":{"type":"mouseReleased","x":100,"y":200,"button":"left","clickCount":1}}'
```

### Network
```bash
# Enable network tracking
curl localhost:2229/cdp -d '{"method":"Network.enable"}'

# Get cookies
curl localhost:2229/cdp -d '{"method":"Network.getCookies"}'

# Set cookie
curl localhost:2229/cdp -d '{"method":"Network.setCookie","params":{"name":"test","value":"123","domain":"example.com"}}'

# Clear cookies
curl localhost:2229/cdp -d '{"method":"Network.clearBrowserCookies"}'
```

### Emulation
```bash
# Mobile viewport
curl localhost:2229/cdp -d '{"method":"Emulation.setDeviceMetricsOverride","params":{"width":375,"height":812,"deviceScaleFactor":3,"mobile":true}}'

# Geolocation
curl localhost:2229/cdp -d '{"method":"Emulation.setGeolocationOverride","params":{"latitude":40.7128,"longitude":-74.006}}'

# Dark mode
curl localhost:2229/cdp -d '{"method":"Emulation.setEmulatedMedia","params":{"features":[{"name":"prefers-color-scheme","value":"dark"}]}}'
```

## Architecture

```
Chrome:9222 ◄── WebSocket ── Server:2229 ◄─┬─ MCP (Claude Code)
                                           └─ REST (curl)
```

## CDP Reference

https://chromedevtools.github.io/devtools-protocol/
