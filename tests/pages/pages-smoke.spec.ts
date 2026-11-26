import { test, expect } from '@playwright/test';
test('published subpath loads real game canvas, HUD and 20 agents', async ({page})=>{
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400 && ['script','stylesheet'].includes(r.request().resourceType()))errors.push(r.status()+' '+r.url());});
  await page.goto('/AI-Angineer/',{waitUntil:'domcontentloaded'});
  await expect(page.getByTestId('top-hud')).toBeVisible();
  await expect(page.locator('canvas').first()).toBeVisible();
  await expect(page.locator('[data-testid^="agent-item-"]')).toHaveCount(20);
  expect(errors).toEqual([]);
});
