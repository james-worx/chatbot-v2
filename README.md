# Ask AI — Multi-Model Chatbot

A React single-page app for chatting with multiple [Groq](https://groq.com)-hosted
LLMs side by side, with long-term memory powered by [Mem0](https://mem0.ai) and
built-in YouTube transcript summarization.

## Features

- **Multi-model chat** — select up to 3 models and compare their responses in
  parallel, one model per chat panel.
- **Ask all at once** — a global input broadcasts the same prompt to every
  active chat.
- **Selectable personas** — pick one of three characters (Aria Vega, Dr. Theo
  Marsh, June Cole). Each has its own voice and its own isolated Mem0 memory
  namespace, so the persona you choose decides which memories are retrieved as
  context. See [Personas & memory](#personas--memory).
- **Long-term memory** — relevant past exchanges are retrieved from Mem0 and
  injected as context, scoped to the active persona. Toggle **Omit Memory** to
  skip retrieval and storage for a one-off query.
- **YouTube summarization** — paste a YouTube link and the backend fetches the
  transcript and summarizes it.
- **Query stats** — per-query time, input/output token usage, and number of
  memory chunks injected.

## Architecture

The app and API deploy together on Netlify:

- **Frontend** — Create React App (React 19) served as static files from `build/`.
- **Backend** — a single Netlify serverless function (`netlify/functions/api.mjs`)
  using the `groq-sdk`. It exposes:
  - `POST /api/chat` — runs the prompt against the selected models, handles Mem0
    memory retrieval/storage, and detects YouTube URLs for summarization.
  - `POST /api/youtube-transcript` — fetches a transcript for a given video ID.

The available model catalog lives in `src/data/groq-models.json`.

## Personas & memory

Because Mem0 memory is long-term and shared by the deployed API key, the app
never writes to a single personal namespace. Instead it ships three fictional
**personas**, defined in `src/data/personas.json`. Each persona has:

- an `id` used as the Mem0 `user_id`, which isolates its memories from the others;
- a `systemPrompt` that gives it a distinct voice; and
- `seedMemories` — starter facts that make its memory recognisably different.

Selecting a persona in the header sends its `user_id` and `system_prompt` with
every `/api/chat` call, so retrieval, storage, and tone all switch to that
persona. Chatting as a persona adds to that persona's memory (live read + write).

### Seeding persona memories

Run once after setting up Mem0 (and any time you want to reset to a clean state):

```bash
MEM0_API_KEY=your_key node scripts/seed-personas.mjs          # add seed memories
MEM0_API_KEY=your_key node scripts/seed-personas.mjs --reset  # wipe each persona first, then seed
```

`--reset` clears every memory in each persona's namespace before seeding, which
is the way to undo memories accumulated by public visitors. Re-running without
`--reset` appends and may duplicate.

## Available Scripts

### `npm start`

Runs the app in development mode at [http://localhost:3000](http://localhost:3000).
The page reloads on changes.

### `npm test`

Launches the test runner in interactive watch mode.

### `npm run build`

Builds the app for production into the `build` folder.

## Local Development

The React dev server alone won't serve the `/api/*` endpoints. Two options:

1. **Netlify Dev (recommended)** — run `netlify dev` to serve the React app and
   the serverless function together, so relative `/api/*` URLs work as in
   production. Set `GROQ_API_KEY` and `MEM0_API_KEY` in a `.env` file.
2. **Separate API base** — if you run the API elsewhere, point the frontend at
   it with `REACT_APP_API_URL=http://localhost:8888` in `.env`. When unset, the
   frontend uses relative `/api/*` URLs.

## Deploy on Netlify

1. Push the repo to GitHub and connect the site in [Netlify](https://app.netlify.com).
2. Build command and publish directory are read from `netlify.toml`
   (`npm run build` → `build/`); functions are served from `netlify/functions`.
3. In **Site settings → Environment variables**, add:
   - `GROQ_API_KEY` — your Groq API key
   - `MEM0_API_KEY` — your Mem0 API key

No `REACT_APP_API_URL` is needed in production; the frontend uses relative
`/api/*` URLs.

## Releases

Releases are automated with [semantic-release](https://semantic-release.gitbook.io/),
driven by [Conventional Commits](https://www.conventionalcommits.org/). On every
push to `main`, the version is bumped, `CHANGELOG.md` is updated, and a GitHub
Release is published. Use `feat:` / `fix:` commit prefixes to trigger version
bumps.
