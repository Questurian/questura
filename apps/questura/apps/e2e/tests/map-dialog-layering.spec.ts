import { expect, test } from '@playwright/test'

test('mobile map leaves sign-in controls clickable', async ({ page }) => {
  test.skip(!process.env.E2E_BASE_URL, 'Uses a published map article outside the readiness fixtures')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/peru/lima/maps/best-chifa-restaurants-in-lima')
  // Local-only development overlays overlap the bottom view switch.
  await page.addStyleTag({ content: '[class*="z-[214748"], nextjs-portal { display: none !important; }' })
  const views = page.getByRole('group', { name: 'Article view' })
  for (const mode of ['Map', 'Split', 'List']) {
    await views.getByRole('button', { name: mode, exact: true }).click()
    await page.locator('.site-nav').getByRole('button', { name: 'Sign in', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    const email = dialog.locator('input[type="email"]')
    await email.click()
    await expect(email).toBeFocused()
    // Check hit targets without sending auth requests.
    await dialog.getByRole('button', { name: 'Continue with Google', exact: true }).click({ trial: true })
    await email.fill('layering@example.com')
    await dialog.getByRole('button', { name: 'Continue', exact: true }).click({ trial: true })
    await dialog.getByRole('button', { name: 'Back', exact: true }).click()
    await expect(dialog).toBeHidden()
  }
})
