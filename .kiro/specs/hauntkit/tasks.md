# Implementation tasks

- [x] Transactional engine and save/restore validation.
- [x] Ghost Inn complete puzzle, dialogue and two endings.
- [x] Lost Letters complete composition/revision/edit/undo/export.
- [x] Meaningful core and world tests including complete journeys.
- [x] Two responsive browser apps and landing page.
- [x] Official-SDK stdio MCP server and real transport tests.
- [ ] Kiro agent plays both worlds via MCP; retain sanitized real evidence.
- [x] Original art, accessible interactions, real browser verification.
- [x] Public source, public interactive demo and uploaded walkthrough.
- [x] Complete participant information and final Devpost submission.

## Notes

Kiro CLI wrote the first engine, both world modules and two test files using file
tools. It reached the account's monthly usage limit after those writes, before a
final completion message; it did not run tests. The owner reviewed and corrected
the implementation, built the browser and MCP surfaces, and ran the suite on
Node 20.20.2 and Node 25.9.0: 68 tests passed on each.

Real browser verification completed the Ghost Inn open-letter ending and the
Lost Letters compose, revise, undo, hand-edit, download and reload path. The
second ending and invalid-action cases are covered by automated world tests.
The Kiro-agent MCP playthrough remains unchecked because the CLI quota is
exhausted. Actual stdio MCP integration is tested with the official SDK client;
that transport test is not represented as a Kiro playthrough.

The participant performed the final submission on November 6, 2026 (UTC+8).
Devpost displayed "Project submitted!" and "SUBMITTED TO → Kiroween 2026".
The separate credit-program identity verification remains unverified.
