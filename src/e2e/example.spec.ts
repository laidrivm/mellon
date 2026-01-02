import {expect, test} from '@playwright/test'

test.describe('App basics', () => {
  test('should load the homepage', async ({page}) => {
    await page.goto('/')

    await expect(page).toHaveTitle(/Mellon — Keep Your Secrets/i)
  })

  test('should display the logo', async ({page}) => {
    await page.goto('/')

    const logo = page.getByRole('img', {name: 'Logo'})
    await expect(logo).toBeVisible()
  })

  test('should display the footer', async ({page}) => {
    await page.goto('/')

    const footer = page.locator('footer')
    await expect(footer).toBeVisible()
  })
})
