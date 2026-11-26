import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/pages',
  timeout: 90_000,
  expect: { timeout: 30_000 },
  workers: 1,
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:4173',
    launchOptions: { args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] },
  },
  webServer: {
    command: 'mkdir -p /tmp/ai-company-pages && ln -sfn "$PWD/dist" /tmp/ai-company-pages/AI-Angineer && python3 -m http.server 4173 --bind 127.0.0.1 --directory /tmp/ai-company-pages',
    url: 'http://127.0.0.1:4173/AI-Angineer/',
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
