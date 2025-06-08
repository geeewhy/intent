import { test, expect } from '@playwright/test';

test('can issue a command and see success toast', async ({ page }) => {
  // Launch app in mock mode
  await page.goto('/?apiMode=mock');

  // Navigate to Command Issuer
  await page.getByText('Command Issuer').click();

  // Select a command type
  await page.getByText('Select command type').click();
  await page.getByText('CreateUser').click();

  // Generate an aggregate ID
  await page.getByRole('button', { name: 'RotateCcw' }).click();

  // Switch to JSON view for payload
  await page.getByRole('tab', { name: 'JSON' }).click();

  // Submit the command
  await page.getByRole('button', { name: 'Submit Command' }).click();

  // Assert that success toast appears
  const successToast = page.getByText('Command executed 🎉');
  await expect(successToast).toBeVisible({ timeout: 5000 });
});