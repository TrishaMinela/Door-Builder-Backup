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

  for (const [width, height] of [[1440, 1000], [1024, 900], [820, 1180], [390, 844], [320, 740]]) {
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
          logoPlacement: 'header',
          primaryColor: '#2456a6',
          secondaryColor: '#f0b429',
          websiteUrl: 'https://dealer.example.com/',
          headingFontFamily: 'georgia', headingFontWeight: 700, headingFontSize: 60,
          bodyFontFamily: 'arial', bodyFontWeight: 400, bodyFontSize: 16,
          customHeadingFontUrl: null, customHeadingFontName: null, customHeadingFontWeight: null,
          customBodyFontUrl: null, customBodyFontName: null, customBodyFontWeight: null,
        },
      },
    }))
    await page.goto(`http://127.0.0.1:${port}/test-dealer-portal-access-qa`)
    await page.getByRole('button', { name: 'Start Building Your Door' }).waitFor()
    assert.equal(await page.locator('.dealer-cobranded').count(), 1)
    assert.equal(await page.locator('header .dealer-brand-mark').count(), 1)
    assert.equal(await page.locator('.dealer-hero-logo').count(), 0)
    assert.equal(await page.locator('.site-footer .dealer-brand-mark').count(), 0)
    assert.equal(await page.locator('header .dealer-brand-fallback').innerText(), 'TD')
    assert.match(await page.locator('header .dealer-brand-mark').getAttribute('aria-label') ?? '', /TEST Dealer.*branding/)
    assert.equal(await page.getByText(/Presented by/i).count(), 0)
    assert.equal(await page.getByRole('link', { name: 'Find a Dealer' }).count(), 0)
    assert.equal(await page.locator('header .hgi-attribution').count(), 0)
    assert.equal(await page.locator('.site-footer .hgi-attribution').count(), 1)
    assert.match(await page.locator('.site-footer .hgi-attribution>span').innerText(), /Door Builder & Visualizer\s+provided by/i)
    const websiteLink = page.getByRole('link', { name: 'Visit Our Website' })
    assert.equal(await websiteLink.getAttribute('href'), 'https://dealer.example.com/')
    assert.equal(await websiteLink.getAttribute('target'), '_blank')
    const homeLogoBox = await page.locator('header .dealer-brand-mark').boundingBox()
    const homeWebsiteBox = await websiteLink.boundingBox()
    assert.ok(homeLogoBox && homeWebsiteBox && homeLogoBox.x < homeWebsiteBox.x, `Header placement stays left/right aligned at ${width}px`)
    assert.equal(await page.getByRole('link', { name: 'Email Home Guard Industries' }).count(), 0)
    assert.equal(await page.getByRole('link', { name: 'View Home Guard Industries on Google Maps' }).count(), 0)
    assert.equal(await page.getByRole('link', { name: 'Call Home Guard Industries at 1-800-525-1885' }).count(), 1)
    assert.equal(await page.getByRole('link', { name: 'Visit the Home Guard Industries website' }).count(), 1)
    assert.equal(await page.locator('header').evaluate(element => getComputedStyle(element).backgroundColor), 'rgb(240, 180, 41)')
    assert.equal(await page.locator('header').evaluate(element => getComputedStyle(element).color), 'rgb(16, 20, 23)')
    assert.equal(await page.locator('.start-building').evaluate(element => getComputedStyle(element).backgroundColor), 'rgb(36, 86, 166)')
    assert.equal(await page.locator('.site-footer').evaluate(element => getComputedStyle(element).backgroundColor), 'rgb(240, 180, 41)')
    const footerBox = await page.locator('.site-footer').boundingBox()
    const providerBox = await page.locator('.site-footer-branding').boundingBox()
    const contactBox = await page.locator('.site-footer-contact').boundingBox()
    const utilityBox = await page.locator('.site-footer-feedback').boundingBox()
    assert.ok(footerBox && providerBox && contactBox && utilityBox)
    if (width >= 1101) {
      assert.ok(utilityBox.x < providerBox.x && providerBox.x < contactBox.x, `Dealer footer uses utilities / provider / contact columns at ${width}px`)
      assert.ok(Math.abs(providerBox.x + providerBox.width / 2 - (footerBox.x + footerBox.width / 2)) < 24, `Provider block anchors the footer center at ${width}px`)
      const centers = [utilityBox, providerBox, contactBox].map(box => box.y + box.height / 2)
      assert.ok(Math.max(...centers) - Math.min(...centers) < 26, `Dealer footer columns share one vertical center at ${width}px`)
    } else if (width <= 700) {
      assert.ok(providerBox.y < contactBox.y && contactBox.y < utilityBox.y, `Dealer footer mobile order is provider / contact / utilities at ${width}px`)
      const footerCenter = footerBox.x + footerBox.width / 2
      for (const box of [providerBox, contactBox, utilityBox]) assert.ok(Math.abs(box.x + box.width / 2 - footerCenter) < 24, `Dealer footer section is centered at ${width}px`)
    }
    assert.match(await page.locator('.home-hero h1').evaluate(element => getComputedStyle(element).fontFamily),/Georgia/)
    assert.match(await page.locator('.home-hero-copy>p').evaluate(element => getComputedStyle(element).fontFamily),/Arial/)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
    assert.match(await page.title(), /^TEST Dealer - Portal Access QA \| Home Guard Door Builder$/)
    assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'noindex,follow')
    await page.screenshot({ path: `/tmp/hgi-dealer-cobranding/dealer-${width}.png`, fullPage: true })
    await page.getByRole('button', { name: 'Start Building Your Door' }).click()
    await page.locator('.builder-panel').waitFor()
    const firstDealerCard = page.locator('[data-equal-product-grid] > .option-card').first()
    await firstDealerCard.click()
    const dealerSelectionStyle = await firstDealerCard.evaluate(element => {
      const style = getComputedStyle(element)
      return { borderColor: style.borderColor, boxShadow: style.boxShadow }
    })
    assert.equal(dealerSelectionStyle.borderColor, 'rgb(36, 86, 166)', `Dealer primary controls the full selected card at ${width}px`)
    assert.notEqual(dealerSelectionStyle.boxShadow, 'none', `Dealer selected card keeps full-surface elevation at ${width}px`)
    assert.equal(await page.locator('.dealer-cobranded .dealer-brand-mark').count(), 1)
    assert.equal(await page.locator('header .dealer-brand-mark').count(), 1, `Interior dealer logo remains visible at ${width}px`)
    const interiorHeader = await page.locator('header').boundingBox()
    const interiorLogo = await page.locator('header .dealer-brand-mark').boundingBox()
    const interiorWebsite = await page.getByRole('link', { name: 'Visit Our Website' }).boundingBox()
    assert.ok(interiorHeader && interiorLogo && interiorWebsite && interiorLogo.x < interiorWebsite.x, `Interior dealer header stays left/right aligned at ${width}px`)
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
        logoPlacement: 'header',
        primaryColor: '#2456a6',
        secondaryColor: '#111827',
        websiteUrl: null,
        headingFontFamily: null, headingFontWeight: null, headingFontSize: null, bodyFontFamily: null, bodyFontWeight: null, bodyFontSize: null,
        customHeadingFontUrl: null, customHeadingFontName: null, customHeadingFontWeight: null, customBodyFontUrl: null, customBodyFontName: null, customBodyFontWeight: null,
      },
    },
  }))
  await darkPage.goto(`http://127.0.0.1:${port}/dark-test-dealer`)
  await darkPage.getByRole('button', { name: 'Start Building Your Door' }).waitFor()
  assert.match(await darkPage.locator('header .dealer-brand-mark img').getAttribute('src') ?? '', /dealer-light\.png/)
  assert.equal(await darkPage.locator('header .hgi-attribution').count(), 0)
  assert.equal(await darkPage.getByRole('link', { name: 'Visit Our Website' }).count(), 0)
  const darkFooterLogo = darkPage.locator('.site-footer .hgi-attribution img')
  assert.match(await darkFooterLogo.getAttribute('src') ?? '', /hgi-logo-white\.png/)
  const darkFooterLogoStyle = await darkFooterLogo.evaluate(element => {
    const style = getComputedStyle(element)
    return { objectFit: style.objectFit, overflow: style.overflow, width: element.getBoundingClientRect().width }
  })
  assert.equal(darkFooterLogoStyle.objectFit, 'contain')
  assert.equal(darkFooterLogoStyle.overflow, 'visible')
  assert.ok(darkFooterLogoStyle.width >= 180)
  const providerLabelStyle = await darkPage.locator('.site-footer .hgi-attribution>span').evaluate(element => {
    const style = getComputedStyle(element)
    const rect = element.getBoundingClientRect()
    return { whiteSpace: style.whiteSpace, height: rect.height, lineHeight: Number.parseFloat(style.lineHeight) }
  })
  assert.equal(providerLabelStyle.whiteSpace, 'nowrap')
  assert.ok(providerLabelStyle.height <= providerLabelStyle.lineHeight + 1)
  const providerBox = await darkPage.locator('.site-footer-branding').boundingBox()
  const contactBox = await darkPage.locator('.site-footer-contact').boundingBox()
  const utilityBox = await darkPage.locator('.site-footer-feedback').boundingBox()
  assert.ok(providerBox && contactBox && utilityBox && utilityBox.x < providerBox.x && providerBox.x < contactBox.x)
  const verticalCenters = [providerBox, contactBox, utilityBox].map(box => box.y + box.height / 2)
  assert.ok(Math.max(...verticalCenters) - Math.min(...verticalCenters) < 26, 'Dealer footer columns share one vertical center')
  const phoneBox = await darkPage.getByRole('link', { name: 'Call Home Guard Industries at 1-800-525-1885' }).boundingBox()
  const websiteBox = await darkPage.getByRole('link', { name: 'Visit the Home Guard Industries website' }).boundingBox()
  assert.ok(phoneBox && websiteBox && websiteBox.y > phoneBox.y + phoneBox.height)
  assert.equal(await darkPage.locator('header').evaluate(element => getComputedStyle(element).color), 'rgb(255, 255, 255)')
  assert.equal(await darkPage.locator('.site-footer').evaluate(element => getComputedStyle(element).color), 'rgb(255, 255, 255)')
  await darkPage.getByRole('button', { name: 'Start Building Your Door' }).click()
  await darkPage.locator('.builder-panel').waitFor()
  assert.match(await darkPage.locator('header .dealer-brand-mark img').getAttribute('src') ?? '', /dealer-light\.png/)
  const interiorDarkLogoStyle = await darkPage.locator('header .dealer-brand-mark img').evaluate(element => {
    const style = getComputedStyle(element)
    return { objectFit: style.objectFit, width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height }
  })
  assert.equal(interiorDarkLogoStyle.objectFit, 'contain')
  assert.ok(interiorDarkLogoStyle.width > 0 && interiorDarkLogoStyle.height > 0)
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
        logoPlacement: 'hero',
        primaryColor: '#111827',
        secondaryColor: '#111827',
        websiteUrl: 'https://dealer.example.com/',
        headingFontFamily: null, headingFontWeight: null, headingFontSize: null, bodyFontFamily: null, bodyFontWeight: null, bodyFontSize: null,
        customHeadingFontUrl: null, customHeadingFontName: null, customHeadingFontWeight: null, customBodyFontUrl: null, customBodyFontName: null, customBodyFontWeight: null,
      },
    },
  }))
  await lowContrastPage.goto(`http://127.0.0.1:${port}/low-contrast-dealer`)
  await lowContrastPage.getByRole('button', { name: 'Start Building Your Door' }).waitFor()
  assert.equal(await lowContrastPage.locator('header .dealer-brand-mark').count(), 0)
  assert.equal(await lowContrastPage.locator('.dealer-hero-logo .dealer-brand-mark').count(), 1)
  assert.match(await lowContrastPage.locator('.dealer-hero-logo img').getAttribute('src') ?? '', /dealer-primary\.png/)
  assert.equal(await lowContrastPage.locator('.dealer-brand-mark').count(), 1)
  const heroLogoStyle = await lowContrastPage.locator('.dealer-hero-logo').evaluate((element) => {
    const style = getComputedStyle(element)
    return { boxShadow: style.boxShadow, borderStyle: style.borderStyle, borderRadius: style.borderRadius }
  })
  assert.equal(heroLogoStyle.boxShadow, 'none')
  assert.equal(heroLogoStyle.borderStyle, 'none')
  assert.equal(heroLogoStyle.borderRadius, '0px')
  const heroAlignment = await lowContrastPage.locator('.home-hero-copy').evaluate((element) => {
    const style = getComputedStyle(element)
    const rect = element.getBoundingClientRect()
    return { alignItems: style.alignItems, textAlign: style.textAlign, center: rect.left + rect.width / 2 }
  })
  assert.equal(heroAlignment.alignItems, 'center')
  assert.equal(heroAlignment.textAlign, 'center')
  assert.ok(Math.abs(heroAlignment.center - 410) < 2)
  const dealerHeaderBox = await lowContrastPage.locator('header').boundingBox()
  const dealerWebsiteBox = await lowContrastPage.getByRole('link', { name: 'Visit Our Website' }).boundingBox()
  const dealerHeroBox = await lowContrastPage.locator('.home-hero-visual').boundingBox()
  assert.equal(Math.round(dealerHeaderBox?.height ?? 0), 64)
  assert.ok(dealerWebsiteBox && dealerHeroBox && Math.abs(dealerWebsiteBox.x + dealerWebsiteBox.width - (dealerHeroBox.x + dealerHeroBox.width)) < 2)
  assert.equal(
    await lowContrastPage.locator('.dealer-hero-logo img').evaluate(element => getComputedStyle(element).maxHeight),
    '165px',
  )
  assert.match(
    await lowContrastPage.locator('.site-footer .hgi-attribution').innerText(),
    /door builder & visualizer\s+provided by/i,
  )
  assert.equal(await lowContrastPage.locator('.site-footer').getByText('getintouch@homeguardindustries.com').count(), 0)
  assert.equal(await lowContrastPage.locator('.site-footer').getByText('13101 Main Street').count(), 0)
  assert.equal(await lowContrastPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  await lowContrastPage.getByRole('button', { name: 'Start Building Your Door' }).click()
  await lowContrastPage.locator('.builder-panel').waitFor()
  assert.match(await lowContrastPage.locator('header .dealer-brand-mark img').getAttribute('src') ?? '', /dealer-primary\.png/, 'Interior pages retain the dealer identity')
  await lowContrastPage.screenshot({ path: '/tmp/hgi-dealer-cobranding/dealer-low-contrast-820.png', fullPage: true })
  await lowContrastPage.close()

  const invalidPage = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await invalidPage.route('**/api/dealer-context?slug=unknown-dealer', route => route.fulfill({ status: 404, json: { error: 'This dealer link is unavailable.' } }))
  await invalidPage.goto(`http://127.0.0.1:${port}/unknown-dealer`)
  await invalidPage.getByRole('heading', { name: 'This dealer link is unavailable.' }).waitFor()
  assert.equal(await invalidPage.locator('.dealer-brand-mark').count(), 0)
  await invalidPage.close()

  for (const [width, height] of [[1440, 1000], [1024, 900], [820, 1180], [390, 844], [320, 740]]) {
    const loadingPage = await browser.newPage({ viewport: { width, height } })
    await loadingPage.route('**/api/dealer-context?slug=loading-dealer', async route => {
      await new Promise(resolve => setTimeout(resolve, 700))
      await route.fulfill({ status: 404, json: { error: 'This dealer link is unavailable.' } })
    })
    await loadingPage.goto(`http://127.0.0.1:${port}/loading-dealer`)
    const loadingCard = loadingPage.getByRole('heading', { name: 'Checking dealer link…' }).locator('..')
    await loadingCard.waitFor()
    const cardRect = await loadingCard.boundingBox()
    const footerRect = await loadingPage.locator('.site-footer').boundingBox()
    assert.ok(cardRect && Math.abs(cardRect.x + cardRect.width / 2 - width / 2) < 2, `Loading card is horizontally centered at ${width}px`)
    assert.ok(cardRect && footerRect && Math.abs(cardRect.y + cardRect.height / 2 - footerRect.y / 2) < 3, `Loading card is vertically centered in usable space at ${width}px`)
    assert.ok(footerRect && Math.abs(footerRect.y + footerRect.height - height) < 2, `Loading footer rests at viewport bottom at ${width}px`)
    assert.equal(await loadingPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
    await loadingPage.close()
  }

  console.info('Verified root HGI isolation, centered dealer landing layout, flat logo presentation, responsive footer, loading centering, route persistence, and unknown-dealer safety.')
} finally {
  await browser?.close()
  server.kill('SIGTERM')
}
