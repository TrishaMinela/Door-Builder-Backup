import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'

const port = 5194
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'pipe' })
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined

try {
  await new Promise<void>((resolve, reject) => {
    server.stdout.on('data', chunk => { if (String(chunk).includes(`127.0.0.1:${port}`)) resolve() })
    server.once('error', reject)
    server.once('exit', code => reject(new Error(`Vite exited ${code}`)))
    setTimeout(() => reject(new Error('Vite startup timeout')), 10_000).unref()
  })
  await mkdir('/tmp/hgi-dealer-cobranding', { recursive: true })
  browser = await chromium.launch({ channel: 'chrome', headless: true })

  const rootPage = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  await rootPage.goto(`http://127.0.0.1:${port}/`)
  await rootPage.getByRole('button', { name: 'Start Building Your Door' }).waitFor()
  assert.equal(await rootPage.locator('.dealer-cobranded,.dealer-brand-mark').count(), 0)
  assert.equal(await rootPage.getByRole('link', { name: 'Find a Dealer' }).count(), 1)
  assert.equal(await rootPage.getByRole('link', { name: 'Email Home Guard Industries' }).count(), 1)
  assert.equal(await rootPage.getByRole('link', { name: 'View Home Guard Industries on Google Maps' }).count(), 1)
  assert.equal(await rootPage.locator('header').evaluate(element => getComputedStyle(element).backgroundColor), 'rgb(255, 255, 255)')
  await rootPage.close()

  for (const [width, height] of [[1440, 1000], [820, 1180], [390, 844], [320, 740]]) {
    const page = await browser.newPage({ viewport: { width, height } })
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await page.route('**/api/dealer-context?slug=test-dealer-portal-access-qa', route => route.fulfill({
      status: 200,
      json: {
        available: true,
        dealer: {
          slug: 'test-dealer-portal-access-qa',
          companyName: 'TEST Dealer - Portal Access QA',
          logoUrl: null,
          logoLightUrl: null,
          primaryColor: '#2456a6',
          secondaryColor: '#f0b429',
          websiteUrl: 'https://dealer.example.com/',
        },
      },
    }))
    await page.goto(`http://127.0.0.1:${port}/test-dealer-portal-access-qa`)
    await page.getByRole('button', { name: 'Start Building Your Door' }).waitFor()
    assert.equal(await page.locator('.dealer-cobranded').count(), 1)
    assert.equal(await page.locator('header .dealer-brand-mark').count(), 1)
    assert.equal(await page.locator('.site-footer .dealer-brand-mark').count(), 0)
    assert.equal(await page.locator('header .dealer-brand-fallback').innerText(), 'TD')
    assert.match(await page.locator('header .dealer-brand-mark').getAttribute('aria-label') ?? '', /TEST Dealer.*branding/)
    assert.equal(await page.getByText(/Presented by/i).count(), 0)
    assert.equal(await page.getByRole('link', { name: 'Find a Dealer' }).count(), 0)
    assert.equal(await page.locator('header .hgi-attribution').count(), 0)
    assert.equal(await page.locator('.site-footer .hgi-attribution').count(), 1)
    const websiteLink = page.getByRole('link', { name: 'Visit Our Website' })
    assert.equal(await websiteLink.getAttribute('href'), 'https://dealer.example.com/')
    assert.equal(await websiteLink.getAttribute('target'), '_blank')
    assert.equal(await page.getByRole('link', { name: 'Email Home Guard Industries' }).count(), 0)
    assert.equal(await page.getByRole('link', { name: 'View Home Guard Industries on Google Maps' }).count(), 0)
    assert.equal(await page.getByRole('link', { name: 'Call Home Guard Industries at 1-800-525-1885' }).count(), 1)
    assert.equal(await page.getByRole('link', { name: 'Visit the Home Guard Industries website' }).count(), 1)
    assert.equal(await page.locator('header').evaluate(element => getComputedStyle(element).backgroundColor), 'rgb(240, 180, 41)')
    assert.equal(await page.locator('header').evaluate(element => getComputedStyle(element).color), 'rgb(16, 20, 23)')
    assert.equal(await page.locator('.start-building').evaluate(element => getComputedStyle(element).backgroundColor), 'rgb(36, 86, 166)')
    assert.equal(await page.locator('.site-footer').evaluate(element => getComputedStyle(element).backgroundColor), 'rgb(240, 180, 41)')
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
    assert.match(await page.title(), /^TEST Dealer - Portal Access QA \| Home Guard Door Builder$/)
    assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'noindex,follow')
    await page.screenshot({ path: `/tmp/hgi-dealer-cobranding/dealer-${width}.png`, fullPage: true })
    await page.getByRole('button', { name: 'Start Building Your Door' }).click()
    await page.locator('.builder-panel').waitFor()
    assert.equal(await page.locator('.dealer-cobranded .dealer-brand-mark').count(), 1)
    assert.equal(await page.evaluate(() => location.pathname), '/test-dealer-portal-access-qa')
    await page.goto(`http://127.0.0.1:${port}/`)
    await page.getByRole('button', { name: 'Start Building Your Door' }).waitFor()
    assert.equal(await page.locator('.dealer-cobranded,.dealer-brand-mark').count(), 0)
    assert.deepEqual(errors, [])
    await page.close()
  }

  const darkPage = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  const transparentPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lT5vWQAAAABJRU5ErkJggg==', 'base64')
  await darkPage.route('https://cdn.example.invalid/**', route => route.fulfill({ status: 200, contentType: 'image/png', body: transparentPng }))
  await darkPage.route('**/api/dealer-context?slug=dark-test-dealer', route => route.fulfill({
    status: 200,
    json: {
      available: true,
      dealer: {
        slug: 'dark-test-dealer',
        companyName: 'Dark Test Dealer',
        logoUrl: 'https://cdn.example.invalid/dealer-primary.png',
        logoLightUrl: 'https://cdn.example.invalid/dealer-light.png',
        primaryColor: '#2456a6',
        secondaryColor: '#111827',
        websiteUrl: null,
      },
    },
  }))
  await darkPage.goto(`http://127.0.0.1:${port}/dark-test-dealer`)
  await darkPage.getByRole('button', { name: 'Start Building Your Door' }).waitFor()
  assert.match(await darkPage.locator('header .dealer-brand-mark img').getAttribute('src') ?? '', /dealer-light\.png/)
  assert.equal(await darkPage.locator('header .hgi-attribution').count(), 0)
  assert.equal(await darkPage.getByRole('link', { name: 'Visit Our Website' }).count(), 0)
  assert.match(await darkPage.locator('.site-footer .hgi-attribution img').getAttribute('src') ?? '', /hgi-logo-white-dealer\.png/)
  assert.equal(await darkPage.locator('header').evaluate(element => getComputedStyle(element).color), 'rgb(255, 255, 255)')
  assert.equal(await darkPage.locator('.site-footer').evaluate(element => getComputedStyle(element).color), 'rgb(255, 255, 255)')
  await darkPage.screenshot({ path: '/tmp/hgi-dealer-cobranding/dealer-dark-1440.png', fullPage: true })
  await darkPage.close()

  const lowContrastPage = await browser.newPage({ viewport: { width: 820, height: 1180 } })
  await lowContrastPage.route('https://cdn.example.invalid/**', route => route.fulfill({ status: 200, contentType: 'image/png', body: transparentPng }))
  await lowContrastPage.route('**/api/dealer-context?slug=low-contrast-dealer', route => route.fulfill({
    status: 200,
    json: {
      available: true,
      dealer: {
        slug: 'low-contrast-dealer',
        companyName: 'Low Contrast Dealer',
        logoUrl: 'https://cdn.example.invalid/dealer-primary.png',
        logoLightUrl: null,
        primaryColor: '#111827',
        secondaryColor: '#111827',
        websiteUrl: 'https://dealer.example.com/',
      },
    },
  }))
  await lowContrastPage.goto(`http://127.0.0.1:${port}/low-contrast-dealer`)
  await lowContrastPage.getByRole('button', { name: 'Start Building Your Door' }).waitFor()
  assert.equal(await lowContrastPage.locator('header .dealer-brand-mark').count(), 0)
  assert.equal(await lowContrastPage.locator('.dealer-hero-logo .dealer-brand-mark').count(), 1)
  assert.match(await lowContrastPage.locator('.dealer-hero-logo img').getAttribute('src') ?? '', /dealer-primary\.png/)
  assert.equal(await lowContrastPage.locator('.dealer-brand-mark').count(), 1)
  assert.equal(await lowContrastPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  await lowContrastPage.screenshot({ path: '/tmp/hgi-dealer-cobranding/dealer-low-contrast-820.png', fullPage: true })
  await lowContrastPage.close()

  const invalidPage = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await invalidPage.route('**/api/dealer-context?slug=unknown-dealer', route => route.fulfill({ status: 404, json: { error: 'This dealer link is unavailable.' } }))
  await invalidPage.goto(`http://127.0.0.1:${port}/unknown-dealer`)
  await invalidPage.getByRole('heading', { name: 'This dealer link is unavailable.' }).waitFor()
  assert.equal(await invalidPage.locator('.dealer-brand-mark').count(), 0)
  await invalidPage.close()

  console.info('Verified root HGI branding, dealer co-branding and fallback identity at desktop/tablet/mobile, route persistence, and unknown-dealer safety.')
} finally {
  await browser?.close()
  server.kill('SIGTERM')
}
