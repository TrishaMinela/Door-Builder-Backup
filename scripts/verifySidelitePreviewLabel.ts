import assert from 'node:assert/strict'
import { sidelitePreviewLabel } from '../src/utils/sidelitePreviewLabel'
import { sideliteStyleDisplayName } from '../src/data/productDisplayNames'
import type { SideliteGlassConfiguration } from '../src/types'

const clear: SideliteGlassConfiguration = { glass: 'Clear Glass with No Grids', glassCategory: 'Clear Glass' }
const grid: SideliteGlassConfiguration = { ...clear, gridLocation: 'Internal', gridStyle: 'Flat', gridPattern: '2 Lite', gridColor: 'Tan' }
for (const [position, label] of [['left', 'Left'], ['right', 'Right'], ['both', 'Both']] as const) {
  for (const style of ['fsl', 'ssl', 'f48sl', 's2sl', 'cr14sl']) {
    const value = sidelitePreviewLabel(position, 'LHI', 'single', style, grid)
    assert.ok(value.startsWith(`${label} · `))
    assert.ok(value.endsWith(' · 2 Lite Tan'))
    assert.doesNotMatch(value, /\b(?:FSL|SSL|F48SL|S2SL|CR14SL)\b/)
    if (style !== 'cr14sl') assert.ok(value.includes(sideliteStyleDisplayName(style)))
  }
}
assert.equal(sidelitePreviewLabel('none', 'LHI', 'single', 'fsl', grid), 'None')
assert.equal(sidelitePreviewLabel('right', 'LHI', 'single', 'ssl', clear), 'Right · Half Side Lite · Clear Glass')
for (const glassCategory of ['Decorative Glass', 'Privacy Glass', 'CLiC Glass'] as const) {
  assert.ok(sidelitePreviewLabel('left', 'RHI', 'single', 'fsl', { glass: 'Selected Design', glassCategory }).endsWith(' · Selected Design'))
}
assert.ok(sidelitePreviewLabel('right', 'LHI', 'single', 'fsl', { ...grid, gridStyle: 'Prairie' }).endsWith(' · Prairie Tan'))
assert.ok(sidelitePreviewLabel('right', 'LHI', 'single', 'fsl', { ...grid, gridLocation: 'SDL', gridColor: undefined }).endsWith(' · 2 Lite SDL'))
console.log('Compact sidelite labels passed: all styles, positions, clear, named specialty glass, internal grids, Prairie and SDL.')

if (process.argv.includes('--ui')) {
  const { spawn } = await import('node:child_process')
  const { chromium } = await import('playwright-core')
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
    for (const width of [1440, 820, 390]) for (const position of ['left', 'right', 'both-sides', 'none']) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } })
      await page.addInitScript(sidelites => localStorage.setItem('hgi-door-builder-draft', JSON.stringify({ version: 1, configuration: {
        selectedDoorConfigurationType: 'single', styleId: 'f482-3-4-lite-2-panel', doorLineId: '20-gauge-smooth-steel',
        sidelites, sideliteStyleId: 'f48sl', doorSwingId: 'LHI', sideliteGlassCategory: 'clear', sideliteGlassId: 'clear-grids',
        sideliteGridLocation: 'internal', sideliteGridStyle: 'Flat', sideliteGridPattern: '2 Lite', sideliteGridColor: 'Tan', sideliteGridWidth: '7/8"',
      } })), position)
      await page.goto('http://127.0.0.1:5299/')
      await page.getByRole('button', { name: 'Start Building Your Door', exact: true }).click()
      const row = page.locator('.sidelite-preview-summary strong')
      await row.waitFor({ state: 'attached' })
      const text = await row.textContent()
      assert.equal(text, position === 'none' ? 'None' : `${position === 'both-sides' ? 'Both' : position === 'left' ? 'Left' : 'Right'} · Three Quarter Side Lite · 2 Lite Tan`)
      const css = await row.evaluate(el => ({ align: getComputedStyle(el).textAlign, whiteSpace: getComputedStyle(el).whiteSpace, overflow: getComputedStyle(el).overflow, width: el.clientWidth, scrollWidth: el.scrollWidth }))
      assert.equal(css.align, 'right'); assert.equal(css.whiteSpace, 'normal'); assert.equal(css.overflow, 'visible')
      assert.ok(css.scrollWidth <= css.width + 1)
      assert.equal(await page.locator('.sidelite-preview-summary').count(), 1)
      await page.close()
    }
    console.log('Preview UI passed: 12 desktop/tablet/phone × left/right/both/none cases; compact text, right alignment and no overflow.')
  } finally { await browser?.close(); server.kill('SIGTERM') }
}
