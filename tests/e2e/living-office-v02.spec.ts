import { test, expect } from '@playwright/test';

test.describe('AI Company World 3D — Sprint 02: Living Office', () => {
  test('opens live Company Management Panel (HR, Finance, Projects, Tasks) backed by real Backend data', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');
    await expect(page.locator('canvas').first()).toBeVisible();
    await expect(page.getByTestId('top-hud')).toContainText('AI COMPANY WORLD 3D');

    // Open Company Management Panel
    await page.getByTestId('open-company-mgmt-btn').click();
    const panel = page.getByTestId('company-management-panel');
    await expect(panel).toBeVisible();

    // 1. HR Tab — 20 real employees from Backend
    await expect(page.getByTestId('mgmt-content-hr')).toBeVisible();
    await expect(page.getByTestId('mgmt-content-hr')).toContainText('Nguyễn Minh Quân');
    await expect(page.getByTestId('mgmt-content-hr')).toContainText('Hồ Thanh Tâm');

    // 2. Finance Tab — initial real balance is 0 ₫ (no fake numbers), then record real capital
    await page.getByTestId('mgmt-tab-finance').click();
    await expect(page.getByTestId('mgmt-content-finance')).toContainText('0 ₫');
    await page.getByTestId('ledger-amount-input').fill('500000000');
    await page.getByTestId('ledger-desc-input').fill('Vốn điều lệ khởi tạo Sprint 02');
    await page.getByTestId('ledger-submit-btn').click();
    await expect(page.getByTestId('mgmt-content-finance')).toContainText('500.000.000 ₫');

    // 3. Projects Tab — real foundation project + create new project
    await page.getByTestId('mgmt-tab-projects').click();
    await expect(page.getByTestId('mgmt-content-projects')).toContainText('AI Company World 3D V0.1');
    await page.getByTestId('project-name-input').fill('Living Office Sprint 02');
    await page.getByTestId('project-submit-btn').click();
    await expect(page.getByTestId('mgmt-content-projects')).toContainText('Living Office Sprint 02');

    // 4. Tasks Tab — real tasks + create new task
    await page.getByTestId('mgmt-tab-tasks').click();
    await page.getByTestId('task-title-input').fill('Kiểm thử màn hình phòng họp');
    await page.getByTestId('task-submit-btn').click();
    await expect(page.getByTestId('mgmt-content-tasks')).toContainText('Kiểm thử màn hình phòng họp');

    // Close panel and navigate to Central Meeting Room + Overview
    await page.getByTestId('close-company-mgmt-btn').click();
    await expect(panel).toBeHidden();
    await page.getByRole('button', { name: 'Phòng Họp Trung Tâm' }).click();
    await page.getByTestId('room-overview-btn').click();

    // Command an agent to the meeting room
    await page.getByTestId('agent-item-EMP-02').click();
    await expect(page.getByTestId('agent-ai-personality')).toBeVisible();
    await expect(page.getByTestId('agent-career-profile')).toBeVisible();
    await page.getByTestId('agent-inspector').getByRole('button', { name: 'Phòng họp' }).click();

    expect(errors).toEqual([]);
  });
});
