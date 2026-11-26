# Sprint 05 — V0.3 integration

Common base: d8c511bdf82010b12033f87f9d89a013dbdb19eb
Living Office: 2e0f3b8e1c4e886367cd190819285ba4030033b4
Business Engine: 8e848789f246d8a61a911a6290ec4ded9dd510f9

The only overlapping source path is useGameStore.ts. Business store retained as base, preserving business advancement, task revision/completions, V0.3 save and legacy migration. Added Gemini follow-camera state/actions, reset defaults, and lounge-seat command routing. All other source changes from both branches are preserved. CI on integration/v0.3 runs locked install, typecheck, production build, backend tests and Chromium E2E. No deployment. Main and V0.2 RC1 untouched. Parent branch reported tests are not combined test results. Hardware GPU performance still unverified.
