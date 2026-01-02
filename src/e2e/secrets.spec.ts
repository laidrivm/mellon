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
 * Complete onboarding to set up a user and get to the main screen
 */
async function setupAuthenticatedUser(page: Page): Promise<void> {
  // Wait for initial form to be ready
  await expect(
    page.getByRole('heading', {name: 'Add a New Secret'})
  ).toBeVisible()

  // Step 1: Add first secret
  await page.getByPlaceholder('Secret Name').fill('Initial Secret')
  await page.getByPlaceholder('Username').fill('initial@test.com')
  await page.getByPlaceholder('Password').fill('InitialPass123!')
  await page.getByRole('button', {name: 'Add a Secret'}).click()

  // Step 2: Set master password
  await expect(
    page.getByRole('heading', {name: 'Set Master Password'})
  ).toBeVisible({timeout: 10000})
  await page.getByPlaceholder('Password').fill(TEST_MASTER_PASSWORD)
  await page.getByRole('button', {name: 'Set Master Password'}).click()

  // Step 3: Continue through recovery (wait for words to load)
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

test.describe('Secret Management', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/')
    await clearAppData(page)
    await page.reload()
    await setupAuthenticatedUser(page)
  })

  test('should display stored secrets list', async ({page}) => {
    await expect(
      page.getByRole('heading', {name: 'Stored Secrets'})
    ).toBeVisible()
    await expect(page.getByText('Initial Secret')).toBeVisible()
  })

  test('should show Add New button', async ({page}) => {
    await expect(page.getByRole('button', {name: 'Add New'})).toBeVisible()
  })

  test('should open secret form when clicking Add New', async ({page}) => {
    await page.getByRole('button', {name: 'Add New'}).click()

    await expect(
      page.getByRole('heading', {name: 'Add a New Secret'})
    ).toBeVisible()
    await expect(page.getByPlaceholder('Secret Name')).toBeVisible()
    await expect(page.getByPlaceholder('Username')).toBeVisible()
    await expect(page.getByPlaceholder('Password')).toBeVisible()
    await expect(page.getByPlaceholder('Notes')).toBeVisible()
  })

  test('should add a new secret', async ({page}) => {
    // Open add form
    await page.getByRole('button', {name: 'Add New'}).click()

    // Fill in new secret
    await page.getByPlaceholder('Secret Name').fill('My New Secret')
    await page.getByPlaceholder('Username').fill('newuser@test.com')
    await page.getByPlaceholder('Password').fill('NewSecretPass!')
    await page.getByPlaceholder('Notes').fill('Some notes about this secret')

    // Submit
    await page.getByRole('button', {name: 'Add a Secret'}).click()

    // Should show the new secret in the list
    await expect(page.getByText('My New Secret')).toBeVisible()
  })

  test('should hide form when clicking Clear and hide', async ({page}) => {
    // Open add form
    await page.getByRole('button', {name: 'Add New'}).click()

    // Form should be visible
    await expect(
      page.getByRole('heading', {name: 'Add a New Secret'})
    ).toBeVisible()

    // Click cancel
    await page.getByRole('button', {name: 'Clear and hide'}).click()

    // Form should be hidden
    await expect(
      page.getByRole('heading', {name: 'Add a New Secret'})
    ).not.toBeVisible()
  })

  test('should expand secret details when clicking on secret name', async ({
    page
  }) => {
    // Click on the secret to expand it
    await page.getByText('Initial Secret').click()

    // Should show details
    await expect(page.getByText('Username: initial@test.com')).toBeVisible()
    await expect(page.getByText('Password:')).toBeVisible()
  })

  test('should collapse secret details when clicking again', async ({page}) => {
    // Expand
    await page.getByText('Initial Secret').click()
    await expect(page.getByText('Username: initial@test.com')).toBeVisible()

    // Collapse
    await page.getByText('Initial Secret').click()
    await expect(page.getByText('Username: initial@test.com')).not.toBeVisible()
  })

  test('should show password as asterisks by default', async ({page}) => {
    // Expand the secret
    await page.getByText('Initial Secret').click()

    // Password should be hidden (shown as asterisks)
    const passwordText = await page
      .locator('text=Password:')
      .locator('..')
      .textContent()
    expect(passwordText).toContain('*')
    expect(passwordText).not.toContain('InitialPass123!')
  })

  test('should toggle password visibility with Show/Hide button', async ({
    page
  }) => {
    // Expand the secret
    await page.getByText('Initial Secret').click()

    // Click Show to reveal password
    await page.getByRole('button', {name: 'Show'}).first().click()

    // Password should now be visible
    await expect(page.getByText('InitialPass123!')).toBeVisible()

    // Click Hide to conceal password
    await page.getByRole('button', {name: 'Hide'}).first().click()

    // Password should be hidden again
    await expect(page.getByText('InitialPass123!')).not.toBeVisible()
  })

  test('should have copy password button', async ({page}) => {
    // Expand the secret
    await page.getByText('Initial Secret').click()

    // Copy button should be visible (use exact to avoid matching "Copy All")
    await expect(
      page.getByRole('button', {name: 'Copy', exact: true})
    ).toBeVisible()
  })

  test('should copy password to clipboard', async ({page, context}) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])

    // Expand the secret
    await page.getByText('Initial Secret').click()

    // Click copy
    await page.getByRole('button', {name: 'Copy'}).first().click()

    // Should show copied confirmation (button shows "Done")
    await expect(page.getByText('Done')).toBeVisible()

    // Verify clipboard content
    const clipboardContent = await page.evaluate(() =>
      navigator.clipboard.readText()
    )
    expect(clipboardContent).toBe('InitialPass123!')
  })

  test('should have Update button in expanded secret', async ({page}) => {
    // Expand the secret
    await page.getByText('Initial Secret').click()

    // Update button should be visible
    await expect(page.getByRole('button', {name: 'Update'})).toBeVisible()
  })

  test('should have Copy All button in expanded secret', async ({page}) => {
    // Expand the secret
    await page.getByText('Initial Secret').click()

    // Copy All button should be visible
    await expect(page.getByRole('button', {name: 'Copy All'})).toBeVisible()
  })

  test('should have Delete button in expanded secret', async ({page}) => {
    // Expand the secret
    await page.getByText('Initial Secret').click()

    // Delete button should be visible
    await expect(page.getByRole('button', {name: 'Delete'})).toBeVisible()
  })

  test('should delete secret with confirmation', async ({page}) => {
    // Expand the secret
    await page.getByText('Initial Secret').click()

    // Click delete
    await page.getByRole('button', {name: 'Delete'}).click()

    // Should show confirmation
    await expect(page.getByRole('button', {name: 'Confirm'})).toBeVisible()

    // Confirm deletion - starts countdown
    await page.getByRole('button', {name: 'Confirm'}).click()

    // Should show Undo button during countdown
    await expect(page.getByRole('button', {name: 'Undo'})).toBeVisible()

    // Wait for countdown to complete (5 seconds + buffer)
    await page.waitForTimeout(6000)

    // Secret should be removed
    await expect(page.getByText('Initial Secret')).not.toBeVisible()

    // Should show empty state
    await expect(page.getByText('No stored secrets yet')).toBeVisible()
  })

  test('should cancel delete when not confirming', async ({page}) => {
    // Expand the secret
    await page.getByText('Initial Secret').click()

    // Click delete
    await page.getByRole('button', {name: 'Delete'}).click()

    // Should show confirmation with Cancel button
    await expect(page.getByRole('button', {name: 'Confirm'})).toBeVisible()
    await expect(page.getByRole('button', {name: 'Cancel'})).toBeVisible()

    // Click Cancel to abort deletion
    await page.getByRole('button', {name: 'Cancel'}).click()

    // Delete button should be back
    await expect(page.getByRole('button', {name: 'Delete'})).toBeVisible()

    // Secret should still exist
    await expect(page.getByText('Initial Secret')).toBeVisible()
  })

  test('should show empty state when no secrets', async ({page}) => {
    // Delete the initial secret
    await page.getByText('Initial Secret').click()
    await page.getByRole('button', {name: 'Delete'}).click()
    await page.getByRole('button', {name: 'Confirm'}).click()

    // Wait for countdown to complete
    await page.waitForTimeout(6000)

    // Should show empty message
    await expect(page.getByText('No stored secrets yet')).toBeVisible()
  })

  test('should add multiple secrets', async ({page}) => {
    // Add second secret
    await page.getByRole('button', {name: 'Add New'}).click()
    await page.getByPlaceholder('Secret Name').fill('Second Secret')
    await page.getByPlaceholder('Password').fill('Pass2!')
    await page.getByRole('button', {name: 'Add a Secret'}).click()

    // Add third secret
    await page.getByRole('button', {name: 'Add New'}).click()
    await page.getByPlaceholder('Secret Name').fill('Third Secret')
    await page.getByPlaceholder('Password').fill('Pass3!')
    await page.getByRole('button', {name: 'Add a Secret'}).click()

    // All secrets should be visible
    await expect(page.getByText('Initial Secret')).toBeVisible()
    await expect(page.getByText('Second Secret')).toBeVisible()
    await expect(page.getByText('Third Secret')).toBeVisible()
  })

  test('should display notes when secret has notes', async ({page}) => {
    // Add secret with notes
    await page.getByRole('button', {name: 'Add New'}).click()
    await page.getByPlaceholder('Secret Name').fill('Secret With Notes')
    await page.getByPlaceholder('Password').fill('NotesPass!')
    await page.getByPlaceholder('Notes').fill('These are my important notes')
    await page.getByRole('button', {name: 'Add a Secret'}).click()

    // Expand the secret
    await page.getByText('Secret With Notes').click()

    // Notes should be displayed
    await expect(page.getByText('Notes:')).toBeVisible()
    await expect(page.getByText('These are my important notes')).toBeVisible()
  })

  test('should persist secrets after page reload', async ({page}) => {
    // Add a new secret
    await page.getByRole('button', {name: 'Add New'}).click()
    await page.getByPlaceholder('Secret Name').fill('Persistent Secret')
    await page.getByPlaceholder('Password').fill('PersistPass!')
    await page.getByRole('button', {name: 'Add a Secret'}).click()

    // Verify it's visible
    await expect(page.getByText('Persistent Secret')).toBeVisible()

    // Reload the page
    await page.reload()

    // Should show unlock form
    await page.getByPlaceholder('Password').fill(TEST_MASTER_PASSWORD)
    await page.getByRole('button', {name: 'Unlock'}).click()

    // Secrets should still be there
    await expect(page.getByText('Initial Secret')).toBeVisible()
    await expect(page.getByText('Persistent Secret')).toBeVisible()
  })
})
