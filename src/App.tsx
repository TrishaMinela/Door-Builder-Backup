import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react'
import { ArrowLeft, ArrowRight, Check, Download, ExternalLink, Eye, FileText, HelpCircle, Home as HomeIcon, RotateCcw, Send, ShieldCheck } from 'lucide-react'
import { DoorPreview, type DoorPreviewProps } from './components/DoorPreview'
import { DoorStyleCard } from './components/DoorStyleCard'
import { sidelitePreviewLabel } from './utils/sidelitePreviewLabel'
import { HardwareOptionCard } from './components/HardwareOptionCard'
import { OptionCard } from './components/OptionCard'
import { QuoteForm } from './components/QuoteForm'
import { SubmissionConfirmation } from './components/SubmissionConfirmation'
import { SiteFooter } from './components/SiteFooter'
import { DealerMode, useDealerSession } from './components/DealerMode'
import { DealerContextGate } from './components/DealerContextGate'
import { DealerBrandMark } from './components/DealerBrandMark'
import type { PublicDealerBrand } from './types/dealerBranding'
import { dealerBrandStyle, isLightBrandColor } from './utils/dealerBranding'
import { sortByDisplayLabel } from './utils/sortByDisplayLabel'
import { validOptionId } from './utils/optionSelection'
import { builderGroupForPage, builderGroupStart, type BuilderGroup } from './utils/builderNavigation'
import { clearGlassOption, retainGlassSelection } from './utils/retainGlassSelection'
import { useInventoryShadow } from './inventory-shadow/useInventoryShadow'
import { usePublishedCatalogShadow } from './published-catalog/usePublishedCatalogShadow'
import { useProductCardLayout } from './utils/useProductCardLayout'
import { safeDynamicImport } from './utils/staleChunkRecovery'
import { doorStyles, finishes, glassOptions } from './data/options'
import { hardwareDisplayName, hardwareOptions } from './data/hardware'
import { autoGrainForDoorLine, doorLineChoicesForStyle, doorStyleSupportsGlass, finishesForStyle, finishTypesForDoorLine, glassDoorCodes, resolveDoorProduct } from './data/productCatalog'
import { approvedPrivacyGlassIds } from './data/privacyGlass'
import { builderUx } from './config/builderUx'
import { matchingJambFinish } from './utils/matchingFrameFinish'
import { isCustomerSelectableGlass, isHiddenDecorativeGlass } from './data/customerGlassAvailability'
import { isGlassFamilyCompatible } from './data/glassFamilyCompatibility'
import { clicAvailable, isClicGlass } from './data/clicGlass'
import { externalGridArtwork } from './data/externalGridArtwork'
import type { ContactForm, DoorConfiguration, DoorConfigurationType, DoorSwing, DoubleDoorLockPrepCode, GlassCoating, GlassOption, GridColor, GridConfiguration, GridPattern, GridStyle, GridWidth, HardwareView, PreviewHardware, SideliteConfiguration, SideliteGlassConfiguration } from './types'
import { DEFAULT_FRENCH_LOCK_PREP, doorConfigurationLabel, lockSetupOptionsForHardware, requiredDoorConfigurationProductOption } from './data/doorConfigurationRules'
import { doorSwingDisplayName, savannahOpening } from './data/doorHanding'
import { configurationPdfName } from './utils/pdfConfig'
import { buildDoorBuilderSubmissionPayload, submitQuote } from './utils/submission'
import { fslArtsAndCraftsGridAsset, fslGlassCategories, fslGlassOptions, fslGridAsset, fslLowEStyleRules, fslPrairieGridAsset, fslSdlPatterns, fslStandardStyleRules, type FslGridLocationId, type SideliteGlassCategory, type SideliteGlassOption } from './data/fslGlass'
import { f48slArtsAndCraftsGridAsset, f48slGlassCategories, f48slGlassOptions, f48slGridAsset, f48slLowEStyleRules, f48slPrairieGridAsset, f48slStandardStyleRules } from './data/f48slGlass'
import { sslArtsAndCraftsGridAsset, sslGlassCategories, sslGlassOptions, sslGridAsset, sslLowEStyleRules, sslPrairieGridAsset, sslStandardStyleRules } from './data/sslGlass'
import { s2slGlassCategories, s2slGlassOptions, s2slStyleRules } from './data/s2slGlass'
import { cr14slGlassCategories, cr14slGlassOptions, cr14slGridAsset, cr14slStyleRules } from './data/cr14slGlass'
import { glassSelectionThumbnail } from './data/glassOptions'
import { cladColors } from './data/finishes'
import { HomeVisualizer } from './features/home-visualizer/HomeVisualizer'
import { HERO_PRESETS, heroDoorFilename, type HeroPreset } from './data/heroPresets'
import { HeroDoorGenerator } from './features/hero/HeroDoorGenerator'
import { HomepageDoorShowcase } from './features/hero/HomepageDoorShowcase'
import { normalizeLegacySidelite, sideliteBuilderOptions, sidelitePlacement, sideliteProductCode, sideliteRelationshipLabel } from './data/sideliteConfigurations'
import { sideliteAssetFamilyForSlab, sideliteGlassMask, sideliteSlabAsset, sideliteStylesForFamily, type SideliteStyleId } from './data/sideliteAssets'
import { clearDoorBuilderDraft, loadDoorBuilderDraft, saveDoorBuilderDraft, type DoorBuilderDraftConfiguration } from './utils/doorBuilderDraft'
import { UNSELECTED_FINISH } from './utils/customerFinish'
import { doorStyleDisplayName, sideliteStyleDisplayName, glassDisplayName, sideliteConfigurationDisplayName } from './data/productDisplayNames'

type BuilderPage = 'door-configuration' | 'door-style' | 'door-line' | 'door-grain' | 'sidelites' | 'sidelite-style' | 'door-finish' | 'jamb-type' | 'jamb-finish' | 'glass-type' | 'glass' | 'glass-variant' | 'glass-frame-color' | 'grid-location' | 'grid-style' | 'grid-pattern' | 'grid-color' | 'grid-width' | 'sidelite-glass-type' | 'sidelite-glass' | 'sidelite-glass-variant' | 'sidelite-grid-location' | 'sidelite-grid-style' | 'sidelite-grid-pattern' | 'sidelite-grid-color' | 'sidelite-grid-width' | 'lock-setup' | 'hardware' | 'door-swing' | 'review'
const mainDoorGlassPages = new Set<BuilderPage>(['glass-type', 'glass', 'glass-variant', 'grid-location', 'grid-style', 'grid-pattern', 'grid-color', 'grid-width'])
const sideliteGlassPages = new Set<BuilderPage>(['sidelite-glass-type', 'sidelite-glass', 'sidelite-glass-variant', 'sidelite-grid-location', 'sidelite-grid-style', 'sidelite-grid-pattern', 'sidelite-grid-color', 'sidelite-grid-width'])
type GlassCategory = 'clear' | 'decorative' | 'privacy' | 'blinds' | 'clic' | 'retro'
const initialContact: ContactForm = { fullName: '', email: '', phone: '', zip: '', notes: '' }
const emptyPreviewHardware: PreviewHardware = { color: '#191919', type: 'long' }
const temporaryPreviewHardware = hardwareOptions.find(item => item.manufacturer === 'Schlage' && item.style === 'Georgian Knob with Deadbolt' && item.finish === 'Matte Black')
const proMatchTooltipTitle = 'About ProMatch® Colors'
const proMatchTooltipText = 'ProMatch® colors are custom-blended to coordinate across select HGI products. Each painted door is carefully prepared, finished with two coats of enamel, and oven-baked for a smooth, durable finish backed by a 15-year warranty.'
const timberStainTooltipTitle = 'About TimberStain®'
const timberStainTooltipText = 'TimberStain® finishes use nature-inspired colors and are hand-applied to enhance the door’s natural texture and grain. Each finish is oven-cured, protected with a durable clear coat, and backed by a 15-year warranty.'
const proMatchNote = 'Colors may appear differently depending on the material, lighting, and screen. Confirm your final selection with an official color sample.'
const doorConfigurationOptions: { id: DoorConfigurationType; name: string; description: string; image: string }[] = [
  { id: 'single', name: doorConfigurationLabel('single'), description: 'One standard entry door.', image: '/assets/door-configurations/single-door.webp' },
  { id: 'french', name: doorConfigurationLabel('french'), description: 'Two operating door panels.', image: '/assets/door-configurations/french-door.webp' },
  { id: 'savannah', name: doorConfigurationLabel('savannah'), description: 'Double-door appearance with one fixed panel.', image: '/assets/door-configurations/savannah-door.webp' },
]

function doorCatalogModelName(name: string) {
  return doorStyleDisplayName({ name })
}

function FinishInfoTooltip({ title, body, note, ariaLabel, tooltipId }: { title: string; body: string; note: string; ariaLabel: string; tooltipId: string }) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ left: 12, top: 12 })
  const wrapperRef = useRef<HTMLSpanElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const tooltipRef = useRef<HTMLSpanElement>(null)

  const updatePosition = () => {
    const button = buttonRef.current
    if (!button) return
    const rect = button.getBoundingClientRect()
    const tooltipWidth = Math.min(340, window.innerWidth - 24)
    const tooltipHeight = tooltipRef.current?.getBoundingClientRect().height ?? 190
    const left = Math.max(12, Math.min(rect.right - tooltipWidth, window.innerWidth - tooltipWidth - 12))
    const top = rect.bottom + 8 + tooltipHeight <= window.innerHeight
      ? rect.bottom + 8
      : Math.max(12, rect.top - tooltipHeight - 8)
    setPosition({ left, top })
  }

  const showTooltip = () => {
    updatePosition()
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }
    const reposition = () => updatePosition()
    const positionFrame = requestAnimationFrame(reposition)
    document.addEventListener('pointerdown', closeOnOutsidePress)
    document.addEventListener('keydown', closeOnEscape)
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)
    return () => {
      cancelAnimationFrame(positionFrame)
      document.removeEventListener('pointerdown', closeOnOutsidePress)
      document.removeEventListener('keydown', closeOnEscape)
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', reposition, true)
    }
  }, [open])

  return <span
    ref={wrapperRef}
    className="promatch-help"
    onMouseEnter={showTooltip}
    onMouseLeave={() => setOpen(false)}
  >
    <button
      ref={buttonRef}
      type="button"
      aria-label={ariaLabel}
      aria-expanded={open}
      aria-controls={tooltipId}
      onClick={showTooltip}
      onFocus={showTooltip}
      onBlur={(event) => {
        if (!wrapperRef.current?.contains(event.relatedTarget as Node | null)) setOpen(false)
      }}
    >
      <HelpCircle size={16} aria-hidden="true" />
    </button>
    {open && <span
      ref={tooltipRef}
      id={tooltipId}
      className="promatch-tooltip"
      role="tooltip"
      style={{ left: position.left, top: position.top }}
    >
      <strong>{title}</strong>
      <span>{body}</span>
      <span className="finish-tooltip-note">{note}</span>
    </span>}
  </span>
}

function ProMatchInfo() {
  return <FinishInfoTooltip title={proMatchTooltipTitle} body={proMatchTooltipText} note={proMatchNote} ariaLabel="What are ProMatch colors?" tooltipId="promatch-colors-tooltip" />
}

function TimberStainInfo() {
  return <FinishInfoTooltip title={timberStainTooltipTitle} body={timberStainTooltipText} note={proMatchNote} ariaLabel="What are TimberStain finishes?" tooltipId="timberstain-finishes-tooltip" />
}

const sideliteStyleOptions = [
  { id: 'fsl', name: 'FSL' },
  { id: 'f48sl', name: 'F48SL' },
  { id: 'ssl', name: 'SSL' },
  { id: 's2sl', name: 'S2SL' },
  { id: 'cr14sl', name: 'CR14SL' },
] as const
const sideliteGlassCatalogs = {
  fsl: { categories: fslGlassCategories, options: fslGlassOptions, standardRules: fslStandardStyleRules, lowERules: fslLowEStyleRules, gridAsset: fslGridAsset, prairieGridAsset: fslPrairieGridAsset, artsAndCraftsGridAsset: fslArtsAndCraftsGridAsset, prairiePattern: '5 Lite' as GridPattern, sdlPatterns: ['3 Lite', '4 Lite', '5 Lite'] as GridPattern[] },
  f48sl: { categories: f48slGlassCategories, options: f48slGlassOptions, standardRules: f48slStandardStyleRules, lowERules: f48slLowEStyleRules, gridAsset: f48slGridAsset, prairieGridAsset: f48slPrairieGridAsset, artsAndCraftsGridAsset: f48slArtsAndCraftsGridAsset, prairiePattern: '4 Lite' as GridPattern, sdlPatterns: ['2 Lite', '3 Lite', '4 Lite'] as GridPattern[] },
  ssl: { categories: sslGlassCategories, options: sslGlassOptions, standardRules: sslStandardStyleRules, lowERules: sslLowEStyleRules, gridAsset: sslGridAsset, prairieGridAsset: sslPrairieGridAsset, artsAndCraftsGridAsset: sslArtsAndCraftsGridAsset, prairiePattern: '3 Lite' as GridPattern, sdlPatterns: ['3 Lite'] as GridPattern[] },
  s2sl: { categories: s2slGlassCategories, options: s2slGlassOptions, standardRules: s2slStyleRules, lowERules: s2slStyleRules, gridAsset: () => '', prairiePattern: '3 Lite' as GridPattern, sdlPatterns: [] as GridPattern[] },
  cr14sl: { categories: cr14slGlassCategories, options: cr14slGlassOptions, standardRules: cr14slStyleRules, lowERules: cr14slStyleRules, gridAsset: cr14slGridAsset, prairiePattern: '3 Lite' as GridPattern, sdlPatterns: [] as GridPattern[] },
}
const defaultClearSideliteGlass = (catalog: (typeof sideliteGlassCatalogs)[keyof typeof sideliteGlassCatalogs] | null | undefined) =>
  catalog?.options.find((option) => option.id === 'clear-no-grids')
  ?? catalog?.options.find((option) => option.id === 'clear')
  ?? catalog?.options.find((option) => option.category === 'clear')
const groupSideliteGlassOptions = (options: SideliteGlassOption[]) => [...options.reduce((groups, option) => {
  const title = isClicGlass(option) ? option.name : option.name.split(/\s+[–-]\s+/)[0]
  const key = title.toLowerCase()
  const existing = groups.get(key)
  if (existing) existing.options.push(option)
  else groups.set(key, { key, title, options: [option] })
  return groups
}, new Map<string, { key: string; title: string; options: SideliteGlassOption[] }>()).values()]
const glassVariantLabel = (name: string) => name.split(/\s+[–-]\s+/)[1] ?? name
const signatureSeriesId = 'signature-series'
const FULL_LITE_GRID_GLASS_ID = 'f-clear-grids'
const F48_GRID_GLASS_ID = 'f48-clear-grids'
const S_GRID_GLASS_ID = 's-clear-grids'
const gridLocations = [
  { id: 'external', name: 'External Grids', image: '/assets/grid-options/External Grids.webp' },
  { id: 'internal', name: 'Internal Grids', image: '/assets/grid-options/Internal Grids.webp' },
  { id: 'sdl', name: 'SDL Grids', image: '/assets/grid-options/SDL Grids.webp' },
] as const
const gridStyles: { id: GridStyle; image: string }[] = [
  { id: 'Contoured', image: '/assets/grid-options/Contoured Grids.webp' },
  { id: 'Flat', image: '/assets/grid-options/Flat Grids.webp' },
  { id: 'Prairie', image: '/assets/grid-options/Prairie Grids.webp' },
]
const lowEGridStyles: { id: GridStyle; image: string }[] = [
  { id: 'Arts & Crafts', image: '/assets/grid-options/Arts & Crafts Grid.webp' },
  ...gridStyles,
]
const flatGridPatterns: { id: GridPattern; image: string }[] = [
  { id: '4 Lite', image: '/assets/hgi-assets/Glass/F/INTERNAL GRIDS/FINT4LBE.webp' },
  { id: '4 Lite Horizontal', image: '/assets/hgi-assets/Glass/F/INTERNAL GRIDS/FINT4LHBE.webp' },
  { id: '6 Lite', image: '/assets/hgi-assets/Glass/F/INTERNAL GRIDS/FINT6LBE.webp' },
  { id: '8 Lite', image: '/assets/hgi-assets/Glass/F/INTERNAL GRIDS/FINT8LBE.webp' },
  { id: '10 Lite', image: '/assets/hgi-assets/Glass/F/INTERNAL GRIDS/FINT10LBE.webp' },
  { id: '12 Lite', image: '/assets/hgi-assets/Glass/F/INTERNAL GRIDS/FINT12LBE.webp' },
  { id: '15 Lite', image: '/assets/hgi-assets/Glass/F/INTERNAL GRIDS/FINT15LBE.webp' },
]
const allGridPatterns: { id: GridPattern; image: string }[] = [
  { id: '2 Lite', image: '/assets/grid-options/All Lites.webp' },
  { id: '3 Lite', image: '/assets/grid-options/All Lites.webp' },
  ...flatGridPatterns.slice(0, 4),
  { id: '9 Lite', image: '/assets/grid-options/All Lites.webp' },
  ...flatGridPatterns.slice(4),
]
const internalGridPatternCodes: Partial<Record<GridPattern, string>> = { '2 Lite': '2L', '3 Lite': '3L', '4 Lite': '4L', '4 Lite Horizontal': '4LH', '6 Lite': '6L', '8 Lite': '8L', '9 Lite': '9L', '10 Lite': '10L', '12 Lite': '12L', '15 Lite': '15L' }
const internalGridColorCodes: Partial<Record<GridColor, string>> = { Beige: 'BE', Black: 'BK', Bronze: 'BZ', 'Bronze/White': 'WH', Champagne: 'CH', Tan: 'TA', White: 'WH' }
const internalGridAsset = (pattern: GridPattern, color: GridColor) => `/assets/hgi-assets/Glass/F/INTERNAL GRIDS/FINT${internalGridPatternCodes[pattern]}${internalGridColorCodes[color]}.webp`
const f48GridColorCodes: Partial<Record<GridColor, string>> = { Beige: 'BE', Black: 'BL', Bronze: 'BR', 'Bronze/White': 'WH', Champagne: 'CH', Tan: 'TA', White: 'WH' }
const f48InternalGridAsset = (pattern: GridPattern, color: GridColor) => `/assets/hgi-assets/Glass/F48/INTERNAL GRIDS/F48INT${internalGridPatternCodes[pattern]}${f48GridColorCodes[color]}.webp`
const sGridColorCodes: Partial<Record<GridColor, string>> = { Beige: 'BE', Black: 'BL', Bronze: 'BR', 'Bronze/White': 'WH', Champagne: 'CH', Tan: 'TA', White: 'WH' }
const sInternalGridAsset = (pattern: GridPattern, color: GridColor) => `/assets/hgi-assets/Glass/S/INTERNAL GRIDS/SINT${internalGridPatternCodes[pattern]}${sGridColorCodes[color]}.webp`
const contouredGridAssets: Partial<Record<GridPattern, Partial<Record<GridColor, string>>>> = {
  '4 Lite': { White: '/assets/hgi-assets/Glass/F/INTERNAL GRIDS/FINT4LWH.webp' },
  '10 Lite': {
    Champagne: '/assets/hgi-assets/Glass/F/INTERNAL GRIDS/FINT10LCH.webp',
    White: '/assets/hgi-assets/Glass/F/INTERNAL GRIDS/FINT10LWH.webp',
  },
  '15 Lite': { Champagne: '/assets/hgi-assets/Glass/F/INTERNAL GRIDS/FINT15LCH.webp' },
}
const prairieGridAssets: Partial<Record<GridColor, string>> = {
  White: '/assets/hgi-assets/Glass/F/INTERNAL GRIDS/FPRAWH.webp',
  Champagne: '/assets/hgi-assets/Glass/F/INTERNAL GRIDS/FPRACH.webp',
  Beige: '/assets/hgi-assets/Glass/F/INTERNAL GRIDS/FPRACHBE.webp',
  Tan: '/assets/hgi-assets/Glass/F/INTERNAL GRIDS/FPRACHTA.webp',
}
const gridColorValues: Partial<Record<GridColor, string>> = {
  Beige: '#d8c5a4', Black: '#161616', Bronze: '#6f4b32', 'Bronze/White': 'linear-gradient(90deg,#6f4b32 0 50%,#f4f4ef 50%)', Champagne: '#d5bd8e', Tan: '#b18b62', White: '#f4f4ef',
}
type GridWidthRules = Partial<Record<GridColor, GridWidth[]>>
const flatGridRules: Partial<Record<GridPattern, GridWidthRules>> = {
  '4 Lite': { Bronze: ['5/8"'], Tan: ['7/8"'], White: ['5/8"', '7/8"'] },
  '4 Lite Horizontal': { Bronze: ['5/8"'], Champagne: ['5/8"'], Tan: ['7/8"'], White: ['5/8"', '7/8"'] },
  '6 Lite': { Bronze: ['5/8"'], Champagne: ['5/8"'], Tan: ['7/8"'], White: ['5/8"', '7/8"'] },
  '8 Lite': { Bronze: ['5/8"'], Champagne: ['5/8"'], Tan: ['7/8"'], White: ['5/8"', '7/8"'] },
  '10 Lite': { Beige: ['5/8"', '7/8"'], Bronze: ['5/8"'], Tan: ['7/8"'], White: ['5/8"', '7/8"'] },
  '12 Lite': { Tan: ['7/8"'] },
  '15 Lite': { Beige: ['5/8"', '7/8"'], Bronze: ['5/8"'], Champagne: ['5/8"', '7/8"'], Tan: ['5/8"', '7/8"'] },
}
const prairieGridRules: GridWidthRules = { Beige: [], Tan: ['7/8"'], White: ['7/8"', '11/16"'] }
const bothFlatWidths: GridWidth[] = ['5/8"', '7/8"']
const lowEFlatGridRules: Partial<Record<GridPattern, GridWidthRules>> = {
  '4 Lite': { Beige: bothFlatWidths, Black: bothFlatWidths, Bronze: ['5/8"'], 'Bronze/White': bothFlatWidths, Tan: ['7/8"'], White: bothFlatWidths },
  '4 Lite Horizontal': { Beige: bothFlatWidths, Black: bothFlatWidths, Bronze: ['5/8"'], 'Bronze/White': bothFlatWidths, Champagne: ['5/8"'], Tan: ['7/8"'], White: bothFlatWidths },
  '6 Lite': { Black: bothFlatWidths, Bronze: ['5/8"'], 'Bronze/White': bothFlatWidths, Champagne: ['5/8"'], Tan: ['7/8"'], White: bothFlatWidths },
  '8 Lite': { Beige: bothFlatWidths, Black: bothFlatWidths, Bronze: ['5/8"'], 'Bronze/White': bothFlatWidths, Champagne: ['5/8"'], Tan: ['7/8"'], White: bothFlatWidths },
  '10 Lite': { Beige: bothFlatWidths, Black: bothFlatWidths, Bronze: ['5/8"'], 'Bronze/White': bothFlatWidths, Champagne: ['5/8"'], Tan: ['7/8"'], White: bothFlatWidths },
  '12 Lite': { Tan: ['7/8"'] },
  '15 Lite': { Beige: bothFlatWidths, Black: bothFlatWidths, Bronze: ['5/8"'], 'Bronze/White': bothFlatWidths, Champagne: ['5/8"'], Tan: bothFlatWidths },
}
const lowEContouredRules: Partial<Record<GridPattern, GridWidthRules>> = {
  '4 Lite': { White: ['11/16"'] },
  '10 Lite': { Champagne: ['11/16"'], White: ['11/16"'] },
  '15 Lite': { Champagne: ['11/16"'] },
}
const lowEArtsRules: Partial<Record<GridPattern, GridWidthRules>> = {
  '3 Lite': { White: ['5/8"'] }, '4 Lite': { White: ['5/8"'] },
}
const lowEPrairieGridRules: GridWidthRules = { Beige: [], Champagne: ['5/8"', '11/16"'], Tan: ['7/8"'], White: ['5/8"', '7/8"', '11/16"'] }
const f48StandardFlatRules: Partial<Record<GridPattern, GridWidthRules>> = {
  '3 Lite': { Bronze: ['5/8"'], Champagne: ['5/8"'], Tan: ['7/8"'], White: ['5/8"', '7/8"'] },
  '4 Lite': { Beige: ['5/8"'], Bronze: ['5/8"'], Champagne: ['5/8"'], Tan: ['7/8"'], White: ['5/8"', '7/8"'] },
  '6 Lite': { Beige: ['5/8"'], Bronze: ['5/8"'], Champagne: ['5/8"'], Tan: ['7/8"'], White: ['5/8"', '7/8"'] },
  '8 Lite': { Bronze: ['5/8"'], Champagne: ['5/8"'], Tan: ['7/8"'], White: ['5/8"', '7/8"'] },
  '12 Lite': { Bronze: ['5/8"'], Champagne: ['5/8"'], Tan: ['7/8"'], White: ['5/8"', '7/8"'] },
}
const f48LowEFlatRules: Partial<Record<GridPattern, GridWidthRules>> = {
  '3 Lite': { Beige: bothFlatWidths, Black: bothFlatWidths, Bronze: ['5/8"'], 'Bronze/White': bothFlatWidths, Champagne: ['5/8"'], Tan: ['7/8"'], White: ['7/8"'] },
  '4 Lite': { Beige: bothFlatWidths, Black: bothFlatWidths, Bronze: ['5/8"'], 'Bronze/White': bothFlatWidths, Champagne: ['5/8"'], Tan: ['7/8"'], White: bothFlatWidths },
  '6 Lite': { Beige: bothFlatWidths, Black: bothFlatWidths, Bronze: ['5/8"'], 'Bronze/White': bothFlatWidths, Champagne: ['5/8"'], Tan: ['7/8"'], White: bothFlatWidths },
  '8 Lite': { Beige: bothFlatWidths, Black: bothFlatWidths, Bronze: ['5/8"'], 'Bronze/White': bothFlatWidths, Champagne: ['5/8"'], Tan: ['7/8"'], White: bothFlatWidths },
  '12 Lite': { Beige: bothFlatWidths, Black: bothFlatWidths, Bronze: ['5/8"'], 'Bronze/White': bothFlatWidths, Champagne: bothFlatWidths, Tan: ['7/8"'], White: bothFlatWidths },
}
const f48StandardContouredRules: Partial<Record<GridPattern, GridWidthRules>> = { '12 Lite': { Champagne: ['11/16"'], White: ['11/16"'] } }
const f48LowEContouredRules: Partial<Record<GridPattern, GridWidthRules>> = { '4 Lite': { White: ['11/16"'] }, '12 Lite': { Champagne: ['11/16"'], White: ['11/16"'] } }
const f48StandardPrairieRules: GridWidthRules = { White: ['5/8"', '7/8"', '11/16"'] }
const f48LowEPrairieRules: GridWidthRules = { Beige: [], Champagne: ['5/8"', '11/16"'], Tan: ['7/8"'], White: ['5/8"', '7/8"', '11/16"'] }
const sStandardFlatRules: Partial<Record<GridPattern, GridWidthRules>> = {
  '4 Lite': { Beige: ['5/8"'], Bronze: ['5/8"'], Champagne: ['5/8"'], Tan: ['7/8"'], White: ['5/8"', '7/8"'] },
  '9 Lite': { Beige: bothFlatWidths, Bronze: ['5/8"'], Champagne: ['5/8"'], Tan: bothFlatWidths, White: ['7/8"'] },
}
const sLowEFlatRules: Partial<Record<GridPattern, GridWidthRules>> = {
  '2 Lite': { Tan: ['7/8"'] },
  '4 Lite': { Beige: bothFlatWidths, Black: bothFlatWidths, Bronze: ['5/8"'], 'Bronze/White': bothFlatWidths, Champagne: ['5/8"'], Tan: ['7/8"'], White: bothFlatWidths },
  '9 Lite': { Beige: bothFlatWidths, Black: bothFlatWidths, Bronze: ['5/8"'], 'Bronze/White': bothFlatWidths, Champagne: ['5/8"'], Tan: bothFlatWidths, White: ['7/8"'] },
}
const sStandardContouredRules: Partial<Record<GridPattern, GridWidthRules>> = { '9 Lite': { Champagne: ['11/16"'], White: ['11/16"'] } }
const sLowEContouredRules: Partial<Record<GridPattern, GridWidthRules>> = { '4 Lite': { White: ['11/16"'] }, '9 Lite': { Champagne: ['11/16"'], White: ['11/16"'] } }
const sStandardPrairieRules: GridWidthRules = { White: ['5/8"', '7/8"', '11/16"'] }
const sLowEPrairieRules: GridWidthRules = { Beige: [], Champagne: ['5/8"', '11/16"'], Tan: ['7/8"'], White: ['5/8"', '7/8"', '11/16"'] }
function gridRuleWidths(style: GridStyle | '', pattern: GridPattern | '', color: GridColor | '', lowE: boolean): GridWidth[] | undefined {
  if (!style || !color) return undefined
  if (style === 'Prairie') return (lowE ? lowEPrairieGridRules : prairieGridRules)[color]
  if (!pattern) return undefined
  const rules = lowE
    ? style === 'Arts & Crafts' ? lowEArtsRules : style === 'Contoured' ? lowEContouredRules : lowEFlatGridRules
    : style === 'Contoured' ? { '15 Lite': { Champagne: ['11/16"' as GridWidth] } } : style === 'Flat' ? flatGridRules : {}
  return rules[pattern]?.[color]
}
const HERO_DOOR_OPENING = {
  leftPct: 45.3,
  topPct: 25.12,
  widthPct: 17.86,
  heightPct: 40.51,
} as const
const heroDoorOpeningStyle = {
  left: `${HERO_DOOR_OPENING.leftPct}%`,
  top: `${HERO_DOOR_OPENING.topPct}%`,
  width: `${HERO_DOOR_OPENING.widthPct}%`,
  height: `${HERO_DOOR_OPENING.heightPct}%`,
} as CSSProperties
const heroSceneStyle = {
  '--hero-door-center-y': `${HERO_DOOR_OPENING.topPct + HERO_DOOR_OPENING.heightPct / 2}%`,
} as CSSProperties
const HERO_FINISH_SPECS: Record<HeroPreset['finishKey'], { baseId: string; name: string; colorId?: string }> = {
  'black-paint': { baseId: 'paint-black', name: 'Black Paint' },
  'white-paint': { baseId: 'paint-white', name: 'White Paint' },
  'natural-stain': { baseId: 'stain-natural-gold', name: 'Natural Stain' },
  'harvest-stain': { baseId: 'stain-harvest-wheat', name: 'Harvest Stain' },
  'nutmeg-stain': { baseId: 'stain-nutmeg', name: 'Nutmeg Stain' },
  'toasted-caramel-stain': { baseId: 'stain-toasted-caramel', name: 'Toasted Caramel Stain' },
  'brown-stain': { baseId: 'stain-cinnamon', colorId: 'paint-brown', name: 'Brown Stain' },
  'black-cherry-stain': { baseId: 'stain-black-cherry', name: 'Black Cherry Stain' },
}
const grainThumbnails: Record<string, string> = {
  Cherry: '/assets/door-lines/grains/cherry.webp',
  Fir: '/assets/door-lines/grains/fir.webp',
  Mahogany: '/assets/door-lines/grains/mahogany.webp',
  Oak: '/assets/door-lines/grains/oak.webp',
}
const signatureGrainChoices = (['Cherry', 'Fir', 'Mahogany', 'Oak'] as const).map((grain) => ({
  id: grain,
  name: grain,
  image: grainThumbnails[grain],
}))
const doorSwingOptions: DoorSwing[] = [
  { id: 'LHI', name: 'Left Hand Inswing', image: '/assets/door-swing/lhi.webp' },
  { id: 'LHO', name: 'Left Hand Outswing', image: '/assets/door-swing/lho.webp' },
  { id: 'RHI', name: 'Right Hand Inswing', image: '/assets/door-swing/rhi.webp' },
  { id: 'RHO', name: 'Right Hand Outswing', image: '/assets/door-swing/rho.webp' },
]
const hardwareStyleGroups = [...hardwareOptions.reduce((groups, option) => {
  const key = `${option.manufacturer}|${option.style}`
  const options = groups.get(key) ?? []
  options.push(option)
  groups.set(key, options)
  return groups
}, new Map<string, typeof hardwareOptions>()).values()]

type GlassOptionGroup = {
  key: string
  title: string
  options: GlassOption[]
}

function glassGroupTitle(option: GlassOption) {
  return option.name.includes(' - ') ? option.name.split(' - ')[0] : option.name
}

function glassGroupKey(option: GlassOption) {
  return glassGroupTitle(option).toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

const glassCategoryChoices: { id: GlassCategory; name: string; description: string; image: string }[] = [
  { id: 'clear', name: 'Clear Glass', description: 'Clear glass and clear grille options.', image: '/assets/glass/thumbnails/Clear.webp' },
  { id: 'decorative', name: 'Decorative Glass', description: 'Decorative glass designs and caming finishes.', image: '/assets/glass/thumbnails/Decorative.webp' },
  { id: 'privacy', name: 'Privacy Glass', description: 'Textured glass designed for added privacy.', image: '/assets/glass/thumbnails/Privacy.webp' },
  { id: 'blinds', name: 'Mini Blinds', description: 'Glass options with integrated mini blinds.', image: '/assets/glass/thumbnails/Blinds.webp' },
  { id: 'clic', name: 'CLiC Glass', description: 'CLiC enclosed-glass options.', image: '/assets/glass/thumbnails/CLIC.webp' },
]
const retroGlassCategory = { id: 'retro' as const, name: 'Retro', description: 'Explore all available Retro glass options.', image: '/assets/glass/thumbnails/Retro.webp' }

const clearGlassIds = new Set(['clear', 'f-clear-no-grids', 'f-clear-grids', 'clear-low-e', 'cr14-divided-lites', 'f-f10l', 'f-f15wh', 'f-prairie-internal', 'f-ten-lite', 'f-clear-f10', 'f-clear-f10l', 'f-clear-f15', 'f-clear-f15int', 'f-clear-f15intl', 'f-clear-fpraint', 'f-clear-ften', 'f-clear-nonstock', 'f48-clear-f1248', 'f48-clear-f1248l', 'f48-clear-f648l', 'f48-clear-nonstock', 'frt-clear-f17rt', 'hrt-clear-s11rt', 'n-clear-ncl', 'qa-clear-qacl', 'sat-clear-nonstock', 'so-clear-nonstock', 'so-clear-small-no-coating', 'so-clear-small-low-e', 's-clear-s5', 's-clear-s5l', 's-clear-s9', 's-clear-s9int', 's-clear-s9intl', 's-clear-sv6', 's-clear-nonstock', 'sw-clear-swg'])
clearGlassIds.add(F48_GRID_GLASS_ID)
clearGlassIds.add('f48-clear-no-grids')
clearGlassIds.add(S_GRID_GLASS_ID)
clearGlassIds.add('s-clear-no-grids')
const legacyFullLiteGlassIds = new Set(['clear', 'f-f10l', 'f-f15wh', 'f-prairie-internal', 'f-ten-lite', 'f-clear-f10', 'f-clear-f10l', 'f-clear-nonstock', 'f-clear-f15', 'f-clear-f15int', 'f-clear-f15intl', 'f-clear-fpraint', 'f-clear-ften', 'f-blinds-15', 'blinds-espresso', 'blinds-gray', 'blinds-sand', 'blinds-silver', 'blinds-tan', 'blinds-white'])
const legacyF48ClearGlassIds = new Set(['clear-low-e', 'f48-clear-f1248', 'f48-clear-f1248l', 'f48-clear-f648l', 'f48-clear-nonstock'])
const legacySHalfLiteClearGlassIds = new Set(['clear', 'clear-low-e', 's-clear-s5', 's-clear-s5l', 's-clear-s9', 's-clear-s9int', 's-clear-s9intl', 's-clear-sv6', 's-clear-nonstock'])
const f48GlassOptionIds = new Set(['f48-clear-f1248', 'f48-clear-f1248l', 'f48-clear-f648l', 'f48-clear-nonstock', 'f48-blinds-white', 'f48-clic-nogrid', 'f48-clic-ext-12l', 'ashbury', 'berkley', 'briselle', 'cadence', 'calandra', 'courtyard', 'crosswalk', 'cyndi', 'dorian-nickel', 'dorian-patina', 'edgewood', 'elegant-black-white', 'elegant-nickel', 'elegant-patina', 'empire', 'fragrance', 'garrison', 'grace-nickel', 'grace-patina', 'heirlooms-brass', 'heirlooms-nickel', 'high-point', 'jameston', 'majestic-nickel', 'majestic-patina', 'margate', 'metro', 'mistify', 'mohave', 'monterey-nickel', 'monterey-patina', 'neo', 'nouveau-nickel', 'nouveau-patina', 'oak-park', 'paris', 'pembrook', 'prestige', 'rill', 'riverwood', 'sterling', 'topaz', 'vilano', 'vincraft', 'waterside', 'baroque', 'blanca', 'chinchilla', 'cumulus', 'double-water', 'micro-granite', 'rain', 'streamed', 'vapor', 'wide-reed'])
f48GlassOptionIds.add(F48_GRID_GLASS_ID)
f48GlassOptionIds.add('f48-clear-no-grids')
const privacyGlassIds = approvedPrivacyGlassIds

function glassCategory(option: GlassOption): GlassCategory {
  const key = `${option.id} ${option.name}`.toLowerCase()
  if (key.includes('clic')) return 'clic'
  if (key.includes('blind')) return 'blinds'
  if (clearGlassIds.has(option.id)) return 'clear'
  if (privacyGlassIds.has(option.id)) return 'privacy'
  return 'decorative'
}

function styleCodesForGlass(style: typeof doorStyles[number]) {
  return [...new Set([style.code, ...style.variants.map((variant) => variant.code)])]
}

function EmptyDoorPreview() {
  return (
    <div className="empty-door-preview" aria-label="No door preview selected yet">
      <span>Choose a door style to preview your design.</span>
    </div>
  )
}

function DoorBuilderApp({ dealerSlug, dealerBrand }: { dealerSlug: string | null; dealerBrand: PublicDealerBrand | null }) {
  const freshDoorStyleId = doorStyles.find(item => item.code === 'F')?.id ?? ''
  const [initialDraft] = useState(loadDoorBuilderDraft)
  const restoredDoorFinishId = initialDraft?.selectedFinishType === 'stain' ? initialDraft.selectedStain : initialDraft?.selectedFinishType === 'paint' ? initialDraft.selectedPaint : ''
  const lastJambDoorFinishId = useRef(restoredDoorFinishId)
  const lastGlassFrameDoorFinishId = useRef(restoredDoorFinishId)
  const [returningFromVisualizer, setReturningFromVisualizer] = useState(false)
  const [editReturnTo, setEditReturnTo] = useState<'summary' | 'visualizer' | null>(null)
  const [editPageId, setEditPageId] = useState<BuilderPage | null>(null)
  const [editReturnError, setEditReturnError] = useState('')
  const [visualizerSessionStarted, setVisualizerSessionStarted] = useState(false)
  const [screen, setScreen] = useState<'home' | 'builder' | 'customer-form' | 'visualizer'>('home')

  useEffect(() => {
    if (!dealerBrand) return
    const previousTitle = document.title
    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    const previousCanonical = canonical?.href
    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]')
    const createdRobots = !robots
    if (!robots) {
      robots = document.createElement('meta')
      robots.name = 'robots'
      document.head.appendChild(robots)
    }
    const previousRobots = robots.content
    document.title = `${dealerBrand.companyName} | Home Guard Door Builder`
    if (canonical) canonical.href = 'https://www.hgidoorbuilder.com/'
    robots.content = 'noindex,follow'
    return () => {
      document.title = previousTitle
      if (canonical && previousCanonical) canonical.href = previousCanonical
      if (createdRobots) robots?.remove()
      else if (robots) robots.content = previousRobots
    }
  }, [dealerBrand])
  const [step, setStep] = useState(0)
  const [selectedDoorConfigurationType, setSelectedDoorConfigurationType] = useState<DoorConfigurationType | ''>(initialDraft?.selectedDoorConfigurationType ?? '')
  const [styleId, setStyleId] = useState(initialDraft?.styleId || freshDoorStyleId)
  const [doorLineId, setDoorLineId] = useState(initialDraft?.doorLineId ?? '')
  const [grainId, setGrainId] = useState(initialDraft?.grainId ?? '')
  const [sidelites, setSidelites] = useState<SideliteConfiguration | ''>(initialDraft?.sidelites ?? '')
  const [sideliteStyleId, setSideliteStyleId] = useState(initialDraft?.sideliteStyleId ?? '')
  const [sideliteGlassCategory, setSideliteGlassCategory] = useState<SideliteGlassCategory | ''>(initialDraft?.sideliteGlassCategory ?? '')
  const [sideliteGlassId, setSideliteGlassId] = useState(initialDraft?.sideliteGlassId ?? '')
  const [sideliteGlassGroupKey, setSideliteGlassGroupKey] = useState(initialDraft?.sideliteGlassGroupKey ?? '')
  const [sideliteGlassVariantConfirmed, setSideliteGlassVariantConfirmed] = useState(initialDraft?.sideliteGlassVariantConfirmed ?? false)
  const [sideliteGridLocation, setSideliteGridLocation] = useState<FslGridLocationId | ''>(initialDraft?.sideliteGridLocation ?? '')
  const [sideliteGridStyle, setSideliteGridStyle] = useState<GridStyle | ''>(initialDraft?.sideliteGridStyle ?? '')
  const [sideliteGridPattern, setSideliteGridPattern] = useState<GridPattern | ''>(initialDraft?.sideliteGridPattern ?? '')
  const [sideliteGridColor, setSideliteGridColor] = useState<GridColor | ''>(initialDraft?.sideliteGridColor ?? '')
  const [sideliteGridWidth, setSideliteGridWidth] = useState<GridWidth | ''>(initialDraft?.sideliteGridWidth ?? '')
  const [selectedFinishType, setSelectedFinishType] = useState<'' | 'paint' | 'stain'>(initialDraft?.selectedFinishType ?? '')
  const [selectedPaint, setSelectedPaint] = useState(initialDraft?.selectedPaint ?? '')
  const [selectedStain, setSelectedStain] = useState(initialDraft?.selectedStain ?? '')
  const [jambType, setJambType] = useState<'' | 'timber' | 'clad'>(initialDraft?.jambType || (builderUx.showJambMaterialSelection ? '' : 'timber'))
  const [jambFinishType, setJambFinishType] = useState<'' | 'paint' | 'stain' | 'clad'>(initialDraft?.jambFinishType ?? '')
  const [jambFinishColor, setJambFinishColor] = useState(initialDraft?.jambFinishColor ?? '')
  const [jambFinishOverridden, setJambFinishOverridden] = useState(initialDraft?.jambFinishOverridden ?? false)
  const [selectedGlassCategory, setSelectedGlassCategory] = useState<GlassCategory | ''>(initialDraft?.selectedGlassCategory ?? '')
  const [glassId, setGlassId] = useState(initialDraft?.glassId ?? '')
  const [selectedGlassGroupKey, setSelectedGlassGroupKey] = useState(initialDraft?.selectedGlassGroupKey ?? '')
  const [glassVariantConfirmed, setGlassVariantConfirmed] = useState(initialDraft?.glassVariantConfirmed ?? false)
  const [glassFrameColorMode, setGlassFrameColorMode] = useState<'' | 'match-door' | 'custom'>(initialDraft?.glassFrameColorMode ?? '')
  const [glassFrameFinishId, setGlassFrameFinishId] = useState(initialDraft?.glassFrameFinishId ?? '')
  const [glassFrameFinishType, setGlassFrameFinishType] = useState<'paint' | 'stain'>(initialDraft?.glassFrameFinishType ?? 'paint')
  const [gridPathId, setGridPathId] = useState(initialDraft?.gridPathId ?? '')
  const [gridStyle, setGridStyle] = useState<GridStyle | ''>(initialDraft?.gridStyle ?? '')
  const [gridPattern, setGridPattern] = useState<GridPattern | ''>(initialDraft?.gridPattern ?? '')
  const [gridColor, setGridColor] = useState<GridColor | ''>(initialDraft?.gridColor ?? '')
  const [gridWidth, setGridWidth] = useState<GridWidth | ''>(initialDraft?.gridWidth ?? '')
  const [hardwareId, setHardwareId] = useState(initialDraft?.hardwareId ?? '')
  const [doubleDoorLockPrep, setDoubleDoorLockPrep] = useState<DoubleDoorLockPrepCode | ''>(initialDraft?.doubleDoorLockPrep || (initialDraft?.selectedDoorConfigurationType === 'french' ? DEFAULT_FRENCH_LOCK_PREP : ''))
  const [doorSwingId, setDoorSwingId] = useState(initialDraft?.doorSwingId ?? '')
  const [contact, setContact] = useState(initialContact)
  const [errors, setErrors] = useState<Partial<Record<keyof ContactForm, string>>>({})
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const submissionAttemptRef = useRef<{ fingerprint: string; submissionId: string } | null>(null)
  const [submitError, setSubmitError] = useState('')
  const [pendingCustomerAction, setPendingCustomerAction] = useState<null | 'download-pdf' | 'open-visualizer'>(null)
  const [completedCustomerAction, setCompletedCustomerAction] = useState<null | 'download-pdf' | 'open-visualizer'>(null)
  const [customerFormCompleted, setCustomerFormCompleted] = useState(false)
  const dealerSession = useDealerSession()
  const dealerMode = dealerSession.active
  const [dealerBannerTarget, setDealerBannerTarget] = useState<HTMLDivElement | null>(null)
  const wasDealer = useRef(false)
  useEffect(() => {
    if (wasDealer.current && !dealerMode) {
      setCustomerFormCompleted(false)
      setSubmitted(false)
      setCompletedCustomerAction(null)
      setScreen(current => current === 'visualizer' ? 'builder' : current)
    }
    wasDealer.current = dealerMode
  }, [dealerMode])
  const [builderPreviewView, setBuilderPreviewView] = useState<'Exterior' | 'Interior' | 'Both'>('Exterior')
  const [pdfProductRender, setPdfProductRender] = useState<{ configurationKey: string; dataUrl: string } | null>(null)
  const [pdfError, setPdfError] = useState('')
  const pdfProductKeyRef = useRef('')
  const builderPanelRef = useRef<HTMLElement | null>(null)
  useProductCardLayout(builderPanelRef, screen === 'builder')
  const builderOptionsRef = useRef<HTMLDivElement | null>(null)
  const resetDialogRef = useRef<HTMLDialogElement | null>(null)
  const resetTriggerRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    const configuration: DoorBuilderDraftConfiguration = {
      selectedDoorConfigurationType, styleId, doorLineId, grainId, sidelites, sideliteStyleId,
      sideliteGlassCategory, sideliteGlassId, sideliteGlassGroupKey, sideliteGlassVariantConfirmed,
      sideliteGridLocation, sideliteGridStyle, sideliteGridPattern, sideliteGridColor, sideliteGridWidth,
      selectedFinishType, selectedPaint, selectedStain, jambType, jambFinishType, jambFinishColor,
      jambFinishOverridden, selectedGlassCategory, glassId, selectedGlassGroupKey, glassVariantConfirmed,
      glassFrameColorMode, glassFrameFinishId, glassFrameFinishType, gridPathId, gridStyle, gridPattern,
      gridColor, gridWidth, hardwareId, doubleDoorLockPrep, doorSwingId,
    }
    const hasDraft = Boolean(selectedDoorConfigurationType || styleId || doorLineId || sidelites || hardwareId)
    if (hasDraft) saveDoorBuilderDraft(configuration)
    else clearDoorBuilderDraft()
  }, [
    selectedDoorConfigurationType, styleId, doorLineId, grainId, sidelites, sideliteStyleId,
    sideliteGlassCategory, sideliteGlassId, sideliteGlassGroupKey, sideliteGlassVariantConfirmed,
    sideliteGridLocation, sideliteGridStyle, sideliteGridPattern, sideliteGridColor, sideliteGridWidth,
    selectedFinishType, selectedPaint, selectedStain, jambType, jambFinishType, jambFinishColor,
    jambFinishOverridden, selectedGlassCategory, glassId, selectedGlassGroupKey, glassVariantConfirmed,
    glassFrameColorMode, glassFrameFinishId, glassFrameFinishType, gridPathId, gridStyle, gridPattern,
    gridColor, gridWidth, hardwareId, doubleDoorLockPrep, doorSwingId,
  ])

  // Styles are the first product choice. Material/grain constrain later
  // questions, never the catalog the customer can browse here.
  const availableDoorStyles = sortByDisplayLabel(doorStyles, item => doorCatalogModelName(item.name))
  const availableDoorStyleIds = availableDoorStyles.map(item => item.id).join('|')
  const resolvedStyleId = validOptionId(styleId, availableDoorStyles)
  const selectedStyle = availableDoorStyles.find((item) => item.id === styleId)
  const style = selectedStyle ?? doorStyles[0]
  const availableDoorLines = selectedStyle ? doorLineChoicesForStyle(selectedStyle) : []
  const availableDoorLineIds = availableDoorLines.map((item) => item.id).join('|')
  const selectedDoorLine = availableDoorLines.find((item) => item.id === doorLineId)
  const compatibilitySupportsGlass = selectedStyle && selectedDoorLine
    ? doorStyleSupportsGlass(selectedStyle, selectedDoorLine.id)
    : Boolean(selectedStyle?.hasGlass)
  const isSignatureDoorLine = selectedDoorLine?.id === signatureSeriesId
  const selectedDoorLineLineIds = selectedDoorLine?.lineIds ?? []
  const selectedDoorLineLineIdsKey = selectedDoorLineLineIds.join('|')
  const signatureGrainOptions = selectedStyle && isSignatureDoorLine
    ? signatureGrainChoices.filter((item) => selectedStyle.variants.some((variant) =>
      selectedDoorLineLineIds.includes(variant.lineId) && variant.grains.includes(item.id),
    ))
    : []
  const needsGrainStep = signatureGrainOptions.length > 0
  const selectedGrain = selectedDoorLine
    ? isSignatureDoorLine
      ? needsGrainStep
        ? grainId || null
        : autoGrainForDoorLine(style, selectedDoorLine.id)
      : autoGrainForDoorLine(style, selectedDoorLine.id)
    : null
  const finishGrain = selectedGrain
  const availableFinishes = selectedDoorLine && (!needsGrainStep || selectedGrain) ? finishesForStyle(style, finishes, selectedDoorLine.id, finishGrain) : []
  const compatibleFinishTypes = (['paint', 'stain'] as const).filter((type) => availableFinishes.some((item) => item.finishType === type))
  const materialFinishTypes = selectedDoorLine ? finishTypesForDoorLine(style, selectedDoorLine.id) : []
  const matchedFinishTypes = compatibleFinishTypes.filter((type) => materialFinishTypes.includes(type))
  const effectiveFinishTypes = selectedDoorLine ? matchedFinishTypes.length ? matchedFinishTypes : compatibleFinishTypes.length ? compatibleFinishTypes : materialFinishTypes : []
  const activeFinishType = selectedFinishType || effectiveFinishTypes[0] || 'paint'
  const finishId = selectedFinishType === 'paint' ? selectedPaint : selectedFinishType === 'stain' ? selectedStain : ''
  const visibleFinishes = availableFinishes.filter((item) => item.finishType === activeFinishType)
  const selectedFinish = availableFinishes.find((item) => item.id === finishId && item.finishType === selectedFinishType)
  const visibleSelectedFinish = visibleFinishes.find((item) => item.id === finishId)
  const availableFinishIds = availableFinishes.map((item) => item.id).join('|')
  const previewFinish = selectedFinish && (!selectedDoorLine || (materialFinishTypes.includes(selectedFinish.finishType) && (!availableFinishes.length || availableFinishes.some((item) => item.id === selectedFinish.id)))) ? selectedFinish : null
  const finish = selectedFinish ?? UNSELECTED_FINISH
  const cladFinishes = finishes.filter((item) => item.finishType === 'paint' && cladColors.some((color) => `paint-${color.id}` === item.id))
  const jambFinishOptions = jambType === 'clad'
    ? cladFinishes
    : availableFinishes.filter((item) => item.finishType === (jambFinishType || selectedFinishType))
  const jambFinish = finishes.find((item) => item.id === jambFinishColor) ?? null
  const glass = glassOptions.find((item) => item.id === glassId) ?? null
  const selectedHardware = hardwareOptions.find((item) => item.id === hardwareId)
  const availableLockSetupOptions = lockSetupOptionsForHardware(selectedHardware)
  const selectedDoubleDoorLockPrep = availableLockSetupOptions.find(option => option.code === doubleDoorLockPrep)
  const hardware = selectedHardware ?? temporaryPreviewHardware ?? emptyPreviewHardware
  const isFrenchDoor = selectedDoorConfigurationType === 'french'
  const isSavannahDoor = selectedDoorConfigurationType === 'savannah'
  useEffect(() => {
    if (isFrenchDoor && !doorSwingId) setDoorSwingId(doorSwingOptions[0].id)
    if (isSavannahDoor) {
      if (!doorSwingId || (doorSwingId !== 'LHI' && doorSwingId !== 'RHI')) setDoorSwingId(savannahOpening((doorSwingId || 'LHI') as DoorSwing['id']).swing)
      if (doubleDoorLockPrep !== DEFAULT_FRENCH_LOCK_PREP) setDoubleDoorLockPrep(DEFAULT_FRENCH_LOCK_PREP)
    }
  }, [isFrenchDoor, isSavannahDoor, doorSwingId, doubleDoorLockPrep])
  useEffect(() => {
    if (!isFrenchDoor || !selectedHardware) return
    const options = lockSetupOptionsForHardware(selectedHardware)
    if (!options.some(option => option.code === doubleDoorLockPrep)) setDoubleDoorLockPrep(options[0]?.code ?? '')
  }, [isFrenchDoor, selectedHardware, doubleDoorLockPrep])
  const swingSelectionOptions = isFrenchDoor ? [] : isSavannahDoor ? doorSwingOptions.filter(item => item.id === 'LHI' || item.id === 'RHI') : doorSwingOptions
  const storedDoorSwing = doorSwingOptions.find((item) => item.id === doorSwingId)
  const selectedDoorSwing = storedDoorSwing ? { ...storedDoorSwing, name: doorSwingDisplayName(selectedDoorConfigurationType, storedDoorSwing) } : undefined
  const sideliteOptions = sideliteBuilderOptions(selectedDoorConfigurationType)
  const selectedStyleCodes = selectedStyle
    ? selectedDoorLine
      ? selectedStyle.variants.filter((variant) => selectedDoorLine.lineIds.includes(variant.lineId)).map((variant) => variant.code)
      : styleCodesForGlass(selectedStyle)
    : []
  const clicContext = { configurationType: selectedDoorConfigurationType, lineId: selectedDoorLine?.id, grain: selectedGrain, openingCodes: selectedStyleCodes }
  const availableGlass = selectedStyle && compatibilitySupportsGlass
    ? glassOptions.filter((option) => (!isClicGlass(option) || clicAvailable(clicContext)) && !isHiddenDecorativeGlass(option) && isGlassFamilyCompatible(option, selectedDoorLine?.id) && selectedStyleCodes.some((code) => Boolean(option.overlaysByDoorStyle[code])) && !(selectedStyleCodes.includes('F') && legacyFullLiteGlassIds.has(option.id)) && !(selectedStyleCodes.includes('S') && legacySHalfLiteClearGlassIds.has(option.id)) && !((selectedStyleCodes.includes('F48') || selectedStyleCodes.includes('F482')) && legacyF48ClearGlassIds.has(option.id)) && (!(selectedStyleCodes.includes('F48') || selectedStyleCodes.includes('F482')) || f48GlassOptionIds.has(option.id)) && !(selectedStyleCodes.includes('SAT') && glassCategory(option) === 'privacy'))
    : []
  const supportsGlass = Boolean(compatibilitySupportsGlass && availableGlass.length > 0)
  const supportsGlassFrameStain = availableFinishes.some((item) => item.finishType === 'stain')
  const glassFrameFinishOptions = availableFinishes.filter((item) => item.finishType === 'paint' || supportsGlassFrameStain)
  const glassFrameFinishTypes = (['paint', 'stain'] as const).filter((type) => glassFrameFinishOptions.some((item) => item.finishType === type))
  const visibleGlassFrameFinishes = glassFrameFinishOptions.filter((item) => item.finishType === glassFrameFinishType)
  const compatibleGlassFrameDefault = glassFrameFinishOptions.find((item) => item.id === 'paint-white') ?? glassFrameFinishOptions[0] ?? finish
  const matchedGlassFrameFinish = finish.finishType === 'paint' || supportsGlassFrameStain ? finish : compatibleGlassFrameDefault
  const customGlassFrameFinish = glassFrameFinishOptions.find((item) => item.id === glassFrameFinishId)
  const resolvedGlassFrameFinish = glassFrameColorMode === 'custom' ? customGlassFrameFinish ?? compatibleGlassFrameDefault : matchedGlassFrameFinish
  const appliedGlassFrameFinish = (glassFrameColorMode || (!builderUx.showGlassFrameColorSelection && selectedFinish)) ? resolvedGlassFrameFinish : null
  const sideliteAssetFamily = sideliteAssetFamilyForSlab({
    doorLineId: selectedDoorLine?.id,
    grain: selectedGrain,
    doorStyleCode: selectedStyle?.code,
  })
  const supportsSideliteLine = Boolean(sideliteAssetFamily)
  const hasSideliteGlass = supportsSideliteLine && Boolean(sidelites && sidelites !== 'none' && sideliteStyleId)
  const hasMainDoorGlassFrame = supportsGlass && Boolean(glass) && selectedStyleCodes.some((code) => glassDoorCodes.has(code))
  const supportsGlassFrameColor = hasMainDoorGlassFrame || hasSideliteGlass
  const steps: BuilderGroup[] = supportsGlass || hasSideliteGlass ? ['Door', 'Finish', 'Glass', 'Hardware'] : ['Door', 'Finish', 'Hardware']
  const selectedGlass = supportsGlass ? glass : null
  const clearOnlyGlass = !supportsGlass && compatibilitySupportsGlass
    ? availableGlass.find((option) => option.id === 'clear') ?? null
    : null
  const configuredGlass = supportsGlass ? selectedGlass : clearOnlyGlass
  const selectedGridLocation = gridLocations.find((location) => location.id === gridPathId)
  const usesFullLiteGridFlow = selectedStyleCodes.includes('F') && glassId === FULL_LITE_GRID_GLASS_ID
  const usesF48GridFlow = (selectedStyleCodes.includes('F48') || selectedStyleCodes.includes('F482')) && glassId === F48_GRID_GLASS_ID
  const usesSGridFlow = selectedStyleCodes.includes('S') && glassId === S_GRID_GLASS_ID
  const usesGridFlow = usesFullLiteGridFlow || usesF48GridFlow || usesSGridFlow
  const availableGridLocations = gridLocations.filter((item) => !usesF48GridFlow || item.id !== 'external')
  const usesMappedSidelites = supportsSideliteLine && Boolean(sidelites && sidelites !== 'none')
  const availableSideliteStyleIds = sideliteStylesForFamily(sideliteAssetFamily)
  const visibleSideliteStyleOptions = sortByDisplayLabel(sideliteStyleOptions.filter((option) => availableSideliteStyleIds.includes(option.id)), item => sideliteStyleDisplayName(item.id))
  const selectedSideliteStyle = visibleSideliteStyleOptions.find((option) => option.id === sideliteStyleId)
  const selectedSidelitePreview = sideliteSlabAsset(sideliteAssetFamily, selectedSideliteStyle?.id ?? null)
  const selectedSideliteMask = sideliteGlassMask(sideliteAssetFamily, selectedSideliteStyle?.id ?? null)
  const selectedSideliteCatalog = selectedSideliteStyle ? sideliteGlassCatalogs[selectedSideliteStyle.id] : null
  const validSideliteGlass = selectedSideliteCatalog?.options.filter(option => isCustomerSelectableGlass(option) && isGlassFamilyCompatible(option, selectedDoorLine?.id) && (!isClicGlass(option) || clicAvailable(clicContext, sideliteStyleId))) ?? []
  const availableSideliteGlassCategories = selectedSideliteCatalog?.categories.filter(category => validSideliteGlass.some(option => option.category === category.id)) ?? []
  const defaultSideliteGlass = defaultClearSideliteGlass(selectedSideliteCatalog)
  const usesFslGlassFlow = Boolean(selectedSideliteCatalog)
  const visibleFslGlass = sideliteGlassCategory ? validSideliteGlass.filter(option => option.category === sideliteGlassCategory) : []
  const sideliteGlassOptionGroups = groupSideliteGlassOptions(visibleFslGlass)
  const selectedSideliteGlassGroup = sideliteGlassOptionGroups.find((group) => group.key === sideliteGlassGroupKey)
  const selectedFslGlass = validSideliteGlass.find(option => option.id === sideliteGlassId)
  const usesFslGridFlow = usesFslGlassFlow && sideliteGlassId === 'clear-grids'
  const usesExactFslRules = selectedSideliteStyle?.id === 'fsl'
  const fslGridStyles = (['Arts & Crafts', 'Contoured', 'Flat', 'Prairie'] as GridStyle[]).filter((styleName) => selectedSideliteCatalog?.standardRules[styleName] || selectedSideliteCatalog?.lowERules[styleName])
  const fslStandardRules = sideliteGridStyle ? selectedSideliteCatalog?.standardRules[sideliteGridStyle] ?? {} : {}
  const fslLowERules = sideliteGridStyle ? selectedSideliteCatalog?.lowERules[sideliteGridStyle] ?? {} : {}
  const fslPatterns = usesExactFslRules && sideliteGridLocation === 'sdl'
      ? ([...new Set(Object.values(fslSdlPatterns).flat())] as GridPattern[])
      : sideliteGridLocation === 'sdl'
        ? selectedSideliteCatalog?.sdlPatterns ?? []
        : ([...new Set([...Object.keys(fslStandardRules), ...Object.keys(fslLowERules)])] as GridPattern[])
  const effectiveSidelitePattern = sideliteGridStyle === 'Prairie' ? selectedSideliteCatalog?.prairiePattern : sideliteGridPattern
  const fslColors = effectiveSidelitePattern
    ? ([...new Set([...Object.keys(fslStandardRules[effectiveSidelitePattern] ?? {}), ...Object.keys(fslLowERules[effectiveSidelitePattern] ?? {})])] as GridColor[])
    : []
  const fslWidths = effectiveSidelitePattern && sideliteGridColor
    ? ([...new Set([...(fslStandardRules[effectiveSidelitePattern]?.[sideliteGridColor] ?? []), ...(fslLowERules[effectiveSidelitePattern]?.[sideliteGridColor] ?? [])])] as GridWidth[])
    : []
  const availableSideliteGridLocations: { id: FslGridLocationId; name: string; image: string }[] = [
    { id: 'internal', name: 'Internal Grids', image: '/assets/grid-options/Internal Grids.webp' },
    { id: 'sdl', name: 'SDL Grids', image: '/assets/grid-options/SDL Grids.webp' },
  ]
  const fslMatches = (rules: typeof fslStandardRules) => {
    if (!effectiveSidelitePattern || !sideliteGridColor) return false
    const widths = rules[effectiveSidelitePattern]?.[sideliteGridColor]
    return widths !== undefined && (widths.length === 0 ? !sideliteGridWidth : Boolean(sideliteGridWidth && widths.includes(sideliteGridWidth)))
  }
  const fslCoating = usesExactFslRules
    ? sideliteGridLocation === 'sdl' ? 'Standard / No Low-E or Low-E' : fslMatches(fslLowERules) && !fslMatches(fslStandardRules) ? 'Low-E' : fslMatches(fslLowERules) ? 'Standard / No Low-E or Low-E' : 'Standard / No Low-E'
    : sideliteGridLocation === 'sdl' ? 'Standard / No Low-E or Low-E' : fslMatches(fslLowERules) && !fslMatches(fslStandardRules) ? 'Low-E' : fslMatches(fslLowERules) ? 'Standard / No Low-E or Low-E' : 'Standard / No Low-E'
  const hasAvailableFslInternalAsset = sideliteGridLocation === 'internal' && ['2 Lite', '3 Lite', '4 Lite', '5 Lite'].includes(effectiveSidelitePattern ?? '')
  const sideliteGlassPreview = selectedFslGlass?.asset
    ?? (usesFslGridFlow && effectiveSidelitePattern && selectedSideliteCatalog && (!usesExactFslRules || sideliteGridLocation === 'sdl' || hasAvailableFslInternalAsset)
      ? sideliteGridLocation === 'sdl'
        ? selectedSideliteCatalog.gridAsset(effectiveSidelitePattern, 'Bronze')
        : sideliteGridStyle === 'Prairie' && 'prairieGridAsset' in selectedSideliteCatalog
        ? selectedSideliteCatalog.prairieGridAsset(sideliteGridColor || 'White')
        : sideliteGridStyle === 'Arts & Crafts' && 'artsAndCraftsGridAsset' in selectedSideliteCatalog
          ? selectedSideliteCatalog.artsAndCraftsGridAsset(sideliteGridColor || 'White')
        : selectedSideliteCatalog.gridAsset(effectiveSidelitePattern, sideliteGridColor || 'White')
      : defaultSideliteGlass?.asset)
  const sideliteGlassConfiguration: SideliteGlassConfiguration | null = selectedFslGlass ? {
    glass: selectedFslGlass.name,
    ...(selectedFslGlass.orderingCodes ? { orderingCodes: selectedFslGlass.orderingCodes } : {}),
    glassCategory: sideliteGlassCategory === 'decorative' ? 'Decorative Glass' : sideliteGlassCategory === 'privacy' ? 'Privacy Glass' : sideliteGlassCategory === 'clic' ? 'CLiC Glass' : sideliteGlassCategory === 'blinds' ? 'Mini Blinds' : 'Clear Glass',
    ...(selectedFslGlass.asset ? { glassAsset: selectedFslGlass.asset } : {}),
    ...(usesFslGridFlow ? {
      glassCoating: fslCoating,
      gridLocation: sideliteGridLocation === 'sdl' ? 'SDL' as const : sideliteGridLocation === 'external' ? 'External' as const : 'Internal' as const,
      ...(sideliteGridStyle ? { gridStyle: sideliteGridStyle } : {}),
      ...(sideliteGridPattern ? { gridPattern: sideliteGridPattern } : {}),
      // SDL uses the Flat-grid PNG only as geometry; its visible finish is
      // inherited from the selected slab rather than the template artwork.
      ...(sideliteGridLocation !== 'sdl' && sideliteGridColor ? { gridColor: sideliteGridColor } : {}),
      ...(sideliteGridWidth ? { gridWidth: sideliteGridWidth } : {}),
    } : {}),
  } : null
  const selectedGridLocationValue = gridPathId === 'sdl' ? 'SDL' : gridPathId === 'internal' ? 'Internal' : 'External'
  const standardWidthsForSelection = usesSGridFlow
    ? !gridColor ? undefined : gridStyle === 'Prairie' ? sStandardPrairieRules[gridColor] : gridPattern ? (gridStyle === 'Contoured' ? sStandardContouredRules : sStandardFlatRules)[gridPattern]?.[gridColor] : undefined
    : usesF48GridFlow
    ? !gridColor ? undefined : gridStyle === 'Prairie' ? f48StandardPrairieRules[gridColor] : gridPattern ? (gridStyle === 'Contoured' ? f48StandardContouredRules : f48StandardFlatRules)[gridPattern]?.[gridColor] : undefined
    : gridRuleWidths(gridStyle, gridPattern, gridColor, false)
  const lowEWidthsForSelection = usesSGridFlow
    ? !gridColor ? undefined : gridStyle === 'Prairie' ? sLowEPrairieRules[gridColor] : gridPattern ? (gridStyle === 'Arts & Crafts' ? lowEArtsRules : gridStyle === 'Contoured' ? sLowEContouredRules : sLowEFlatRules)[gridPattern]?.[gridColor] : undefined
    : usesF48GridFlow
    ? !gridColor ? undefined : gridStyle === 'Prairie' ? f48LowEPrairieRules[gridColor] : gridPattern ? (gridStyle === 'Arts & Crafts' ? lowEArtsRules : gridStyle === 'Contoured' ? f48LowEContouredRules : f48LowEFlatRules)[gridPattern]?.[gridColor] : undefined
    : gridRuleWidths(gridStyle, gridPattern, gridColor, true)
  const matchesSelectedWidth = (widths: GridWidth[] | undefined) => widths !== undefined && (widths.length === 0 ? !gridWidth : Boolean(gridWidth && widths.includes(gridWidth)))
  const matchesStandard = matchesSelectedWidth(standardWidthsForSelection)
  const matchesLowE = matchesSelectedWidth(lowEWidthsForSelection)
  const selectedGlassCoating: GlassCoating = gridPathId === 'sdl'
    ? 'Low-E'
    : gridPathId === 'external'
      ? usesSGridFlow ? gridPattern === '4 Lite' ? 'Standard / No Low-E or Low-E' : 'Low-E' : gridPattern === '8 Lite' ? 'Standard / No Low-E, Low-E or Low-E Plus' : 'Low-E or Low-E Plus'
      : matchesStandard && matchesLowE ? 'Standard / No Low-E or Low-E' : matchesLowE ? 'Low-E' : 'Standard / No Low-E'
  const gridConfiguration: GridConfiguration | null = usesGridFlow && selectedGridLocation
    ? {
      glassCoating: selectedGlassCoating,
      gridLocation: selectedGridLocationValue,
      ...(gridStyle ? { gridStyle } : {}),
      ...(gridPattern ? { gridPattern } : {}),
      ...(gridColor ? { gridColor } : {}),
      ...(gridWidth ? { gridWidth } : {}),
    }
    : null
  const standardPatternRules = usesSGridFlow
    ? gridStyle === 'Contoured' ? sStandardContouredRules : gridStyle === 'Flat' ? sStandardFlatRules : {}
    : usesF48GridFlow
    ? gridStyle === 'Contoured' ? f48StandardContouredRules : gridStyle === 'Flat' ? f48StandardFlatRules : {}
    : gridStyle === 'Contoured' ? { '15 Lite': { Champagne: ['11/16"' as GridWidth] } } : gridStyle === 'Flat' ? flatGridRules : {}
  const lowEPatternRules = usesSGridFlow
    ? gridStyle === 'Arts & Crafts' ? lowEArtsRules : gridStyle === 'Contoured' ? sLowEContouredRules : gridStyle === 'Flat' ? sLowEFlatRules : {}
    : usesF48GridFlow
    ? gridStyle === 'Arts & Crafts' ? lowEArtsRules : gridStyle === 'Contoured' ? f48LowEContouredRules : gridStyle === 'Flat' ? f48LowEFlatRules : {}
    : gridStyle === 'Arts & Crafts' ? lowEArtsRules : gridStyle === 'Contoured' ? lowEContouredRules : gridStyle === 'Flat' ? lowEFlatGridRules : {}
  const compatibleGridPatterns = gridPathId === 'external'
    ? allGridPatterns.filter((item) => (usesSGridFlow ? ['4 Lite', '9 Lite'] : ['8 Lite', '10 Lite', '15 Lite']).includes(item.id))
    : gridPathId === 'sdl'
      ? allGridPatterns.filter((item) => (usesSGridFlow ? ['9 Lite'] : usesF48GridFlow ? ['4 Lite'] : ['6 Lite', '8 Lite', '15 Lite']).includes(item.id))
      : allGridPatterns.filter((item) => Object.prototype.hasOwnProperty.call(standardPatternRules, item.id) || Object.prototype.hasOwnProperty.call(lowEPatternRules, item.id))
  const compatibleGridColors: GridColor[] = gridStyle === 'Prairie'
    ? [...new Set([...Object.keys(usesSGridFlow ? sStandardPrairieRules : usesF48GridFlow ? f48StandardPrairieRules : prairieGridRules), ...Object.keys(usesSGridFlow ? sLowEPrairieRules : usesF48GridFlow ? f48LowEPrairieRules : lowEPrairieGridRules)])] as GridColor[]
    : gridPattern
      ? [...new Set([...Object.keys(standardPatternRules[gridPattern] ?? {}), ...Object.keys(lowEPatternRules[gridPattern] ?? {})])] as GridColor[]
      : []
  const compatibleGridWidths = gridColor
    ? gridStyle === 'Prairie'
      ? [...new Set([...((usesSGridFlow ? sStandardPrairieRules : usesF48GridFlow ? f48StandardPrairieRules : prairieGridRules)[gridColor] ?? []), ...((usesSGridFlow ? sLowEPrairieRules : usesF48GridFlow ? f48LowEPrairieRules : lowEPrairieGridRules)[gridColor] ?? [])])]
      : gridPattern
        ? [...new Set([...(standardPatternRules[gridPattern]?.[gridColor] ?? []), ...(lowEPatternRules[gridPattern]?.[gridColor] ?? [])])]
        : []
    : []
  const previewGridColor = gridColor || compatibleGridColors[0]
  const doorStyleDefaultGlass = selectedStyleCodes.includes('HRT')
    ? availableGlass.find((option) => option.id === 'hrt-clear-s11rt') ?? null
    : selectedStyleCodes.includes('SAT')
      ? availableGlass.find((option) => option.id === 'sat-clear-nonstock') ?? null
      : null
  const selectedGridOverlay = gridStyle === 'Arts & Crafts' && gridPattern
    ? `/assets/hgi-assets/Glass/F/INTERNAL GRIDS/FART${internalGridPatternCodes[gridPattern]}WH.webp`
    : gridStyle === 'Contoured' && gridPattern && previewGridColor
      ? usesSGridFlow ? sInternalGridAsset(gridPattern, previewGridColor) : usesF48GridFlow ? f48InternalGridAsset(gridPattern, previewGridColor) : contouredGridAssets[gridPattern]?.[previewGridColor] ?? null
    : gridStyle === 'Prairie' && previewGridColor
      ? prairieGridAssets[previewGridColor] ?? null
      : gridPattern && previewGridColor && internalGridPatternCodes[gridPattern] && internalGridColorCodes[previewGridColor]
        ? usesSGridFlow ? sInternalGridAsset(gridPattern, previewGridColor) : usesF48GridFlow ? f48InternalGridAsset(gridPattern, previewGridColor) : internalGridAsset(gridPattern, previewGridColor)
        : null
  const externalPreviewOverlay = gridPathId === 'external' && gridPattern
    ? externalGridArtwork(usesSGridFlow ? 'S' : usesF48GridFlow ? selectedStyleCodes.includes('F482') ? 'F482' : 'F48' : 'F', gridPattern)
    : gridPattern && internalGridPatternCodes[gridPattern]
    ? usesSGridFlow
      ? sInternalGridAsset(gridPattern, 'White')
      : usesF48GridFlow
      ? f48InternalGridAsset(gridPattern, 'White')
      : `/assets/hgi-assets/Glass/F/INTERNAL GRIDS/FINT${internalGridPatternCodes[gridPattern]}WH.webp`
    : null
  const gridPreviewDoorCode = usesSGridFlow ? 'S' : usesF48GridFlow ? selectedStyleCodes.includes('F482') ? 'F482' : 'F48' : 'F'
  const gridClearGlass = glassOptions.find((option) => option.id === (usesSGridFlow ? 's-clear-no-grids' : usesF48GridFlow ? 'f48-clear-no-grids' : 'f-clear-no-grids'))
  const gridClearOverlay = gridClearGlass?.overlaysByDoorStyle[gridPreviewDoorCode]
  const selectedGridPreview = glass && selectedGridLocationValue !== 'Internal' && externalPreviewOverlay
    ? { ...glass, overlaysByDoorStyle: { ...glass.overlaysByDoorStyle, [gridPreviewDoorCode]: externalPreviewOverlay } }
    : glass && selectedGridOverlay
    ? { ...glass, overlaysByDoorStyle: { ...glass.overlaysByDoorStyle, [gridPreviewDoorCode]: selectedGridOverlay } }
    : glass && gridClearOverlay
      ? { ...glass, overlaysByDoorStyle: { ...glass.overlaysByDoorStyle, [gridPreviewDoorCode]: gridClearOverlay } }
      : glass
  const previewGlass = supportsGlass ? (usesGridFlow ? selectedGridPreview : glass) ?? doorStyleDefaultGlass : selectedHardware ? clearOnlyGlass : null
  const usesRetroGlassCategory = selectedStyleCodes.some((code) => ['3LT', '3STEP', '4LT', '5LT', 'F764'].includes(code))
  const availableGlassCategories = usesRetroGlassCategory
    ? [retroGlassCategory]
    : glassCategoryChoices.filter((category) => availableGlass.some((option) => glassCategory(option) === category.id))
  const visibleGlass = (selectedGlassCategory
    ? usesRetroGlassCategory && selectedGlassCategory === 'retro'
      ? availableGlass
      : availableGlass.filter((option) => glassCategory(option) === selectedGlassCategory)
    : []).filter(isCustomerSelectableGlass)
  const glassOptionGroups = [...visibleGlass.reduce((groups, option) => {
    const key = glassGroupKey(option)
    const group = groups.get(key) ?? { key, title: glassGroupTitle(option), options: [] }
    group.options.push(option)
    groups.set(key, group)
    return groups
  }, new Map<string, GlassOptionGroup>()).values()]
  const selectedGlassGroup = glassOptionGroups.find((group) => group.key === selectedGlassGroupKey)
  const availableGlassIds = availableGlass.map((item) => item.id).join('|')
  const pages: BuilderPage[] = [
    'door-configuration',
    'sidelites',
    ...(!isFrenchDoor ? ['door-swing' as const] : []),
    'door-style',
    'door-line',
    ...(needsGrainStep ? ['door-grain' as const] : []),
    ...(usesMappedSidelites ? ['sidelite-style' as const] : []),
    'door-finish',
    ...(builderUx.showJambMaterialSelection ? ['jamb-type' as const] : []),
    ...(builderUx.showJambColorSelection ? ['jamb-finish' as const] : []),
    ...(supportsGlass ? ['glass-type' as const, 'glass' as const] : []),
    ...(selectedGlassGroup && selectedGlassGroup.options.length > 1 ? ['glass-variant' as const] : []),
    ...(usesGridFlow ? [
      'grid-location' as const,
      ...(selectedGridLocationValue === 'Internal' ? ['grid-style' as const] : []),
      ...(gridPathId && (selectedGridLocationValue !== 'Internal' || (gridStyle && gridStyle !== 'Prairie')) ? ['grid-pattern' as const] : []),
      ...(selectedGridLocationValue === 'Internal' && (gridStyle === 'Prairie' || Boolean(gridPattern)) && compatibleGridColors.length ? ['grid-color' as const] : []),
      ...(selectedGridLocationValue === 'Internal' && gridColor && compatibleGridWidths.length ? ['grid-width' as const] : []),
    ] : []),
    ...(usesFslGlassFlow ? [
      'sidelite-glass-type' as const,
      'sidelite-glass' as const,
      ...(selectedSideliteGlassGroup && selectedSideliteGlassGroup.options.length > 1 ? ['sidelite-glass-variant' as const] : []),
      ...(usesFslGridFlow ? [
        'sidelite-grid-location' as const,
        ...(sideliteGridLocation === 'internal' ? ['sidelite-grid-style' as const] : []),
        ...(sideliteGridLocation && (sideliteGridLocation !== 'internal' || (sideliteGridStyle && sideliteGridStyle !== 'Prairie')) ? ['sidelite-grid-pattern' as const] : []),
        ...(sideliteGridLocation === 'internal' && (sideliteGridStyle === 'Prairie' || Boolean(sideliteGridPattern)) ? ['sidelite-grid-color' as const] : []),
        ...(sideliteGridLocation === 'internal' && sideliteGridColor && fslWidths.length ? ['sidelite-grid-width' as const] : []),
      ] : []),
    ] : []),
    ...(supportsGlassFrameColor && builderUx.showGlassFrameColorSelection ? ['glass-frame-color' as const] : []),
    'hardware',
    ...(selectedDoorConfigurationType === 'french' ? ['lock-setup' as const] : []),
    'review',
  ]
  const isBuilderPageComplete = (page: BuilderPage) => {
    if (page === 'door-configuration') return Boolean(selectedDoorConfigurationType)
    if (page === 'door-style') return Boolean(selectedStyle)
    if (page === 'door-line') return Boolean(selectedDoorLine)
    if (page === 'door-grain') return Boolean(selectedGrain)
    if (page === 'sidelites') return Boolean(sidelites)
    if (page === 'sidelite-style') return Boolean(selectedSideliteStyle)
    if (page === 'door-finish') return Boolean(visibleSelectedFinish)
    if (page === 'jamb-type') return Boolean(jambType)
    if (page === 'jamb-finish') return Boolean(jambFinish)
    if (page === 'glass-type') return Boolean(selectedGlassCategory)
    if (page === 'glass') return visibleGlass.length === 0 || Boolean(selectedGlass || selectedGlassGroup)
    if (page === 'glass-variant') return glassVariantConfirmed
    if (page === 'grid-location') return Boolean(gridPathId)
    if (page === 'grid-style') return Boolean(gridStyle)
    if (page === 'grid-pattern') return Boolean(gridPattern)
    if (page === 'grid-color') return Boolean(gridColor)
    if (page === 'grid-width') return Boolean(gridWidth)
    if (page === 'sidelite-glass-type') return Boolean(sideliteGlassCategory)
    if (page === 'sidelite-glass') return Boolean(selectedFslGlass || selectedSideliteGlassGroup)
    if (page === 'sidelite-glass-variant') return sideliteGlassVariantConfirmed
    if (page === 'sidelite-grid-location') return Boolean(sideliteGridLocation)
    if (page === 'sidelite-grid-style') return Boolean(sideliteGridStyle)
    if (page === 'sidelite-grid-pattern') return Boolean(sideliteGridPattern)
    if (page === 'sidelite-grid-color') return Boolean(sideliteGridColor)
    if (page === 'sidelite-grid-width') return Boolean(sideliteGridWidth)
    if (page === 'glass-frame-color') return Boolean(glassFrameColorMode)
    if (page === 'lock-setup') return Boolean(selectedDoubleDoorLockPrep)
    if (page === 'hardware') return Boolean(selectedHardware)
    if (page === 'door-swing') return Boolean(selectedDoorSwing)
    return true
  }
  const restoredDraftReferencesValid = Boolean(
    selectedDoorConfigurationType && selectedStyle && selectedDoorLine
    && (!grainId || selectedGrain === grainId)
    && visibleSelectedFinish
    && jambType && jambFinish
    && selectedHardware && selectedDoorSwing
    && (!supportsGlass || selectedGlass)
    && (!usesMappedSidelites || (selectedSideliteStyle && selectedFslGlass))
    && (supportsSideliteLine || !sidelites || sidelites === 'none')
    && (glassFrameColorMode !== 'custom' || customGlassFrameFinish)
  )
  const visualizerConfigurationReady = restoredDraftReferencesValid && pages.every((page) => page === 'review' || isBuilderPageComplete(page))
  const currentPage = editReturnTo && editPageId && pages.includes(editPageId) ? editPageId : pages[step] ?? pages[pages.length - 1]
  const currentPageIndex = pages.indexOf(currentPage)
  const pageSequenceKey = pages.join('|')
  useEffect(() => {
    if (editReturnTo && editPageId && pages.includes(editPageId) && step !== pages.indexOf(editPageId)) setStep(pages.indexOf(editPageId))
  }, [editReturnTo, editPageId, pageSequenceKey, step])
  useEffect(() => {
    if (screen !== 'builder' && editReturnTo) {
      setEditReturnTo(null); setEditPageId(null); setEditReturnError('')
    }
  }, [screen, editReturnTo])
  const glassSelectionTarget = mainDoorGlassPages.has(currentPage) ? 'main-door' : sideliteGlassPages.has(currentPage) ? 'sidelite' : null
  const currentStep = builderGroupForPage(currentPage)
  const activeMainStepIndex = currentStep === 'Review & Quote' ? steps.length : steps.indexOf(currentStep)
  const product = resolveDoorProduct(style, finish, selectedGrain ?? undefined, selectedDoorLine?.id)
  const previewConfig = {
    finish,
    tintColor: previewFinish?.color ?? null,
    applyFinish: Boolean(previewFinish),
    glass: previewGlass,
    hardware,
    doorSwing: selectedDoorSwing,
  }
  const doorConfigurationProductOption = requiredDoorConfigurationProductOption(selectedDoorConfigurationType || 'single')
  // SDL bars use the compatible Flat-grid artwork as a reusable mask and
  // always inherit the selected slab finish on both doors and sidelites.
  const mainDoorSdlMatchesFinish = usesGridFlow && gridPathId === 'sdl'
  const sideliteSdlMatchesFinish = usesFslGridFlow && sideliteGridLocation === 'sdl'
  const previewModes = ['Exterior', 'Interior', 'Both'] as const
  const configuredDoorPreview: DoorPreviewProps = {
    doorConfigurationType: selectedDoorConfigurationType || 'single',
    doubleDoorLockPrep: isSavannahDoor ? DEFAULT_FRENCH_LOCK_PREP : isFrenchDoor ? doubleDoorLockPrep || DEFAULT_FRENCH_LOCK_PREP : null,
    style,
    finish: previewConfig.finish,
    glass: previewConfig.glass,
    hardware: previewConfig.hardware,
    showHardware: Boolean(selectedHardware || temporaryPreviewHardware),
    grain: selectedGrain,
    product,
    tintColor: previewConfig.tintColor,
    doorSwing: previewConfig.doorSwing,
    applyFinish: previewConfig.applyFinish,
    gridMatchesFinish: mainDoorSdlMatchesFinish,
    showViewToggle: false,
    sidelites: sidelites || 'none',
    sideliteAssetSrc: selectedSidelitePreview,
    sideliteMaskSrc: selectedSideliteMask,
    sideliteGlassSrc: sideliteGlassPreview,
    // Every sidelite glass selection needs a full clear-glass underlayer so
    // transparent decorative/grid artwork never exposes the painted slab.
    sideliteClearGlassBase: Boolean(selectedFslGlass ?? defaultSideliteGlass),
    sideliteGlassIsGrid: usesFslGridFlow,
    sideliteGridColor: sideliteGridColor ? gridColorValues[sideliteGridColor] : undefined,
    sideliteGridIsPrairie: sideliteGridStyle === 'Prairie',
    sideliteGridMatchesFinish: sideliteSdlMatchesFinish,
    jambFinish,
    jambType: jambType || 'timber',
    glassFrameFinish: appliedGlassFrameFinish,
    loadingLabel: currentPage === 'jamb-finish' ? 'Updating preview...' : 'Loading preview',
  }
  const configuredDoorKey = JSON.stringify({
    doorConfigurationType: selectedDoorConfigurationType || 'single',
    doubleDoorLockPrep,
    style: style.id,
    finish: previewConfig.finish.id,
    finishType: previewConfig.finish.finishType,
    finishColor: previewConfig.finish.color,
    finishImage: previewConfig.finish.image,
    tint: previewConfig.tintColor,
    glass: previewConfig.glass,
    gridPathId,
    gridStyle,
    gridPattern,
    gridColor,
    gridWidth,
    hardware: previewConfig.hardware,
    showHardware: Boolean(selectedHardware),
    grain: selectedGrain,
    product: product?.styleCodes.join('|'),
    swing: previewConfig.doorSwing?.id,
    sidelites,
    sideliteStyle: selectedSideliteStyle?.id,
    sideliteAsset: selectedSidelitePreview,
    sideliteMask: selectedSideliteMask,
    sideliteGlass: selectedFslGlass?.id,
    sideliteGlassPreview,
    sideliteGridLocation,
    sideliteGridStyle,
    sideliteGridPattern,
    sideliteGridColor,
    sideliteGridWidth,
    jambFinish: jambFinish?.id,
    jambFinishType: jambFinish?.finishType,
    jambFinishColor: jambFinish?.color,
    jambFinishImage: jambFinish?.image,
    jambType,
    // Include the complete trim selection in the product/cache identity.
    glassFrameColorMode,
    glassFrameFinish: appliedGlassFrameFinish?.id,
    glassFrameFinishType: appliedGlassFrameFinish?.finishType,
    glassFrameFinishColor: appliedGlassFrameFinish?.color,
  })
  // PDF cache includes complete material/product and resolved appearance,
  // not just style codes (the same code can have different surface families).
  const pdfProductKey = JSON.stringify({ ...configuredDoorPreview, loadingLabel: undefined, grid: gridConfiguration, sideliteGlass: sideliteGlassConfiguration })
  pdfProductKeyRef.current = pdfProductKey
  useEffect(() => { setPdfProductRender(null); setPdfError('') }, [pdfProductKey])
  const renderConfiguredDoorPreview = (previewView: HardwareView, sharedComparisonCanvas = false) => <DoorPreview {...configuredDoorPreview} renderConfigurationKey={configuredDoorKey} view={previewView} sharedComparisonCanvas={sharedComparisonCanvas} />
  const renderConfiguredPreviewMode = () => builderPreviewView === 'Both'
    ? <div className="preview-comparison" aria-label="Exterior and interior door previews">
        {(['Exterior', 'Interior'] as const).map((previewView) => <div className="preview-comparison-item" key={previewView}>
          <span className="preview-comparison-label">{previewView}</span>
          {renderConfiguredDoorPreview(previewView, true)}
        </div>)}
      </div>
    : renderConfiguredDoorPreview(builderPreviewView)
  const demoStyleByCode = (code: string) => doorStyles.find((item) => item.code === code || item.variants.some((variant) => variant.code === code)) ?? doorStyles[0]
  const buildHomeDemo = (preset: HeroPreset, presetIndex: number) => {
    const { styleCode } = preset
    const demoStyle = demoStyleByCode(styleCode)
    const compatibleDoorLines = doorLineChoicesForStyle(demoStyle)
    const finishSpec = HERO_FINISH_SPECS[preset.finishKey]
    const baseHeroFinish = finishes.find((finishOption) => finishOption.id === finishSpec.baseId) ?? finishes[0]
    const heroColorFinish = finishes.find((finishOption) => finishOption.id === finishSpec.colorId)
    const requestedHeroFinish = {
      ...baseHeroFinish,
      id: `hero-${preset.finishKey}`,
      name: finishSpec.name,
      color: heroColorFinish?.color ?? baseHeroFinish.color,
      accent: heroColorFinish?.accent ?? baseHeroFinish.accent,
    }
    const finishCandidates = compatibleDoorLines.flatMap((doorLine) => {
      const grain = autoGrainForDoorLine(demoStyle, doorLine.id)
      return finishesForStyle(demoStyle, finishes, doorLine.id, grain).map((finishOption) => ({ doorLine, grain, finishOption }))
    })
    const preferredFinishCandidates = finishCandidates.filter(({ finishOption }) => finishOption.finishType === requestedHeroFinish.finishType)
    const selectedCombination = preferredFinishCandidates[presetIndex % Math.max(preferredFinishCandidates.length, 1)]
      ?? finishCandidates[presetIndex % Math.max(finishCandidates.length, 1)]
    const demoDoorLine = selectedCombination?.doorLine ?? compatibleDoorLines[0]
    const demoGrain = demoDoorLine ? autoGrainForDoorLine(demoStyle, demoDoorLine.id) : null
    const demoFinish = requestedHeroFinish
    const demoProduct = resolveDoorProduct(demoStyle, demoFinish, demoGrain ?? undefined, demoDoorLine?.id)
    const isGlassCapable = demoProduct.styleCodes.some((code) => glassDoorCodes.has(code))
    const preferredGlass = preset.glassId
    const compatibleGlass = glassOptions.filter((option) =>
      demoProduct.styleCodes.some((code) => Boolean(option.overlaysByDoorStyle[code]))
      && !(demoProduct.styleCodes.includes('F') && legacyFullLiteGlassIds.has(option.id))
      && !(demoProduct.styleCodes.includes('S') && legacySHalfLiteClearGlassIds.has(option.id))
      && !((demoProduct.styleCodes.includes('F48') || demoProduct.styleCodes.includes('F482')) && legacyF48ClearGlassIds.has(option.id))
      && (!(demoProduct.styleCodes.includes('F48') || demoProduct.styleCodes.includes('F482')) || f48GlassOptionIds.has(option.id)),
    )
    const requestedGlass = compatibleGlass.find((option) => option.id === preferredGlass)
    const fallbackGlass = compatibleGlass.find((option) => glassCategory(option) === 'decorative')
      ?? compatibleGlass.find((option) => option.id === 'clear')
      ?? compatibleGlass.find((option) => option.name.toLowerCase().includes('clear'))
      ?? compatibleGlass[0]
    const isStrictNoGlassStyle = demoProduct.styleCodes.every((code) => !glassDoorCodes.has(code))
    const demoGlass = isGlassCapable && !isStrictNoGlassStyle
      ? requestedGlass
        ? {
            ...requestedGlass,
            name: preset.glassName ?? requestedGlass.name,
          }
        : fallbackGlass ?? null
      : null
    const demoHardware = hardwareOptions[presetIndex % hardwareOptions.length]

    if (import.meta.env.DEV && (!demoFinish?.color || !demoHardware || (isGlassCapable && !demoGlass))) {
      console.warn('[hero-door-preset:incomplete]', {
        styleCode,
        doorLineChoiceId: demoDoorLine?.id,
        finish: demoFinish?.id,
        hardware: demoHardware?.id,
        glass: demoGlass?.id,
        isGlassCapable,
      })
    }
    return {
      style: demoStyle,
      finish: demoFinish,
      glass: demoGlass,
      hardware: demoHardware,
      grain: demoGrain,
      product: demoProduct,
      isGlassCapable,
      gridMatchesFinish: false,
    }
  }
  const homeDemoConfigurations = HERO_PRESETS.map((preset, index) => buildHomeDemo(preset, index))

  useEffect(() => {
    if (!selectedDoorConfigurationType) return
    if (styleId !== resolvedStyleId) {
      setStyleId(resolvedStyleId)
      return // Reconcile downstream values only after the slab fallback settles.
    }
    if (!resolvedStyleId) return // An empty slab catalog has no downstream choices to resolve.
    if (doorLineId && !availableDoorLines.some((item) => item.id === doorLineId)) {
      if (availableDoorLines[0]) selectDoorLine(availableDoorLines[0].id)
      else { setDoorLineId(''); setGrainId('') }
      return
    }
    if (grainId && !isSignatureDoorLine) setGrainId('')
    if (grainId && needsGrainStep && !signatureGrainOptions.some((item) => item.id === grainId)) {
      selectGrain(signatureGrainOptions[0]?.id ?? '')
      return
    }
    if (effectiveFinishTypes.length && !effectiveFinishTypes.includes(selectedFinishType as 'paint' | 'stain')) {
      setSelectedFinishType(effectiveFinishTypes[0])
      setSelectedPaint('')
      setSelectedStain('')
    }
    if (finishId && selectedDoorLine && (!needsGrainStep || selectedGrain) && !availableFinishes.some((item) => item.id === finishId)) {
      setSelectedPaint('')
      setSelectedStain('')
    }
    if (!editReturnTo && step >= pages.length) setStep(pages.length - 1)
  }, [selectedDoorConfigurationType, styleId, resolvedStyleId, availableDoorStyleIds, doorLineId, grainId, availableDoorLineIds, isSignatureDoorLine, selectedDoorLineLineIdsKey, needsGrainStep, effectiveFinishTypes, selectedFinishType, finishId, availableFinishIds, selectedGlassCategory, glassId, availableGlassIds, supportsGlass, step, pages.length, editReturnTo])

  const lastGlassParent = useRef('')
  useEffect(() => {
    // Do not reconcile against a transient unresolved material/grain.
    if (!selectedDoorConfigurationType || !selectedDoorLine || (needsGrainStep && !signatureGrainOptions.some(item => item.id === grainId))) return
    const parent = `${styleId}|${doorLineId}|${grainId}`
    const parentChanged = parent !== lastGlassParent.current
    lastGlassParent.current = parent
    // An empty selection during a manual category change is intentional.
    if (!glassId && !parentChanged) return
    const next = supportsGlass ? retainGlassSelection(glass, availableGlass.filter(isCustomerSelectableGlass)) : undefined
    if (next?.id === glassId && !parentChanged) return
    setGlassId(next?.id ?? '')
    setSelectedGlassCategory(next ? (usesRetroGlassCategory ? 'retro' : glassCategory(next)) : '')
    setSelectedGlassGroupKey(next ? glassGroupKey(next) : '')
    setGlassVariantConfirmed(Boolean(next))
    if (next?.id !== glassId) resetGridOptions()
  }, [selectedDoorConfigurationType, styleId, doorLineId, grainId, needsGrainStep, availableGlassIds, glassId, supportsGlass])

  // A missing line/grain while navigating upstream is unresolved, not an
  // incompatible family. Wait for a valid family before reconciling sidelites.
  useEffect(() => {
    if (!selectedDoorLine || (needsGrainStep && !signatureGrainOptions.some(item => item.id === grainId))) return
    if (!sidelites || sidelites === 'none') return
    reconcileSideliteForParent(selectedDoorLine.id, selectedGrain)
  }, [selectedDoorLine?.id, needsGrainStep, grainId, signatureGrainOptions.map(item => item.id).join('|'), sideliteAssetFamily, sidelites, sideliteStyleId])

  useEffect(() => {
    const current = selectedSideliteCatalog?.options.find(option => option.id === sideliteGlassId)
    if (!selectedDoorLine || !selectedSideliteCatalog || !sideliteGlassId) return
    const valid = validSideliteGlass
    if (current && valid.includes(current)) {
      const group = groupSideliteGlassOptions(valid).find(group => group.options.some(option => option.id === current.id))
      if (sideliteGlassCategory !== current.category) setSideliteGlassCategory(current.category)
      if (sideliteGlassGroupKey !== group?.key) setSideliteGlassGroupKey(group?.key ?? '')
      return
    }
    const fallback = clearGlassOption(valid)
    const group = groupSideliteGlassOptions(valid).find(group => group.options.some(option => option.id === fallback?.id))
    setSideliteGlassId(fallback?.id ?? '')
    setSideliteGlassCategory(fallback?.category ?? '')
    setSideliteGlassGroupKey(group?.key ?? '')
    setSideliteGlassVariantConfirmed(Boolean(group && group.options.length === 1))
    setSideliteGridLocation(''); setSideliteGridStyle(''); setSideliteGridPattern(''); setSideliteGridColor(''); setSideliteGridWidth('')
  }, [selectedDoorConfigurationType, styleId, grainId, selectedDoorLine?.id, selectedSideliteCatalog, sideliteGlassId, sideliteGlassCategory, sideliteGlassGroupKey])

  useEffect(() => {
    if (screen !== 'builder') return

    switch (currentPage) {
      case 'door-style':
        break
      case 'door-line':
        if (!selectedDoorLine && availableDoorLines[0]) selectDoorLine(availableDoorLines[0].id)
        break
      case 'door-grain':
        if (!selectedGrain && signatureGrainOptions[0]) selectGrain(signatureGrainOptions[0].id)
        break
      case 'sidelites':
        if (!sidelites && sideliteOptions[0]) setSidelites(sideliteOptions[0].id)
        break
      case 'sidelite-style':
        break
      case 'door-finish': {
        // Choose only on entering this step, in the same order as the cards.
        const firstFinish = sortByDisplayLabel(visibleFinishes, item => item.name)[0]
        if (!visibleSelectedFinish && firstFinish) {
          setSelectedFinishType(firstFinish.finishType)
          if (firstFinish.finishType === 'paint') setSelectedPaint(firstFinish.id)
          else setSelectedStain(firstFinish.id)
        }
        break
      }
      case 'jamb-type':
        if (!jambType) setJambType('timber')
        break
      case 'jamb-finish':
        if (!jambFinish && jambFinishOptions[0]) setJambFinishColor(jambFinishOptions[0].id)
        break
      case 'glass-type':
        if (!selectedGlassCategory && availableGlassCategories[0]) setSelectedGlassCategory(availableGlassCategories[0].id)
        break
      case 'glass': {
        const firstGroup = glassOptionGroups[0]
        if (!selectedGlassGroup && firstGroup) {
          setSelectedGlassGroupKey(firstGroup.key)
          setGlassId(firstGroup.options[0]?.id ?? '')
          setGlassVariantConfirmed(firstGroup.options.length === 1)
        }
        break
      }
      case 'glass-variant':
        if (!glassVariantConfirmed && selectedGlassGroup?.options[0]) {
          setGlassId(selectedGlassGroup.options[0].id)
          setGlassVariantConfirmed(true)
        }
        break
      case 'grid-location':
        if (!gridPathId && availableGridLocations[0]) setGridPathId(availableGridLocations[0].id)
        break
      case 'grid-style':
        if (!gridStyle && lowEGridStyles[0]) setGridStyle(lowEGridStyles[0].id)
        break
      case 'grid-pattern':
        if (!gridPattern && compatibleGridPatterns[0]) setGridPattern(compatibleGridPatterns[0].id)
        break
      case 'grid-color':
        if (!gridColor && compatibleGridColors[0]) setGridColor(compatibleGridColors[0])
        break
      case 'grid-width':
        if (!gridWidth && compatibleGridWidths[0]) setGridWidth(compatibleGridWidths[0])
        break
      case 'sidelite-glass-type':
        if ((!sideliteGlassCategory || !availableSideliteGlassCategories.some(item => item.id === sideliteGlassCategory)) && availableSideliteGlassCategories[0]) setSideliteGlassCategory(availableSideliteGlassCategories[0].id)
        break
      case 'sidelite-glass': {
        const firstGroup = sideliteGlassOptionGroups[0]
        if (!selectedSideliteGlassGroup && firstGroup) {
          setSideliteGlassGroupKey(firstGroup.key)
          setSideliteGlassId(firstGroup.options[0]?.id ?? '')
          setSideliteGlassVariantConfirmed(firstGroup.options.length === 1)
        }
        break
      }
      case 'sidelite-glass-variant':
        if (!sideliteGlassVariantConfirmed && selectedSideliteGlassGroup?.options[0]) {
          setSideliteGlassId(selectedSideliteGlassGroup.options[0].id)
          setSideliteGlassVariantConfirmed(true)
        }
        break
      case 'sidelite-grid-location':
        if (!sideliteGridLocation && availableSideliteGridLocations[0]) setSideliteGridLocation(availableSideliteGridLocations[0].id)
        break
      case 'sidelite-grid-style':
        if (!sideliteGridStyle && fslGridStyles[0]) setSideliteGridStyle(fslGridStyles[0])
        break
      case 'sidelite-grid-pattern':
        if (!sideliteGridPattern && fslPatterns[0]) setSideliteGridPattern(fslPatterns[0])
        break
      case 'sidelite-grid-color':
        if (!sideliteGridColor && fslColors[0]) setSideliteGridColor(fslColors[0])
        break
      case 'sidelite-grid-width':
        if (!sideliteGridWidth && fslWidths[0]) setSideliteGridWidth(fslWidths[0])
        break
      case 'glass-frame-color':
        if (!glassFrameColorMode) {
          // Do not tint insert trim while the customer is still choosing
          // glass. Match Door becomes the default only upon reaching this
          // dedicated step.
          setGlassFrameColorMode('match-door')
          setGlassFrameFinishType(matchedGlassFrameFinish.finishType)
        }
        break
      case 'hardware':
        if (!selectedHardware && hardwareStyleGroups[0]?.[0]) setHardwareId(hardwareStyleGroups[0][0].id)
        break
      case 'door-swing':
        if (!selectedDoorSwing && doorSwingOptions[0]) setDoorSwingId(doorSwingOptions[0].id)
        break
    }
  }, [screen, currentPage, selectedStyle, selectedDoorLine, selectedGrain, sidelites, selectedSideliteStyle, visibleSideliteStyleOptions, visibleSelectedFinish, visibleFinishes, jambType, jambFinish, jambFinishOptions, selectedGlassCategory, availableGlassCategories, selectedGlassGroup, glassOptionGroups, glassVariantConfirmed, selectedGlassGroupKey, gridPathId, availableGridLocations, gridStyle, gridPattern, compatibleGridPatterns, gridColor, compatibleGridColors, gridWidth, compatibleGridWidths, sideliteGlassCategory, selectedSideliteCatalog, selectedSideliteGlassGroup, sideliteGlassOptionGroups, sideliteGlassVariantConfirmed, sideliteGridLocation, availableSideliteGridLocations, sideliteGridStyle, fslGridStyles, sideliteGridPattern, fslPatterns, sideliteGridColor, fslColors, sideliteGridWidth, fslWidths, glassFrameColorMode, matchedGlassFrameFinish.finishType, selectedHardware, hardwareStyleGroups, selectedDoorSwing])

  // Prime each grid choice as soon as its valid options are known. This keeps
  // the live preview one step ahead of the customer while preserving every
  // explicit selection they make later in the flow.
  useEffect(() => {
    if (!usesGridFlow) return
    if (!gridPathId) {
      if (availableGridLocations[0]) setGridPathId(availableGridLocations[0].id)
      return
    }
    if (selectedGridLocationValue === 'Internal' && !gridStyle) {
      if (lowEGridStyles[0]) setGridStyle(lowEGridStyles[0].id)
      return
    }
    if (!gridPattern) {
      if (compatibleGridPatterns[0]) setGridPattern(compatibleGridPatterns[0].id)
      return
    }
    if (selectedGridLocationValue === 'Internal' && !gridColor) {
      if (compatibleGridColors[0]) setGridColor(compatibleGridColors[0])
      return
    }
    if (selectedGridLocationValue === 'Internal' && gridColor && !gridWidth && compatibleGridWidths[0]) {
      setGridWidth(compatibleGridWidths[0])
    }
  }, [usesGridFlow, gridPathId, availableGridLocations, selectedGridLocationValue, gridStyle, gridPattern, compatibleGridPatterns, gridColor, compatibleGridColors, gridWidth, compatibleGridWidths])

  useEffect(() => {
    if (!usesFslGridFlow) return
    if (!sideliteGridLocation) {
      if (availableSideliteGridLocations[0]) setSideliteGridLocation(availableSideliteGridLocations[0].id)
      return
    }
    if (sideliteGridLocation !== 'internal') {
      if (!sideliteGridPattern && fslPatterns[0]) setSideliteGridPattern(fslPatterns[0])
      return
    }
    if (!sideliteGridStyle) {
      if (fslGridStyles[0]) setSideliteGridStyle(fslGridStyles[0])
      return
    }
    if (!sideliteGridPattern) {
      if (fslPatterns[0]) setSideliteGridPattern(fslPatterns[0])
      return
    }
    if (!sideliteGridColor) {
      if (fslColors[0]) setSideliteGridColor(fslColors[0])
      return
    }
    if (!sideliteGridWidth && fslWidths[0]) setSideliteGridWidth(fslWidths[0])
  }, [usesFslGridFlow, sideliteGridLocation, availableSideliteGridLocations, sideliteGridStyle, fslGridStyles, sideliteGridPattern, fslPatterns, sideliteGridColor, fslColors, sideliteGridWidth, fslWidths])

  useEffect(() => {
    if (!selectedFinish) return
    const doorColorChanged = lastJambDoorFinishId.current !== selectedFinish.id
    lastJambDoorFinishId.current = selectedFinish.id
    if (builderUx.showJambColorSelection && jambFinishOverridden) return
    // Loading a valid saved color is not a customer color change.
    if (!builderUx.showJambColorSelection && !doorColorChanged && jambFinish) return
    if (!jambType) setJambType('timber')
    const match = matchingJambFinish(selectedFinish, jambType, cladFinishes)
    setJambFinishType(jambType === 'clad' ? 'clad' : selectedFinish.finishType)
    setJambFinishColor(match?.id ?? '')
    if (!builderUx.showJambColorSelection) setJambFinishOverridden(false)
  }, [selectedFinish?.id, jambType, jambFinishOverridden, jambFinish?.id])

  useEffect(() => {
    if (!selectedFinish) return
    const doorColorChanged = lastGlassFrameDoorFinishId.current !== selectedFinish.id
    lastGlassFrameDoorFinishId.current = selectedFinish.id
    if (builderUx.showGlassFrameColorSelection) return
    if (!doorColorChanged && glassFrameColorMode && (glassFrameColorMode !== 'custom' || customGlassFrameFinish)) return
    setGlassFrameColorMode('match-door')
    setGlassFrameFinishId(matchedGlassFrameFinish.id)
    setGlassFrameFinishType(matchedGlassFrameFinish.finishType)
  }, [selectedFinish?.id, matchedGlassFrameFinish.id, matchedGlassFrameFinish.finishType, glassFrameColorMode, customGlassFrameFinish?.id])

  useEffect(() => {
    if (screen !== 'builder') return

    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
      builderPanelRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' })
      builderOptionsRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    })
  }, [screen, currentPage])

  const goTo = (next: number) => {
    if (next < 0 || next >= pages.length) return
    setStep(next)
    if (editReturnTo) setEditPageId(pages[next])
  }

  const resetGridOptions = () => {
    setGridPathId('')
    setGridStyle('')
    setGridPattern('')
    setGridColor('')
    setGridWidth('')
  }

  const selectDoorConfiguration = (configurationType: DoorConfigurationType) => {
    if (configurationType === selectedDoorConfigurationType) return
    setSelectedDoorConfigurationType(configurationType)
    if (sidelites && sidelites !== 'none' && sidelites !== 'both-sides') {
      const physical = sidelitePlacement(sidelites, selectedDoorSwing?.id, selectedDoorConfigurationType || 'single')
      setSidelites(normalizeLegacySidelite(physical, configurationType === 'french' ? undefined : selectedDoorSwing?.id, configurationType === 'single' ? 'single' : undefined))
    }
    setDoubleDoorLockPrep(configurationType !== 'single' ? DEFAULT_FRENCH_LOCK_PREP : '')
    // Preserve the initialized Full Lite or manual slab selection. Use catalog
    // order only when a later selection is genuinely invalid or unavailable.
    setStyleId(validOptionId(styleId, availableDoorStyles))
  }

  const selectDoorStyle = (nextStyleId: string) => {
    const nextStyle = availableDoorStyles.find((item) => item.id === nextStyleId)
    if (!nextStyle) return
    if (nextStyleId !== styleId) {
      const lines = doorLineChoicesForStyle(nextStyle)
      // A new style is the parent change: start its material choices at index 0.
      const line = lines[0]
      const grains = signatureGrainChoices.filter(item => nextStyle.variants.some(variant => line?.lineIds.includes(variant.lineId) && variant.grains.includes(item.id)))
      const nextGrain = line?.id === signatureSeriesId ? grains[0]?.id ?? '' : ''
      setDoorLineId(line?.id ?? '')
      setGrainId(nextGrain)
      reconcileSideliteForParent(line?.id ?? '', nextGrain || line?.autoGrain || null)
    }
    if (editReturnTo && nextStyleId !== styleId) {
      // Existing catalog reconciliation effects clear incompatible choices.
      // Do not discard still-valid material/finish/glass during a summary edit.
      setStyleId(nextStyleId)
      return
    }
    if (nextStyleId !== styleId) {
      setStyleId(nextStyleId)
      setGlassFrameColorMode('')
      setGlassFrameFinishId('')
      setGlassFrameFinishType('paint')
    }
    if (!editReturnTo && availableDoorStyles.length === 1) goTo(step + 1)
  }

  const startOver = () => {
    clearDoorBuilderDraft()
    setReturningFromVisualizer(false)
    setEditReturnTo(null)
    setEditPageId(null)
    setEditReturnError('')
    setVisualizerSessionStarted(false)
    setBuilderPreviewView('Exterior')
    setStyleId(freshDoorStyleId)
    setSelectedDoorConfigurationType('')
    setDoorLineId('')
    setGrainId('')
    setSidelites('')
    setSideliteStyleId('')
    setSelectedFinishType('')
    setSelectedPaint('')
    setSelectedStain('')
    setJambType(builderUx.showJambMaterialSelection ? '' : 'timber')
    setJambFinishType('')
    setJambFinishColor('')
    setJambFinishOverridden(false)
    setSelectedGlassCategory('')
    setGlassId('')
    setSelectedGlassGroupKey('')
    setSideliteGlassGroupKey('')
    setGlassVariantConfirmed(false)
    setGlassFrameColorMode('')
    setGlassFrameFinishId('')
    setGlassFrameFinishType('paint')
    setSideliteGlassVariantConfirmed(false)
    resetGridOptions()
    setHardwareId('')
    setDoubleDoorLockPrep('')
    setDoorSwingId('')
    setContact(initialContact)
    setErrors({})
    setSubmitted(false)
    setSubmitting(false)
    submissionAttemptRef.current = null
    setSubmitError('')
    setPendingCustomerAction(null)
    setCompletedCustomerAction(null)
    setCustomerFormCompleted(false)
    setScreen('builder')
    goTo(0)
  }

  const closeResetDialog = () => {
    resetDialogRef.current?.close()
    resetTriggerRef.current?.focus()
  }
  const resetDesign = (event: MouseEvent<HTMLButtonElement>) => {
    resetTriggerRef.current = event.currentTarget
    resetDialogRef.current?.showModal()
    resetDialogRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
  }
  const confirmResetDesign = () => {
    closeResetDialog()
    setBuilderPreviewView('Exterior')
    startOver()
  }

  const canVisitStep = (target: number) => {
    const targetStep = steps[target]
    if (!targetStep) return false
    const targetPage = builderGroupStart(pages, targetStep)
    return targetPage >= 0 && (targetPage <= currentPageIndex || pages.slice(0, targetPage).every(isBuilderPageComplete))
  }

  const showScreen = async (next: 'home' | 'builder' | 'customer-form' | 'visualizer') => {
    if (next === 'visualizer' && !customerFormCompleted && !(await dealerSession.verify())) {
      void (async () => {
        setPendingCustomerAction('open-visualizer')
        setSubmitted(false)
        setScreen('customer-form')
        goTo(pages.indexOf('review'))
        window.scrollTo({ top: 0, behavior: 'smooth' })
      })()
      return
    }
    if (next === 'builder') setBuilderPreviewView('Exterior')
    if (next === 'visualizer' || next === 'home') {
      setReturningFromVisualizer(false)
      setEditReturnTo(null)
      setEditPageId(null)
      setEditReturnError('')
    }
    if (next === 'visualizer') setVisualizerSessionStarted(true)
    if (next === 'builder' && screen === 'home') {
      // Starting again from Home begins a fresh pass through the workflow while
      // retaining the customer's configured door and contact selections.
      setStep(0)
      setSubmitted(false)
      setSubmitting(false)
      setSubmitError('')
    }
    setScreen(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const editConfiguration = (page: BuilderPage, returnTo: 'summary' | 'visualizer') => {
    const target = pages.indexOf(page)
    if (target < 0) return
    setEditReturnTo(returnTo)
    setEditPageId(page)
    setEditReturnError('')
    setSubmitted(false)
    if (returnTo === 'visualizer') setReturningFromVisualizer(true)
    showScreen('builder')
    goTo(target)
  }

  const doneEditing = () => {
    // Validate actual configured products against existing availability lists.
    // UI-only group/confirmation flags are not reasons to redo a valid product.
    const validForPreview = (page: BuilderPage) => {
      if (page === 'glass-type') return availableGlassCategories.some(option => option.id === selectedGlassCategory)
      if (page === 'glass' || page === 'glass-variant') return Boolean(selectedGlass && availableGlass.some(option => option.id === glassId))
      if (page === 'sidelite-glass-type') return Boolean(selectedSideliteCatalog?.categories.some(option => option.id === sideliteGlassCategory))
      if (page === 'sidelite-glass' || page === 'sidelite-glass-variant') return Boolean(selectedFslGlass)
      if (page === 'grid-location') return availableGridLocations.some(option => option.id === gridPathId)
      if (page === 'grid-style') return lowEGridStyles.some(option => option.id === gridStyle)
      if (page === 'grid-pattern') return compatibleGridPatterns.some(option => option.id === gridPattern)
      if (page === 'grid-color') return compatibleGridColors.includes(gridColor as GridColor)
      if (page === 'grid-width') return compatibleGridWidths.includes(gridWidth as GridWidth)
      if (page === 'sidelite-grid-location') return availableSideliteGridLocations.some(option => option.id === sideliteGridLocation)
      if (page === 'sidelite-grid-style') return fslGridStyles.includes(sideliteGridStyle as GridStyle)
      if (page === 'sidelite-grid-pattern') return fslPatterns.includes(sideliteGridPattern as GridPattern)
      if (page === 'sidelite-grid-color') return fslColors.includes(sideliteGridColor as GridColor)
      if (page === 'sidelite-grid-width') return fslWidths.includes(sideliteGridWidth as GridWidth)
      return isBuilderPageComplete(page)
    }
    const missingPage = pages.find(page => page !== 'review' && !validForPreview(page))
      ?? (!supportsSideliteLine && sidelites && sidelites !== 'none' ? 'sidelites' : undefined)
      ?? (!jambFinish ? (pages.includes('jamb-finish') ? 'jamb-finish' : 'door-finish') : undefined)
      ?? (glassFrameColorMode === 'custom' && !customGlassFrameFinish ? (pages.includes('glass-frame-color') ? 'glass-frame-color' : 'door-finish') : undefined)
    if (missingPage) {
      goTo(pages.indexOf(missingPage))
      setEditReturnError('Please update this option before returning to your preview.')
      return
    }
    if (editReturnTo === 'visualizer') showScreen('visualizer')
    else {
      goTo(pages.indexOf('review'))
      setEditReturnTo(null)
      setEditPageId(null)
      setEditReturnError('')
      setReturningFromVisualizer(false)
    }
  }

  const isVisualizerEditing = editReturnTo === 'visualizer'
  const editModeControls = isVisualizerEditing && <div className="configuration-edit-return editing-bar">
    <strong>Editing your design</strong>
    <button type="button" onClick={doneEditing}>Done editing</button>
    {editReturnError && <p role="status">{editReturnError}</p>}
  </div>

  const requestCustomerAction = async (action: 'download-pdf' | 'open-visualizer') => {
    if (customerFormCompleted || await dealerSession.verify()) {
      if (action === 'download-pdf') await downloadPdf().catch(() => undefined)
      else await showScreen('visualizer')
      return
    }
    void (async () => {
      if (action === 'download-pdf') {
        try {
          await renderConfiguredPdfProduct()
        } catch (error) {
          setSubmitError(error instanceof Error ? error.message : 'The configured door preview could not be prepared.')
          return
        }
      }
      setPendingCustomerAction(action)
      setCompletedCustomerAction(null)
      setSubmitted(false)
      setSubmitError('')
      setScreen('customer-form')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    })()
  }

  const renderConfiguredPdfProduct = async () => {
    setPdfError('')
    try {
      const renderConfigurationKey = pdfProductKey
      if (!currentDoorConfiguration) throw new Error('Complete the door configuration before PDF export.')
      const { renderPdfProduct } = await safeDynamicImport(() => import('./utils/pdfProductRenderer'))
      const { dataUrl } = await renderPdfProduct(currentDoorConfiguration, configuredDoorPreview)
      if (pdfProductKeyRef.current !== renderConfigurationKey) throw new Error('The door configuration changed while the PDF product image was being prepared. Please try again.')
      setPdfProductRender({ configurationKey: renderConfigurationKey, dataUrl })
      return dataUrl
    } catch (error) {
      setPdfError(error instanceof Error ? error.message : 'The PDF product image could not be rendered. Please retry.')
      throw error
    }
  }

  const updateContact = (key: keyof ContactForm, value: string) => {
    setContact((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  const selectFinishTab = (nextTab: 'paint' | 'stain') => {
    if (nextTab === selectedFinishType) return
    setSelectedFinishType(nextTab)
    setSelectedPaint('')
    setSelectedStain('')
  }

  const selectDoorLine = (nextDoorLineId: string) => {
    if (!availableDoorLines.some((item) => item.id === nextDoorLineId)) return
    if (nextDoorLineId !== doorLineId) {
      const line = availableDoorLines.find(item => item.id === nextDoorLineId)!
      const grains = signatureGrainChoices.filter(item => selectedStyle?.variants.some(variant => line.lineIds.includes(variant.lineId) && variant.grains.includes(item.id)))
      const nextGrain = nextDoorLineId === signatureSeriesId ? grains[0]?.id ?? '' : ''
      setDoorLineId(nextDoorLineId)
      setGrainId(nextGrain)
      reconcileSideliteForParent(nextDoorLineId, nextGrain || line.autoGrain || null)
      // Main glass is reconciled after destination material/grain lists settle.
    }
    if (!editReturnTo && availableDoorLines.length === 1) goTo(step + 1)
  }

  const selectGrain = (nextGrain: string) => {
    if (!signatureGrainOptions.some((item) => item.id === nextGrain)) return
    if (nextGrain !== grainId) {
      setGrainId(nextGrain)
      reconcileSideliteForParent(doorLineId, nextGrain)
    }
    if (!editReturnTo && signatureGrainOptions.length === 1) goTo(step + 1)
  }

  const selectSidelites = (nextSidelites: SideliteConfiguration) => {
    setSidelites(nextSidelites)
    if (nextSidelites === 'none') {
      setSideliteStyleId('')
      setSideliteGlassCategory(''); setSideliteGlassId('')
      setSideliteGridLocation(''); setSideliteGridStyle(''); setSideliteGridPattern(''); setSideliteGridColor(''); setSideliteGridWidth('')
    }
  }

  const resetSideliteGrid = () => {
    setSideliteGridLocation(''); setSideliteGridStyle(''); setSideliteGridPattern(''); setSideliteGridColor(''); setSideliteGridWidth('')
  }
  const reconcileSideliteForParent = (lineId: string, grain: string | null, requestedStyleId = sideliteStyleId) => {
    if (!sidelites || sidelites === 'none') return
    const family = sideliteAssetFamilyForSlab({ doorLineId: lineId, grain })
    const ids = sideliteStylesForFamily(family)
    const options = sortByDisplayLabel(sideliteStyleOptions.filter(item => ids.includes(item.id)), item => sideliteStyleDisplayName(item.id))
    const nextId = validOptionId(requestedStyleId, options)
    if (nextId === sideliteStyleId) return
    setSideliteStyleId(nextId)
    const catalog = sideliteGlassCatalogs[nextId as keyof typeof sideliteGlassCatalogs]
    const previousGlass = selectedSideliteCatalog?.options.find(option => option.id === sideliteGlassId)
    const valid = catalog?.options.filter(option => isCustomerSelectableGlass(option) && isGlassFamilyCompatible(option, lineId) && (!isClicGlass(option) || clicAvailable({ ...clicContext, lineId, grain }, nextId))) ?? []
    const retainedGlass = retainGlassSelection(previousGlass, valid)
    if (retainedGlass) {
      // Shared IDs must also exist in the destination opening's catalog.
      // Keep grid components only as far as the new opening supports them.
      setSideliteGlassCategory(retainedGlass.category)
      setSideliteGlassId(retainedGlass.id)
      const group = groupSideliteGlassOptions(valid.filter(option => option.category === retainedGlass.category)).find(group => group.options.some(option => option.id === retainedGlass.id))
      setSideliteGlassGroupKey(group?.key ?? '')
      setSideliteGlassVariantConfirmed(true)
      if (retainedGlass.id !== 'clear-grids') { resetSideliteGrid(); return }
      if (sideliteGridLocation === 'sdl') {
        const patterns = nextId === 'fsl' ? Object.values(fslSdlPatterns).flat() : catalog.sdlPatterns
        if (sideliteGridPattern && !patterns.includes(sideliteGridPattern)) setSideliteGridPattern('')
        return
      }
      if (sideliteGridLocation !== 'internal') { resetSideliteGrid(); return }
      const standard = sideliteGridStyle ? catalog.standardRules[sideliteGridStyle] : undefined
      const lowE = sideliteGridStyle ? catalog.lowERules[sideliteGridStyle] : undefined
      if (!standard && !lowE) {
        setSideliteGridStyle(''); setSideliteGridPattern(''); setSideliteGridColor(''); setSideliteGridWidth('')
        return
      }
      const pattern = sideliteGridStyle === 'Prairie' ? catalog.prairiePattern : sideliteGridPattern
      if (!pattern || (!standard?.[pattern] && !lowE?.[pattern])) {
        setSideliteGridPattern(''); setSideliteGridColor(''); setSideliteGridWidth('')
        return
      }
      const widths = [...(standard?.[pattern]?.[sideliteGridColor as GridColor] ?? []), ...(lowE?.[pattern]?.[sideliteGridColor as GridColor] ?? [])]
      if (standard?.[pattern]?.[sideliteGridColor as GridColor] === undefined && lowE?.[pattern]?.[sideliteGridColor as GridColor] === undefined) {
        setSideliteGridColor(''); setSideliteGridWidth('')
      } else if (sideliteGridWidth && !widths.includes(sideliteGridWidth)) setSideliteGridWidth('')
      return
    }
    setSideliteGlassCategory(''); setSideliteGlassId('')
    setSideliteGlassGroupKey(''); setSideliteGlassVariantConfirmed(false)
    resetSideliteGrid()
  }
  const selectSideliteStyle = (styleId: string) => {
    if (!visibleSideliteStyleOptions.some((option) => option.id === styleId)) return
    if (styleId !== sideliteStyleId) {
      reconcileSideliteForParent(doorLineId, selectedGrain, styleId)
    }
  }
  const selectSideliteGlassCategory = (category: SideliteGlassCategory) => { setSideliteGlassCategory(category); setSideliteGlassId(''); setSideliteGlassGroupKey(''); setSideliteGlassVariantConfirmed(false); resetSideliteGrid() }
  const selectSideliteGlass = (id: string) => { setSideliteGlassId(id); resetSideliteGrid() }
  const selectSideliteGlassGroup = (group: { key: string; options: SideliteGlassOption[] }) => {
    if (editReturnTo && group.key === sideliteGlassGroupKey && group.options.some(option => option.id === sideliteGlassId)) return
    setSideliteGlassGroupKey(group.key)
    setSideliteGlassId(group.options[0]?.id ?? '')
    setSideliteGlassVariantConfirmed(group.options.length === 1)
    resetSideliteGrid()
  }
  const selectSideliteGlassVariant = (id: string) => { selectSideliteGlass(id); setSideliteGlassVariantConfirmed(true) }
  const selectSideliteGridLocation = (location: FslGridLocationId) => { setSideliteGridLocation(location); setSideliteGridStyle(''); setSideliteGridPattern(''); setSideliteGridColor(''); setSideliteGridWidth('') }
  const selectSideliteGridStyle = (styleName: GridStyle) => { setSideliteGridStyle(styleName); setSideliteGridPattern(''); setSideliteGridColor(''); setSideliteGridWidth('') }
  const selectSideliteGridPattern = (pattern: GridPattern) => { setSideliteGridPattern(pattern); setSideliteGridColor(''); setSideliteGridWidth('') }
  const selectSideliteGridColor = (color: GridColor) => { setSideliteGridColor(color); setSideliteGridWidth('') }

  const selectFinish = (nextFinishId: string, nextFinishType: 'paint' | 'stain') => {
    if (!visibleFinishes.some((item) => item.id === nextFinishId)) return
    setSelectedFinishType(nextFinishType)
    if (nextFinishId !== finishId) {
      if (nextFinishType === 'paint') setSelectedPaint(nextFinishId)
      else setSelectedStain(nextFinishId)
    }
    if (!editReturnTo && visibleFinishes.length === 1) goTo(step + 1)
  }

  const selectJambType = (nextType: 'timber' | 'clad') => {
    setJambType(nextType)
    setJambFinishType(nextType === 'clad' ? 'clad' : selectedFinish?.finishType ?? 'paint')
    const match = matchingJambFinish(selectedFinish, nextType, cladFinishes)
    setJambFinishColor(match?.id ?? '')
    setJambFinishOverridden(false)
  }

  const selectJambFinish = (id: string) => {
    if (!jambFinishOptions.some((item) => item.id === id)) return
    setJambFinishColor(id)
    setJambFinishOverridden(id !== selectedFinish?.id || jambType === 'clad')
  }

  const selectGlass = (nextGlassId: string) => {
    if (!visibleGlass.some((item) => item.id === nextGlassId)) return
    if (nextGlassId !== glassId) {
      setGlassId(nextGlassId)
      resetGridOptions()
    }
    if (!editReturnTo && visibleGlass.length === 1) goTo(step + 1)
  }

  const selectGlassGroup = (group: GlassOptionGroup) => {
    if (editReturnTo && group.key === selectedGlassGroupKey && group.options.some(option => option.id === glassId)) return
    setSelectedGlassGroupKey(group.key)
    setGlassId(group.options[0]?.id ?? '')
    setGlassVariantConfirmed(group.options.length === 1)
    resetGridOptions()
  }
  const selectGlassVariant = (id: string) => { selectGlass(id); setGlassVariantConfirmed(true) }

  const selectGlassCategory = (nextCategory: GlassCategory) => {
    if (!availableGlassCategories.some((item) => item.id === nextCategory)) return
    if (nextCategory !== selectedGlassCategory) {
      setSelectedGlassCategory(nextCategory)
      setGlassId('')
      setSelectedGlassGroupKey('')
      setGlassVariantConfirmed(false)
      resetGridOptions()
    }
    if (!editReturnTo && availableGlassCategories.length === 1) goTo(step + 1)
  }

  const selectGridLocation = (nextLocationId: string) => {
    setGridPathId(nextLocationId)
    setGridPattern('')
    setGridStyle('')
    setGridColor('')
    setGridWidth('')
  }

  const selectGridStyle = (nextStyle: GridStyle) => {
    setGridStyle(nextStyle)
    setGridPattern('')
    setGridColor('')
    setGridWidth('')
  }

  const selectGridPattern = (nextPattern: GridPattern) => {
    setGridPattern(nextPattern)
    setGridColor('')
    setGridWidth('')
    if (!editReturnTo && compatibleGridPatterns.length === 1) goTo(step + 1)
  }

  const selectGridColor = (nextColor: GridColor) => {
    setGridColor(nextColor)
    setGridWidth('')
    if (!editReturnTo && compatibleGridColors.length === 1) goTo(step + 1)
  }

  const selectGridWidth = (nextWidth: GridWidth) => {
    setGridWidth(nextWidth)
    if (!editReturnTo && compatibleGridWidths.length === 1) goTo(step + 1)
  }

  const selectHardware = (nextHardwareId: string) => {
    if (!hardwareOptions.some((item) => item.id === nextHardwareId)) return
    if (nextHardwareId !== hardwareId) setHardwareId(nextHardwareId)
    if (!editReturnTo && hardwareStyleGroups.length === 1 && hardwareStyleGroups[0].length === 1) goTo(step + 1)
  }

  const selectDoorSwing = (nextDoorSwingId: string) => {
    if (!swingSelectionOptions.some((item) => item.id === nextDoorSwingId)) return
    if (nextDoorSwingId !== doorSwingId) setDoorSwingId(nextDoorSwingId)
    if (!editReturnTo && doorSwingOptions.length === 1) goTo(step + 1)
  }

  const currentDoorConfiguration: DoorConfiguration | null = selectedHardware && selectedDoorSwing && selectedFinish ? {
    ...(isSavannahDoor ? { savannahOpening: savannahOpening(selectedDoorSwing.id) } : {}),
    doorConfigurationType: selectedDoorConfigurationType || 'single',
    ...(doorConfigurationProductOption ? { doorConfigurationProductOption } : {}),
    ...(selectedDoorConfigurationType !== 'single' && doubleDoorLockPrep ? { doubleDoorLockPrep } : {}),
    product,
    doorLine: selectedDoorLine?.name ?? product.doorType,
    style,
    grain: selectedGrain,
    finish,
    doorFinishType: finish.finishType,
    doorFinishColor: finish.name,
    glassFrameColorMode: glassFrameColorMode || undefined,
    glassFrameFinishId: glassFrameColorMode === 'custom' ? resolvedGlassFrameFinish.id : undefined,
    jambType: jambType || 'timber',
    jambFinishType: jambType === 'clad' ? 'clad' : jambFinish?.finishType ?? 'paint',
    jambFinishColor: jambFinish?.name ?? '',
    jambFinishOverridden,
    glassFrameFinishColor: supportsGlassFrameColor && appliedGlassFrameFinish ? appliedGlassFrameFinish.name : undefined,
    glass: configuredGlass,
    mainDoorGlass: configuredGlass,
    grid: gridConfiguration,
    hardware: selectedHardware,
    doorSwing: selectedDoorSwing,
    sidelites: sidelites || 'none',
    sidelitePlacement: sidelites || 'none',
    sideliteConfigurationCode: sideliteProductCode(sidelites || 'none', selectedDoorSwing.id, selectedDoorConfigurationType || 'single'),
    sideliteConfigurationLabel: sideliteConfigurationDisplayName(sidelites || 'none', selectedDoorSwing.id, selectedDoorConfigurationType || 'single', selectedSideliteStyle?.id),
    ...((sidelites || 'none') !== 'none' && selectedSideliteStyle ? { sideliteStyle: selectedSideliteStyle.name, sideliteSlab: selectedSideliteStyle.id } : {}),
    ...((sidelites || 'none') !== 'none' && sideliteGlassConfiguration ? { sideliteGlass: sideliteGlassConfiguration } : {}),
  } : null

  const submit = async () => {
    if (submitting || submitted) return
    const required: (keyof ContactForm)[] = ['fullName', 'email', 'phone', 'zip']
    const nextErrors: Partial<Record<keyof ContactForm, string>> = {}
    required.forEach((key) => { if (!contact[key].trim()) nextErrors[key] = 'Please complete this field.' })
    if (contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) nextErrors.email = 'Enter a valid email address.'
    if (contact.phone && !/^[+]?[\d\s().-]{7,20}$/.test(contact.phone)) nextErrors.phone = 'Enter a valid phone number.'
    if (contact.zip && !/^\d{5}(-\d{4})?$/.test(contact.zip)) nextErrors.zip = 'Enter a valid ZIP code.'
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      return
    }
    setSubmitting(true)
    setSubmitError('')
    try {
      if (!selectedHardware) throw new Error('Please select hardware before sending your configuration.')
      if (!selectedDoorSwing) throw new Error('Please select a door swing before sending your configuration.')
      if (!selectedFinish) throw new Error('Please select a door finish before sending your configuration.')
      if (!currentDoorConfiguration) throw new Error('Please complete your door configuration before sending it.')
      const configuration = currentDoorConfiguration
      const flattenedSubmission = buildDoorBuilderSubmissionPayload({ configuration, contact })
      const doorConfiguration = { schemaVersion: 1 as const, configuration }
      const submissionFingerprint = JSON.stringify({ ...flattenedSubmission, doorConfiguration })
      const submissionId = submissionAttemptRef.current?.fingerprint === submissionFingerprint
        ? submissionAttemptRef.current.submissionId
        : crypto.randomUUID()
      submissionAttemptRef.current = { fingerprint: submissionFingerprint, submissionId }
      await submitQuote({
        ...flattenedSubmission,
        submissionId,
        doorConfiguration,
        dealerSlug,
      })
      const completedAction = pendingCustomerAction
      setCustomerFormCompleted(true)
      setPendingCustomerAction(null)
      setCompletedCustomerAction(completedAction)
      if (completedAction === 'download-pdf') {
        await downloadPdf()
        setSubmitted(true)
      } else if (completedAction === 'open-visualizer') {
        setSubmitted(true)
      } else {
        setSubmitted(true)
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "We couldn't submit your information. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const downloadPdf = async () => {
    if (!selectedHardware || !selectedDoorSwing) return
    setPdfError('')
    try {
      if (!selectedFinish) throw new Error('Please select a door finish before downloading the PDF.')
      const { downloadSummary } = await safeDynamicImport(() => import('./utils/pdf'))
      const exactPreview = pdfProductRender?.configurationKey === pdfProductKey
        ? pdfProductRender.dataUrl
        : await renderConfiguredPdfProduct()
      await downloadSummary(contact, product, style, selectedGrain, finish, configuredGlass, gridConfiguration, selectedHardware, selectedDoorSwing, sidelites || 'none', selectedSideliteStyle?.name ?? null, sideliteGlassConfiguration, { jambType: jambType || 'timber', jambFinishType: jambType === 'clad' ? 'clad' : jambFinish?.finishType ?? 'paint', jambFinishColor: jambFinish?.name ?? '', jambFinishOverridden, glassFrameFinishColor: supportsGlassFrameColor && appliedGlassFrameFinish ? appliedGlassFrameFinish.name : undefined }, selectedDoorConfigurationType || 'single', exactPreview, isSavannahDoor ? DEFAULT_FRENCH_LOCK_PREP : isFrenchDoor ? doubleDoorLockPrep || DEFAULT_FRENCH_LOCK_PREP : null, dealerBrand?.companyName)
    } catch (error) {
      setPdfError(error instanceof Error ? error.message : 'The configuration PDF could not be downloaded. Please retry.')
      throw error
    }
  }

  const configurationSummaryRows: [string, string, number][] = [
    ['Door Configuration', doorConfigurationLabel(selectedDoorConfigurationType), pages.indexOf('door-configuration')],
    ...(isSavannahDoor ? [['Lock Setup', 'Lock on Main Door Only', pages.indexOf('hardware')] as [string, string, number]] : isFrenchDoor && selectedDoubleDoorLockPrep ? [['Lock Setup', selectedDoubleDoorLockPrep.name, pages.indexOf('lock-setup')] as [string, string, number]] : []),
    ['Door style', doorStyleDisplayName(style), pages.indexOf('door-style')],
    ['Door Line', selectedDoorLine?.name ?? product.doorType, pages.indexOf('door-line')],
    ['Sidelite Configuration', sideliteConfigurationDisplayName(sidelites || 'none', selectedDoorSwing?.id ?? 'LHI', selectedDoorConfigurationType || 'single', selectedSideliteStyle?.id), pages.indexOf('sidelites')],
    ...(selectedSideliteStyle ? [['Sidelite Slab', sideliteStyleDisplayName(selectedSideliteStyle.id), pages.indexOf('sidelite-style')] as [string, string, number]] : []),
    ...(selectedFslGlass ? [
      ['Sidelite Glass', glassDisplayName(selectedFslGlass.name), pages.indexOf('sidelite-glass')] as [string, string, number],
      ...(usesFslGridFlow ? [
        ...(!usesExactFslRules ? [['Sidelite glass coating', fslCoating, pages.indexOf('sidelite-grid-location')] as [string, string, number]] : []),
        ['Sidelite grid location', sideliteGridLocation === 'sdl' ? 'SDL' : sideliteGridLocation === 'external' ? 'External' : 'Internal', pages.indexOf('sidelite-grid-location')] as [string, string, number],
        ...(sideliteGridStyle ? [['Sidelite grid style', sideliteGridStyle, pages.indexOf('sidelite-grid-style')] as [string, string, number]] : []),
        ...(sideliteGridPattern ? [['Sidelite grid pattern', sideliteGridPattern, pages.indexOf('sidelite-grid-pattern')] as [string, string, number]] : []),
        ...(sideliteGridColor ? [['Sidelite grid color', sideliteGridColor, pages.indexOf('sidelite-grid-color')] as [string, string, number]] : []),
        ...(sideliteGridWidth ? [['Sidelite grid width', sideliteGridWidth, pages.indexOf('sidelite-grid-width')] as [string, string, number]] : []),
      ] : []),
    ] : []),
    ...(selectedGrain ? [['Grain', selectedGrain, pages.indexOf('door-grain')] as [string, string, number]] : []),
    ['Door finish type', selectedFinish ? selectedFinish.finishType === 'stain' ? 'Stain' : 'Paint' : 'Not selected', pages.indexOf('door-finish')],
    ['Door finish color', selectedFinish?.name ?? 'Not selected', pages.indexOf('door-finish')],
    ['Jamb type', jambType === 'clad' ? 'Clad' : 'Timber', pages.indexOf('jamb-type')],
    ['Jamb finish type', jambType === 'clad' ? 'Clad' : jambFinishType === 'stain' ? 'Stain' : 'Paint', pages.indexOf('jamb-finish')],
    ['Jamb finish color', jambFinish?.name ?? 'Not selected', pages.indexOf('jamb-finish')],
    ...(compatibilitySupportsGlass ? [['Main Door Glass', glassDisplayName(configuredGlass?.name ?? 'Not selected'), pages.indexOf('glass-type')] as [string, string, number]] : []),
    ...(supportsGlassFrameColor && appliedGlassFrameFinish ? [['Glass Frame Color', glassFrameColorMode === 'match-door' ? `Match Door (${appliedGlassFrameFinish.name})` : appliedGlassFrameFinish.name, pages.indexOf('glass-frame-color')] as [string, string, number]] : []),
    ...(gridConfiguration ? [
      ...(gridConfiguration.glassCoating !== 'Standard / No Low-E' ? [['Glass Coating', gridConfiguration.glassCoating, pages.indexOf('grid-location')] as [string, string, number]] : []),
      ...(gridConfiguration.gridLocation ? [['Grid Location', gridConfiguration.gridLocation, pages.indexOf('grid-location')] as [string, string, number]] : []),
      ...(gridConfiguration.gridStyle ? [['Grid Style', gridConfiguration.gridStyle, pages.indexOf('grid-style')] as [string, string, number]] : []),
      ...(gridConfiguration.gridPattern ? [['Grid Pattern', gridConfiguration.gridPattern, pages.indexOf('grid-pattern')] as [string, string, number]] : []),
      ...(gridConfiguration.gridColor ? [['Grid Color', gridConfiguration.gridColor, pages.indexOf('grid-color')] as [string, string, number]] : []),
      ...(gridConfiguration.gridWidth ? [['Grid Width', gridConfiguration.gridWidth, pages.indexOf('grid-width')] as [string, string, number]] : []),
    ] as [string, string, number][] : []),
    ['Hardware', selectedHardware ? hardwareDisplayName(selectedHardware) : 'Not selected', pages.indexOf('hardware')],
    ...(isFrenchDoor ? [['Opening', 'Both slabs operable', pages.indexOf('door-configuration')] as [string, string, number]] : [['Door swing', selectedDoorSwing?.name ?? 'Not selected', pages.indexOf('door-swing')] as [string, string, number]]),
  ]
  const feedbackConfiguration = {
    doorStyle: selectedStyle?.name ?? 'Not selected',
    doorConfiguration: selectedDoorConfigurationType ? doorConfigurationLabel(selectedDoorConfigurationType) : 'Not selected',
    sidelites: sideliteRelationshipLabel(sidelites || 'none', selectedDoorConfigurationType || 'single'),
    glass: configuredGlass?.name ?? (compatibilitySupportsGlass ? 'Not selected' : 'Not applicable'),
    sideliteGlass: selectedFslGlass?.name ?? ((sidelites || 'none') === 'none' ? 'Not applicable' : 'Not selected'),
    doorFinish: selectedFinish?.name ?? 'Not selected',
    jambType: jambType || 'Not selected',
    jambFinish: jambFinish?.name ?? 'Not selected',
    glassFrameFinish: appliedGlassFrameFinish?.name ?? 'Not selected',
    hardware: selectedHardware ? hardwareDisplayName(selectedHardware) : 'Not selected',
    lockSetup: selectedDoubleDoorLockPrep?.name ?? 'Not applicable',
    doorSwing: selectedDoorSwing?.name ?? 'Not selected',
  }
  const feedbackStep = screen === 'builder' ? `${currentStep}: ${currentPage}` : screen

  useEffect(() => {
    if (screen !== 'builder') return
    const app = document.querySelector<HTMLElement>('.app')
    const actions = app?.querySelector<HTMLElement>('.builder-actions')
    const editingBar = app?.querySelector<HTMLElement>('.editing-bar')
    const observer = new ResizeObserver(() => {
      if (actions) app?.style.setProperty('--builder-actions-height', `${actions.getBoundingClientRect().height}px`)
      if (editingBar) app?.style.setProperty('--builder-editing-bar-height', `${editingBar.getBoundingClientRect().height}px`)
    })
    if (actions) observer.observe(actions)
    if (editingBar) observer.observe(editingBar)
    return () => {
      observer.disconnect()
      app?.style.removeProperty('--builder-actions-height')
      app?.style.removeProperty('--builder-editing-bar-height')
    }
  }, [screen, currentPage, editReturnTo])
  useInventoryShadow({styleId,lineId:doorLineId,grain:selectedGrain,finishType:selectedFinishType,glassId,sideliteStyle:sideliteStyleId,hardwareId},screen==='builder')
  usePublishedCatalogShadow(screen === 'builder')

  const heroGenerationParam = new URLSearchParams(window.location.search).get('generateHeroDoor')
  if (heroGenerationParam !== null) {
    const generationIndex = Number.parseInt(heroGenerationParam, 10)
    const generationDemo = homeDemoConfigurations[generationIndex]
    if (!generationDemo || !HERO_PRESETS[generationIndex]) return <pre>Invalid hero door index: {heroGenerationParam}</pre>
    return <HeroDoorGenerator
      label={heroDoorFilename(HERO_PRESETS[generationIndex], generationIndex)}
      previewProps={{ style: generationDemo.style, finish: generationDemo.finish, glass: generationDemo.glass, hardware: generationDemo.hardware, grain: generationDemo.grain, product: generationDemo.product, tintColor: generationDemo.finish.color, applyFinish: true, gridMatchesFinish: generationDemo.gridMatchesFinish }}
    />
  }

  return (
    <div
      className={`app builder-typography ${screen === 'home' ? 'home-app' : screen === 'visualizer' ? 'visualizer-app' : screen === 'customer-form' ? 'customer-form-app' : ''} ${screen === 'builder' && isVisualizerEditing ? 'visualizer-editing' : ''} ${screen === 'builder' && currentPage === 'review' && submitted ? 'review-confirmation-centered' : ''} ${dealerBrand ? 'dealer-cobranded' : ''} ${dealerBrand && isLightBrandColor(dealerBrand.secondaryColor) ? 'dealer-secondary-light' : ''}`}
      style={dealerBrand ? dealerBrandStyle(dealerBrand) : undefined}
    >
      <div className="dealer-mode-banner-slot" ref={setDealerBannerTarget} />
      <header>
        <div className="brand">
          <button className="brand-home" type="button" aria-label="Go to home page" onClick={() => showScreen('home')}>
            <img src="/assets/branding/hgi-logo-black.webp" alt="Home Guard Industries Doors and Windows" />
          </button>
          {dealerBrand && <DealerBrandMark brand={dealerBrand} onDarkBackground={!isLightBrandColor(dealerBrand.secondaryColor)} />}
          {screen !== 'home' && <span className="app-name"><strong>Home Guard Door Builder</strong></span>}
        </div>
        <div className="header-actions">
          {screen !== 'home' && <>
          <button className="home-return" aria-label="Home" onClick={() => showScreen('home')}><HomeIcon size={17} /><span>Home</span></button></>}
          <div className="header-dealer-cta"><span>Want this door? <strong>Connect with a Dealer</strong></span><a href="https://homeguardindustries.com/find-a-home-guard-dealer-hub/" target="_blank" rel="noreferrer">Find a Dealer <ExternalLink size={14} /></a></div>
        </div>
      </header>

      <dialog ref={resetDialogRef} className="reset-design-dialog" aria-labelledby="reset-design-title" aria-describedby="reset-design-message"
        onCancel={event => { event.preventDefault(); closeResetDialog() }}
        onClick={event => {
          if (event.target !== event.currentTarget) return
          const rect = event.currentTarget.getBoundingClientRect()
          if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeResetDialog()
        }}
        onKeyDown={event => {
          if (event.key !== 'Tab') return
          const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button')]
          const first = buttons[0], last = buttons[buttons.length - 1]
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
        }}>
        <h2 id="reset-design-title">Start over?</h2>
        <p id="reset-design-message">This will clear your current door selections so you can build a new configuration.</p>
        <div className="reset-design-actions">
          <button type="button" className="reset-design-cancel" onClick={closeResetDialog}>Keep editing</button>
          <button type="button" className="reset-design-confirm" onClick={confirmResetDesign}>Start over</button>
        </div>
      </dialog>

      {screen === 'home' ? <main className="home-page">
        <section className="home-hero">
          <div className="home-hero-copy">
            <h1>Build a Door Made for <em>Your Home.</em></h1>
            <p>Choose your door style, finish, glass, and hardware, then bring your vision to life by seeing how your custom door looks on your own home.</p>
            <button className="start-building" onClick={() => showScreen('builder')}>Start Building Your Door</button>
          </div>
          <div className="home-hero-visual">
            <div className="home-entryway-demo hero-composite" aria-label="Animated examples of configurable entry doors">
              <div className="hero-composite-stage" style={heroSceneStyle}>
                <img className="home-entryway-image" src="/assets/hero/hero-entryway.webp" alt="Welcoming home entryway with a customizable door preview" />
                <div className="home-entryway-overlay" aria-hidden="true">
                  <div className="home-entryway-door-slot hero-door-stack entryway-door-stack hero-door-overlay" style={heroDoorOpeningStyle}>
                    <HomepageDoorShowcase />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        <div className="home-preview-caption"><p>Made to complement your home.</p><p>Styles. Finishes. Glass. Hardware.</p></div>
      </main> : screen === 'customer-form' ? <main className="customer-form-page">
        <section className={`customer-form-screen ${submitted && completedCustomerAction === 'open-visualizer' ? 'visualizer-success-screen' : ''}`} aria-labelledby="customer-form-title">
          <button type="button" className="back" onClick={() => { setPendingCustomerAction(null); setCompletedCustomerAction(null); setSubmitted(false); goTo(pages.indexOf('review')); showScreen('builder') }}><ArrowLeft size={17} /> Back to Review</button>
          {!submitted ? <div className="form-card" id="quote-contact-form">
            <span className="form-screen-eyebrow">Home Guard Door Builder</span>
            <h1 id="customer-form-title">Complete Your Information</h1>
            <p>{pendingCustomerAction === 'download-pdf' ? 'Enter your details to download your configured door quote.' : pendingCustomerAction === 'open-visualizer' ? 'Enter your details to view your configured door on your home.' : 'Enter your details to send your configured door to Home Guard.'}</p>
            {pendingCustomerAction === 'open-visualizer' && <div className="visualizer-form-guide"><img src="/assets/visualizer/view-on-your-home-tablet.webp" alt="Example of a configured door shown on a customer's house" /><div><strong>Next: Add a photo of your home</strong><p>After submitting, we’ll guide you through uploading a clear picture of your entrance and placing your configured door on it.</p></div></div>}
            <QuoteForm values={contact} errors={errors} onChange={updateContact} />
            <label className="consent"><input type="checkbox" defaultChecked /> <span>I agree to be contacted about this door configuration.</span></label>
            {submitError && <p className="submit-error" role="alert">{submitError}</p>}
            <button className="submit-button" type="button" disabled={submitting} onClick={submit}><Send size={18} /> {submitting ? 'Preparing & Sending...' : pendingCustomerAction === 'open-visualizer' ? 'Continue to Visualizer' : pendingCustomerAction === 'download-pdf' ? 'Submit & Download PDF' : 'Send My Door Configuration'}</button>
            <p className="privacy"><ShieldCheck size={15} /> Your information is kept private and never sold.</p>
          </div> : completedCustomerAction === 'open-visualizer' ? <div className="success visualizer-form-confirmation visualizer-home-success-card">
            <div className="visualizer-confirmation-layout">
              <div className="visualizer-confirmation-intro">
                <span className="visualizer-success-indicator"><Check size={32} /></span>
                <small>Information received</small>
                <h1 id="customer-form-title">Your door is ready to view on your home.</h1>
                <p>Next, upload a photo of your entrance. We’ll guide you through positioning your configured door on the picture.</p>
              </div>
              <div className="visualizer-confirmation-graphic"><img src="/assets/visualizer/view-on-your-home-tablet.webp" alt="A configured door visualized on a home entrance" /></div>
              <div className="visualizer-confirmation-action"><strong>See your configured door on your own entryway</strong><span>Have a clear photo of your entrance ready.</span><button className="post-submit-visualizer-button" type="button" onClick={() => showScreen('visualizer')}><Eye size={19} /> Continue to Home Visualizer <ArrowRight size={17} /></button></div>
            </div>
          </div> : <SubmissionConfirmation fullName={contact.fullName} onContinue={() => showScreen('visualizer')} onReview={() => { setSubmitted(false); setCompletedCustomerAction(null); goTo(pages.indexOf('review')); showScreen('builder') }} />}
        </section>
      </main> : screen === 'visualizer' ? null : <>
      {editModeControls}
      <div className={`builder-toolbar ${currentPage === 'review' && submitted ? 'confirmation-toolbar' : ''}`}>
        <nav className="stepper" aria-label="Configuration progress">
          {steps.map((label, index) => {
            const isReachable = canVisitStep(index)
            const targetPage = builderGroupStart(pages, label)
            return <button key={label} className={`${index === activeMainStepIndex ? 'active' : ''} ${index < activeMainStepIndex ? 'done' : ''}`} disabled={!isReachable} aria-current={index === activeMainStepIndex ? 'step' : undefined} onClick={() => isReachable && goTo(targetPage)}><span>{index + 1}</span><em>{label}</em></button>
          })}
        </nav>
        {!(currentPage === 'review' && submitted) && <div className="preview-toolbar">
          {currentPage !== 'review' && <button type="button" className="preview-reset-design preview-toolbar-reset" aria-label="Reset Design" title="Reset Design" onClick={resetDesign}><RotateCcw size={19} /></button>}
          {selectedStyle && <div className="preview-view-toggle" role="group" aria-label="Preview view">
            {previewModes.map((view) => <button type="button" className={builderPreviewView === view ? 'active' : ''} aria-pressed={builderPreviewView === view} key={view} onClick={() => setBuilderPreviewView(view)}>{view}</button>)}
          </div>}
        </div>}
      </div>
      <main>
        {currentStep !== 'Review & Quote' && <div className="mobile-live-preview">
          <button type="button" className="preview-reset-design" aria-label="Reset Design" title="Reset Design" onClick={resetDesign}><RotateCcw size={19} /></button>
          {selectedStyle && <div className="preview-view-toggle mobile-preview-view-toggle" role="group" aria-label="Preview view">
            {previewModes.map((view) => <button type="button" className={builderPreviewView === view ? 'active' : ''} aria-pressed={builderPreviewView === view} key={view} onClick={() => setBuilderPreviewView(view)}>{view}</button>)}
          </div>}
          {selectedStyle ? renderConfiguredPreviewMode() : <EmptyDoorPreview />}
        </div>}
        <section ref={builderPanelRef} className={`builder-panel ${currentStep !== 'Review & Quote' ? 'configuration-step' : 'review-step'}`}>
          {currentStep !== 'Review & Quote' && <>
            <div className="builder-step-intro">
              {returningFromVisualizer && !editReturnTo && <div className="saved-door-visualizer-action">
                <button type="button" disabled={!visualizerConfigurationReady} onClick={() => requestCustomerAction('open-visualizer')}><Eye size={16} /> Return to Visualizer <ArrowRight size={15} /></button>
              </div>}
              <div className="section-heading step-heading">
              <div className="step-heading-copy">
                <div className="step-label-row">
                  <span>Step {activeMainStepIndex + 1} of {steps.length} · {currentStep}</span>
                </div>
                <div className="step-title-row">
                  <h1>{currentPage === 'door-configuration' ? 'Choose Your Door Configuration' : currentPage === 'door-style' ? 'Choose a Door Style' : currentPage === 'door-line' ? 'Choose Your Door Line' : currentPage === 'door-grain' ? 'Choose Your Door Grain' : currentPage === 'sidelites' ? 'Choose Your Sidelites' : currentPage === 'sidelite-style' ? 'Choose Your Sidelite Slab' : currentPage === 'door-finish' ? 'Choose Your Door Finish' : currentPage === 'jamb-type' ? 'Choose Your Jamb Type' : currentPage === 'jamb-finish' ? 'Choose Your Jamb Finish' : currentPage === 'glass-type' ? 'Choose Main Door Glass Type' : currentPage === 'glass' ? 'Choose Main Door Glass' : currentPage === 'glass-variant' ? `Choose ${selectedGlassGroup?.title ?? 'Glass'} Finish` : currentPage === 'glass-frame-color' ? 'Choose Glass Frame Color' : currentPage === 'grid-location' ? 'Choose Main Door Grid Location' : currentPage === 'grid-style' ? 'Choose Main Door Grid Style' : currentPage === 'grid-pattern' ? 'Choose Main Door Grid Pattern' : currentPage === 'grid-color' ? 'Choose Main Door Grid Color' : currentPage === 'grid-width' ? 'Choose Main Door Grid Width' : currentPage === 'sidelite-glass-type' ? 'Choose Sidelite Glass Type' : currentPage === 'sidelite-glass' ? 'Choose Sidelite Glass' : currentPage === 'sidelite-glass-variant' ? `Choose ${selectedSideliteGlassGroup?.title ?? 'Sidelite Glass'} Finish` : currentPage === 'sidelite-grid-location' ? 'Choose Sidelite Grid Location' : currentPage === 'sidelite-grid-style' ? 'Choose Sidelite Grid Style' : currentPage === 'sidelite-grid-pattern' ? 'Choose Sidelite Grid Pattern' : currentPage === 'sidelite-grid-color' ? 'Choose Sidelite Grid Color' : currentPage === 'sidelite-grid-width' ? 'Choose Sidelite Grid Width' : currentPage === 'lock-setup' ? 'Lock Setup' : currentPage === 'hardware' ? 'Choose Your Hardware' : 'Choose Your Door Swing'}</h1>
                </div>
                <p>{currentPage === 'door-configuration' ? 'Start by choosing the type of entry door you want to build.' : currentPage === 'door-style' ? 'Select a door style to begin your configuration.' : currentPage === 'door-line' ? 'Choose the compatible material line for this door style.' : currentPage === 'door-grain' ? 'Choose the Signature Series grain for this door.' : currentPage === 'sidelites' ? 'Choose whether sidelites appear beside your selected door.' : currentPage === 'sidelite-style' ? `Select the sidelite slab for your ${selectedDoorLine?.name ?? 'steel'} entry unit.` : currentPage === 'door-finish' ? 'Choose the paint or stain applied to the door slab and sidelites.' : currentPage === 'jamb-type' ? 'Choose timber or clad for the frame, jambs, casing, brickmould, and mullions.' : currentPage === 'jamb-finish' ? 'Choose the finish applied only to the jamb and frame system.' : currentPage === 'glass-type' ? 'Choose the kind of glass you want to explore for the main door.' : currentPage === 'glass' ? 'Choose glass for the main door before selecting sidelite glass.' : currentPage === 'glass-variant' ? 'Choose the available finish for this glass design.' : currentPage === 'glass-frame-color' ? 'Match the insert trim to your door or choose a separate compatible paint color.' : currentPage.startsWith('sidelite-') ? `Choose the compatible ${sideliteStyleDisplayName(selectedSideliteStyle?.id)} sidelite option.` : currentPage === 'grid-location' ? 'Choose where the grids are installed.' : currentPage === 'grid-style' ? 'Choose the profile of your internal grids.' : currentPage === 'grid-pattern' ? 'Choose a pattern compatible with your selected grid style.' : currentPage === 'grid-color' ? 'Choose the confirmed color for this grid pattern.' : currentPage === 'grid-width' ? 'Choose the confirmed grid width.' : currentPage === 'lock-setup' ? 'Choose how you want your double doors prepared for hardware.' : currentPage === 'hardware' ? 'Complete your entry with hardware.' : 'Choose the direction your door will swing when viewed from the outside.'}</p>
              </div>
              </div>
            </div>
            <div ref={builderOptionsRef} className="builder-options-scroll">
                {currentPage === 'door-style' && <p className="door-style-help">Choose from solid-panel and glazed designs. Use View details for the full product name and details.</p>}
              {glassSelectionTarget && <div className={`glass-target-banner glass-target-${glassSelectionTarget}`} role="status" aria-live="polite">
                <span className="glass-target-icon" aria-hidden="true">{glassSelectionTarget === 'main-door' ? 'D' : 'SL'}</span>
                <span><small>You are choosing glass for</small><strong>{glassSelectionTarget === 'main-door' ? 'Main Door' : 'Sidelite'}</strong>{glassSelectionTarget === 'sidelite' && <em>{sideliteStyleDisplayName(selectedSideliteStyle?.id)}{sidelites && sidelites !== 'none' ? ` · ${sideliteRelationshipLabel(sidelites, selectedDoorConfigurationType || 'single')}` : ''}</em>}</span>
              </div>}
              {(currentPage === 'door-finish' || currentPage === 'jamb-finish') && selectedDoorLine && <div className="finish-toolbar">
                {(currentPage === 'door-finish' || jambType === 'timber') && <div className="finish-tabs" role="tablist" aria-label="Finish type">{effectiveFinishTypes.map((type) => <button type="button" role="tab" aria-selected={(currentPage === 'door-finish' ? activeFinishType : jambFinishType) === type} className={(currentPage === 'door-finish' ? activeFinishType : jambFinishType) === type ? 'active' : ''} key={type} onClick={() => currentPage === 'door-finish' ? selectFinishTab(type) : (setJambFinishType(type), setJambFinishColor(''), setJambFinishOverridden(true))}>{type === 'paint' ? 'Paint' : 'Stain'}</button>)}</div>}
                <div className="finish-logo-slot">
                  {(jambType === 'clad' && currentPage === 'jamb-finish' || (currentPage === 'door-finish' ? activeFinishType : jambFinishType) === 'paint') && <div className="promatch-group">
                    <div className="promatch-brand"><img src="/assets/branding/pro-match-logo.webp" alt="ProMatch paint colors" loading="lazy" decoding="async" /><ProMatchInfo /></div>
                  </div>}
                  {(currentPage === 'door-finish' ? activeFinishType : jambFinishType) === 'stain' && <div className="timberstain-group"><div className="timberstain-brand"><img src="/assets/branding/timberstain-logo.webp" alt="TimberStain®" loading="lazy" decoding="async" /><TimberStainInfo /></div></div>}
                </div>
              </div>}
              {currentPage === 'glass-frame-color' && <div className="finish-toolbar">
                <div className="finish-tabs" role="tablist" aria-label="Glass frame finish type">{glassFrameFinishTypes.map((type) => <button type="button" role="tab" aria-selected={glassFrameFinishType === type} className={glassFrameFinishType === type ? 'active' : ''} key={type} onClick={() => setGlassFrameFinishType(type)}>{type === 'paint' ? 'Paint' : 'Stain'}</button>)}</div>
                <div className="finish-logo-slot">{glassFrameFinishType === 'paint' ? <div className="promatch-group"><div className="promatch-brand"><img src="/assets/branding/pro-match-logo.webp" alt="ProMatch paint colors" /><ProMatchInfo /></div></div> : <div className="timberstain-group"><div className="timberstain-brand"><img src="/assets/branding/timberstain-logo.webp" alt="TimberStain®" /><TimberStainInfo /></div></div>}</div>
              </div>}
              <div className={`options-grid step-${step} ${currentPage === 'door-configuration' ? 'door-configuration-grid door-style-catalog-grid' : ''} ${currentPage === 'door-style' || currentPage === 'lock-setup' ? 'door-style-catalog-grid ' : ''}${currentPage === 'door-style' ? 'door-style-product-grid ' : ''}${currentPage === 'lock-setup' ? 'lock-setup-grid ' : ''}${currentPage === 'door-style' || currentPage === 'lock-setup' || currentPage === 'door-grain' || currentPage === 'door-finish' || currentPage === 'jamb-type' || currentPage === 'jamb-finish' || currentPage === 'glass-type' || currentPage === 'glass-variant' || currentPage.startsWith('grid-') || currentPage.startsWith('sidelite-') ? 'door-style-grid' : ''} ${currentPage === 'sidelites' || currentPage === 'sidelite-style' ? 'sidelite-catalog-grid' : ''} ${currentPage === 'glass' || currentPage === 'glass-variant' || currentPage === 'sidelite-glass' || currentPage === 'sidelite-glass-variant' ? 'glass-options-grid' : ''}`}>
                {currentPage === 'door-configuration' && doorConfigurationOptions.map((item) => <OptionCard key={item.id} className="door-catalog-card door-configuration-card" title={item.name} description={item.description} eyebrow="Entry configuration" selected={selectedDoorConfigurationType === item.id} onClick={() => selectDoorConfiguration(item.id)} visual={<div className="door-configuration-preview"><img className="door-configuration-card-image" src={item.image} alt="" loading="eager" decoding="async" /></div>} />)}
                {currentPage === 'door-style' && sortByDisplayLabel(availableDoorStyles, item => doorCatalogModelName(item.name)).map((item) => <DoorStyleCard key={item.id} style={item} selected={styleId === item.id} onSelect={() => selectDoorStyle(item.id)} />)}
                {currentPage === 'door-line' && sortByDisplayLabel(availableDoorLines, item => item.name).map((item) => <OptionCard key={item.id} title={item.name} description={item.description} eyebrow="Door Line" selected={doorLineId === item.id} onClick={() => selectDoorLine(item.id)} visual={<span className="door-line-card-image"><img src={item.image} alt="" loading="lazy" decoding="async" /></span>} />)}
                {currentPage === 'door-grain' && sortByDisplayLabel(signatureGrainOptions, item => item.name).map((item) => <OptionCard key={item.id} title={item.name} eyebrow="Signature grain" selected={selectedGrain === item.id} onClick={() => selectGrain(item.id)} visual={<img className="grain-card-image" src={item.image} alt="" loading="lazy" decoding="async" />} />)}
                {currentPage === 'sidelites' && sideliteOptions.map((item) => <OptionCard key={item.id} className="sidelite-catalog-card" title={item.name} eyebrow="Entry layout" selected={sidelites === item.id} onClick={() => selectSidelites(item.id)} visual={<img className="sidelite-option-image sidelite-option-image-unflipped" src={item.image} alt="" loading="eager" decoding="async" />} />)}
                {currentPage === 'sidelite-style' && sortByDisplayLabel(visibleSideliteStyleOptions, item => sideliteStyleDisplayName(item.id)).map((item) => <OptionCard key={item.id} className="sidelite-catalog-card" title={sideliteStyleDisplayName(item.id)} eyebrow={`${selectedDoorLine?.name ?? 'Door'} sidelite`} selected={sideliteStyleId === item.id} onClick={() => selectSideliteStyle(item.id)} visual={<img className="sidelite-style-image" src={sideliteSlabAsset(sideliteAssetFamily, item.id as SideliteStyleId)} alt="" loading="eager" decoding="async" />} />)}
                {currentPage === 'door-finish' && sortByDisplayLabel(visibleFinishes, item => item.name).map((item) => <OptionCard key={item.id} title={item.name} description={item.description} eyebrow={item.finishType} selected={finishId === item.id} onClick={() => selectFinish(item.id, item.finishType)} visual={<span className={`finish-tile-wrap${item.finishType === 'paint' ? ' finish-tile-flat' : ' finish-tile-stain'}`} style={{ '--fallback-finish': item.color } as CSSProperties}>{item.proMatch && <img src="/assets/branding/pro-match-logo.webp" className="pro-match-swatch-logo" alt="" loading="eager" decoding="async" />}{item.finishType === 'stain' && <img className="finish-tile-image" src={item.image} alt="" loading="lazy" decoding="async" onError={(event) => { event.currentTarget.style.display = 'none' }} />}</span>} />)}
                {currentPage === 'jamb-type' && <>
                  <OptionCard title="Clad" description="Choose from available Home Guard clad colors. Stain finishes are not available for clad jambs." eyebrow="Jamb type" selected={jambType === 'clad'} onClick={() => selectJambType('clad')} visual={<span className="jamb-type-card-image jamb-type-card-image-clad"><img src="/assets/jamb/clad-wrap-card.webp" alt="Clad-wrapped entry door" loading="lazy" decoding="async" /></span>} />
                  <OptionCard title="Timber" description="Choose from available paint and stain finishes. The jamb defaults to match your door but can be changed." eyebrow="Jamb type" selected={jambType === 'timber'} onClick={() => selectJambType('timber')} visual={<span className="jamb-type-card-image"><img src="/assets/jamb/timber-frame-card.webp" alt="Timber-framed entry door" loading="lazy" decoding="async" /></span>} />
                </>}
                {currentPage === 'jamb-finish' && sortByDisplayLabel(jambFinishOptions, item => item.name).map((item) => <OptionCard key={`${jambType}-${item.id}`} title={item.name} description={jambType === 'clad' ? 'Home Guard clad color.' : item.description} eyebrow={jambType === 'clad' ? 'Clad' : item.finishType} selected={jambFinishColor === item.id} onClick={() => selectJambFinish(item.id)} visual={<span className={`finish-tile-wrap${item.finishType === 'paint' || jambType === 'clad' ? ' finish-tile-flat' : ' finish-tile-stain'}`} style={{ '--fallback-finish': item.color } as CSSProperties}>{item.proMatch && <img src="/assets/branding/pro-match-logo.webp" className="pro-match-swatch-logo" alt="" loading="eager" decoding="async" />}{item.finishType === 'stain' && jambType !== 'clad' && <img className="finish-tile-image" src={item.image} alt="" loading="lazy" decoding="async" onError={(event) => { event.currentTarget.style.display = 'none' }} />}</span>} />)}
                {currentPage === 'glass-type' && sortByDisplayLabel(availableGlassCategories, item => item.name).map((item) => <OptionCard key={item.id} title={item.name} description={item.description} eyebrow="Glass type" selected={selectedGlassCategory === item.id} onClick={() => selectGlassCategory(item.id)} visual={<img className={`glass-option-thumbnail${item.id === 'retro' ? ' retro-glass-thumbnail' : item.id === 'clic' ? ' clic-glass-thumbnail' : ''}`} src={item.image} alt="" loading="lazy" decoding="async" />} />)}
                {currentPage === 'glass' && sortByDisplayLabel(glassOptionGroups, group => group.title).map((group) => {
                  const displayOption = group.options.find((item) => item.id === glassId) ?? group.options[0]
                  return <OptionCard key={group.key} title={group.title} eyebrow="Glass" selected={selectedGlassGroupKey === group.key} onClick={() => selectGlassGroup(group)} visual={displayOption.thumbnailPath ? <img className="glass-option-thumbnail" src={displayOption.thumbnailPath} alt="" loading="lazy" decoding="async" /> : undefined} />
                })}
                {currentPage === 'glass-variant' && sortByDisplayLabel(selectedGlassGroup?.options ?? [], item => glassVariantLabel(item.name)).map((item) => <OptionCard key={item.id} title={glassVariantLabel(item.name)} eyebrow={selectedGlassGroup?.title} selected={glassVariantConfirmed && glassId === item.id} onClick={() => selectGlassVariant(item.id)} visual={item.thumbnailPath ? <img className={`glass-option-thumbnail${selectedGlassCategory === 'decorative' ? ' caming-finish-thumbnail' : ''}`} src={item.thumbnailPath} alt="" loading="lazy" decoding="async" /> : undefined} />)}
                {currentPage === 'glass-frame-color' && <OptionCard title="Match Door" eyebrow="Glass frame" selected={glassFrameColorMode === 'match-door'} onClick={() => { setGlassFrameColorMode('match-door'); setGlassFrameFinishType(matchedGlassFrameFinish.finishType) }} visual={<span className={`finish-tile-wrap${matchedGlassFrameFinish.finishType === 'paint' ? ' finish-tile-flat' : ' finish-tile-stain'}`} style={{ '--fallback-finish': matchedGlassFrameFinish.color } as CSSProperties}>{matchedGlassFrameFinish.finishType === 'stain' && <img className="finish-tile-image" src={matchedGlassFrameFinish.image} alt="" />}</span>} />}
                {currentPage === 'glass-frame-color' && sortByDisplayLabel(visibleGlassFrameFinishes, item => item.name).map((item) => <OptionCard key={`glass-frame-${item.id}`} title={item.name} eyebrow={`Custom glass frame · ${item.finishType}`} selected={glassFrameColorMode === 'custom' && glassFrameFinishId === item.id} onClick={() => { setGlassFrameColorMode('custom'); setGlassFrameFinishId(item.id) }} visual={<span className={`finish-tile-wrap${item.finishType === 'paint' ? ' finish-tile-flat' : ' finish-tile-stain'}`} style={{ '--fallback-finish': item.color } as CSSProperties}>{item.proMatch && <img src="/assets/branding/pro-match-logo.webp" className="pro-match-swatch-logo" alt="" />}{item.finishType === 'stain' && <img className="finish-tile-image" src={item.image} alt="" loading="lazy" decoding="async" onError={(event) => { event.currentTarget.style.display = 'none' }} />}</span>} />)}
                {currentPage === 'grid-location' && sortByDisplayLabel(availableGridLocations, item => item.name).map((item) => <OptionCard key={item.id} title={item.name} selected={gridPathId === item.id} onClick={() => selectGridLocation(item.id)} visual={<img className="grid-option-thumbnail" src={item.image} alt="" loading="eager" decoding="async" />} />)}
                {currentPage === 'grid-style' && sortByDisplayLabel(lowEGridStyles, item => item.id).map((item) => <OptionCard key={item.id} title={item.id} selected={gridStyle === item.id} onClick={() => selectGridStyle(item.id)} visual={<img className="grid-option-thumbnail" src={item.image} alt="" loading="eager" decoding="async" />} />)}
                {currentPage === 'grid-pattern' && compatibleGridPatterns.map((item) => <OptionCard key={item.id} title={item.id} selected={gridPattern === item.id} onClick={() => selectGridPattern(item.id)} visual={<img className="grid-pattern-thumbnail" src="/assets/grid-options/All Lites.webp" alt="" loading="eager" decoding="async" />} />)}
                {currentPage === 'grid-color' && sortByDisplayLabel(compatibleGridColors, item => item).map((color) => <OptionCard key={color} title={color} eyebrow="Grid color" selected={gridColor === color} onClick={() => selectGridColor(color)} visual={<span className="finish-tile-wrap grid-color-tile" style={{ '--fallback-finish': gridColorValues[color] ?? '#efeee8' } as CSSProperties} />} />)}
                {currentPage === 'grid-width' && gridColor && compatibleGridWidths.map((width) => <OptionCard key={width} className="bar-size-option-card" title={width} eyebrow="Bar size" selected={gridWidth === width} onClick={() => selectGridWidth(width)} />)}
                {currentPage === 'sidelite-glass-type' && sortByDisplayLabel(availableSideliteGlassCategories, item => item.name).map((item) => <OptionCard key={item.id} title={item.name} eyebrow={`${sideliteStyleDisplayName(selectedSideliteStyle?.id)} glass`} selected={sideliteGlassCategory === item.id} onClick={() => selectSideliteGlassCategory(item.id)} visual={<img className={`glass-option-thumbnail${item.id === 'clic' ? ' clic-glass-thumbnail' : ''}`} src={glassCategoryChoices.find((category) => category.id === item.id)?.image ?? item.image} alt="" loading="lazy" decoding="async" />} />)}
                {currentPage === 'sidelite-glass' && sortByDisplayLabel(sideliteGlassOptionGroups, group => group.title).map((group) => {
                  const displayOption = group.options.find((item) => item.id === sideliteGlassId) ?? group.options[0]
                  const thumbnail = glassSelectionThumbnail(displayOption.name) ?? displayOption.asset ?? (displayOption.id === 'clear-grids' ? '/assets/grid-options/Internal Grids.webp' : '/assets/glass/thumbnails/Clear-option.webp')
                  return <OptionCard key={group.key} title={group.title} eyebrow={`${sideliteStyleDisplayName(selectedSideliteStyle?.id)} Glass`} selected={sideliteGlassGroupKey === group.key} onClick={() => selectSideliteGlassGroup(group)} visual={<img className={`glass-option-thumbnail${group.title.toLowerCase().startsWith('clic') ? ' clic-glass-thumbnail' : ''}`} src={thumbnail} alt="" loading="lazy" decoding="async" />} />
                })}
                {currentPage === 'sidelite-glass-variant' && sortByDisplayLabel(selectedSideliteGlassGroup?.options ?? [], item => glassVariantLabel(item.name)).map((item) => <OptionCard key={item.id} title={glassVariantLabel(item.name)} eyebrow={selectedSideliteGlassGroup?.title} selected={sideliteGlassVariantConfirmed && sideliteGlassId === item.id} onClick={() => selectSideliteGlassVariant(item.id)} visual={item.asset ? <img className={`glass-option-thumbnail${sideliteGlassCategory === 'decorative' ? ' caming-finish-thumbnail' : ''}`} src={item.asset} alt="" loading="lazy" decoding="async" /> : undefined} />)}
                {currentPage === 'sidelite-grid-location' && sortByDisplayLabel(availableSideliteGridLocations, item => item.name).map((item) => <OptionCard key={item.id} title={item.name} selected={sideliteGridLocation === item.id} onClick={() => selectSideliteGridLocation(item.id)} visual={<img className="grid-option-thumbnail" src={item.image} alt="" />} />)}
                {currentPage === 'sidelite-grid-style' && sortByDisplayLabel(fslGridStyles, item => item).map((item) => <OptionCard key={item} title={item} selected={sideliteGridStyle === item} onClick={() => selectSideliteGridStyle(item)} visual={<img className="grid-option-thumbnail" src={`/assets/grid-options/${item === 'Arts & Crafts' ? 'Arts & Crafts Grid' : `${item} Grids`}.webp`} alt="" />} />)}
                {currentPage === 'sidelite-grid-pattern' && fslPatterns.map((item) => <OptionCard key={item} title={item} selected={sideliteGridPattern === item} onClick={() => selectSideliteGridPattern(item)} visual={<img className="grid-pattern-thumbnail" src="/assets/grid-options/All Lites.webp" alt="" />} />)}
                {currentPage === 'sidelite-grid-color' && sortByDisplayLabel(fslColors, item => item).map((color) => <OptionCard key={color} title={color} eyebrow="Grid color" selected={sideliteGridColor === color} onClick={() => selectSideliteGridColor(color)} visual={<span className="finish-tile-wrap grid-color-tile" style={{ '--fallback-finish': gridColorValues[color] ?? '#efeee8' } as CSSProperties} />} />)}
                {currentPage === 'sidelite-grid-width' && fslWidths.map((width) => <OptionCard key={width} className="bar-size-option-card" title={width} eyebrow="Bar size" selected={sideliteGridWidth === width} onClick={() => setSideliteGridWidth(width)} />)}
                {currentPage === 'lock-setup' && <div className="double-door-lock-prep-options" role="group" aria-label="Lock Setup">{availableLockSetupOptions.map((option) => <OptionCard key={option.code} className="door-catalog-card double-door-lock-prep-card" title={option.name} eyebrow={option.description} selected={doubleDoorLockPrep === option.code} onClick={() => setDoubleDoorLockPrep(option.code)} visual={<span className="door-style-thumbnail double-door-lock-prep-visual"><img className="double-door-lock-prep-thumbnail" src={option.thumbnail} alt="" loading="eager" decoding="async" /></span>} />)}</div>}
                {currentPage === 'hardware' && sortByDisplayLabel(hardwareStyleGroups, options => options[0].style).map((options) => <HardwareOptionCard key={`${options[0].manufacturer}-${options[0].style}`} options={options} selectedId={hardwareId} onSelect={(option) => selectHardware(option.id)} />)}
                {currentPage === 'door-swing' && swingSelectionOptions.map((item) => <OptionCard key={item.id} title={`${item.id} – ${item.name}`} eyebrow="Door swing" selected={doorSwingId === item.id} onClick={() => selectDoorSwing(item.id)} visual={<img className="door-swing-image" src={item.image} alt="" loading="lazy" decoding="async" />} />)}
              </div>
            </div>
          </>}

          {currentPage === 'review' && !submitted && <>
            <div className="section-heading review-heading"><span>Final step</span><h1>Find a Home Guard Dealer</h1><p>Submit your contact information and door configuration. A Home Guard dealer or team member will follow up with next steps.</p></div>
            {!dealerMode && <button className="mobile-quote-form-cta" type="button" onClick={() => { setPendingCustomerAction(null); setSubmitted(false); showScreen('customer-form') }}>Continue to Quote Form <ArrowRight size={17}/></button>}
            <button className="floating-visualizer-launch" type="button" onClick={() => requestCustomerAction('open-visualizer')} aria-label="Launch Door Visualizer"><Eye size={19} /><span>Launch Door Visualizer</span><ArrowRight size={16} /></button>
            <div className="mobile-review-preview">{renderConfiguredPreviewMode()}</div>
            <section className="visualizer-promo-card visualizer-promo-card-mobile" aria-labelledby="mobile-visualizer-promo-title">
              <div className="visualizer-promo-graphic" aria-hidden="true"><img src="/assets/visualizer/view-on-your-home-tablet.webp" alt="" /></div>
              <div className="visualizer-promo-copy"><span className="visualizer-promo-eyebrow">Home Visualizer</span><h2 id="mobile-visualizer-promo-title">View on your home</h2><p>Upload a photo and see this door on your entryway.</p><button type="button" onClick={() => requestCustomerAction('open-visualizer')}>Launch Visualizer <ArrowRight size={16} /></button><small>It’s fast, easy, and helps you buy with confidence.</small></div>
            </section>
            <div className="summary-card">
              <div className="summary-title"><h2>Configuration Summary</h2></div>
              {configurationSummaryRows.map(([label, value, target]) => <div className="summary-row" key={label}><span>{label}<strong>{value}</strong></span>{target >= 0 && <button onClick={() => editConfiguration(pages[target], 'summary')}>Edit</button>}</div>)}
            </div>
            <p className="availability-notice"><strong>Availability Notice:</strong> Some door styles, finishes, glass, hardware, and other options may not be available with every door configuration. Final availability depends on the selected door style and product specifications.</p>
            <div className={`review-download-form ${dealerMode ? '' : 'form-only'}`}>
              <div className="attachment-card">
                <span className="attachment-icon"><FileText size={25} /></span>
                <span className="attachment-copy"><strong>{configurationPdfName}</strong></span>
                <button type="button" onClick={() => requestCustomerAction('download-pdf')}><Download size={16} /> Download PDF</button>
              </div>
              {pdfError && <p className="submit-error" role="alert">{pdfError}</p>}
            </div>
          </>}

          {submitted && <div className="success post-submit-visualizer">
            <span><Check size={32} /></span><small>Configuration received</small><h1>Thanks, {contact.fullName}.</h1>
            <p>Your configuration PDF will be sent to <strong>{contact.email}</strong>.</p>
            <p>While you wait, see how your configured door could look on your own home.</p>
            <button className="post-submit-visualizer-button" onClick={() => showScreen('visualizer')}><Eye size={19} /> Try the Door Visualizer <ArrowRight size={17} /></button>
          </div>}

              <div className="builder-actions" aria-label="Builder actions">
                <div className="builder-step-actions">
                  {currentPage !== 'review' && <button className="back" aria-label="Previous configuration step" disabled={currentPageIndex === 0} onClick={() => goTo(currentPageIndex - 1)}><ArrowLeft size={17} /><span>Previous</span></button>}
                  <div className="builder-forward-actions">
                    {currentPage !== 'review' && <button className="next" aria-label="Next configuration step" disabled={!editReturnTo && !isBuilderPageComplete(currentPage)} onClick={() => goTo(currentPageIndex + 1)}><span>{pages[currentPageIndex + 1] === 'review' ? 'Review & Quote' : 'Next'}</span><ArrowRight size={17} /></button>}
                  </div>
                </div>
                {editReturnTo === 'summary' && <button type="button" className="summary-edit-return" onClick={doneEditing}>Back to summary</button>}
                {editReturnTo === 'summary' && editReturnError && <p role="status">{editReturnError}</p>}
              </div>
        </section>

        {!submitted && <aside className={currentPage === 'review' ? 'review-preview-panel' : undefined}>
          <div className="aside-preview-area">
            {selectedStyle ? renderConfiguredPreviewMode() : <EmptyDoorPreview />}
          </div>
          {currentPage === 'review' && <section className="visualizer-promo-card visualizer-promo-card-desktop" aria-labelledby="desktop-visualizer-promo-title">
            <div className="visualizer-promo-graphic" aria-hidden="true"><img src="/assets/visualizer/view-on-your-home-tablet.webp" alt="" /></div>
            <div className="visualizer-promo-copy"><span className="visualizer-promo-eyebrow">Home Visualizer</span><h2 id="desktop-visualizer-promo-title">View on your home</h2><p>Upload a photo and see this door on your entryway.</p><button type="button" onClick={() => requestCustomerAction('open-visualizer')}>Launch Visualizer <ArrowRight size={16} /></button><small>It’s fast, easy, and helps you buy with confidence.</small></div>
          </section>}
          {currentPage !== 'review' && <div className="mini-summary">
            <span><b>Door Style</b><strong>{selectedStyle ? doorStyleDisplayName(selectedStyle) : 'Not selected'}</strong></span>
            <span><b>Finish</b><strong>{selectedFinish?.name ?? 'Not selected'}</strong></span>
            <span><b>Glass</b><strong>{compatibilitySupportsGlass ? (glassDisplayName(configuredGlass?.name ?? 'Not selected')) : 'Not applicable'}</strong></span>
            <span className="sidelite-preview-summary"><b>Sidelites</b><strong>{sidelitePreviewLabel(sidelites || 'none', selectedDoorSwing?.id ?? 'LHI', selectedDoorConfigurationType || 'single', selectedSideliteStyle?.id, sideliteGlassConfiguration)}</strong></span>
            {selectedDoorConfigurationType === 'french' && <span><b>Lock Setup</b><strong>{selectedDoubleDoorLockPrep?.name ?? 'Not selected'}</strong></span>}
            <span><b>Hardware</b><strong>{selectedHardware ? hardwareDisplayName(selectedHardware) : 'Not selected'}</strong></span>
            <span><b>{isFrenchDoor ? 'Opening' : 'Door Swing'}</b><strong>{isFrenchDoor ? 'Both slabs operable' : selectedDoorSwing?.name ?? 'Not selected'}</strong></span>
          </div>}
        </aside>}
      </main>
      </>}
      {visualizerSessionStarted && <HomeVisualizer
        active={screen === 'visualizer'}
        onBack={() => showScreen('builder')}
        onEditConfiguration={page => editConfiguration(page === 'glass-type' && !supportsGlass ? 'sidelite-glass-type' : page, 'visualizer')}
        onReturnToReview={() => { setReturningFromVisualizer(true); goTo(pages.indexOf('review')); showScreen('builder') }}
        onDownloadPdf={() => requestCustomerAction('download-pdf')}
        configuredDoorPreview={configuredDoorPreview}
        configurationKey={configuredDoorKey}
        doorConfiguration={currentDoorConfiguration}
      />}
      <SiteFooter currentStep={feedbackStep} configuration={feedbackConfiguration} dealerBrand={dealerBrand} dealerAccess={<DealerMode session={dealerSession} bannerTarget={dealerBannerTarget} onExit={() => { setCustomerFormCompleted(false); setSubmitted(false); setCompletedCustomerAction(null); setPendingCustomerAction(null); void showScreen('builder') }}/>} />
    </div>
  )
}

export default function App() {
  return <DealerContextGate>{(dealerSlug, dealerBrand) => <DoorBuilderApp dealerSlug={dealerSlug} dealerBrand={dealerBrand}/>}</DealerContextGate>
}
