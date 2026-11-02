import type { DoorConfiguration, Finish } from '../types'
import { buildPreviewMasks, fitGlassOverlayToMask, buildHrtClearTrimMask, buildSatGlassFrameMask, isUsableDoorSlabImage, FINISH_RENDERING, type DoorPreviewProps } from '../components/DoorPreview'
import { resolveDoorPreviewCandidates } from '../data/doorPreviewAssets'
import { resolveGlassMaskAsset } from '../data/glassMaskAssets'
import { glassFrameMaskForOpening } from '../data/glassFrameMasks'
import { glassDoorCodes } from '../data/productCatalog'
import { glassOptions } from '../data/glassOptions'
import { hardwarePreviewAssetUrl } from '../data/hardware'
import { doorHardwarePlacements } from '../data/doorConfigurationRules'
import { sidelitePlacement } from '../data/sideliteConfigurations'
import { doorHandingSides } from '../data/doorHanding'
import { createCanonicalEntranceGeometry, ENTRANCE_GEOMETRY } from '../features/home-visualizer/entranceGeometry'
import { renderSslRelief } from './sideliteRelief'
import { darkFinishStrength, renderDarkFinishSurface, frameFinishLighting } from './finishDetail'

// Resolved asset selection is shared with the builder, not re-guessed from
// human-readable grid labels. This is immutable data, never a DOM reference.
export type PdfProductAppearance = Pick<DoorPreviewProps, 'glass' | 'sideliteAssetSrc' | 'sideliteMaskSrc' | 'sideliteGlassSrc' | 'sideliteClearGlassBase' | 'sideliteGlassIsGrid' | 'sideliteGridColor' | 'sideliteGridIsPrairie' | 'gridMatchesFinish' | 'sideliteGridMatchesFinish' | 'jambFinish' | 'glassFrameFinish'>
export const PDF_PRODUCT_SIZE = { width: 1200, height: 1600 } as const
const PIXEL_SCALE = 3
const imageCache = new Map<string, Promise<HTMLImageElement>>()

function canvas(width: number, height: number) {
  const result = document.createElement('canvas')
  result.width = Math.round(width)
  result.height = Math.round(height)
  return result
}
function context(target: HTMLCanvasElement) {
  const result = target.getContext('2d', { willReadFrequently: true })
  if (!result) throw new Error('Canvas is unavailable for PDF product rendering.')
  result.imageSmoothingEnabled = true
  result.imageSmoothingQuality = 'high'
  return result
}
export function loadPdfImage(url: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(url)
  if (cached) return cached
  const pending = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = async () => {
      try { await image.decode(); resolve(image) }
      catch { reject(new Error(`PDF asset could not be decoded: ${url}`)) }
    }
    image.onerror = () => reject(new Error(`PDF asset could not be loaded: ${url}`))
    image.src = url
  })
  imageCache.set(url, pending)
  void pending.catch(() => { if (imageCache.get(url) === pending) imageCache.delete(url) })
  return pending
}

type Masks = NonNullable<ReturnType<typeof buildPreviewMasks>>
type PreparedSurface = { image: HTMLCanvasElement; masks: Masks | null; glass?: HTMLImageElement; frame?: HTMLImageElement; reliefSource?: { slab: HTMLImageElement; mask?: HTMLImageElement; ssl: boolean } }

async function prepareSurface(slab: HTMLImageElement, mask: HTMLImageElement | undefined, finish: Finish, code: string, opening?: HTMLImageElement, sidelite = false): Promise<PreparedSurface> {
  const masks = mask ? buildPreviewMasks(mask, slab, !sidelite, glassFrameMaskForOpening(sidelite ? null : code), opening) : null
  if (mask && !masks) throw new Error(`PDF mask dimensions do not match slab: ${mask.src} / ${slab.src}`)
  const finishMask = masks ? await loadPdfImage(masks.finishUrl) : undefined
  const result = canvas(slab.naturalWidth * PIXEL_SCALE, slab.naturalHeight * PIXEL_SCALE)
  const ctx = context(result)
  ctx.scale(PIXEL_SCALE, PIXEL_SCALE)
  ctx.drawImage(slab, 0, 0)
  const painted = canvas(result.width, result.height)
  const paint = context(painted)
  paint.scale(PIXEL_SCALE, PIXEL_SCALE)
  // Opaque selected finish, then the same contrast/detail multipliers as the
  // live preview. Multiply can darken relief, never wash black out with white.
  paint.fillStyle = finish.color
  if (finish.finishType === 'stain') paint.filter = `saturate(${FINISH_RENDERING.stainSaturation})`
  paint.fillRect(0, 0, slab.naturalWidth, slab.naturalHeight)
  paint.globalCompositeOperation = 'multiply'
  paint.globalAlpha = finish.finishType === 'paint' ? FINISH_RENDERING.paintDetailOpacity : FINISH_RENDERING.stainDetailOpacity
  paint.filter = `grayscale(1) contrast(${finish.finishType === 'paint' ? 1.12 : FINISH_RENDERING.stainContrast})`
  paint.drawImage(slab, 0, 0)
  const ssl = sidelite && code.toLowerCase() === 'ssl' && Boolean(mask)
  const reliefSource = { slab, mask: ssl ? mask : finishMask, ssl }
  if (ssl || darkFinishStrength(finish.color) > 0) {
    paint.globalCompositeOperation = 'source-over'
    paint.globalAlpha = 1
    paint.filter = 'none'
    paint.drawImage(ssl ? renderSslRelief(slab, mask!, finish.color) : renderDarkFinishSurface(slab, finishMask, finish.color, finish.finishType), 0, 0)
  }
  paint.globalAlpha = 1
  paint.filter = 'none'
  // Solid slab artwork can be translucent relief, not a material silhouette.
  // Match the live preview's opaque solid-slab mask; only a real glass-opening
  // mask may remove finish pixels. Using slab alpha here washed paint out on PDF white.
  if (finishMask) {
    paint.globalCompositeOperation = 'destination-in'
    paint.drawImage(finishMask, 0, 0)
  }
  paint.globalCompositeOperation = 'source-over'
  ctx.drawImage(painted, 0, 0, slab.naturalWidth, slab.naturalHeight)
  return { image: result, masks, glass: masks?.glassUrl ? await loadPdfImage(masks.glassUrl) : undefined, frame: masks?.glassFrameUrl ? await loadPdfImage(masks.glassFrameUrl) : undefined, reliefSource }
}

async function fittedGlass(overlay: HTMLImageElement, surface: PreparedSurface, code: string, id?: string, sidelite = false, grid = false, prairie = false, alignmentReference?: HTMLImageElement) {
  const mask = surface.masks
  if (!mask?.glassBounds) throw new Error(`PDF glass opening is missing for ${code}.`)
  const arts = overlay.src.includes('/FART')
  if (sidelite && grid && !prairie && !overlay.src.includes('Arts%20Crafts') && !overlay.src.includes('Arts Crafts')) return overlay
  const fullSidelite = sidelite && code === 'fsl'
  const mainPrairie = !sidelite && ['S', 'F48', 'F482'].includes(code) && overlay.src.includes('/FPRA')
  const offset = !sidelite && arts && ['S', 'F48', 'F482'].includes(code) ? mask.glassBounds.height * (code === 'S' ? .4 : .2) : id === 'f48-clear-f648l' ? mask.glassBounds.height * .08 : 0
  const result = fitGlassOverlayToMask(overlay, mask.maskWidth, mask.maskHeight, mask.glassBounds, offset, sidelite || glassFrameMaskForOpening(code).separateOpenings ? mask.glassRegions : undefined, 1.5, mainPrairie, fullSidelite || mainPrairie, fullSidelite || (mainPrairie && code === 'S'), alignmentReference)
  if (!result) throw new Error(`PDF glass artwork has no visible pixels: ${overlay.src}`)
  return loadPdfImage(result)
}

function clippedLayer(image: CanvasImageSource, mask: HTMLImageElement | undefined, width: number, height: number, tint?: string) {
  const result = canvas(width * PIXEL_SCALE, height * PIXEL_SCALE)
  const ctx = context(result)
  if (tint) { ctx.fillStyle = tint; ctx.fillRect(0, 0, result.width, result.height); ctx.globalCompositeOperation = 'destination-in' }
  ctx.drawImage(image, 0, 0, result.width, result.height)
  ctx.globalCompositeOperation = 'destination-in'
  if (mask) ctx.drawImage(mask, 0, 0, result.width, result.height)
  ctx.globalCompositeOperation = 'source-over'
  return result
}

function recolorPrairie(image: HTMLImageElement, color: string) {
  const match = /^#([\da-f]{6})$/i.exec(color)
  if (!match) throw new Error(`Unsupported PDF grid color: ${color}`)
  const target = [0, 2, 4].map(offset => parseInt(match[1].slice(offset, offset + 2), 16))
  const result = canvas(image.naturalWidth, image.naturalHeight)
  const ctx = context(result)
  ctx.drawImage(image, 0, 0)
  const pixels = ctx.getImageData(0, 0, result.width, result.height)
  for (let i = 0; i < pixels.data.length; i += 4) {
    const rgb = Array.from(pixels.data.slice(i, i + 3)), lightness = rgb.reduce((a, b) => a + b) / 3
    if (pixels.data[i + 3] && lightness > 226 && Math.max(...rgb) - Math.min(...rgb) < 18) {
      const strength = Math.min(1, (lightness - 226) / 29)
      rgb.forEach((value, channel) => { pixels.data[i + channel] = Math.round(value + (target[channel] - value) * strength) })
    }
  }
  ctx.putImageData(pixels, 0, 0)
  return result
}

/** PDF-only product render. No html2canvas, computed CSS, viewport or DPR. */
export async function renderPdfProduct(configuration: DoorConfiguration, appearance: PdfProductAppearance) {
  // Export is always OSLI, independent of the live preview's selected view.
  const view = 'Exterior' as const
  // Freeze one generation before the first await; no layer reads later state.
  const config = structuredClone(configuration)
  const assets = structuredClone(appearance)
  const codes = config.product.styleCodes.length ? config.product.styleCodes : [config.style.code]
  const code = codes.find(item => glassDoorCodes.has(item)) ?? codes[0]
  const candidates = resolveDoorPreviewCandidates(config.style, config.finish.finishType, config.product, config.grain)
  if (!candidates.length) throw new Error(`No PDF slab asset is mapped for ${config.style.name}.`)
  // Fallback is only between the existing authored candidates, never an
  // uncolored/default door. The complete failure names all attempted assets.
  const failures: string[] = []
  let slab: HTMLImageElement | undefined
  for (const url of candidates) {
    try {
      const candidate = await loadPdfImage(url)
      if (!isUsableDoorSlabImage(candidate)) throw new Error(`PDF slab artwork is invalid: ${url}`)
      slab = candidate; break
    }
    catch (error) { failures.push(error instanceof Error ? error.message : url) }
  }
  if (!slab) throw new Error(failures.join('\n'))
  const maskUrl = glassDoorCodes.has(code) ? code === 'HRT' && slab.src.includes('/Textured/') ? '/assets/masks/HRT-textured.png' : resolveGlassMaskAsset(code) : null
  if (glassDoorCodes.has(code) && !maskUrl) throw new Error(`No PDF glass mask is mapped for ${code}.`)
  const selectedGlass = assets.glass
  const glassUrl = selectedGlass ? codes.map(item => selectedGlass.overlaysByDoorStyle[item]).find(Boolean) : undefined
  if (selectedGlass && !glassUrl) throw new Error(`No PDF glass asset is mapped for ${selectedGlass.name} / ${code}.`)
  const gridClear = ['f-clear-grids', 'f48-clear-grids', 's-clear-grids'].includes(selectedGlass?.id ?? '') || Boolean(selectedGlass?.orderingCodes?.includes('EXTG'))
  const clearUrl = gridClear ? glassOptions.find(item => item.id === (code === 'S' ? 's-clear-no-grids' : ['F48', 'F482'].includes(code) ? 'f48-clear-no-grids' : 'f-clear-no-grids'))?.overlaysByDoorStyle[code] : undefined
  const hardwareUrl = hardwarePreviewAssetUrl(config.hardware, view, config.doorSwing)
  if (!hardwareUrl) throw new Error(`No PDF hardware asset is mapped for ${config.hardware.manufacturer} / ${config.hardware.style} / ${config.hardware.finish}.`)
  const placement = sidelitePlacement(config.sidelites, config.doorSwing.id, config.doorConfigurationType)
  if (placement !== 'none' && (!assets.sideliteAssetSrc || !assets.sideliteMaskSrc)) throw new Error('PDF sidelite slab/mask assets are missing.')
  if (placement !== 'none' && config.sideliteGlass && !assets.sideliteGlassSrc && !assets.sideliteClearGlassBase) throw new Error(`PDF sidelite glass asset is missing: ${config.sideliteGlass.glass}`)
  const urls = [maskUrl, code === 'HRT' ? '/assets/masks/HRT.png' : undefined, glassUrl, clearUrl, hardwareUrl, ...(placement !== 'none' ? [assets.sideliteAssetSrc, assets.sideliteMaskSrc, assets.sideliteGlassSrc] : [])].filter((url): url is string => Boolean(url))
  const loaded = new Map(await Promise.all([...new Set(urls)].map(async url => [url, await loadPdfImage(url)] as const)))
  const get = (url?: string | null) => url ? loaded.get(url) : undefined
  const main = await prepareSurface(slab, get(maskUrl), config.finish, code, get(code === 'HRT' ? '/assets/masks/HRT.png' : undefined))
  const side = placement !== 'none' ? await prepareSurface(get(assets.sideliteAssetSrc)!, get(assets.sideliteMaskSrc), config.finish, config.sideliteSlab ?? '', undefined, true) : undefined
  const alignF48Grid = code === 'F48' && selectedGlass?.id === 'f48-clear-grids' && /\/F48INT\d+L/.test(glassUrl ?? '')
  const alignmentReference = alignF48Grid ? get(clearUrl) : undefined
  const glass = glassUrl ? code === 'SAT' || code === 'HRT' ? get(glassUrl)! : await fittedGlass(get(glassUrl)!, main, code, selectedGlass?.id, false, false, false, alignmentReference) : undefined
  const fitClearBase = code === 'F482' || alignF48Grid
  const clear = clearUrl ? fitClearBase ? await fittedGlass(get(clearUrl)!, main, code) : get(clearUrl) : undefined
  const sideGlass = side && assets.sideliteGlassSrc ? await fittedGlass(get(assets.sideliteGlassSrc)!, side, config.sideliteSlab ?? '', undefined, true, assets.sideliteGlassIsGrid, assets.sideliteGridIsPrairie) : undefined
  const satFrameUrl = code === 'SAT' && glass ? buildSatGlassFrameMask(glass) : undefined
  const satFrame = satFrameUrl ? await loadPdfImage(satFrameUrl) : undefined
  const hrtTrimUrl = code === 'HRT' && selectedGlass?.id === 'hrt-clear-s11rt' && glass ? buildHrtClearTrimMask(glass) : undefined
  const hrtTrim = hrtTrimUrl ? await loadPdfImage(hrtTrimUrl) : undefined
  const geometry = createCanonicalEntranceGeometry({ doorConfigurationType: config.doorConfigurationType ?? 'single', sidelites: placement, variant: 'exterior', openingOnly: false })
  const output = canvas(PDF_PRODUCT_SIZE.width, PDF_PRODUCT_SIZE.height)
  const ctx = context(output)
  const scale = Math.min((output.width - 32) / geometry.totalWidth, (output.height - 32) / geometry.totalHeight)
  ctx.translate((output.width - geometry.totalWidth * scale) / 2, (output.height - geometry.totalHeight * scale) / 2)
  ctx.scale(scale, scale)
  const jambColor = assets.jambFinish?.color ?? config.finish.color
  const frameLighting = frameFinishLighting(jambColor, 'exterior', assets.jambFinish?.finishType ?? config.finish.finishType)
  function frameFill(x: number, width: number) {
    const gradient = ctx.createLinearGradient(x, 0, x + width, 0)
    gradient.addColorStop(0, frameLighting.shadow); gradient.addColorStop(.18, jambColor)
    gradient.addColorStop(.5, frameLighting.highlight); gradient.addColorStop(.82, jambColor)
    gradient.addColorStop(1, frameLighting.shadow)
    return gradient
  }
  ctx.fillStyle = frameFill(0, geometry.totalWidth)
  ctx.fillRect(0, 0, geometry.totalWidth, geometry.thresholdTop)
  ctx.clearRect(geometry.contentLeft, geometry.contentTop, geometry.openingWidth, geometry.openingHeight)

  function drawGlassFrame(surface: PreparedSurface, frame = surface.frame) {
    const finish = assets.glassFrameFinish
    if (!finish || !frame) return
    const width = surface.image.width / PIXEL_SCALE, height = surface.image.height / PIXEL_SCALE
    const relief = surface.reliefSource
    const tint = relief && (relief.ssl || darkFinishStrength(finish.color) > 0)
      ? clippedLayer(relief.ssl ? renderSslRelief(relief.slab, relief.mask, finish.color) : renderDarkFinishSurface(relief.slab, relief.mask, finish.color, finish.finishType), frame, width, height)
      : clippedLayer(frame, undefined, width, height, finish.color)
    ctx.drawImage(tint, 0, 0, ENTRANCE_GEOMETRY.slabWidth, geometry.openingHeight)
  }
  function drawSide(x: number) {
    if (!side) return
    ctx.save(); ctx.translate(x, geometry.contentTop)
    ctx.scale(ENTRANCE_GEOMETRY.sideliteWidth / ENTRANCE_GEOMETRY.slabWidth, 1)
    ctx.drawImage(side.image, 0, 0, ENTRANCE_GEOMETRY.slabWidth, geometry.openingHeight)
    if (assets.sideliteClearGlassBase && side.glass) {
      ctx.drawImage(clippedLayer(side.glass, undefined, side.image.width / PIXEL_SCALE, side.image.height / PIXEL_SCALE, '#e6edef'), 0, 0, ENTRANCE_GEOMETRY.slabWidth, geometry.openingHeight)
    }
    if (sideGlass) {
      const prairieTint = assets.sideliteGridIsPrairie && assets.sideliteGridColor && !/\/(?:FSL|F48SL|SSL)(?:%20| )Prairie/i.test(assets.sideliteGlassSrc ?? '')
      const image = prairieTint ? recolorPrairie(sideGlass, assets.sideliteGridColor!) : sideGlass
      ctx.drawImage(clippedLayer(image, side.glass, side.image.width / PIXEL_SCALE, side.image.height / PIXEL_SCALE, assets.sideliteGridMatchesFinish ? config.finish.color : undefined), 0, 0, ENTRANCE_GEOMETRY.slabWidth, geometry.openingHeight)
    }
    drawGlassFrame(side)
    ctx.restore()
  }
  if (geometry.hasLeft) drawSide(geometry.contentLeft)
  if (geometry.hasRight) drawSide(geometry.doorLeft + geometry.doorAssemblyWidth + geometry.rightMullionWidth)
  const exteriorSide = doorHandingSides(config.doorSwing.id, view).lockSide
  const placements = doorHardwarePlacements(config.doorConfigurationType, exteriorSide, exteriorSide, config.doubleDoorLockPrep)
  const leaves = config.doorConfigurationType === 'french' || config.doorConfigurationType === 'savannah' ? 2 : 1
  for (let leaf = 0; leaf < leaves; leaf += 1) {
    ctx.save()
    ctx.translate(geometry.doorLeft + leaf * (ENTRANCE_GEOMETRY.slabWidth + geometry.centerMeetingStileWidth), geometry.contentTop)
    ctx.beginPath(); ctx.rect(0, 0, ENTRANCE_GEOMETRY.slabWidth, geometry.openingHeight); ctx.clip()
    ctx.drawImage(main.image, 0, 0, ENTRANCE_GEOMETRY.slabWidth, geometry.openingHeight)
    if (clear) ctx.drawImage(clippedLayer(clear, main.glass, slab.naturalWidth, slab.naturalHeight), 0, 0, 242, 549)
    if (glass) {
      ctx.save()
      if (code === 'SAT') { ctx.translate(121, 284.5); ctx.scale(1.1, 1.1); ctx.translate(-121, -274.5) }
      ctx.drawImage(clippedLayer(glass, code === 'SAT' || (code === 'HRT' && selectedGlass?.id !== 'hrt-clear-s11rt') ? undefined : main.glass, slab.naturalWidth, slab.naturalHeight, assets.gridMatchesFinish ? config.finish.color : undefined), 0, 0, 242, 549)
      if (hrtTrim && assets.glassFrameFinish) { ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(clippedLayer(hrtTrim, main.glass, slab.naturalWidth, slab.naturalHeight, assets.glassFrameFinish.color), 0, 0, 242, 549); ctx.globalCompositeOperation = 'source-over' }
      ctx.restore()
    }
    if (code === 'SAT') { ctx.save(); ctx.translate(121, 274.5 + 10); ctx.scale(1.1, 1.1); ctx.translate(-121, -274.5); drawGlassFrame(main, satFrame); ctx.restore() }
    else drawGlassFrame(main)
    const hardware = placements.find(item => item.leafIndex === leaf)
    if (hardware) {
      ctx.save()
      const readable = /keypad|number|touchscreen|electronic|smart|logo|engraving/i.test(`${config.hardware.manufacturer} ${config.hardware.style}`)
      if (hardware.side === 'left') {
        if (readable) ctx.translate(-242 * .82, 0)
        else { ctx.translate(242, 0); ctx.scale(-1, 1) }
      }
      if (hardware.mode === 'knob-only' && config.hardware.crop?.knobOnly) {
        const crop = config.hardware.crop.knobOnly
        ctx.beginPath(); ctx.rect(242 * crop.left / 100, 549 * crop.top / 100, 242 * (1 - (crop.left + crop.right) / 100), 549 * (1 - (crop.top + crop.bottom) / 100)); ctx.clip()
      }
      ctx.drawImage(get(hardwareUrl)!, 0, 0, 242, 549)
      ctx.restore()
    }
    ctx.restore()
  }
  // Explicit final structural details: mullions, meeting stile and threshold.
  const divider = (x: number, width: number) => { ctx.fillStyle = frameFill(x, width); ctx.fillRect(x, geometry.contentTop, width, geometry.openingHeight) }
  if (geometry.hasLeft) divider(geometry.contentLeft + geometry.leftSideliteWidth, geometry.mullionWidth)
  if (geometry.hasRight) divider(geometry.doorLeft + geometry.doorAssemblyWidth, geometry.mullionWidth)
  if (geometry.centerMeetingStileWidth) divider(geometry.centerMeetingStileLeft, geometry.centerMeetingStileWidth)
  ctx.fillStyle = '#111211'; ctx.fillRect(0, geometry.thresholdTop, geometry.totalWidth, ENTRANCE_GEOMETRY.thresholdHeight)
  ctx.fillStyle = '#3c3d3b'; ctx.fillRect(3, geometry.thresholdTop + 2, geometry.totalWidth - 6, 2)
  return { dataUrl: output.toDataURL('image/png'), width: output.width, height: output.height, assets: [slab.src, ...urls], geometry, view }
}
