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

### Example Prompts

Common tasks you can ask Claude Code:

**Navigation**
- "Open https://example.com in Chrome"
- "Go to google.com and search for 'bun runtime'"
- "Reload the page"
- "Go back to the previous page"

**Screenshots**
- "Take a screenshot of the current page"
- "Capture a full-page screenshot and save as fullpage.png"
- "Take a mobile screenshot (375x812)"
- "Screenshot the page in dark mode"

**Page Content**
- "Get the page title"
- "Find all links on the page"
- "Extract all image URLs"
- "Get the HTML of the page"
- "Find all headings (h1, h2, h3)"
- "List all form inputs on the page"

**Interaction**
- "Click the 'Submit' button"
- "Type 'hello world' in the search input"
- "Fill the login form with user@example.com and password123"
- "Scroll to the bottom of the page"
- "Click the element at coordinates 100, 200"

**Extraction**
- "Get all product prices from the page"
- "Extract the main article text"
- "Find all email addresses on the page"
- "Get the value of all meta tags"
- "List all external links"

**Emulation**
- "Set viewport to iPhone size"
- "Enable dark mode"
- "Set geolocation to New York"
- "Emulate slow 3G network"

**Cookies & Storage**
- "Get all cookies"
- "Set a cookie named 'session' with value 'abc123'"
- "Clear all cookies"
- "Get localStorage contents"

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
# Set viewport size
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

# Common sizes:
# Desktop: 1920x1080, scale 1, mobile false
# Laptop:  1366x768,  scale 1, mobile false
# iPad:    768x1024,  scale 2, mobile true
# iPhone:  375x812,   scale 3, mobile true

# Reset viewport
curl localhost:2229/cdp -d '{"method":"Emulation.clearDeviceMetricsOverride"}'

# Geolocation
curl localhost:2229/cdp -d '{"method":"Emulation.setGeolocationOverride","params":{"latitude":40.7128,"longitude":-74.006}}'

# Dark mode
curl localhost:2229/cdp -d '{"method":"Emulation.setEmulatedMedia","params":{"features":[{"name":"prefers-color-scheme","value":"dark"}]}}'
```

### Screenshot
```bash
# Take screenshot and save to file
curl -s localhost:2229/cdp -d @- <<EOF | jq -r '.data' | base64 -d > screenshot.png
{
  "method": "Page.captureScreenshot",
  "params": {"format": "png"}
}
EOF

# Full page screenshot
curl -s localhost:2229/cdp -d @- <<EOF | jq -r '.data' | base64 -d > full.png
{
  "method": "Page.captureScreenshot",
  "params": {"format": "png", "captureBeyondViewport": true}
}
EOF

# JPEG with quality
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
