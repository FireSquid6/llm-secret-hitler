
# Project Overview

This is an **Avalon (social deduction game) simulation** where LLM agents play against each other. Despite the repo name (`llm-secret-hitler`), the game implemented is **Avalon**, not Secret Hitler.

## Architecture

### Entry Point
- `src/index.ts` — CLI using `commander`. Run with `bun src/index.ts simulate`

### Core Game Logic (`src/engine/`)
- `index.ts` — Types/schemas: `GameState`, `Round`, `Knowledge`, `Role`, `Rule`, `Player` (Zod-based)
- `actions.ts` — Action schemas: `vote`, `nominate`, `quest`, `lady`, `assassinate`, `start`, `ruleset`, `abort`, `leave`
- `logic.ts` — Pure logic functions: role allocation, knowledge generation, available actions, scoring
- `mutators.ts` — State-mutating functions called by `processAction` (one per action type)
- `process.ts` — `processAction()` dispatcher; returns `GameState | ProcessError`
- `view.ts` — `viewStateAs(state, playerId)` — strips hidden info (roles, votes, quest cards)
- `data.ts` — Quest configs per player count (5–10 players), good/evil ratios

### Simulation Layer (`src/`)
- `game.ts` — `AvalonGame` class: manages state, listeners (state + chat), and action dispatch
- `simulation.ts` — `AvalonAgent` class: LLM agent using Vercel AI SDK + `@ai-sdk/anthropic`; `simulateAvalonGame()` wires agents to game
- `prompts.ts` — `buildSystemPrompt()` (role/knowledge context) and `describeGameState()` (per-turn user message)

### Key Design Patterns
- **Immutable state**: `processAction` uses `structuredClone` — returns new state or `ProcessError`
- **Event-driven agents**: `AvalonGame` notifies listeners on state change; agents queue updates via `drainQueue`
- **View isolation**: Each agent only sees state filtered through `viewStateAs`
- **Knowledge map**: `generateKnowledgeMap` computes per-player knowledge (role, team, percivalic sight, Lady results)

### Game Roles
- **Good (Arthurian)**: Merlin, Percival, Arthurian Servant
- **Evil (Mordredic)**: Assassin, Mordred, Morgana, Oberon, Mordredic Servant

### Active Ruleset (hardcoded in `game.ts`)
8 players, rules: `["Mordred", "Percival and Morgana", "Lady of the Lake"]`

### LLM Used
`claude-haiku-4-5-20251001` via Vercel AI SDK (`generateText` with tool calls, max 6 steps)

---

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Use `bunx <package> <command>` instead of `npx <package> <command>`
- Bun automatically loads .env, so don't use dotenv.

## APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

## Testing

Use `bun test` to run tests.

```ts#index.test.ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

## Frontend

Use HTML imports with `Bun.serve()`. Don't use `vite`. HTML imports fully support React, CSS, Tailwind.

Server:

```ts#index.ts
import index from "./index.html"

Bun.serve({
  routes: {
    "/": index,
    "/api/users/:id": {
      GET: (req) => {
        return new Response(JSON.stringify({ id: req.params.id }));
      },
    },
  },
  // optional websocket support
  websocket: {
    open: (ws) => {
      ws.send("Hello, world!");
    },
    message: (ws, message) => {
      ws.send(message);
    },
    close: (ws) => {
      // handle close
    }
  },
  development: {
    hmr: true,
    console: true,
  }
})
```

HTML files can import .tsx, .jsx or .js files directly and Bun's bundler will transpile & bundle automatically. `<link>` tags can point to stylesheets and Bun's CSS bundler will bundle.

```html#index.html
<html>
  <body>
    <h1>Hello, world!</h1>
    <script type="module" src="./frontend.tsx"></script>
  </body>
</html>
```

With the following `frontend.tsx`:

```tsx#frontend.tsx
import React from "react";
import { createRoot } from "react-dom/client";

// import .css files directly and it works
import './index.css';

const root = createRoot(document.body);

export default function Frontend() {
  return <h1>Hello, world!</h1>;
}

root.render(<Frontend />);
```

Then, run index.ts

```sh
bun --hot ./index.ts
```

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.mdx`.
