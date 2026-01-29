# LinkedIn - Feed & Data Extraction

Access LinkedIn feed and data via CDP + Voyager API.

## Prerequisites

1. Chrome running with debug port (non-headless recommended to avoid CAPTCHA):
   ```bash
   /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
     --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug
   ```
2. CDP server running: `bun /path/to/chromoi/src/index.js`
3. User logged into LinkedIn in the browser

## Architecture

LinkedIn uses a hybrid approach:
- **Initial page**: Server-rendered HTML (SSR)
- **Data fetching**: JSON via Voyager API (GraphQL + REST)

Key endpoints:
```
/voyager/api/graphql              - GraphQL queries (feed, profiles, settings)
/voyager/api/relationships/*      - Connections, invitations
/voyager/api/messaging/*          - Messages, presence
/voyager/api/identity/*           - Profile data
```

## Authentication

LinkedIn requires CSRF token from `JSESSIONID` cookie:
```javascript
const csrf = document.cookie.match(/JSESSIONID="([^"]+)"/)?.[1] || '';
```

## Feed API

### Fetch feed page directly
```javascript
// Run via Runtime.evaluate
(async () => {
  const csrf = document.cookie.match(/JSESSIONID="([^"]+)"/)?.[1] || '';
  const res = await fetch(
    '/voyager/api/graphql?variables=(start:0,count:50,sortOrder:MEMBER_SETTING)&queryId=voyagerFeedDashMainFeed.923020905727c01516495a0ac90bb475',
    { headers: { 'csrf-token': csrf } }
  );
  const data = await res.json();
  return data.data?.feedDashMainFeedByMainFeed?.elements || [];
})()
```

### Pagination
Change `start` parameter:
- Page 1: `start:0,count:50`
- Page 2: `start:50,count:50`
- Page 3: `start:100,count:50`

### Extract posts from API response
```javascript
posts.map(p => ({
  actor: p.actor?.name?.text || '',
  text: p.commentary?.text?.text || ''
}))
```

## DOM Scraping (Fallback)

### Extract feed posts from DOM
```javascript
[...document.querySelectorAll('.feed-shared-update-v2')].map(post => ({
  author: post.querySelector('.update-components-actor__title span[dir="ltr"] span')?.innerText?.trim(),
  content: post.querySelector('.update-components-text span[dir="ltr"]')?.innerText?.trim()
}))
```

### Scroll to load more posts
```javascript
window.scrollBy(0, 2000)
// Wait 1-2 seconds between scrolls
```

## Full Workflow

### 1. Navigate to LinkedIn feed
```bash
curl -s localhost:2229/cdp -d '{"method":"Page.navigate","params":{"url":"https://www.linkedin.com/feed/"}}'
```

### 2. Wait for page load
```bash
sleep 3
```

### 3. Fetch posts via API (recommended)
```bash
curl -s localhost:2229/cdp -d @- <<'EOF'
{
  "method": "Runtime.evaluate",
  "params": {
    "expression": "(async () => { const csrf = document.cookie.match(/JSESSIONID=\"([^\"]+)\"/)?.[1] || ''; const res = await fetch('/voyager/api/graphql?variables=(start:0,count:50,sortOrder:MEMBER_SETTING)&queryId=voyagerFeedDashMainFeed.923020905727c01516495a0ac90bb475', { headers: { 'csrf-token': csrf } }); const data = await res.json(); const posts = data.data?.feedDashMainFeedByMainFeed?.elements || []; return JSON.stringify(posts.map(p => ({ actor: p.actor?.name?.text || '', text: (p.commentary?.text?.text || '').slice(0, 300) })).filter(p => p.text)); })()",
    "awaitPromise": true
  }
}
EOF
```

### 4. Or extract from DOM (fallback)
```bash
curl -s localhost:2229/cdp -d @- <<'EOF'
{
  "method": "Runtime.evaluate",
  "params": {
    "expression": "JSON.stringify([...document.querySelectorAll('.feed-shared-update-v2')].slice(0, 50).map(post => ({ author: post.querySelector('.update-components-actor__title span[dir=\"ltr\"] span')?.innerText?.trim(), content: post.querySelector('.update-components-text span[dir=\"ltr\"]')?.innerText?.trim()?.slice(0, 300) })))"
  }
}
EOF
```

## Other Endpoints

### Get cookies
```bash
curl -s localhost:2229/cdp -d '{"method":"Network.getCookies","params":{"urls":["https://www.linkedin.com"]}}'
```

### Check network requests
```javascript
performance.getEntriesByType('resource')
  .filter(e => e.name.includes('voyager/api'))
  .map(e => e.name)
```

### Profile API
```
/voyager/api/graphql?variables=(vanityName:USERNAME)&queryId=voyagerIdentityDashProfile...
```

### Connections API
```
/voyager/api/relationships/connectionsSummary
/voyager/api/relationships/invitationsSummary
```

### Messaging API
```
/voyager/api/voyagerMessagingGraphQL/graphql?queryId=messengerConversations...
```

## Tips

1. **Use non-headless Chrome** - LinkedIn detects headless browsers and shows CAPTCHA
2. **Use fresh profile** - `--user-data-dir=/tmp/chrome-debug` avoids conflicts
3. **API is faster** - Direct API calls are faster and more reliable than DOM scraping
4. **CSRF token required** - Always include `csrf-token` header from JSESSIONID cookie
5. **Rate limits** - Don't fetch too fast; add delays between requests

## Response Structure

Feed API response:
```json
{
  "data": {
    "feedDashMainFeedByMainFeed": {
      "paging": { "start": 0, "count": 50, "total": 498 },
      "elements": [
        {
          "actor": { "name": { "text": "Author Name" } },
          "commentary": { "text": { "text": "Post content..." } },
          "socialContent": { "shareUrl": "..." }
        }
      ]
    }
  }
}
```
