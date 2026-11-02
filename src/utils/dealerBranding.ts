import type { CSSProperties } from 'react'
import type { PublicDealerBrand } from '../types/dealerBranding'

const HEX_COLOR = /^#[0-9a-f]{6}$/i

function safeColor(value: string | null, fallback: string) {
  return value && HEX_COLOR.test(value) ? value : fallback
}

export function dealerBrandStyle(brand: PublicDealerBrand): CSSProperties {
  const primary = safeColor(brand.primaryColor, '#0d666c')
  const secondary = safeColor(brand.secondaryColor, '#05040b')
  return {
    '--dealer-primary': primary,
    '--dealer-primary-foreground': isLightBrandColor(primary) ? '#101417' : '#ffffff',
    '--dealer-secondary': secondary,
    '--dealer-secondary-foreground': isLightBrandColor(secondary) ? '#101417' : '#ffffff',
    '--peacock': primary,
    '--green': primary,
  } as CSSProperties
}

export function dealerInitials(companyName: string) {
  const words = companyName.trim().split(/\s+/).filter(Boolean)
  return words.slice(0, 2).map((word) => word[0]?.toUpperCase()).join('') || 'D'
}

export function dealerLogo(brand: PublicDealerBrand, onDarkBackground = false) {
  return onDarkBackground
    ? brand.logoLightUrl || brand.logoUrl
    : brand.logoUrl || brand.logoLightUrl
}

export function isLightBrandColor(value: string | null) {
  if (!value || !HEX_COLOR.test(value)) return false
  const channel = (start: number) => {
    const srgb = Number.parseInt(value.slice(start, start + 2), 16) / 255
    return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4
  }
  const luminance = 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5)
  const contrastWithBlack = (luminance + 0.05) / 0.05
  const contrastWithWhite = 1.05 / (luminance + 0.05)
  return contrastWithBlack >= contrastWithWhite
}
