import { doorStyles, finishes, hardwareOptions, glassOptions } from '../src/data/options'
import { resolveDoorProduct } from '../src/data/productCatalog'
import { sideliteAssetFamilyForSlab, sideliteSlabAsset, sideliteGlassMask } from '../src/data/sideliteAssets'
import { fslGlassOptions, fslGridAsset } from '../src/data/fslGlass'
import { sslGlassOptions } from '../src/data/sslGlass'
import { renderPdfProduct, type PdfProductAppearance } from '../src/utils/pdfProductRenderer'
import { downloadSummary, generateSummaryPdf } from '../src/utils/pdf'
import type { DoorConfiguration } from '../src/types'
import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { DoorPreview } from '../src/components/DoorPreview'
import { renderSslRelief } from '../src/utils/sideliteRelief'
import { loadPdfImage } from '../src/utils/pdfProductRenderer'
import { captureFinalDoorPreview } from '../src/features/home-visualizer/captureDoorPreview'
import '../src/styles.css'
import { restoredFullLiteDecorativeGlassIds, isApprovedDecorativeGlassName } from '../src/data/decorativeGlass'
import { buildDoorBuilderSubmissionPayload } from '../src/utils/submission'

function fixture(code: string, finishId: string, sidelites: DoorConfiguration['sidelites'] = 'none', double: DoorConfiguration['doorConfigurationType'] = 'single', glassId?: string, lineId = '22-gauge-steel') {
  const style = doorStyles.find(item => item.code === code)!
  const finish = finishes.find(item => item.id === finishId)!
  const product = resolveDoorProduct(style, finish, finish.finishType === 'stain' ? 'Oak' : undefined, lineId)
  const glass = glassOptions.find(item => item.id === glassId) ?? null
  const configuration: DoorConfiguration = { style, finish, product, grain: finish.finishType === 'stain' ? 'Oak' : null, glass, grid: null, hardware: hardwareOptions[0], doorSwing: { id: 'LHI', name: 'Left Hand Inswing', image: '' }, sidelites, doorConfigurationType: double, doubleDoorLockPrep: double === 'french' ? 'DDLLBO' : undefined, sideliteSlab: 'fsl' }
  const family = sideliteAssetFamilyForSlab({ doorLineId: lineId, doorStyleCode: code, grain: configuration.grain })
  const sideGlass = fslGlassOptions.find(item => item.asset)!
  if (sidelites !== 'none') configuration.sideliteGlass = { glass: sideGlass.name, glassCategory: 'Decorative Glass', glassAsset: sideGlass.asset }
  const appearance: PdfProductAppearance = { glass, jambFinish: finish, sideliteAssetSrc: sideliteSlabAsset(family, 'fsl'), sideliteMaskSrc: sideliteGlassMask(family, 'fsl'), sideliteGlassSrc: sideGlass.asset, sideliteClearGlassBase: true }
  return { configuration, appearance }
}
const grid = fixture('F', 'paint-black', 'none', 'single', 'f-clear-grids')
grid.configuration.grid = { glassCoating: 'Low-E', gridLocation: 'SDL', gridPattern: '6 Lite', gridStyle: 'Flat' }
grid.appearance.glass = { ...grid.configuration.glass!, overlaysByDoorStyle: { F: '/assets/hgi-assets/Glass/F/INTERNAL GRIDS/FINT6LWH.webp' } }
grid.appearance.gridMatchesFinish = true
const sideGrid = fixture('F', 'paint-brown', 'both-sides', 'single', 'f-clear-no-grids')
sideGrid.configuration.sideliteGlass = { glass: 'Clear Glass with Grids', glassCategory: 'Clear Glass', gridLocation: 'SDL', gridPattern: '3 Lite', gridStyle: 'Flat' }
sideGrid.appearance.sideliteGlassSrc = fslGridAsset('3 Lite', 'Bronze')
sideGrid.appearance.sideliteGlassIsGrid = true
sideGrid.appearance.sideliteGridMatchesFinish = true
const independent = fixture('F1', 'paint-black')
independent.appearance.jambFinish = finishes.find(item => item.id === 'paint-white')!
const complex = fixture('F', 'stain-nutmeg', 'both-sides', 'french', 'f-clear-no-grids')
complex.appearance.glassFrameFinish = finishes.find(item => item.id === 'paint-white')!
complex.appearance.jambFinish = finishes.find(item => item.id === 'paint-brown')!
const sat = fixture('SAT', 'paint-black', 'none', 'single', 'sat-clear-nonstock')
sat.appearance.glassFrameFinish = finishes.find(item => item.id === 'paint-brown')!
const hrt = fixture('HRT', 'paint-brown', 'none', 'single', 'hrt-clear-s11rt')
hrt.appearance.glassFrameFinish = finishes.find(item => item.id === 'paint-black')!
function activeFrenchFixture(right: boolean) {
  const item = fixture('2PHD', 'paint-white', 'lock-side', 'french')
  item.configuration.doubleDoorLockPrep = 'DDLLAC'
  item.configuration.doorSwing = { id: right ? 'RHI' : 'LHI', name: right ? 'Right Hand Inswing' : 'Left Hand Inswing', image: '' }
  return item
}
function halfSideliteFixture(lineId: string, finishId = 'paint-clay') {
  const item = fixture('N1', finishId, 'lock-side', 'single', undefined, lineId)
  const family = sideliteAssetFamilyForSlab({ doorLineId: lineId })
  const glass = sslGlassOptions.find(option => option.asset)!
  item.configuration.sideliteSlab = 'ssl'
  item.configuration.sideliteGlass = { glass: glass.name, glassCategory: 'Decorative Glass', glassAsset: glass.asset }
  Object.assign(item.appearance, { sideliteAssetSrc: sideliteSlabAsset(family, 'ssl'), sideliteMaskSrc: sideliteGlassMask(family, 'ssl'), sideliteGlassSrc: glass.asset })
  return item
}
const fixtures = [
  { name: 'single-paint', ...fixture('2PHD', 'paint-white') },
  { name: 'black', ...fixture('F1', 'paint-black') },
  { name: 'grain-stain', ...fixture('2PHD', 'stain-nutmeg') },
  { name: 'glass', ...fixture('F', 'paint-brown', 'none', 'single', 'f-clear-no-grids') },
  { name: 'glass-grids', ...grid },
  { name: 'one-sidelite', ...fixture('F1', 'paint-black', 'hinge-side') },
  { name: 'both-sidelites', ...fixture('F1', 'paint-black', 'both-sides') },
  { name: 'sidelite-grid', ...sideGrid },
  { name: 'french', ...fixture('2PHD', 'paint-brown', 'none', 'french') },
  { name: 'independent-jamb', ...independent },
  { name: 'hardware', ...fixture('F1', 'paint-brown') },
  { name: 'complex', ...complex },
  { name: 'savannah', ...fixture('2PHD', 'paint-black', 'lock-side', 'savannah') },
  ...['black-cherry', 'harvest-wheat', 'natural-gold', 'toasted-caramel'].map(id => ({ name: id, ...fixture('2PHD', `stain-${id}`) })),
  { name: 'SAT', ...sat },
  { name: 'HRT', ...hrt },
  { name: 'F48-glass', ...fixture('F48', 'paint-brown', 'none', 'single', 'f48-clear-no-grids') },
  { name: 'F482-glass', ...fixture('F482', 'paint-black', 'none', 'single', 'f48-clear-no-grids') },
  { name: 'half-lite', ...fixture('S', 'paint-white', 'none', 'single', 's-clear-no-grids') },
  ...(['DDLLAC', 'DDLLKP'] as const).map(prep => {
    const item = fixture('F1', 'paint-black', 'none', 'french')
    item.configuration.doubleDoorLockPrep = prep
    return { name: prep, ...item }
  }),
  ...['white', 'clay', 'black'].map(id => ({ name: `N1-${id}`, ...fixture('N1', `paint-${id}`, 'lock-side', 'single', undefined, '20-gauge-smooth-steel') })),
  { name: 'N1-stain', ...fixture('N1', 'stain-nutmeg', 'lock-side') },
  { name: 'smooth-steel-ssl', ...halfSideliteFixture('20-gauge-smooth-steel') },
  { name: 'textured-fiberglass-ssl', ...halfSideliteFixture('textured-fiberglass') },
  ...['20-gauge-smooth-steel', 'textured-fiberglass'].flatMap(line => ['musket', 'wineberry', 'terratone', 'black', 'white'].map(color => {
    const item = halfSideliteFixture(line, `paint-${color}`)
    item.appearance.glassFrameFinish = item.configuration.finish
    return { name: `ssl-relief-${line}-${color}`, ...item }
  })),
  { name: 'ssl-relief-dark-stain', ...halfSideliteFixture('textured-fiberglass', 'stain-black-cherry') },
  { name: 'french-left-active', ...activeFrenchFixture(false) },
  { name: 'french-right-active', ...activeFrenchFixture(true) },
  ...[
    ['F', 'paint-white', 'f-clear-no-grids'], ['F', 'paint-black', 'f-clear-no-grids'],
    ['F', 'stain-nutmeg', 'f-clear-no-grids'], ['S', 'stain-black-cherry', 's-clear-no-grids'],
    ['HRT', 'stain-nutmeg', 'hrt-clear-s11rt'], ['SAT', 'stain-nutmeg', 'sat-clear-nonstock'],
  ].map(([code, finishId, glassId]) => {
    const item = fixture(code, finishId, 'none', 'single', glassId)
    item.appearance.glassFrameFinish = item.configuration.finish
    return { name: `plain-frame-${code}-${finishId}`, ...item }
  }),
  ...(['LHI', 'RHI'] as const).flatMap(handing => (['left', 'right'] as const).map(side => {
    const item = fixture('F', 'paint-clay', side, 'single', 'f-clear-no-grids')
    item.configuration.doorSwing = { id: handing, name: handing === 'LHI' ? 'Left Hand Inswing' : 'Right Hand Inswing', image: '' }
    return { name: `single-osli-${handing}-${side}`, ...item }
  })),
  ...(['F', 'F48'] as const).flatMap(code => glassOptions.filter(glass => restoredFullLiteDecorativeGlassIds.has(glass.id) && glass.overlaysByDoorStyle[code]).map(glass => ({ name: `restored-${code}-${glass.id}`, ...fixture(code, 'paint-white', 'none', 'single', glass.id) }))),
  ...fslGlassOptions.filter(glass => glass.category === 'decorative' && !isApprovedDecorativeGlassName(glass.name)).map(glass => {
    const item = fixture('F', 'paint-white', 'right', 'single', 'courtyard')
    item.configuration.sideliteGlass = { glass: glass.name, glassCategory: 'Decorative Glass', glassAsset: glass.asset }
    item.appearance.sideliteGlassSrc = glass.asset
    return { name: `restored-FSL-${glass.id}`, ...item }
  }),
  ...['signature-series', '20-gauge-smooth-steel', 'brushed-smooth-fiberglass'].map(line => ({ name: `six-panel-${line}`, ...fixture('S1NGSS', 'paint-white', 'none', 'single', undefined, line) })),
  { name: 'explicit-terratone', ...fixture('F1', 'paint-terratone', 'none', 'single', undefined, '20-gauge-smooth-steel') },
  ...(['LHI', 'RHI'] as const).map(id => {
    const item = fixture('F', 'paint-clay', 'both-sides', 'savannah', 'f-clear-no-grids')
    item.configuration.doorSwing = { id, name: id === 'LHI' ? 'Left Hand Inswing' : 'Right Hand Inswing', image: '' }
    item.configuration.doubleDoorLockPrep = 'DDLLAC'
    return { name: `savannah-inswing-${id}`, ...item }
  }),
  ...['F48', 'F482'].flatMap(code => [4, 6, 12].map(lites => {
    const item = fixture(code, 'paint-clay', 'none', 'single', 'f48-clear-grids')
    item.configuration.grid = { glassCoating: 'Low-E', gridLocation: 'SDL', gridPattern: `${lites} Lite` }
    item.appearance.glass = { ...item.configuration.glass!, overlaysByDoorStyle: { [code]: `/assets/hgi-assets/Glass/F48/INTERNAL GRIDS/F48INT${lites}LWH.webp` } }
    item.appearance.gridMatchesFinish = true
    return { name: `three-quarter-sdl-${code}-${lites}`, ...item }
  })),
]
let liveRoot: Root | undefined
Object.assign(window, {
  async mountLiveFixture(index: number, view: 'Exterior' | 'Interior' = 'Exterior') {
    liveRoot?.unmount()
    const container = document.getElementById('live-preview') ?? document.body.appendChild(Object.assign(document.createElement('div'), { id: 'live-preview' }))
    container.style.width = '450px'
    liveRoot = createRoot(container)
    const { configuration: c, appearance } = fixtures[index]
    await new Promise<void>(resolve => liveRoot!.render(createElement(DoorPreview, {
      ...appearance, style: c.style, finish: c.finish, product: c.product, grain: c.grain,
      hardware: c.hardware, doorSwing: c.doorSwing, sidelites: c.sidelites,
      doorConfigurationType: c.doorConfigurationType, doubleDoorLockPrep: c.doubleDoorLockPrep,
      applyFinish: true, showViewToggle: false, view,
      renderConfigurationKey: `pdf-live-fixture-${index}`,
      onRenderReadinessChange: state => { if (state.ready) resolve() },
    })))
    return { finishId: c.finish.id, finishHex: c.finish.color, finishName: c.finish.name }
  },
  pdfFixtures: fixtures.map(item => item.name),
  async sslReliefSurface(index: number) {
    const { configuration: c, appearance: a } = fixtures[index]
    const slab = await loadPdfImage(a.sideliteAssetSrc!), mask = await loadPdfImage(a.sideliteMaskSrc!)
    return renderSslRelief(slab, mask, c.finish.color).toDataURL('image/png')
  },
  async captureSslReference() {
    const result = await captureFinalDoorPreview(document.querySelector<HTMLElement>('#live-preview')!, { frameMode: 'visible', preserveCanonicalFrameBounds: true })
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = reject
      reader.readAsDataURL(result.blob)
    })
  },
  restoredFixtureDetails(index: number) {
    const { configuration: c } = fixtures[index]
    let payload = null
    try { payload = buildDoorBuilderSubmissionPayload({ contact: { fullName: 'Glass Test', email: '', phone: '', zip: '', notes: '' }, configuration: c }) } catch { /* Historical fixtures must no longer be submittable. */ }
    return { glassId: c.glass?.id, mainAsset: c.glass?.overlaysByDoorStyle[c.style.code], sideAsset: c.sideliteGlass?.glassAsset,
      mainName: c.glass?.name, sideName: c.sideliteGlass?.glass,
      payload }
  },
  async renderFixture(index: number) {
    const { configuration, appearance } = fixtures[index]
    return renderPdfProduct(configuration, appearance)
  },
  async createFinishPdf(index: number) {
    const { configuration: c, appearance } = fixtures[index]
    const result = await renderPdfProduct(c, appearance)
    const pdf = await generateSummaryPdf({ fullName: 'Finish Regression', email: 'test@example.com', phone: '5551234567', zip: '12345', notes: '' }, c.product, c.style, c.grain, c.finish, c.glass, c.grid, c.hardware, c.doorSwing, c.sidelites, 'FSL', c.sideliteGlass, { jambType: 'timber', jambFinishType: c.finish.finishType, jambFinishColor: c.finish.name, jambFinishOverridden: false }, c.doorConfigurationType, result.dataUrl, c.doubleDoorLockPrep)
    return pdf.output('datauristring')
  },
  async renderMissingAsset() {
    return renderPdfProduct(complex.configuration, { ...complex.appearance, sideliteGlassSrc: '/assets/missing-pdf-glass.png' })
  },
  async renderDelayedAsset() {
    const configuration = structuredClone(complex.configuration)
    const pending = renderPdfProduct(configuration, { ...complex.appearance, sideliteAssetSrc: `${complex.appearance.sideliteAssetSrc}?pdf-delay-test` })
    configuration.finish = finishes.find(item => item.id === 'paint-white')!
    return pending // Later state mutation must not alter this in-flight render.
  },
  async renderHardwareVariant() {
    const item = fixtures[10]
    return renderPdfProduct({ ...item.configuration, hardware: hardwareOptions.find(h => h.style !== item.configuration.hardware.style)! }, item.appearance)
  },
  async renderWithoutGrid() {
    return renderPdfProduct(grid.configuration, { ...grid.appearance, glass: glassOptions.find(item => item.id === 'f-clear-no-grids')!, gridMatchesFinish: false })
  },
  async createPdf() {
    const { configuration: c, appearance } = complex
    const result = await renderPdfProduct(c, appearance)
    const pdf = await generateSummaryPdf({ fullName: 'PDF Test Customer', email: 'test@example.com', phone: '5551234567', zip: '12345', notes: '' }, c.product, c.style, c.grain, c.finish, c.glass, c.grid, c.hardware, c.doorSwing, c.sidelites, 'FSL', c.sideliteGlass, { jambType: 'timber', jambFinishType: 'paint', jambFinishColor: 'Brown', jambFinishOverridden: true }, c.doorConfigurationType, result.dataUrl, c.doubleDoorLockPrep)
    return pdf.output('datauristring')
  },
  async downloadPdf() {
    const { configuration: c, appearance } = complex
    const result = await renderPdfProduct(c, appearance)
    await downloadSummary({ fullName: 'PDF Test Customer', email: 'test@example.com', phone: '5551234567', zip: '12345', notes: '' }, c.product, c.style, c.grain, c.finish, c.glass, c.grid, c.hardware, c.doorSwing, c.sidelites, 'FSL', c.sideliteGlass, { jambType: 'timber', jambFinishType: 'paint', jambFinishColor: 'Brown', jambFinishOverridden: true }, c.doorConfigurationType, result.dataUrl, c.doubleDoorLockPrep)
  },
})
