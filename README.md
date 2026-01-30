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

## Testing

Verify the server is running:

```bash
# Check health endpoint
curl localhost:2229/health
# {"ok":true,"ws":false}

# Test CDP connection
curl localhost:2229/cdp -d '{"method":"Browser.getVersion"}'
# Returns Chrome version info
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
# Find all links on the page
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
# Open a URL
curl localhost:2229/cdp -d '{"method":"Page.navigate","params":{"url":"https://example.com"}}'

# Reload current page
curl localhost:2229/cdp -d '{"method":"Page.reload"}'

# Take screenshot (returns base64)
curl localhost:2229/cdp -d '{"method":"Page.captureScreenshot","params":{"format":"png"}}'

# Generate PDF of the page
curl localhost:2229/cdp -d '{"method":"Page.printToPDF"}'

# Get full page HTML
curl localhost:2229/cdp -d '{"method":"Runtime.evaluate","params":{"expression":"document.documentElement.outerHTML"}}'
```

### Runtime (JavaScript)
```bash
# Get page title
curl localhost:2229/cdp -d '{"method":"Runtime.evaluate","params":{"expression":"document.title"}}'

# Get text content of first h1
curl localhost:2229/cdp -d '{"method":"Runtime.evaluate","params":{"expression":"document.querySelector(\"h1\").textContent"}}'

# Click the first button on page
curl localhost:2229/cdp -d '{"method":"Runtime.evaluate","params":{"expression":"document.querySelector(\"button\").click()"}}'

# Get all image URLs
curl localhost:2229/cdp -d '{"method":"Runtime.evaluate","params":{"expression":"JSON.stringify([...document.images].map(i => i.src))"}}'

# Get all headings (h1-h3)
curl localhost:2229/cdp -d '{"method":"Runtime.evaluate","params":{"expression":"JSON.stringify([...document.querySelectorAll(\"h1,h2,h3\")].map(h => h.textContent))"}}'

# Scroll to bottom of page
curl localhost:2229/cdp -d '{"method":"Runtime.evaluate","params":{"expression":"window.scrollTo(0, document.body.scrollHeight)"}}'

# Get localStorage contents
curl localhost:2229/cdp -d '{"method":"Runtime.evaluate","params":{"expression":"JSON.stringify(localStorage)"}}'

# Fill input by id
curl localhost:2229/cdp -d '{"method":"Runtime.evaluate","params":{"expression":"document.getElementById(\"email\").value = \"user@example.com\""}}'
```

### Input
```bash
# Type text into focused element
curl localhost:2229/cdp -d '{"method":"Input.insertText","params":{"text":"Hello"}}'

# Press Enter key
curl localhost:2229/cdp -d '{"method":"Input.dispatchKeyEvent","params":{"type":"keyDown","key":"Enter"}}'

# Mouse click at coordinates (x=100, y=200)
curl localhost:2229/cdp -d '{"method":"Input.dispatchMouseEvent","params":{"type":"mousePressed","x":100,"y":200,"button":"left","clickCount":1}}'
curl localhost:2229/cdp -d '{"method":"Input.dispatchMouseEvent","params":{"type":"mouseReleased","x":100,"y":200,"button":"left","clickCount":1}}'
```

### Network
```bash
# Enable network event tracking (required for intercepting requests)
curl localhost:2229/cdp -d '{"method":"Network.enable"}'

# Get all cookies for current page
curl localhost:2229/cdp -d '{"method":"Network.getCookies"}'

# Set a new cookie
curl localhost:2229/cdp -d '{"method":"Network.setCookie","params":{"name":"test","value":"123","domain":"example.com"}}'

# Clear all browser cookies
curl localhost:2229/cdp -d '{"method":"Network.clearBrowserCookies"}'
```

### Emulation
```bash
# Set desktop viewport (1920x1080)
curl -s localhost:2229/cdp -d @- <<EOF
{
  "method": "Emulation.setDeviceMetricsOverride",
  "params": {
    "width": 1920,
    "height": 1080,
    "deviceScaleFactor": 1,
    "mobile": false
  }
}
EOF

# Common viewport sizes:
# Desktop: 1920x1080, scale 1, mobile false
# Laptop:  1366x768,  scale 1, mobile false
# iPad:    768x1024,  scale 2, mobile true
# iPhone:  375x812,   scale 3, mobile true

# Reset viewport to default
curl localhost:2229/cdp -d '{"method":"Emulation.clearDeviceMetricsOverride"}'

# Set geolocation to New York
curl localhost:2229/cdp -d '{"method":"Emulation.setGeolocationOverride","params":{"latitude":40.7128,"longitude":-74.006}}'

# Enable dark mode
curl localhost:2229/cdp -d '{"method":"Emulation.setEmulatedMedia","params":{"features":[{"name":"prefers-color-scheme","value":"dark"}]}}'

# Enable light mode
curl localhost:2229/cdp -d '{"method":"Emulation.setEmulatedMedia","params":{"features":[{"name":"prefers-color-scheme","value":"light"}]}}'
```

### Screenshot
```bash
# Capture visible viewport and save as PNG
curl -s localhost:2229/cdp -d @- <<EOF | jq -r '.data' | base64 -d > screenshot.png
{
  "method": "Page.captureScreenshot",
  "params": {"format": "png"}
}
EOF

# Capture full scrollable page (not just viewport)
curl -s localhost:2229/cdp -d @- <<EOF | jq -r '.data' | base64 -d > full.png
{
  "method": "Page.captureScreenshot",
  "params": {"format": "png", "captureBeyondViewport": true}
}
EOF

# Capture as JPEG with 80% quality (smaller file size)
curl -s localhost:2229/cdp -d @- <<EOF | jq -r '.data' | base64 -d > screenshot.jpg
{
  "method": "Page.captureScreenshot",
  "params": {"format": "jpeg", "quality": 80}
}
EOF
```

## Architecture

```
Chrome:9222 ◄── WebSocket ── Server:2229 ◄─┬─ MCP (Claude Code)
                                           └─ REST (curl)
```

## CDP Reference

https://chromedevtools.github.io/devtools-protocol/
