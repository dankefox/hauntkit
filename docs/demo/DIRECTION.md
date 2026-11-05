# Hauntkit — two doors, one foundation

Scope: the new v0.1.0 project, both desktop browser experiences and the local
stdio MCP extension. English, 1920×1080, 30 fps, 92 seconds. The user delegated
the project and its submission materials; use the product's own visual style.
No account, KYC, family service or private registration screen appears.

## Three directions

1. Paper trail: cream paper, editorial serif, real interface close-ups, quiet
   storytelling, warm plucked notes. Chosen because the two apps both centre on
   a letter and a remembered detail.
2. Night lantern: ink-dark stage, glowing room windows, three-dimensional camera
   moves, short suspense beats, low ambient score.
3. Toolkit anatomy: white technical board, monospaced type, assembly diagrams,
   brisk match cuts, dry mechanical rhythm.

The paper trail suits a gentle mystery and a thoughtful writing desk. This is
the first video in this isolated project; no prior project template is reused.

## Product-derived devices

- Because both worlds hold unfinished letters, chapter cards read like stamps
  and the ending returns to the same paper-and-ink palette.
- Because clues are persistent discoveries, zoom into the real field notebook
  rather than inventing floating clue graphics.
- Because tone and undo change actual state, show successive genuine browser
  states with labelled edits. Cuts do not pretend to be continuous footage.
- Because one core serves two apps and MCP, finish with three branches joining
  a single versioned-state spine and a real transport receipt.

## Frame system and renderer

Cream #f3f0e4, ink #293a32, coral #d75d43, muted gold #b79b65.
Georgia headings 88–112px, Arial explanatory text 30–38px. English-only because
the destination is the English-language hackathon entry. 72px horizontal safe
area; captions remain above y=950. Establishing views may show the whole UI;
feature close-ups scale body text to at least 22px. No decorative code waterfall,
fake pointer clicks, or invented AI responses.

The product is buildless HTML, not React. Its actual business components were
rendered and operated in the user's Chrome through CUA. The DOM screenshot
bridge fails with timeoutMs; native screenshots work. Therefore this video uses
those actual component renders, with browser chrome cropped away, in a Python
and FFmpeg compositor. It is explicitly an edited walkthrough of actual browser
states, not a remounted imitation or continuous screen recording. No additional
browser automation, Chromium install or presentation framework is introduced.
Slow 2–3% framing moves serve reading. Hard cuts separate dark and light shots;
short fades stay within a palette. No spring, particle or neon effects.

## Shot table

| Seconds | Focal element | Picture and copy | Sound |
| --- | --- | --- | --- |
| 0–7 | Hauntkit title | Small bones. Living worlds. Original inn art; two letters/doors motif. | Plucked opening, paper tick |
| 7–17 | Real landing page | Two little worlds. No sign-up. Edited browser walkthrough label. | Quiet chord and soft page accent |
| 17–30 | Ghost Inn notebook | Explore four rooms. Find clues before solving the lock. Actual library screen and notebook detail. | Sparse bell over soft strings |
| 30–40 | Returned letter | Your choices become the ending. Actual Memory Returned result. | Two-note resolution |
| 40–52 | Writing desk | Bring a memory. Start a letter. Actual brief and composition. | Warm major turn, paper tick |
| 52–62 | Tone change | Warm. Gentle. Clear. Actual gentle result, then hand-edited draft. | Light toggle and pluck |
| 62–71 | Kept letter | Edit it. Undo it. Keep it. Actual sealed/download control. | Seal chime |
| 71–84 | Shared foundation | Same world rules. Real MCP transport. Six tools; stale writes rejected. Scripted SDK client, not an AI playthrough. | Sparse pulse, confirmation |
| 84–92 | Source and invitation | Built with Kiro. Reviewed with care. MIT source; no key needed for browser play. | Complete harmonic cadence |

## Evidence and limits

Source commit 0b178d555d9143d0bba44ce4a5e035fed62c8faf. Real browser captures
as public component crops in frames/; real MCP receipt in mcp-receipt.json. 68 automated tests passed
on Node 20.20.2 and 25.9.0. Kiro initial file-writing run reached quota; no Kiro
MCP playthrough or live model generation is claimed. Music and effects are
original waveform synthesis with a fixed score. Audio is measured, not claimed
as human-listened. Native browser chrome and all personal account tabs are
excluded from public frames.
