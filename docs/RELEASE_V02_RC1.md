# V0.2 RC1 — Integration report

Common base: 6a442dce697e8d1a8ce04cf1ec228dfba4bc3f2c
Graphics QA: 03ca3f15f0c179dcdc3bb5c990ee18eda2f155b1
Backend QA: eed5df4e3b7215a22a62f4f1071afdd81bd9482d

Both QA branches fixed the invalid store syntax and restored tickSimulation. The backend store is selected verbatim because it preserves graphics camera/modal hooks and adds task revision notifications, department/task synchronization and hydrate fixes. Preserve all graphics source changes and all eight QA screenshots. Include the backend TaskManager, management panel, two new E2E scenarios and QA report verbatim.

## Verification status
- QA graphics report: typecheck/build pass, backend 26/26, E2E 4/4; SwiftShader performance not representative of hardware GPU.
- QA backend report: typecheck/build pass, backend 26/26, E2E 6/6 with temporary local Playwright configuration; default preview configuration blocked in that environment.
- These results apply to parent branches only, not the merged RC1. Local GitHub DNS unavailable, and offline npm ci failed ENOTCACHED (zustand); combined build and automated tests pending.
- Release candidate, not stable. No deployment, no main update. Run npm ci, npm run typecheck, npm run build, npm run test:backend, npm run test:e2e against this exact branch before promoting. Also verify physical GPU performance.
