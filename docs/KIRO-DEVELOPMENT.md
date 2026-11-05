# Kiro development record
Project started November 5, 2026. Category: Skeleton Crew.

## What Kiro actually did
Kiro CLI 2.35.1 ran against this new repository with an isolated file-only custom agent.
The request supplied the product steering and owner-selected interfaces in .kiro/specs/hauntkit/design.md.
No family MCP connections, cloud credentials, shell tools or other projects were exposed to that agent.

The run used the product steering, requirements/design documents, and the task checklist.
It read the specifications and wrote:
- packages/core/engine.mjs
- apps/ghost-inn/world.mjs
- apps/lost-letters/world.mjs
- tests/engine.test.mjs
- tests/worlds.test.mjs

It also updated the implementation checklist, explicitly noting that it had not executed the tests.
The account reached its monthly usage limit after these writes. The final CLI exit status was 1, so this is not reported as a clean completed agent turn.

## Human-directed integration and review
The owner ran the initial suite: 55 of 56 tests passed. The failure was an incorrect assertion in a counter fixture: adding an item had not incremented its independent count.
Review also found gaps that were not covered by the initial green tests.

Nine additional behavioral regression tests were written and run against the initial implementation. They exposed initial-state validation, observer isolation, post-action projection atomicity, metadata spoofing, shared initial-state references, strict envelope validation, inherited action names, semantic save validation, and full tone undo.
The corrected implementation passes those regressions.

Codex integrated the responsive browser applications, original art, storage adapter, build/dev scripts, and official-SDK MCP server.
The actual browser flow was exercised through Chrome, including clue discovery, final delivery, composition, tone change, undo, hand editing, download and reload.

## What is not claimed
- No live LLM is hidden behind the authored browser composer.
- No Kiro MCP playthrough was completed after the quota error.
- No hook execution or autonomous deployment is claimed.
- Raw agent transcripts and account/session details are not public project artifacts.

The committed .kiro directory is working project guidance, not a retroactive reconstruction of an unrelated existing app.

