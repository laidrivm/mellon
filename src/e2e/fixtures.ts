import {test as base, expect, type Page} from '@playwright/test'

export const TEST_MASTER_PASSWORD = 'MasterPassword123!'
export const TEST_PASSWORD_HINT = 'My test hint'
export const TEST_EMAIL = 'test@example.com'
export const INITIAL_SECRET_NAME = 'Initial Secret'
export const INITIAL_SECRET_USERNAME = 'initial@test.com'
export const INITIAL_SECRET_PASSWORD = 'InitialPass123!'

async function clearIndexedDb(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const databases = await indexedDB.databases()
    for (const db of databases) {
      if (db.name) indexedDB.deleteDatabase(db.name)
    }
  })
}

// E2E tests run without the email microservice. Stub both auth endpoints so
// the UI flow doesn't depend on a live Resend connection.
async function mockEmailAuthRoutes(page: Page): Promise<void> {
  await page.route('**/api/auth/email/request', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({success: true})
    })
  )
  await page.route('**/api/auth/email/verify', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({success: true, userId: 'test-user-id'})
    })
  )
}

async function completeOnboarding(page: Page): Promise<string[]> {
  await expect(
    page.getByRole('heading', {name: 'Add a New Secret'})
  ).toBeVisible()

  await page.getByPlaceholder('Secret Name').fill(INITIAL_SECRET_NAME)
  await page.getByPlaceholder('Username').fill(INITIAL_SECRET_USERNAME)
  await page.getByPlaceholder('Password').fill(INITIAL_SECRET_PASSWORD)
  await page.getByRole('button', {name: 'Add a Secret'}).click()

  await expect(
    page.getByRole('heading', {name: 'Set Master Password'})
  ).toBeVisible({timeout: 10000})
  await page.getByPlaceholder('Password').fill(TEST_MASTER_PASSWORD)
  await page.getByPlaceholder('Hint').fill(TEST_PASSWORD_HINT)
  await page.getByRole('button', {name: 'Set Master Password'}).click()

  await expect(
    page.getByRole('heading', {name: 'Backup Your Recovery Words'})
  ).toBeVisible({timeout: 10000})
  await expect(page.locator('ol li').first()).toBeVisible()
  const recoveryWords = await page.locator('ol li').allTextContents()

  await page.getByRole('button', {name: 'Continue'}).click()

  await page.getByPlaceholder('Email').fill(TEST_EMAIL)
  await page.getByRole('button', {name: 'Sign Up'}).click()

  await page.getByPlaceholder('Code').fill('123456')
  await page.getByRole('button', {name: 'Verify'}).click()

  await expect(
    page.getByRole('heading', {name: 'Stored Secrets'})
  ).toBeVisible()

  return recoveryWords
}

interface Fixtures {
  clearedPage: Page
  authenticatedPage: {page: Page; recoveryWords: string[]}
}

export const test = base.extend<Fixtures>({
  page: async ({page}, use) => {
    await mockEmailAuthRoutes(page)
    await use(page)
  },
  clearedPage: async ({page}, use) => {
    await page.goto('/')
    await clearIndexedDb(page)
    await page.reload()
    await use(page)
  },
  authenticatedPage: async ({clearedPage}, use) => {
    const recoveryWords = await completeOnboarding(clearedPage)
    await use({page: clearedPage, recoveryWords})
  }
})

export {expect}
