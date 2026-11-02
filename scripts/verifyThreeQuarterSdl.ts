import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright-core'
import { doorStyles } from '../src/data/options'

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5299', '--strictPort'])
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
try {
  await new Promise<void>((resolve, reject) => {
    server.stdout.on('data', chunk => { if (String(chunk).includes('5299')) resolve() })
    server.once('error', reject)
    server.once('exit', code => reject(new Error(`Server exited ${code}`)))
    setTimeout(() => reject(new Error('Server startup timeout')), 10000).unref()
  })
  browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
  await mkdir('/private/tmp/hgi-three-quarter-sdl', { recursive: true })
  for (const width of [1440, 820, 390]) for (const code of ['F48', 'F482']) for (const pattern of ['4 Lite', '6 Lite', '12 Lite']) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } })
    const assets = new Set<string>()
    page.on('response', response => { if (response.ok()) assets.add(decodeURIComponent(new URL(response.url()).pathname)) })
    await page.addInitScript(configuration => localStorage.setItem('hgi-door-builder-draft', JSON.stringify({ version: 1, configuration })), {
      selectedDoorConfigurationType: 'single', styleId: doorStyles.find(item => item.code === code)!.id,
      doorLineId: '20-gauge-smooth-steel', sidelites: 'none', doorSwingId: 'LHI', finishId: 'paint-clay',
      selectedGlassCategory: 'clear', glassId: 'f48-clear-grids', gridPathId: 'sdl', gridPattern: pattern,
    })
    await page.goto('http://127.0.0.1:5299/')
    await page.getByRole('button', { name: 'Start Building Your Door', exact: true }).click()
    let checked = false
    for (let step = 0; step < 40; step++) {
      if (await page.locator('.review-heading').count()) break
      const thumbnails = page.locator('.builder-options-scroll .grid-pattern-thumbnail')
      if (await thumbnails.count()) {
        const cards = page.locator('.builder-options-scroll .option-card')
        assert.deepEqual(await cards.locator('strong').allTextContents(), ['4 Lite', '6 Lite', '12 Lite'])
        await cards.filter({ hasText: pattern }).click()
        checked = true
        if (pattern === '12 Lite') await page.screenshot({ path: `/private/tmp/hgi-three-quarter-sdl/${code}-${width}-options.png`, fullPage: true })
      }
      await page.getByRole('button', { name: 'Next configuration step' }).click()
    }
    assert.ok(checked, `${code}: reached SDL pattern options`)
    assert.equal(await page.locator('.review-heading').count(), 1)
    const state = await page.evaluate(() => JSON.parse(localStorage.getItem('hgi-door-builder-draft')!).configuration)
    assert.equal(state.gridPathId, 'sdl')
    assert.equal(state.gridPattern, pattern)
    assert.equal(state.styleId, doorStyles.find(item => item.code === code)!.id)
    assert.match(await page.locator('.summary-card').innerText(), /Low-E/)
    assert.ok(assets.has(`/assets/hgi-assets/Glass/F48/INTERNAL GRIDS/F48INT${pattern.split(' ')[0]}LWH.webp`), 'Matching artwork loaded')
    await page.screenshot({ path: `/private/tmp/hgi-three-quarter-sdl/${code}-${width}-${pattern.replace(' ', '-')}.png`, fullPage: true })
    console.log(`PASS ${width}px ${code} SDL ${pattern}: options, selection, Low-E and artwork`)
    await page.close()
  }
  const capturePage = await browser.newPage()
  await capturePage.goto('http://127.0.0.1:5299/scripts/pdfRendererHarness.html')
  await capturePage.waitForFunction(() => 'pdfFixtures' in window)
  type Harness = { pdfFixtures: string[]; mountLiveFixture(index: number): Promise<unknown>; captureSslReference(): Promise<string> }
  const fixtures = await capturePage.evaluate(() => (window as unknown as Harness).pdfFixtures)
  for (const name of fixtures.filter(name => name.startsWith('three-quarter-sdl-'))) {
    await capturePage.evaluate(index => (window as unknown as Harness).mountLiveFixture(index), fixtures.indexOf(name))
    const data = await capturePage.evaluate(() => (window as unknown as Harness).captureSslReference())
    assert.match(data, /^data:image\/png;base64,/)
    await writeFile(`/private/tmp/hgi-three-quarter-sdl/${name}-reference.png`, Buffer.from(data.split(',')[1], 'base64'))
    console.log(`PASS configured AI reference capture: ${name}`)
  }
  await capturePage.close()
} finally {
  await browser?.close()
  server.kill('SIGTERM')
}
