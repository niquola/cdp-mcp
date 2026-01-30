# chro

Claude Code plugin marketplace with browser automation skills.

## Skills

| Skill | Description |
|-------|-------------|
| `cdp` | Chrome DevTools Protocol - control Chrome via CDP |
| `linkedin` | LinkedIn automation |

## Install

Add to `~/.claude/settings.json`:

```json
{
  "plugins": ["/path/to/chro"]
}
```

## Requirements

- [Bun](https://bun.sh)
- Chrome/Chromium

## Structure

```
chro/
├── plugin.json
├── skills/
│   ├── cdp/
│   │   ├── SKILL.md
│   │   └── src/index.js
│   └── linkedin/
│       └── SKILL.md
└── CLAUDE.md
```
