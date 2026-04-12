import {expect, TEST_MASTER_PASSWORD, test} from './fixtures.ts'

test.describe('Secret Management', () => {
  test('should display stored secrets list', async ({
    authenticatedPage: {page}
  }) => {
    await expect(
      page.getByRole('heading', {name: 'Stored Secrets'})
    ).toBeVisible()
    await expect(page.getByText('Initial Secret')).toBeVisible()
  })

  test('should show Add New button', async ({authenticatedPage: {page}}) => {
    await expect(page.getByRole('button', {name: 'Add New'})).toBeVisible()
  })

  test('should open secret form when clicking Add New', async ({
    authenticatedPage: {page}
  }) => {
    await page.getByRole('button', {name: 'Add New'}).click()

    await expect(
      page.getByRole('heading', {name: 'Add a New Secret'})
    ).toBeVisible()
    await expect(page.getByPlaceholder('Secret Name')).toBeVisible()
    await expect(page.getByPlaceholder('Username')).toBeVisible()
    await expect(page.getByPlaceholder('Password')).toBeVisible()
    await expect(page.getByPlaceholder('Notes')).toBeVisible()
  })

  test('should add a new secret', async ({authenticatedPage: {page}}) => {
    await page.getByRole('button', {name: 'Add New'}).click()

    await page.getByPlaceholder('Secret Name').fill('My New Secret')
    await page.getByPlaceholder('Username').fill('newuser@test.com')
    await page.getByPlaceholder('Password').fill('NewSecretPass!')
    await page.getByPlaceholder('Notes').fill('Some notes about this secret')

    await page.getByRole('button', {name: 'Add a Secret'}).click()

    await expect(page.getByText('My New Secret')).toBeVisible()
  })

  test('should hide form when clicking Clear and hide', async ({
    authenticatedPage: {page}
  }) => {
    await page.getByRole('button', {name: 'Add New'}).click()

    await expect(
      page.getByRole('heading', {name: 'Add a New Secret'})
    ).toBeVisible()

    await page.getByRole('button', {name: 'Clear and hide'}).click()

    await expect(
      page.getByRole('heading', {name: 'Add a New Secret'})
    ).not.toBeVisible()
  })

  test('should expand secret details when clicking on secret name', async ({
    authenticatedPage: {page}
  }) => {
    await page.getByText('Initial Secret').click()

    await expect(page.getByText('Username: initial@test.com')).toBeVisible()
    await expect(page.getByText('Password:')).toBeVisible()
  })

  test('should collapse secret details when clicking again', async ({
    authenticatedPage: {page}
  }) => {
    await page.getByText('Initial Secret').click()
    await expect(page.getByText('Username: initial@test.com')).toBeVisible()

    await page.getByText('Initial Secret').click()
    await expect(page.getByText('Username: initial@test.com')).not.toBeVisible()
  })

  test('should show password as asterisks by default', async ({
    authenticatedPage: {page}
  }) => {
    await page.getByText('Initial Secret').click()

    const passwordText = await page
      .locator('text=Password:')
      .locator('..')
      .textContent()
    expect(passwordText).toContain('*')
    expect(passwordText).not.toContain('InitialPass123!')
  })

  test('should toggle password visibility with Show/Hide button', async ({
    authenticatedPage: {page}
  }) => {
    await page.getByText('Initial Secret').click()

    await page.getByRole('button', {name: 'Show'}).first().click()
    await expect(page.getByText('InitialPass123!')).toBeVisible()

    await page.getByRole('button', {name: 'Hide'}).first().click()
    await expect(page.getByText('InitialPass123!')).not.toBeVisible()
  })

  test('should have copy password button', async ({
    authenticatedPage: {page}
  }) => {
    await page.getByText('Initial Secret').click()

    await expect(
      page.getByRole('button', {name: 'Copy', exact: true})
    ).toBeVisible()
  })

  test('should copy password to clipboard', async ({
    authenticatedPage: {page},
    context
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])

    await page.getByText('Initial Secret').click()
    await page.getByRole('button', {name: 'Copy'}).first().click()

    await expect(page.getByText('Done')).toBeVisible()

    const clipboardContent = await page.evaluate(() =>
      navigator.clipboard.readText()
    )
    expect(clipboardContent).toBe('InitialPass123!')
  })

  test('should have Update button in expanded secret', async ({
    authenticatedPage: {page}
  }) => {
    await page.getByText('Initial Secret').click()

    await expect(page.getByRole('button', {name: 'Update'})).toBeVisible()
  })

  test('should have Copy All button in expanded secret', async ({
    authenticatedPage: {page}
  }) => {
    await page.getByText('Initial Secret').click()

    await expect(page.getByRole('button', {name: 'Copy All'})).toBeVisible()
  })

  test('should have Delete button in expanded secret', async ({
    authenticatedPage: {page}
  }) => {
    await page.getByText('Initial Secret').click()

    await expect(page.getByRole('button', {name: 'Delete'})).toBeVisible()
  })

  test('should delete secret with confirmation', async ({
    authenticatedPage: {page}
  }) => {
    await page.getByText('Initial Secret').click()
    await page.getByRole('button', {name: 'Delete'}).click()

    await expect(page.getByRole('button', {name: 'Confirm'})).toBeVisible()

    await page.getByRole('button', {name: 'Confirm'}).click()

    await expect(page.getByRole('button', {name: 'Undo'})).toBeVisible()

    await page.waitForTimeout(6000)

    await expect(page.getByText('Initial Secret')).not.toBeVisible()
    await expect(page.getByText('No stored secrets yet')).toBeVisible()
  })

  test('should cancel delete when not confirming', async ({
    authenticatedPage: {page}
  }) => {
    await page.getByText('Initial Secret').click()
    await page.getByRole('button', {name: 'Delete'}).click()

    await expect(page.getByRole('button', {name: 'Confirm'})).toBeVisible()
    await expect(page.getByRole('button', {name: 'Cancel'})).toBeVisible()

    await page.getByRole('button', {name: 'Cancel'}).click()

    await expect(page.getByRole('button', {name: 'Delete'})).toBeVisible()
    await expect(page.getByText('Initial Secret')).toBeVisible()
  })

  test('should show empty state when no secrets', async ({
    authenticatedPage: {page}
  }) => {
    await page.getByText('Initial Secret').click()
    await page.getByRole('button', {name: 'Delete'}).click()
    await page.getByRole('button', {name: 'Confirm'}).click()

    await page.waitForTimeout(6000)

    await expect(page.getByText('No stored secrets yet')).toBeVisible()
  })

  test('should add multiple secrets', async ({authenticatedPage: {page}}) => {
    await page.getByRole('button', {name: 'Add New'}).click()
    await page.getByPlaceholder('Secret Name').fill('Second Secret')
    await page.getByPlaceholder('Password').fill('Pass2!')
    await page.getByRole('button', {name: 'Add a Secret'}).click()

    await page.getByRole('button', {name: 'Add New'}).click()
    await page.getByPlaceholder('Secret Name').fill('Third Secret')
    await page.getByPlaceholder('Password').fill('Pass3!')
    await page.getByRole('button', {name: 'Add a Secret'}).click()

    await expect(page.getByText('Initial Secret')).toBeVisible()
    await expect(page.getByText('Second Secret')).toBeVisible()
    await expect(page.getByText('Third Secret')).toBeVisible()
  })

  test('should display notes when secret has notes', async ({
    authenticatedPage: {page}
  }) => {
    await page.getByRole('button', {name: 'Add New'}).click()
    await page.getByPlaceholder('Secret Name').fill('Secret With Notes')
    await page.getByPlaceholder('Password').fill('NotesPass!')
    await page.getByPlaceholder('Notes').fill('These are my important notes')
    await page.getByRole('button', {name: 'Add a Secret'}).click()

    await page.getByText('Secret With Notes').click()

    await expect(page.getByText('Notes:')).toBeVisible()
    await expect(page.getByText('These are my important notes')).toBeVisible()
  })

  test('should persist secrets after page reload', async ({
    authenticatedPage: {page}
  }) => {
    await page.getByRole('button', {name: 'Add New'}).click()
    await page.getByPlaceholder('Secret Name').fill('Persistent Secret')
    await page.getByPlaceholder('Password').fill('PersistPass!')
    await page.getByRole('button', {name: 'Add a Secret'}).click()

    await expect(page.getByText('Persistent Secret')).toBeVisible()

    await page.reload()

    await page.getByPlaceholder('Password').fill(TEST_MASTER_PASSWORD)
    await page.getByRole('button', {name: 'Unlock'}).click()

    await expect(page.getByText('Initial Secret')).toBeVisible()
    await expect(page.getByText('Persistent Secret')).toBeVisible()
  })
})
