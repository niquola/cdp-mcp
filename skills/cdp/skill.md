# CDP - Chrome DevTools Protocol

Control headless Chrome browser via CDP commands.

## Prerequisites

1. Chrome running with: `google-chrome --headless=new --remote-debugging-port=9222 --disable-gpu about:blank`
2. CDP server running: `bun /path/to/chromoi/src/index.js`

## Commands

### Navigate to URL
```bash
curl -s localhost:2229/cdp -d '{"method":"Page.navigate","params":{"url":"URL"}}'
```

### Get page HTML (after JS loads)
```bash
curl -s localhost:2229/cdp -d '{"method":"Runtime.evaluate","params":{"expression":"document.documentElement.outerHTML"}}' | jq -r '.result.value'
```

### Get page title
```bash
curl -s localhost:2229/cdp -d '{"method":"Runtime.evaluate","params":{"expression":"document.title"}}' | jq -r '.result.value'
```

### Execute JavaScript
```bash
curl -s localhost:2229/cdp -d '{"method":"Runtime.evaluate","params":{"expression":"JS_CODE"}}'
```

### Take screenshot
```bash
curl -s localhost:2229/cdp -d '{"method":"Page.captureScreenshot","params":{"format":"png"}}' | jq -r '.data' | base64 -d > screenshot.png
```

### Click at coordinates
```bash
curl -s localhost:2229/cdp -d '{"method":"Input.dispatchMouseEvent","params":{"type":"mousePressed","x":100,"y":200,"button":"left","clickCount":1}}'
curl -s localhost:2229/cdp -d '{"method":"Input.dispatchMouseEvent","params":{"type":"mouseReleased","x":100,"y":200,"button":"left","clickCount":1}}'
```

### Type text
```bash
curl -s localhost:2229/cdp -d '{"method":"Input.insertText","params":{"text":"Hello world"}}'
```

## Workflow: Fetch page with JS

```bash
# Navigate
curl -s localhost:2229/cdp -d '{"method":"Page.navigate","params":{"url":"https://example.com"}}'

# Wait for JS
sleep 3

# Get HTML
curl -s localhost:2229/cdp -d '{"method":"Runtime.evaluate","params":{"expression":"document.documentElement.outerHTML"}}' | jq -r '.result.value'
```

## CDP Reference

Full protocol: https://chromedevtools.github.io/devtools-protocol/
