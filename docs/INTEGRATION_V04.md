# Sprint 07 — V0.4 integration

Common AI Brain base: 4238d73ef12a4fca2c85ff9959b6763a57c59d98
Company World: b341e52fa4c440183334846e09fb5718a1499df9
Corporate Engine: ef42d66f9dbbfc2e6ce4bab22cbdb2199d67671a

Verified the only overlapping source file, useGameStore.ts, has independent edits relative to the common base. Retained the corporate V0.4 save version and Gemini HQ overview camera target [-4,0,0] and offset [0,24,27]. All other graphics and corporate changes are preserved, including eight HQ screenshots. Added integration regression covering the expanded HQ camera, training waypoint command, real corporate training task and V0.4 IndexedDB save/restore. Existing 20-agent roster unchanged. Formal promotion remains CEO-controlled and recruitment remains planning only; the physical boardroom and training scene do not by themselves automate board meetings or training skill transfer.

CI configured for integration/v0.4: npm ci, typecheck, build, backend tests, Chromium E2E. Parent test results are not merged test results. Await CI before release; physical GPU performance is unverified. No deployment or writes to main or old RC branches.
