import type { GridColor, GridPattern, GridStyle, GridWidth } from '../types.js'
import type { SideliteGlassCategory, SideliteGlassOption, SideliteGridRules } from './fslGlass.js'
import { isApprovedDecorativeGlassName } from './decorativeGlass.js'
import { isApprovedPrivacyGlassName } from './privacyGlass.js'
import { clicSideliteOption } from './clicGlass.js'

const asset = (code: string) => `/assets/hgi-assets/Sidelites/F48SL/Glass/F48SL${code}.webp`
const option = (code: string, name: string, category: SideliteGlassCategory = 'decorative'): SideliteGlassOption => ({ id: code.toLowerCase(), name, category, asset: asset(code) })

export const f48slGlassCategories = [
  { id: 'clear', name: 'Clear Glass', image: '/assets/glass/thumbnails/Clear.webp' },
  { id: 'decorative', name: 'Decorative Glass', image: '/assets/glass/thumbnails/Decorative.webp' },
  { id: 'privacy', name: 'Privacy Glass', image: '/assets/glass/thumbnails/Privacy.webp' },
  { id: 'clic', name: 'CLiC Glass', image: '/assets/glass/thumbnails/CLIC.webp' },
] as const

const allF48slGlassOptions: SideliteGlassOption[] = [
  { id: 'clear-no-grids', name: 'Clear Glass with No Grids', category: 'clear' },
  { id: 'clear-grids', name: 'Clear Glass with Grids', category: 'clear' },
  clicSideliteOption,
  option('BER', 'Berkley'), option('BRI', 'Bristol'), option('CAD', 'Cadence'), option('CAL', 'Calandra'),
  option('CAR', 'Carrollton'), option('COU', 'Courtyard'), option('CRO', 'Crosswalk'), option('CYD', 'Cyndi'),
  option('DORNI', 'Dorian – Nickel'), option('DORPA', 'Dorian – Patina'), option('ELEBW', 'Elegant – Black/White'),
  option('ELENI', 'Elegant – Nickel'), option('ELEPA', 'Elegant – Patina'), option('EMP', 'Empire'), option('GEN', 'Geneva'),
  option('GRA', 'Grace'), option('HEIBB', 'Heirlooms – Brass'), option('HEINI', 'Heirlooms – Nickel'),
  option('HIG', 'High Point'), option('JAC', 'Jacinto'), option('MAJ', 'Majestic'),
  option('MET', 'Metro'), option('MOH', 'Mohave'), option('MONNI', 'Monterey – Nickel'), option('MONPA', 'Monterey – Patina'),
  option('NEO', 'Neo'), option('NOUNI', 'Nouveau – Nickel'), option('NOUPA', 'Nouveau – Patina'), option('OAK', 'Oak Park'),
  option('PAR', 'Paris'), option('PRE', 'Prestige'), option('STE', 'Sterling'), option('TOP', 'Topaz'),
  option('BLA', 'Blanca', 'privacy'), option('CHI', 'Chinchilla', 'privacy'), option('CUM', 'Cumulus', 'privacy'),
  option('LIN', 'Linen', 'privacy'), option('MIC', 'Micro Granite', 'privacy'), option('RAI', 'Rain', 'privacy'),
  option('VAP', 'Vapor', 'privacy'), option('4LBLA', 'Blanca – 4 Lite', 'privacy'),
  option('4LCHI', 'Chinchilla – 4 Lite', 'privacy'), option('4LMIC', 'Micro Granite – 4 Lite', 'privacy'),
]

export const f48slGlassOptions = allF48slGlassOptions.filter((glass) =>
  (glass.category !== 'decorative' || isApprovedDecorativeGlassName(glass.name))
  && (glass.category !== 'privacy' || isApprovedPrivacyGlassName(glass.name)),
)

const both: GridWidth[] = ['5/8"', '7/8"']
export const f48slStandardStyleRules: Partial<Record<GridStyle, SideliteGridRules>> = {
  'Arts & Crafts': { '3 Lite': { White: ['5/8"'] } },
  Contoured: { '4 Lite': { Champagne: ['11/16"'], White: ['11/16"'] } },
  Flat: {
    '2 Lite': { Bronze: ['5/8"'], Champagne: ['5/8"'], Tan: ['7/8"'], White: both },
    '3 Lite': { Bronze: ['5/8"'], Champagne: ['5/8"'], Tan: ['7/8"'], White: both },
    '4 Lite': { Beige: both, Bronze: ['5/8"'], Champagne: both, Tan: ['7/8"'], White: both },
  },
  Prairie: { '4 Lite': { Champagne: ['5/8"', '11/16"'], Tan: ['7/8"'], White: ['5/8"', '7/8"', '11/16"'] } },
}
export const f48slLowEStyleRules: Partial<Record<GridStyle, SideliteGridRules>> = {
  'Arts & Crafts': { '3 Lite': { White: ['5/8"'] } },
  Contoured: { '4 Lite': { Champagne: ['11/16"'], White: ['11/16"'] } },
  Flat: {
    '2 Lite': { Beige: both, Black: both, Bronze: ['5/8"'], Champagne: ['5/8"'], 'Bronze/White': both, Tan: ['7/8"'], White: both },
    '3 Lite': { Beige: both, Black: both, Bronze: ['5/8"'], 'Bronze/White': both, Champagne: ['5/8"'], Tan: ['7/8"'], White: both },
    '4 Lite': { Beige: both, Black: both, Bronze: ['5/8"'], 'Bronze/White': both, Champagne: ['5/8"'], White: both },
  },
  Prairie: { '4 Lite': { Champagne: ['5/8"', '11/16"'], Tan: ['7/8"'], White: ['5/8"', '7/8"', '11/16"'] } },
}

const patternCodes: Partial<Record<GridPattern, string>> = { '2 Lite': '2L', '3 Lite': '3L', '4 Lite': '4L' }
const colorCodes: Partial<Record<GridColor, string>> = { Beige: 'BE', Black: 'BL', Bronze: 'BZ', 'Bronze/White': 'WH', Champagne: 'CH', Tan: 'TA', White: 'WH' }
export const f48slGridAsset = (pattern: GridPattern, color: GridColor) => `/assets/hgi-assets/Sidelites/F48SL/Internal Grids/F48SLINT${patternCodes[pattern]}${colorCodes[color]}.webp`

const f48slPrairieGridAssets: Partial<Record<GridColor, string>> = {
  Champagne: '/assets/hgi-assets/Glass/F48SL/CLEAR STOCK/F48SL Prairie Champagne.webp',
  Tan: '/assets/hgi-assets/Glass/F48SL/CLEAR STOCK/F48SL Prairie Tan.webp',
  White: '/assets/hgi-assets/Glass/F48SL/CLEAR STOCK/F48SL Prairie White.webp',
}

export const f48slPrairieGridAsset = (color: GridColor) => f48slPrairieGridAssets[color] ?? f48slPrairieGridAssets.White!
export const f48slArtsAndCraftsGridAsset = (_color: GridColor) => {
  void _color
  return '/assets/hgi-assets/Glass/Sidelites/F48SL SSL Arts Crafts White.webp'
}
