import { test, expect } from '@playwright/test';

test.describe('AI Company World 3D — V0.1 Foundation', () => {
  test('renders 3D WebGL canvas, HUD, 20 agents, speed controls and inspector without console errors', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');

    // 1. Canvas WebGL mounted
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();

    // 2. Top HUD & 20 agents rendered
    await expect(page.getByTestId('top-hud')).toBeVisible();
    await expect(page.getByTestId('agent-list-panel')).toBeVisible();
    const agentRows = page.locator('[data-testid^="agent-item-"]');
    await expect(agentRows).toHaveCount(20);

    // 3. Select first employee -> inspector opens
    await page.getByTestId('agent-item-EMP-01').click();
    await expect(page.getByTestId('agent-inspector')).toBeVisible();
    await expect(page.getByTestId('agent-inspector')).toContainText('Nguyễn Minh Quân');

    // 4. Pause & Resume toggle
    const pauseBtn = page.getByTestId('pause-toggle-btn');
    await pauseBtn.click();
    await expect(pauseBtn).toContainText('Resume');
    await pauseBtn.click();
    await expect(pauseBtn).toContainText('Pause');

    // 5. Simulation speeds (0.15x .. 2x)
    for (const s of [0.15, 0.25, 0.5, 1, 1.5, 2]) {
      await page.getByTestId(`speed-btn-${s}`).click();
    }

    // 6. Quality presets (Low, Medium, High)
    for (const q of ['low', 'medium', 'high']) {
      await page.getByTestId(`quality-btn-${q}`).click();
    }

    expect(errors).toEqual([]);
  });
});
