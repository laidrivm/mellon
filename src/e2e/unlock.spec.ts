import {
  expect,
  TEST_MASTER_PASSWORD,
  TEST_PASSWORD_HINT,
  test
} from './fixtures.ts'

test.describe('Unlock Form', () => {
  test('should show unlock form after page reload', async ({
    authenticatedPage: {page}
  }) => {
    await page.reload()

    await expect(
      page.getByRole('heading', {name: 'Speak Friend and Enter'})
    ).toBeVisible()
    await expect(
      page.getByText('Unlock secrets with your master password')
    ).toBeVisible()
  })

  test('should unlock with correct master password', async ({
    authenticatedPage: {page}
  }) => {
    await page.reload()

    await page.getByPlaceholder('Password').fill(TEST_MASTER_PASSWORD)
    await page.getByRole('button', {name: 'Unlock'}).click()

    await expect(
      page.getByRole('heading', {name: 'Stored Secrets'})
    ).toBeVisible()
  })

  test('should show error for incorrect master password', async ({
    authenticatedPage: {page}
  }) => {
    await page.reload()

    await page.getByPlaceholder('Password').fill('WrongPassword!')
    await page.getByRole('button', {name: 'Unlock'}).click()

    await expect(page.getByText('Invalid master password')).toBeVisible()
    await expect(
      page.getByRole('heading', {name: 'Speak Friend and Enter'})
    ).toBeVisible()
  })

  test('should require password to unlock', async ({
    authenticatedPage: {page}
  }) => {
    await page.reload()

    await page.getByRole('button', {name: 'Unlock'}).click()

    await expect(page.getByText('Password is required')).toBeVisible()
  })

  test('should show password hint when clicking Hint button', async ({
    authenticatedPage: {page}
  }) => {
    await page.reload()

    await page.getByRole('button', {name: 'Hint'}).click()

    await expect(page.getByText(`Hint: ${TEST_PASSWORD_HINT}`)).toBeVisible()
  })

  test('should toggle hint visibility', async ({authenticatedPage: {page}}) => {
    await page.reload()

    await page.getByRole('button', {name: 'Hint'}).click()
    await expect(page.getByText(`Hint: ${TEST_PASSWORD_HINT}`)).toBeVisible()

    await page.getByRole('button', {name: 'Hint'}).click()
    await expect(
      page.getByText(`Hint: ${TEST_PASSWORD_HINT}`)
    ).not.toBeVisible()
  })

  test('should navigate to recovery form when clicking Recover', async ({
    authenticatedPage: {page}
  }) => {
    await page.reload()

    await page.getByRole('button', {name: 'Recover'}).click()

    await expect(
      page.getByRole('heading', {name: 'Recover Your Password'})
    ).toBeVisible()
    await expect(page.getByText('Enter your 12 recovery words')).toBeVisible()
  })

  test('should have Hint, Recover, and Unlock buttons', async ({
    authenticatedPage: {page}
  }) => {
    await page.reload()

    await expect(page.getByRole('button', {name: 'Hint'})).toBeVisible()
    await expect(page.getByRole('button', {name: 'Recover'})).toBeVisible()
    await expect(page.getByRole('button', {name: 'Unlock'})).toBeVisible()
  })
})
