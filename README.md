# Hauntkit
**Small bones. Living worlds.**

A reusable, stateful character starter, demonstrated by two distinct applications:

- **Ghost Inn** — explore four rooms, find clues, return a long-delayed letter, and choose between two endings.
- **Lost Letters** — turn a memory into a letter, change its tone, edit it yourself, undo, and keep a plain-text copy.

The browser experiences need no account, API key, or backend. They use authored story dialogue and deterministic writing templates. A real **stdio MCP server** exposes the exact same world modules to an AI client.

## Run
Requires Node.js 20+ and npm.

```sh
npm ci
npm test
npm run dev
```

Open the Local URL printed by the server (default: http://127.0.0.1:18778).
The two experiences are at `/ghost-inn/` and `/lost-letters/`.
`npm run build` creates a self-contained static site in `dist/`.

## Connect an AI
Run `node /absolute/path/to/hauntkit/packages/mcp/server.mjs` as a local stdio MCP server.
For example, a Kiro workspace MCP configuration can contain:

```json
{
  "mcpServers": {
    "hauntkit": {
      "command": "node",
      "args": ["/absolute/path/to/hauntkit/packages/mcp/server.mjs"]
    }
  }
}
```

Install dependencies first. Replace the path with your actual checkout; do not put secrets in this configuration.
See [Kiro MCP configuration](https://kiro.dev/docs/mcp/configuration/) for the current client setup.
The server exposes six tools: `hauntkit_worlds`, `hauntkit_start`, `hauntkit_observe`, `hauntkit_act`, `hauntkit_export`, `hauntkit_restore`.
The `hauntkit_character` prompt helps the client stay grounded in discovered facts.

The normal loop is **start → observe → act with the current expectedVersion → observe**.
Every write requires the version in the most recent view. A conflict changes nothing: observe again and make a new choice.
The MCP server has no shell, filesystem-writing, network, or letter-sending tools.

Browser saves stay in localStorage. MCP sessions stay in the MCP process and do not share the browser's storage; export a snapshot to retain them.

## Use it as a starter
1. Add a world under `apps/your-world/world.mjs`.
2. Give it an ID, `initialState`, `validateState`, `observe`, and explicit `actions`.
3. Register it with `createEngine({ worlds: [...] })`.
4. Keep business rules in the world. Keep transport, DOM, and model calls outside it.

The core owns isolated sessions, cloning, optimistic version checks, atomic commits, and validated save/restore.
A world's public observation cannot overwrite session metadata. Failed actions and failed projections do not partially commit.
The example worlds also validate semantic save invariants. This is local state validation, **not** an anti-cheat boundary: the static source is public.

Lost Letters keeps the latest 50 previous drafts and 100 journal entries. Ghost Inn retains the latest 100 journal entries.
Letter text is rendered as text, never as HTML or instructions.

## Walkthrough and evidence

The built website includes a [92-second walkthrough](site/demo/index.html).
The video uses real browser states, original scene art, and an original score.
See [verification](docs/VERIFICATION.md), [video sources](docs/demo/README.md),
and the [actual MCP transport receipt](docs/demo/mcp-receipt.json).
The video does not claim live AI narration in the browser.

## Project map
```text
packages/core/engine.mjs          Shared transactional foundation
packages/mcp/                    Official-SDK stdio transport
apps/ghost-inn/world.mjs          Exploration rules and authored story
apps/lost-letters/world.mjs       Writing, editing, history and export
site/                            Responsive browser interfaces
tests/                           World, invariant and real stdio MCP tests
.kiro/specs/hauntkit/             Requirements, design and tasks
.kiro/steering/                   Product boundaries used during development
docs/                            Architecture, attribution and development record
```

## Kiro and other tools
This is a new project made for Kiroween 2026, in the Skeleton Crew category.
Kiro CLI was used for the initial shared engine, both worlds, and their tests, guided by the committed requirements/design and steering.
Codex reviewed and corrected invariants, integrated the interfaces and MCP transport, and ran verification.
The Kiro run wrote the five requested files, then reached the account's monthly usage limit before its final response; its tests were run by the owner, not by that agent.
No Kiro MCP playthrough is claimed. See [the development record](docs/KIRO-DEVELOPMENT.md).

Original raster artwork was generated with OpenAI image generation. Prompts and original PNG files are under [docs/art](docs/art/README.md).
No pre-existing AISay or Tower application code, user records, or family credentials are included.
Third-party runtime dependencies are the official Model Context Protocol SDK and Zod; npm records their licenses in their packages.

MIT license. Built with care by dankefox.

