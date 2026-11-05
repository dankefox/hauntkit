# Kiroween draft materials

## Name
Hauntkit — AI Character Starter

## Pitch
One shared foundation for a clue-driven ghost inn and a thoughtful letter-writing desk.

## Category
Skeleton Crew — reusable foundation with two distinct applications.

## Inspiration
Characters feel more alive when their choices matter. A beautiful chat window is not enough if the world forgets a discovery, an invalid action silently changes a save, or an edit cannot be undone.
We wanted a small, understandable foundation that gives characters reliable memory and boundaries, without requiring a paid API key to try the work.

## What it does
Ghost Inn is a short exploration game about a forgotten guest and a long-delayed letter. Four rooms hold clues; the player solves a lock and chooses how the letter is returned.
Lost Letters is a quiet writing tool. A visitor brings a recipient, a memory, something left unsaid, and a small promise. The desk offers an authored starting point, three tones, hand editing, undo and a downloadable letter.
Both apps use the same stateful starter. An AI can also enter through a real local MCP server and use those exact rules.

## How we built it
Kiro specifications and product steering defined the interfaces and boundaries before coding.
Kiro CLI wrote the initial engine, two world modules, and their tests. Codex reviewed the code, corrected invariants, and integrated the browser and MCP surfaces.
The frontend is static HTML/CSS/JavaScript. Core modules run unchanged in the browser and Node. The MCP transport uses the official TypeScript/JavaScript SDK.
Original scene art was created with OpenAI image generation, and the room illustrations are code-authored SVG.

## Challenges
A transaction must include its public observation: constructing the view after committing can leave state changed even when the caller sees a failure.
Undo must restore tone alongside text.
A save needs semantic world checks as well as correct field types.
We added explicit regressions for these cases and tested the real stdio boundary rather than replacing it with a mock.

## Accomplishments
Two complete and visually distinct applications share one small core. The browser demo is immediately usable without sign-in, while the MCP server is a real extension point rather than a staged transcript.
The site also tells the truth about what is authored and what an external AI can do.

## Next
Optional live narration, more character worlds, and a durable MCP persistence adapter with explicit user control.

## Built with
JavaScript, HTML, CSS, Node.js, Kiro, Model Context Protocol, Zod, OpenAI image generation.

## Submission checklist
- [x] New open-source project with an MIT license
- [x] Root .kiro specifications and steering
- [x] Two separate application folders
- [x] Browser and MCP implementations
- [x] Published source URL verified: https://github.com/dankefox/hauntkit
- [ ] Working demo URL verified
- [ ] Public demonstration video under 3 minutes
- [ ] Devpost draft details completed and preview checked
- [ ] Final submission receipt
- [ ] Credit-program identity verification handled by the participant

## Current concrete assets
- Source: https://github.com/dankefox/hauntkit (public, MIT).
- Deployed Site: https://hauntkit.dandanceplay.chatgpt.site (owner-private until
  an explicit audience choice; this is not yet a public judge-accessible demo).
- Local video: `site/demo/hauntkit-demo.mp4`, 92 seconds, H.264/AAC, 1080p.
- Existing Devpost draft: Hauntkit — AI Character Starter, submission 1283278.
- YouTube has no channel yet; creation accepts new terms and is awaiting the
  participant's action-time confirmation. No substitute URL is entered into
  the required YouTube field, and no final submission is claimed.

