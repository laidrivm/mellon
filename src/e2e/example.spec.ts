import {expect, test} from '@playwright/test'

test.describe('App basics', () => {
  test('should load the homepage', async ({page}) => {
    await page.goto('/')

    await expect(page).toHaveTitle(/Mellon — Keep Your Secrets/i)
  })
})
