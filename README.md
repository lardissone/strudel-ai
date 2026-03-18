# Strudel AI

[![GitHub](https://img.shields.io/github/license/lardissone/strudel-ai)](https://github.com/lardissone/strudel-ai)

A live-coding music environment powered by [Strudel](https://strudel.cc) with an integrated AI chat assistant. Ask the AI about patterns, mini-notation, and music programming — then insert generated code directly into the REPL.

## Setup

```bash
npm install
```

### Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | — | Anthropic API key for the AI chat assistant |
| `ANTHROPIC_MODEL` | No | `claude-sonnet-4-6` | Anthropic model used by `/api/chat` |
| `ANTHROPIC_MAX_TOKENS` | No | `4096` | Max tokens requested per AI response |
| `RATE_LIMIT_MAX` | No | `20` | Max chat requests per IP per minute |

Create a `.env.local` file:

```bash
ANTHROPIC_API_KEY=sk-ant-...
```

## Development

```bash
npm run dev
```

Open [http://localhost:3434](http://localhost:3434).

## Production

### Vercel

Deploy with the Vercel CLI or connect the repo. Set `ANTHROPIC_API_KEY` in the Vercel dashboard under Environment Variables. The repo includes [`vercel.json`](vercel.json) to target the Next.js framework, `iad1`, and a `30` second max duration for the chat route.

### Manual

```bash
npm run build
npm start
```

Note: Docker deployment is not documented here because the repo does not currently include a `Dockerfile`.

## Architecture

- **Next.js 16** with App Router and React 19
- **`/api/chat`** — streaming AI endpoint (SSE) backed by Claude, with in-memory rate limiting
- **Strudel REPL** — `@strudel/repl` web component for live music coding
- **AI Chat Panel** — streams responses and offers "Insert into REPL" for code blocks
- **Docs Sidebar** — quick reference for mini-notation, pattern methods, and sounds

## License

AGPL-3.0-only
