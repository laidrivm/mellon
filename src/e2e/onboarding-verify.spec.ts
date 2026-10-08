import {expect, TEST_MASTER_PASSWORD, test} from './fixtures.ts'

test.describe('Onboarding Flow', () => {
  test('forwards local uuid to verify endpoint and persists verified state', async ({
    clearedPage: page
  }) => {
    interface VerifyBody {
      email?: string
      code?: string
      userId?: string
    }
    const captured: {uuid: string | null; body: VerifyBody | null} = {
      uuid: null,
      body: null
    }

    page.on('response', async (resp) => {
      if (
        resp.url().includes('/api/generate-uuid') &&
        resp.request().method() === 'POST'
      ) {
        const data = (await resp.json().catch(() => null)) as {
          uuid?: string
        } | null
        if (data?.uuid) captured.uuid = data.uuid
      }
    })

    await expect(
      page.getByRole('heading', {name: 'Add a New Secret'})
    ).toBeVisible()
    await page.getByPlaceholder('Secret Name').fill('Test Secret')
    await page.getByPlaceholder('Username').fill('user@test.com')
    await page.getByPlaceholder('Password').fill('Password123!')
    await page.getByRole('button', {name: 'Add a Secret'}).click()

    await expect(
      page.getByRole('heading', {name: 'Set Master Password'})
    ).toBeVisible({timeout: 10000})
    await page.getByPlaceholder('Password').fill(TEST_MASTER_PASSWORD)
    await page.getByPlaceholder('Hint').fill('hint')
    await page.getByRole('button', {name: 'Set Master Password'}).click()

    await expect(
      page.getByRole('heading', {name: 'Backup Your Recovery Words'})
    ).toBeVisible({timeout: 10000})
    await expect(page.locator('ol li').first()).toBeVisible()
    await page.getByRole('button', {name: 'Continue'}).click()

    await page.getByPlaceholder('Email').fill('user@example.com')
    await page.getByRole('button', {name: 'Sign Up'}).click()

    await expect(
      page.getByRole('heading', {name: 'Verify Email'})
    ).toBeVisible()
    await page.getByPlaceholder('Code').fill('123456')

    const verifyRequest = page.waitForRequest(
      (req) =>
        req.url().includes('/api/auth/email/verify') && req.method() === 'POST'
    )
    await page.getByRole('button', {name: 'Verify'}).click()
    const req = await verifyRequest
    captured.body = req.postDataJSON() as VerifyBody

    await expect(
      page.getByRole('heading', {name: 'Verify Email'})
    ).not.toBeVisible()

    expect(captured.uuid).toBeTruthy()
    expect(captured.body).not.toBeNull()
    expect(captured.body?.email).toBe('user@example.com')
    expect(captured.body?.code).toBe('123456')
    expect(captured.body?.userId).toBe(captured.uuid)

    await page.reload()

    await expect(
      page.getByRole('heading', {name: 'Speak Friend and Enter'})
    ).toBeVisible()
    await expect(
      page.getByRole('heading', {name: 'Verify Email'})
    ).not.toBeVisible()
    await expect(page.getByRole('heading', {name: 'Sign Up'})).not.toBeVisible()
  })

  test('should show unlock form (not code form) after inactivity lock on verify step', async ({
    page
  }) => {
    await page.clock.install()
    await page.goto('/')
    await page.evaluate(async () => {
      const databases = await indexedDB.databases()
      for (const db of databases) {
        if (db.name) indexedDB.deleteDatabase(db.name)
      }
    })
    await page.reload()

    await expect(
      page.getByRole('heading', {name: 'Add a New Secret'})
    ).toBeVisible()
    await page.getByPlaceholder('Password').fill('TestPass123!')
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
    await page.getByRole('button', {name: 'Continue'}).click()

    await expect(page.getByRole('heading', {name: 'Sign Up'})).toBeVisible()
    await page.getByPlaceholder('Email').fill('user@example.com')
    await page.getByRole('button', {name: 'Sign Up'}).click()

    await expect(
      page.getByRole('heading', {name: 'Verify Email'})
    ).toBeVisible()

    await page.clock.fastForward('02:05')

    await expect(
      page.getByRole('heading', {name: 'Speak Friend and Enter'})
    ).toBeVisible()
    await expect(
      page.getByRole('heading', {name: 'Verify Email'})
    ).not.toBeVisible()
    await expect(page.getByPlaceholder('Code')).not.toBeVisible()
  })
})
