# Verification, 2026-11-05

- `npm test`: 68 passing on Node 25.9.0 and on Node 20.20.2.
- Nine new review regressions were first run against the initial Kiro candidate
  and failed for the intended behavior before the corresponding corrections.
- The real stdio MCP client exercises both worlds, invalid actions, version
  conflicts, export/restore, prompt registration and session isolation.
- Chrome: completed Ghost Inn's key → clues → discovered combination → trunk →
  returned-letter ending. The alternate ending is covered by world tests.
- Chrome: entered a synthetic letter brief; composed, changed tone, undid,
  hand-edited, downloaded a 253-byte text file, and reloaded the retained draft.
- Visual checks at the normal desktop viewport and a 390×844 override covered
  the landing page, inn and writing desk. Mobile controls and letter text fit
  their column. These are visual checks, not DOM-measured overflow assertions.
- The DOM browser bridge was unavailable; native Chrome accessibility and
  screenshots were used. No clean-console assertion is made.
- The initial development server accidentally denied `/packages/` imports;
  the real browser exposed this and root-path normalization corrected it.
- Static build, dependency audit (zero known vulnerabilities at verification),
  and public-source credential/private-registration pattern checks passed.
- Browser storage failures and stale-tab checks are covered by the real
  session adapter tests. The stale-tab check is best-effort, not an atomic
  cross-window transaction system.
- No production family service, account, database or model credential is used
  by the applications. No Kiro MCP playthrough is claimed after the CLI quota.

After participant confirmation, Site access was changed to public (revision 2).
The previously unauthenticated Chrome tab loaded the landing page and both
applications without a sign-in gate; ringing the Ghost Inn bell awarded the
brass key. The YouTube walkthrough was uploaded as unlisted, passed the
platform's copyright check at upload time, and played on its actual watch page:
https://www.youtube.com/watch?v=hf8rdYMLEh8 .

Devpost project details are saved (3/5 steps). Additional participant information
and final submission remain incomplete. Publication is not a submission receipt.
