import {expect, type Page, test} from '@playwright/test'

const TEST_MASTER_PASSWORD = 'MasterPassword123!'
const TEST_PASSWORD_HINT = 'My test hint'

/**
 * Clear IndexedDB to start fresh
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

/**
 * Complete onboarding to set up a user with master password
 */
async function setupUserWithMasterPassword(page: Page): Promise<void> {
  // Wait for initial form to be ready
  await expect(
    page.getByRole('heading', {name: 'Add a New Secret'})
  ).toBeVisible()

  // Step 1: Add first secret
  await page.getByPlaceholder('Password').fill('SecretPass123!')
  await page.getByRole('button', {name: 'Add a Secret'}).click()

  // Step 2: Set master password with hint
  await expect(
    page.getByRole('heading', {name: 'Set Master Password'})
  ).toBeVisible({timeout: 10000})
  await page.getByPlaceholder('Password').fill(TEST_MASTER_PASSWORD)
  await page.getByPlaceholder('Hint').fill(TEST_PASSWORD_HINT)
  await page.getByRole('button', {name: 'Set Master Password'}).click()

  // Step 3: Skip through recovery (wait for words to load)
  await expect(
    page.getByRole('heading', {name: 'Backup Your Recovery Words'})
  ).toBeVisible()
  await expect(page.locator('ol li').first()).toBeVisible()
  await page.getByRole('button', {name: 'Continue'}).click()

  // Step 4: Sign up
  await page.getByPlaceholder('Email').fill('test@example.com')
  await page.getByRole('button', {name: 'Sign Up'}).click()

  // Step 5: Verify code
  await page.getByPlaceholder('Code').fill('123456')
  await page.getByRole('button', {name: 'Verify'}).click()

  // Should now be on main screen
  await expect(
    page.getByRole('heading', {name: 'Stored Secrets'})
  ).toBeVisible()
}

test.describe('Unlock Form', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/')
    await clearAppData(page)
    await page.reload()
    await setupUserWithMasterPassword(page)
  })

  test('should show unlock form after page reload', async ({page}) => {
    // Reload page to simulate returning user
    await page.reload()

    // Should see unlock form
    await expect(
      page.getByRole('heading', {name: 'Speak Friend and Enter'})
    ).toBeVisible()
    await expect(
      page.getByText('Unlock secrets with your master password')
    ).toBeVisible()
  })

  test('should unlock with correct master password', async ({page}) => {
    await page.reload()

    // Enter correct password
    await page.getByPlaceholder('Password').fill(TEST_MASTER_PASSWORD)
    await page.getByRole('button', {name: 'Unlock'}).click()

    // Should now see stored secrets
    await expect(
      page.getByRole('heading', {name: 'Stored Secrets'})
    ).toBeVisible()
  })

  test('should show error for incorrect master password', async ({page}) => {
    await page.reload()

    // Enter wrong password
    await page.getByPlaceholder('Password').fill('WrongPassword!')
    await page.getByRole('button', {name: 'Unlock'}).click()

    // Should show error message
    await expect(page.getByText('Invalid master password')).toBeVisible()

    // Should still be on unlock form
    await expect(
      page.getByRole('heading', {name: 'Speak Friend and Enter'})
    ).toBeVisible()
  })

  test('should require password to unlock', async ({page}) => {
    await page.reload()

    // Try to unlock without entering password
    await page.getByRole('button', {name: 'Unlock'}).click()

    // Should show password required error
    await expect(page.getByText('Password is required')).toBeVisible()
  })

  test('should show password hint when clicking Hint button', async ({
    page
  }) => {
    await page.reload()

    // Click hint button
    await page.getByRole('button', {name: 'Hint'}).click()

    // Should display the hint
    await expect(page.getByText(`Hint: ${TEST_PASSWORD_HINT}`)).toBeVisible()
  })

  test('should toggle hint visibility', async ({page}) => {
    await page.reload()

    // Click hint button to show
    await page.getByRole('button', {name: 'Hint'}).click()
    await expect(page.getByText(`Hint: ${TEST_PASSWORD_HINT}`)).toBeVisible()

    // Click again to hide
    await page.getByRole('button', {name: 'Hint'}).click()
    await expect(
      page.getByText(`Hint: ${TEST_PASSWORD_HINT}`)
    ).not.toBeVisible()
  })

  test('should navigate to recovery form when clicking Recover', async ({
    page
  }) => {
    await page.reload()

    // Click recover button
    await page.getByRole('button', {name: 'Recover'}).click()

    // Should show recovery form
    await expect(
      page.getByRole('heading', {name: 'Recover Your Password'})
    ).toBeVisible()
    await expect(page.getByText('Enter your recovery words')).toBeVisible()
  })

  test('should have Hint, Recover, and Unlock buttons', async ({page}) => {
    await page.reload()

    await expect(page.getByRole('button', {name: 'Hint'})).toBeVisible()
    await expect(page.getByRole('button', {name: 'Recover'})).toBeVisible()
    await expect(page.getByRole('button', {name: 'Unlock'})).toBeVisible()
  })
})
