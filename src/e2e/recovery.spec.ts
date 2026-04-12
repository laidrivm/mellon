import {expect, TEST_MASTER_PASSWORD, test} from './fixtures.ts'

test.describe('Recovery Flow', () => {
  test('should display recovery form when clicking Recover', async ({
    authenticatedPage: {page}
  }) => {
    await page.reload()

    await page.getByRole('button', {name: 'Recover'}).click()

    await expect(
      page.getByRole('heading', {name: 'Recover Your Password'})
    ).toBeVisible()
    await expect(page.getByText('Enter your recovery words')).toBeVisible()
    await expect(page.getByLabel('Recovery Words')).toBeVisible()
  })

  test('should have Cancel and Recover Password buttons', async ({
    authenticatedPage: {page}
  }) => {
    await page.reload()

    await page.getByRole('button', {name: 'Recover'}).click()

    await expect(page.getByRole('button', {name: 'Cancel'})).toBeVisible()
    await expect(
      page.getByRole('button', {name: 'Recover Password'})
    ).toBeVisible()
  })

  test('should return to unlock form when clicking Cancel', async ({
    authenticatedPage: {page}
  }) => {
    await page.reload()

    await page.getByRole('button', {name: 'Recover'}).click()
    await expect(
      page.getByRole('heading', {name: 'Recover Your Password'})
    ).toBeVisible()

    await page.getByRole('button', {name: 'Cancel'}).click()

    await expect(
      page.getByRole('heading', {name: 'Speak Friend and Enter'})
    ).toBeVisible()
  })

  test('should show validation error for empty recovery words', async ({
    authenticatedPage: {page}
  }) => {
    await page.reload()

    await page.getByRole('button', {name: 'Recover'}).click()
    await page.getByRole('button', {name: 'Recover Password'}).click()

    await expect(
      page.getByText('Please enter at least one recovery share')
    ).toBeVisible()
  })

  test('should show validation error for short words', async ({
    authenticatedPage: {page}
  }) => {
    await page.reload()

    await page.getByRole('button', {name: 'Recover'}).click()
    await page.getByLabel('Recovery Words').fill('ab cd')
    await page.getByRole('button', {name: 'Recover Password'}).click()

    await expect(page.getByText('Validation Errors')).toBeVisible()
  })

  test('should show validation error for words with numbers', async ({
    authenticatedPage: {page}
  }) => {
    await page.reload()

    await page.getByRole('button', {name: 'Recover'}).click()
    await page.getByLabel('Recovery Words').fill('word1 word2 word3')
    await page.getByRole('button', {name: 'Recover Password'}).click()

    await expect(page.getByText('Validation Errors')).toBeVisible()
  })

  test('should accept valid recovery words format', async ({
    authenticatedPage: {page}
  }) => {
    await page.reload()

    await page.getByRole('button', {name: 'Recover'}).click()
    await page.getByLabel('Recovery Words').fill('apple banana cherry')
    await page.getByRole('button', {name: 'Recover Password'}).click()

    const validationErrors = page.getByText('Validation Errors')
    await expect(validationErrors).not.toBeVisible()
  })

  test('should recover access with correct recovery words', async ({
    authenticatedPage: {page, recoveryWords}
  }) => {
    await page.reload()

    await page.getByRole('button', {name: 'Recover'}).click()
    await page.getByLabel('Recovery Words').fill(recoveryWords.join('\n'))
    await page.getByRole('button', {name: 'Recover Password'}).click()

    await expect(
      page.getByRole('heading', {name: 'Stored Secrets'})
    ).toBeVisible()
  })

  test('should show error for incorrect recovery words', async ({
    authenticatedPage: {page}
  }) => {
    await page.reload()

    await page.getByRole('button', {name: 'Recover'}).click()
    await page
      .getByLabel('Recovery Words')
      .fill(
        'wrong words here that are not valid\nmore wrong words for another share'
      )
    await page.getByRole('button', {name: 'Recover Password'}).click()

    await expect(page.getByText('Invalid recovery words')).toBeVisible()
  })

  test('should show recovery words during onboarding', async ({
    clearedPage: page
  }) => {
    await expect(
      page.getByRole('heading', {name: 'Add a New Secret'})
    ).toBeVisible()

    await page.getByPlaceholder('Password').fill('SecretPass123!')
    await page.getByRole('button', {name: 'Add a Secret'}).click()

    await expect(
      page.getByRole('heading', {name: 'Set Master Password'})
    ).toBeVisible({timeout: 10000})
    await page.getByPlaceholder('Password').fill(TEST_MASTER_PASSWORD)
    await page.getByRole('button', {name: 'Set Master Password'}).click()

    await expect(
      page.getByRole('heading', {name: 'Backup Your Recovery Words'})
    ).toBeVisible({timeout: 10000})

    await expect(page.locator('ol li').first()).toBeVisible()
    const words = await page.locator('ol li').allTextContents()
    expect(words.length).toBeGreaterThan(0)

    await expect(page.getByText('Storage Best Practicies')).toBeVisible()
    await expect(
      page.getByText('Store these words in a secure, offline location')
    ).toBeVisible()
  })
})
