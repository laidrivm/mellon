import {expect, type Page, test} from '@playwright/test'

const TEST_MASTER_PASSWORD = 'MasterPassword123!'

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
 * Complete onboarding and capture recovery words
 */
async function setupUserAndGetRecoveryWords(page: Page): Promise<string[]> {
  // Wait for initial form to be ready
  await expect(
    page.getByRole('heading', {name: 'Add a New Secret'})
  ).toBeVisible()

  // Step 1: Add first secret
  await page.getByPlaceholder('Password').fill('SecretPass123!')
  await page.getByRole('button', {name: 'Add a Secret'}).click()

  // Step 2: Set master password
  await expect(
    page.getByRole('heading', {name: 'Set Master Password'})
  ).toBeVisible({timeout: 10000})
  await page.getByPlaceholder('Password').fill(TEST_MASTER_PASSWORD)
  await page.getByRole('button', {name: 'Set Master Password'}).click()

  // Step 3: Capture recovery words
  await expect(
    page.getByRole('heading', {name: 'Backup Your Recovery Words'})
  ).toBeVisible()

  // Wait for recovery words to load
  await expect(page.locator('ol li').first()).toBeVisible()

  // Get recovery words from the list
  const recoveryWords = await page.locator('ol li').allTextContents()

  // Continue through onboarding
  await page.getByRole('button', {name: 'Continue'}).click()

  // Complete signup
  await page.getByPlaceholder('Email').fill('test@example.com')
  await page.getByRole('button', {name: 'Sign Up'}).click()

  await page.getByPlaceholder('Code').fill('123456')
  await page.getByRole('button', {name: 'Verify'}).click()

  await expect(
    page.getByRole('heading', {name: 'Stored Secrets'})
  ).toBeVisible()

  return recoveryWords
}

test.describe('Recovery Flow', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/')
    await clearAppData(page)
    await page.reload()
  })

  test('should display recovery form when clicking Recover', async ({page}) => {
    await setupUserAndGetRecoveryWords(page)
    await page.reload()

    // Click recover button on unlock form
    await page.getByRole('button', {name: 'Recover'}).click()

    // Should show recovery form
    await expect(
      page.getByRole('heading', {name: 'Recover Your Password'})
    ).toBeVisible()
    await expect(page.getByText('Enter your recovery words')).toBeVisible()
    await expect(page.getByLabel('Recovery Words')).toBeVisible()
  })

  test('should have Cancel and Recover Password buttons', async ({page}) => {
    await setupUserAndGetRecoveryWords(page)
    await page.reload()

    await page.getByRole('button', {name: 'Recover'}).click()

    await expect(page.getByRole('button', {name: 'Cancel'})).toBeVisible()
    await expect(
      page.getByRole('button', {name: 'Recover Password'})
    ).toBeVisible()
  })

  test('should return to unlock form when clicking Cancel', async ({page}) => {
    await setupUserAndGetRecoveryWords(page)
    await page.reload()

    await page.getByRole('button', {name: 'Recover'}).click()
    await expect(
      page.getByRole('heading', {name: 'Recover Your Password'})
    ).toBeVisible()

    // Cancel
    await page.getByRole('button', {name: 'Cancel'}).click()

    // Should be back on unlock form
    await expect(
      page.getByRole('heading', {name: 'Speak Friend and Enter'})
    ).toBeVisible()
  })

  test('should show validation error for empty recovery words', async ({
    page
  }) => {
    await setupUserAndGetRecoveryWords(page)
    await page.reload()

    await page.getByRole('button', {name: 'Recover'}).click()

    // Submit empty form
    await page.getByRole('button', {name: 'Recover Password'}).click()

    // Should show validation error
    await expect(
      page.getByText('Please enter at least one recovery share')
    ).toBeVisible()
  })

  test('should show validation error for short words', async ({page}) => {
    await setupUserAndGetRecoveryWords(page)
    await page.reload()

    await page.getByRole('button', {name: 'Recover'}).click()

    // Enter invalid words
    await page.getByLabel('Recovery Words').fill('ab cd')

    await page.getByRole('button', {name: 'Recover Password'}).click()

    // Should show validation error
    await expect(page.getByText('Validation Errors')).toBeVisible()
  })

  test('should show validation error for words with numbers', async ({
    page
  }) => {
    await setupUserAndGetRecoveryWords(page)
    await page.reload()

    await page.getByRole('button', {name: 'Recover'}).click()

    // Enter words with numbers
    await page.getByLabel('Recovery Words').fill('word1 word2 word3')

    await page.getByRole('button', {name: 'Recover Password'}).click()

    // Should show validation error about invalid words
    await expect(page.getByText('Validation Errors')).toBeVisible()
  })

  test('should accept valid recovery words format', async ({page}) => {
    await setupUserAndGetRecoveryWords(page)
    await page.reload()

    await page.getByRole('button', {name: 'Recover'}).click()

    // Enter valid format (at least 3 words with only letters)
    await page.getByLabel('Recovery Words').fill('apple banana cherry')

    await page.getByRole('button', {name: 'Recover Password'}).click()

    // Should attempt recovery (may fail with invalid words but validation passes)
    // Looking for either success or "Invalid recovery words" message (not validation error)
    const validationErrors = page.getByText('Validation Errors')
    await expect(validationErrors).not.toBeVisible()
  })

  test('should recover access with correct recovery words', async ({page}) => {
    const recoveryWords = await setupUserAndGetRecoveryWords(page)
    await page.reload()

    // Navigate to recovery form
    await page.getByRole('button', {name: 'Recover'}).click()

    // Enter the actual recovery words (joined by newlines for multiple shares)
    await page.getByLabel('Recovery Words').fill(recoveryWords.join('\n'))

    await page.getByRole('button', {name: 'Recover Password'}).click()

    // Should successfully recover and show stored secrets
    await expect(
      page.getByRole('heading', {name: 'Stored Secrets'})
    ).toBeVisible()
  })

  test('should show error for incorrect recovery words', async ({page}) => {
    await setupUserAndGetRecoveryWords(page)
    await page.reload()

    await page.getByRole('button', {name: 'Recover'}).click()

    // Enter wrong recovery words (valid format but wrong)
    await page
      .getByLabel('Recovery Words')
      .fill(
        'wrong words here that are not valid\nmore wrong words for another share'
      )

    await page.getByRole('button', {name: 'Recover Password'}).click()

    // Should show error
    await expect(page.getByText('Invalid recovery words')).toBeVisible()
  })

  test('should show recovery words during onboarding', async ({page}) => {
    // Wait for initial form to be ready
    await expect(
      page.getByRole('heading', {name: 'Add a New Secret'})
    ).toBeVisible()

    // Add first secret
    await page.getByPlaceholder('Password').fill('SecretPass123!')
    await page.getByRole('button', {name: 'Add a Secret'}).click()

    // Wait for master password form
    await expect(
      page.getByRole('heading', {name: 'Set Master Password'})
    ).toBeVisible({timeout: 10000})
    await page.getByPlaceholder('Password').fill(TEST_MASTER_PASSWORD)
    await page.getByRole('button', {name: 'Set Master Password'}).click()

    // Should show recovery display
    await expect(
      page.getByRole('heading', {name: 'Backup Your Recovery Words'})
    ).toBeVisible({timeout: 10000})

    // Wait for recovery words to load
    await expect(page.locator('ol li').first()).toBeVisible()

    // Should have recovery words list
    const words = await page.locator('ol li').allTextContents()
    expect(words.length).toBeGreaterThan(0)

    // Should show storage best practices
    await expect(page.getByText('Storage Best Practicies')).toBeVisible()
    await expect(
      page.getByText('Store these words in a secure, offline location')
    ).toBeVisible()
  })
})
