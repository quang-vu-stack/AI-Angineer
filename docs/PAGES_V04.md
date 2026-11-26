# V0.4 RC1 web deployment
Source: 3761913b360f34c93a2712f820252ef362b3b888, CI passed (47 backend and 8 E2E tests).
Dedicated branch deploy/v0.4-web. Main, RC and V0.5 branches unchanged. No server, API keys or paid service. Build uses Vite --base=/AI-Angineer/ so asset URLs resolve under the GitHub Pages repository path. Site is public if Pages is enabled; saves stay in IndexedDB in each browser/origin, not shared across devices or migrated from localhost. GPU/mobile performance unverified.

Repository owner must enable Settings > Pages > Build and deployment > Source > GitHub Actions. If the github-pages environment restricts deployment to the default branch, allow deploy/v0.4-web specifically in Settings > Environments > github-pages (keep other restrictions). After enabling, rerun the workflow or push a new commit on deploy/v0.4-web. Expected default URL: https://quang-vu-stack.github.io/AI-Angineer/ ; only consider live after deployment success and opening the site.
