import type { DoorConfigurationType, DoorSwing, SideliteGlassConfiguration } from '../types'
import { sidelitePlacement, type SideliteInput } from '../data/sideliteConfigurations'
import { glassDisplayName, sideliteStyleDisplayName, doorStyleDisplayName } from '../data/productDisplayNames'
import { catalogDoorStyles } from '../data/productCatalog'

/** Compact preview text only. Never used for PDF or ordering payloads. */
export function sidelitePreviewLabel(position: SideliteInput, swing: DoorSwing['id'], type: DoorConfigurationType,
  style: string | null | undefined, glass: SideliteGlassConfiguration | null) {
  const placement = sidelitePlacement(position, swing, type)
  if (placement === 'none') return 'None'
  const side = placement === 'both' ? 'Both' : placement === 'left' ? 'Left' : 'Right'
  // Use the named CR14 opening rather than displaying the legacy CR14SL code.
  const craftsman = catalogDoorStyles.find(item => item.code === 'CR14')
  const name = style?.toLowerCase() === 'cr14sl' && craftsman
    ? `${doorStyleDisplayName(craftsman)} Side Lite` : sideliteStyleDisplayName(style)
  const description = !glass ? 'Not selected'
    : glass.gridLocation ? [glass.gridStyle === 'Prairie' ? 'Prairie' : glass.gridPattern,
      glass.gridColor, glass.gridLocation === 'SDL' ? 'SDL' : null].filter(Boolean).join(' ') || 'Grids'
    : glass.glassCategory === 'Clear Glass' ? 'Clear Glass' : glassDisplayName(glass.glass)
  return [side, name, description].join(' · ')
}
