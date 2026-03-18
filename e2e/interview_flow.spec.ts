import { test, expect } from '@playwright/test';

test.describe('E2E System Failure Simulation & Happy Path', () => {

  test('The Happy Path: Successful Call Lifecycle', async ({ page }) => {
    // 1. Navigation and Login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'candidate@example.com');
    await page.fill('input[type="password"]', 'securepassword');
    await page.click('button[type="submit"]');

    // 2. Navigate to Interview
    await page.waitForURL('/interview/*');
    
    // 3. Connect to Audio
    const connectBtn = page.locator('button:has-text("Connect")');
    await expect(connectBtn).toBeVisible();
    await connectBtn.click();

    // 4. Validate live visualizer or connected state rendering
    await expect(page.locator('.audio-visualizer, .status-connected')).toBeVisible({ timeout: 15000 });
    
    // 5. Simulate End Call
    await page.click('button:has-text("End Call")');
    await expect(page.getByText('Interview completed')).toBeVisible();
  });

  test('Network Drop Simulation: Handling Backend 502/Offline State', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'candidate@example.com');
    await page.fill('input[type="password"]', 'securepassword');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('/interview/*');
    await page.click('button:has-text("Connect")');
    await expect(page.locator('.status-connected')).toBeVisible({ timeout: 15000 });

    // Mid-interview, intercept network requests to simulate 502 Bad Gateway
    await page.route('**/*stream*', async (route) => {
      await route.fulfill({
        status: 502,
        contentType: 'text/plain',
        body: 'Bad Gateway Simulation',
      });
    });

    // Alternatively, simulate complete offline state if evaluating frontend disconnection event listeners
    await page.context().setOffline(true);

    // Front-end should catch the disconnection gracefully
    // Assert visualizers are detached/stopped
    await expect(page.locator('.audio-visualizer')).toBeHidden({ timeout: 10000 });
    
    // Assert "Reconnecting..." toast or fallback UI is displayed
    const reconnectToast = page.getByText(/Reconnecting\.\.\.|Connection Lost/i);
    await expect(reconnectToast).toBeVisible();
  });

});
