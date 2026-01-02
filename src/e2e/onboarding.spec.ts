import {expect, type Page, test} from '@playwright/test'

/**
 * Clear IndexedDB to start fresh for onboarding tests
 */
async function clearAppData(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const databases = await indexedDB.databases()
    for (const db of databases) {
      if (db.name) {
        indexedDB.deleteDatabase(db.name)
      }
    }
  })
}

test.describe('Onboarding Flow', () => {
  test.beforeEach(async ({page}) => {
    // Clear app data before each test to simulate fresh install
    await page.goto('/')
    await clearAppData(page)
    await page.reload()
  })

  test('should show add secret form for new users', async ({page}) => {
    // New users should see the secret form first
    await expect(
      page.getByRole('heading', {name: 'Add a New Secret'})
    ).toBeVisible()
    await expect(
      page.getByText('Secrets are encrypted and stored on your device')
    ).toBeVisible()
  })

  test('should require password when adding first secret', async ({page}) => {
    // Try to submit without password
    await page.getByRole('button', {name: 'Add a Secret'}).click()

    // Should show password required error
    await expect(page.getByText('Password is required')).toBeVisible()
  })

  test('should add first secret and proceed to master password step', async ({
    page
  }) => {
    // Fill in secret details
    await page.getByPlaceholder('Secret Name').fill('My First Secret')
    await page.getByPlaceholder('Username').fill('testuser@example.com')
    await page.getByPlaceholder('Password').fill('SecurePass123!')
    await page.getByPlaceholder('Notes').fill('This is my first secret')

    // Submit the form
    await page.getByRole('button', {name: 'Add a Secret'}).click()

    // Should now show master password form
    await expect(
      page.getByRole('heading', {name: 'Set Master Password'})
    ).toBeVisible()
    await expect(
      page.getByText('Set the master password to hide secrets')
    ).toBeVisible()
  })

  test('should generate password when clicking Generate button', async ({
    page
  }) => {
    // Click generate button
    await page.getByRole('button', {name: 'Generate'}).click()

    // Password field should now have a value
    const passwordInput = page.getByPlaceholder('Password')
    await expect(passwordInput).not.toBeEmpty()

    // Generated password should be 16 characters
    const value = await passwordInput.inputValue()
    expect(value.length).toBe(16)
  })

  test('should complete full onboarding flow', async ({page}) => {
    // Wait for initial form to be ready
    await expect(
      page.getByRole('heading', {name: 'Add a New Secret'})
    ).toBeVisible()

    // Step 1: Add first secret
    await page.getByPlaceholder('Secret Name').fill('Test Secret')
    await page.getByPlaceholder('Username').fill('user@test.com')
    await page.getByPlaceholder('Password').fill('Password123!')
    await page.getByRole('button', {name: 'Add a Secret'}).click()

    // Step 2: Set master password
    await expect(
      page.getByRole('heading', {name: 'Set Master Password'})
    ).toBeVisible({timeout: 10000})
    await page.getByPlaceholder('Password').fill('MasterPass456!')
    await page.getByPlaceholder('Hint').fill('My favorite password')
    await page.getByRole('button', {name: 'Set Master Password'}).click()

    // Step 3: Recovery words display
    await expect(
      page.getByRole('heading', {name: 'Backup Your Recovery Words'})
    ).toBeVisible()
    await expect(
      page.getByRole('heading', {name: 'Recovery Words', exact: true})
    ).toBeVisible()

    // Should show recovery words in a list (wait for words to load)
    const recoveryList = page.locator('ol')
    await expect(recoveryList).toBeVisible()
    await expect(page.locator('ol li').first()).toBeVisible()

    // Verify copy functionality exists
    await expect(page.getByRole('button', {name: 'Copy All'})).toBeVisible()

    // Continue to signup
    await page.getByRole('button', {name: 'Continue'}).click()

    // Step 4: Sign up form
    await expect(page.getByRole('heading', {name: 'Sign Up'})).toBeVisible()
    await expect(page.getByText('share secrets across devices')).toBeVisible()

    // Fill email and submit
    await page.getByPlaceholder('Email').fill('user@example.com')
    await page.getByRole('button', {name: 'Sign Up'}).click()

    // Step 5: Code verification
    await expect(
      page.getByRole('heading', {name: 'Verify Email'})
    ).toBeVisible()
    await expect(
      page.getByText('We sent a code to user@example.com')
    ).toBeVisible()

    // Enter verification code
    await page.getByPlaceholder('Code').fill('123456')
    await page.getByRole('button', {name: 'Verify'}).click()

    // Step 6: Finished - should show stored secrets
    await expect(
      page.getByRole('heading', {name: 'Stored Secrets'})
    ).toBeVisible()

    // The secret we added should be visible
    await expect(page.getByText('Test Secret')).toBeVisible()
  })

  test('should copy all recovery words to clipboard', async ({
    page,
    context
  }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])

    // Wait for initial form to be ready
    await expect(
      page.getByRole('heading', {name: 'Add a New Secret'})
    ).toBeVisible()

    // Complete steps to reach recovery display
    await page.getByPlaceholder('Password').fill('TestPassword!')
    await page.getByRole('button', {name: 'Add a Secret'}).click()

    // Wait for master password form
    await expect(
      page.getByRole('heading', {name: 'Set Master Password'})
    ).toBeVisible({timeout: 10000})
    await page.getByPlaceholder('Password').fill('MasterPass!')
    await page.getByRole('button', {name: 'Set Master Password'}).click()

    // Now on recovery display
    await expect(
      page.getByRole('heading', {name: 'Backup Your Recovery Words'})
    ).toBeVisible({timeout: 10000})

    // Wait for recovery words to load
    await expect(page.locator('ol li').first()).toBeVisible()

    // Click copy all
    await page.getByRole('button', {name: 'Copy All'}).click()

    // Button should show "Copied" state
    await expect(page.getByText('Copied')).toBeVisible()
  })

  test('should auto-generate secret name if not provided', async ({page}) => {
    // Only fill password and submit
    await page.getByPlaceholder('Password').fill('OnlyPassword!')
    await page.getByRole('button', {name: 'Add a Secret'}).click()

    // Should proceed to master password (secret was created)
    await expect(
      page.getByRole('heading', {name: 'Set Master Password'})
    ).toBeVisible()
  })
})
