# Strudel AI

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](https://github.com/lardissone/strudel-ai/blob/main/LICENSE)

**Live-code music with AI by your side.**

Strudel AI is a browser-based music environment built on [Strudel](https://strudel.cc) with an integrated AI assistant powered by Claude. Ask it about patterns, mini-notation, and music programming — then drop generated code straight into the REPL and hear it play.

---

## Features

- **Live REPL** — Write and hear Strudel patterns in real time
- **AI Chat** — Ask Claude about patterns, sounds, and mini-notation; insert suggestions directly into the editor
- **Docs Sidebar** — Quick reference for mini-notation, pattern methods, and available sounds
- **Keyboard-first** — `Cmd+Enter` to play, `Cmd+.` to stop

## Quick Start

```bash
npm install
cp .env.local.example .env.local  # add your ANTHROPIC_API_KEY
npm run dev
```

Open [http://localhost:3434](http://localhost:3434) and start making music.

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | — | Anthropic API key for the AI chat |
| `ANTHROPIC_MODEL` | No | `claude-sonnet-4-6` | Model used by `/api/chat` |
| `ANTHROPIC_MAX_TOKENS` | No | `4096` | Max tokens per AI response |
| `RATE_LIMIT_MAX` | No | `20` | Max chat requests per IP per minute |

## Deployment

### Vercel

Connect the repo or deploy with the Vercel CLI. Set `ANTHROPIC_API_KEY` in the dashboard under Environment Variables. The included [`vercel.json`](vercel.json) targets Next.js on `iad1` with a 30s max duration for the chat route.

### Manual

```bash
npm run build
npm start
```

## Tech Stack

- **Next.js 16** — App Router + React 19
- **Claude API** — Streaming AI responses via SSE with in-memory rate limiting
- **Strudel REPL** — `@strudel/repl` web component for live music coding

## License

[AGPL-3.0-only](LICENSE)
