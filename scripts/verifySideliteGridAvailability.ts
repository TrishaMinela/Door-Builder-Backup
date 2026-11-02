import assert from 'node:assert/strict'
import { f48slStandardStyleRules, f48slLowEStyleRules } from '../src/data/f48slGlass'
import { sslStandardStyleRules, sslLowEStyleRules } from '../src/data/sslGlass'
import { fslSdlPatterns, fslStandardStyleRules, fslLowEStyleRules } from '../src/data/fslGlass'
import { s2slGlassOptions, s2slStyleRules } from '../src/data/s2slGlass'

// SDL Grids (1), labeled F48SL section: Flat / 2 Lite / Tan is BAR7
// for both coatings. It must never be offered as the Low-E-only BAR5.
for (const rules of [f48slStandardStyleRules, f48slLowEStyleRules]) {
  assert.deepEqual(rules.Flat?.['2 Lite']?.Tan, ['7/8"'])
}
const standard = f48slStandardStyleRules.Flat?.['2 Lite']?.Tan ?? []
const lowE = f48slLowEStyleRules.Flat?.['2 Lite']?.Tan ?? []
assert.deepEqual([...new Set([...standard, ...lowE])], ['7/8"'])
assert.ok(standard.includes('7/8"') && lowE.includes('7/8"'))
assert.ok(!lowE.includes('5/8"'))

// Section-specific restrictions: do not propagate S2SL's Clear-only rule.
assert.deepEqual(s2slGlassOptions.map(({ id, category }) => ({ id, category })), [
  { id: 'clear-no-grids', category: 'clear' },
])
assert.deepEqual(s2slStyleRules, {})
for (const rules of [sslStandardStyleRules, sslLowEStyleRules]) {
  assert.deepEqual(rules.Contoured?.['3 Lite'], { Champagne: ['11/16"'], White: ['11/16"'] })
  // The source lists Bronze without a selectable BAR width.
  assert.deepEqual(rules.Flat?.['2 Lite']?.Bronze, [])
  assert.deepEqual(rules.Flat?.['3 Lite']?.Bronze, [])
}
assert.deepEqual(fslSdlPatterns.standard, ['3 Lite', '4 Lite', '5 Lite'])
assert.deepEqual(fslSdlPatterns['low-e'], fslSdlPatterns.standard)
assert.deepEqual(fslStandardStyleRules.Prairie?.['5 Lite']?.Champagne, ['11/16"'])
assert.deepEqual(fslLowEStyleRules.Prairie?.['5 Lite']?.Champagne, ['5/8"', '11/16"'])
console.log('Sidelite grid availability: corrected F48SL BAR7 eligibility and section-specific SSL/S2SL/FSL restrictions passed.')

if (process.argv.includes('--ui')) {
  const { spawn } = await import('node:child_process')
  const { chromium } = await import('playwright-core')
  const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5298', '--strictPort'])
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
  try {
    await new Promise<void>((resolve, reject) => {
      server.stdout.on('data', chunk => { if (String(chunk).includes('5298')) resolve() })
      server.once('error', reject)
      server.once('exit', code => reject(new Error(`Server exited ${code}`)))
      setTimeout(() => reject(new Error('Server startup timeout')), 10000).unref()
    })
    browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
    for (const width of [1440, 820, 390]) for (const position of ['left', 'right', 'both-sides']) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } })
      await page.addInitScript(sidelites => localStorage.setItem('hgi-door-builder-draft', JSON.stringify({ version: 1, configuration: {
        selectedDoorConfigurationType: 'single', styleId: 'f482-3-4-lite-2-panel', doorLineId: '20-gauge-smooth-steel',
        sidelites, sideliteStyleId: 'f48sl', doorSwingId: 'LHI', sideliteGlassCategory: 'clear', sideliteGlassId: 'clear-grids',
        sideliteGridLocation: 'internal', sideliteGridStyle: 'Flat', sideliteGridPattern: '2 Lite', sideliteGridColor: 'Tan', sideliteGridWidth: '7/8"',
      } })), position)
      await page.goto('http://127.0.0.1:5298/')
      await page.getByRole('button', { name: 'Start Building Your Door', exact: true }).click()
      let checkedWidth = false
      for (let step = 0; step < 40; step++) {
        if (await page.locator('.review-heading').count()) break
        const heading = await page.locator('.step-heading h1').innerText()
        console.log(`${width}/${position}: ${heading}`)
        const cards = page.locator('.builder-options-scroll .bar-size-option-card')
        if (await cards.count() && /sidelite/i.test(heading)) {
          assert.deepEqual(await cards.locator('strong').allTextContents(), ['7/8"'])
          checkedWidth = true
          await cards.first().click()
        }
        const next = page.getByRole('button', { name: 'Next configuration step' })
        if (!(await next.count())) break
        await next.click()
      }
      assert.ok(checkedWidth, 'Reached sidelite width screen')
      assert.equal(await page.locator('.review-heading').count(), 1, 'Reached final configuration review')
      assert.match(await page.locator('.summary-card').innerText(), /7\/8"/)
      assert.match(await page.locator('.summary-card').innerText(), /Standard \/ No Low-E or Low-E/)
      const state = await page.evaluate(() => JSON.parse(localStorage.getItem('hgi-door-builder-draft')!).configuration)
      assert.equal(state.sidelites, position)
      assert.equal(state.sideliteStyleId, 'f48sl')
      assert.equal(state.sideliteGridWidth, '7/8"')
      assert.equal(state.sideliteGridColor, 'Tan')
      assert.equal(state.sideliteGridPattern, '2 Lite')
      await page.close()
    }
  } finally {
    await browser?.close()
    server.kill('SIGTERM')
  }
}
