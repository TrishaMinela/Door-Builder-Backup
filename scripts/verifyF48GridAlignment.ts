import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright-core'

// Check actual decoded layers rather than screenshot equality, which is
// sensitive to browser paint timing. Every opaque opening pixel needs glass.
const output = '/private/tmp/hgi-f48-grid-alignment'
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5302', '--strictPort'])
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
type Harness = { pdfFixtures: string[]; mountLiveFixture(index: number, view: 'Exterior' | 'Interior'): Promise<unknown> }
try {
  await mkdir(output, { recursive: true })
  await new Promise<void>((resolve, reject) => {
    server.stdout.on('data', chunk => { if (String(chunk).includes('5302')) resolve() })
    server.once('error', reject)
    server.once('exit', code => reject(new Error(`Server exited ${code}`)))
    setTimeout(() => reject(new Error('Server startup timeout')), 10000).unref()
  })
  browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } })
    await page.goto('http://127.0.0.1:5302/scripts/pdfRendererHarness.html')
    await page.waitForFunction(() => 'pdfFixtures' in window)
    const names = await page.evaluate(() => (window as unknown as Harness).pdfFixtures)
    for (const name of names.filter(name => name.startsWith('three-quarter-'))) for (const view of ['Exterior', 'Interior'] as const) {
      await page.evaluate(async ({ index, view, width }) => {
        await (window as unknown as Harness).mountLiveFixture(index, view)
        document.querySelector<HTMLElement>('#live-preview')!.style.width = `${Math.min(width - 32, 450)}px`
      }, { index: names.indexOf(name), view, width })
      const result = await page.evaluate(async () => {
        const base = document.querySelector<HTMLImageElement>('.door-clear-glass-base')!
        await base.decode()
        const mask = new Image()
        mask.src = base.style.maskImage.slice(5, -2)
        await mask.decode()
        const canvas = document.createElement('canvas')
        canvas.width = mask.naturalWidth; canvas.height = mask.naturalHeight
        const context = canvas.getContext('2d', { willReadFrequently: true })!
        context.drawImage(mask, 0, 0)
        const opening = context.getImageData(0, 0, canvas.width, canvas.height).data
        context.clearRect(0, 0, canvas.width, canvas.height)
        context.drawImage(base, 0, 0, canvas.width, canvas.height)
        const glass = context.getImageData(0, 0, canvas.width, canvas.height).data
        let gaps = 0; let openingPixels = 0
        for (let i = 3; i < opening.length; i += 4) if (opening[i] > 250) {
          openingPixels++
          if (glass[i] < 250) gaps++
        }
        return { gaps, openingPixels, fitted: base.src.startsWith('data:') }
      })
      assert.ok(result.openingPixels > 10000, 'Measured real glass opening')
      assert.ok(result.fitted)
      assert.equal(result.gaps, 0, `${name}/${view}/${width}: clear base covers opening`)
      if (name === 'three-quarter-flat-F48-3') {
        const bands = await page.evaluate(async () => {
          const grid = document.querySelector<HTMLImageElement>('.door-glass-assembly > img.door-glass-overlay:not(.door-clear-glass-base)')!
          await grid.decode()
          const canvas = document.createElement('canvas')
          canvas.width = grid.naturalWidth; canvas.height = grid.naturalHeight
          const context = canvas.getContext('2d')!
          context.drawImage(grid, 0, 0)
          const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
          const rows: number[] = []
          let previous = false
          for (let y = 0; y < canvas.height; y++) {
            const filled = pixels[(y * canvas.width + Math.floor(canvas.width / 2)) * 4 + 3] > 200
            if (filled && !previous) rows.push(y / canvas.height)
            previous = filled
          }
          return rows
        })
        // Preserve all three bars in the supplied asset, in their authored
        // interior positions. Alpha-bound fitting used to move two to edges.
        assert.equal(bands.length, 3)
        assert.ok(bands[0] > .2 && bands[2] < .6, `Authored horizontal bar positions: ${bands}`)
      }
      await page.locator('#live-preview').screenshot({ path: `${output}/${name}-${view}-${width}.png` })
      console.log(`PASS ${name} ${view} ${width}px: ${result.openingPixels} opening pixels, zero gaps`)
    }
    await page.close()
  }
} finally {
  await browser?.close()
  server.kill('SIGTERM')
}
