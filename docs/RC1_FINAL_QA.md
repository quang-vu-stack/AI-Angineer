# Final RC1 QA

Automated verification on push to release/v0.2-rc1 runs npm ci, typecheck, build, backend tests and Chromium E2E. Preview binds to loopback only. No public deployment. GitHub-hosted runner uses software WebGL; separately measure FPS on the user's hardware. Stable requires successful checks on the final commit and gameplay approval. No result claimed before CI finishes.
