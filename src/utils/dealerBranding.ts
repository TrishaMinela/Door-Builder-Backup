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

export type DealerLogoPlacement = {
  placement: 'header' | 'hero'
  headerIsDark: boolean
  logoUrl: string | null
  heroUsesDarkSurface: boolean
}

function relativeLuminance(value: string) {
  const channel = (start: number) => {
    const srgb = Number.parseInt(value.slice(start, start + 2), 16) / 255
    return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5)
}

export function brandColorContrast(first: string | null, second: string | null) {
  const firstColor = safeColor(first, '#0d666c')
  const secondColor = safeColor(second, '#05040b')
  const lighter = Math.max(relativeLuminance(firstColor), relativeLuminance(secondColor))
  const darker = Math.min(relativeLuminance(firstColor), relativeLuminance(secondColor))
  return (lighter + 0.05) / (darker + 0.05)
}

export function dealerLogoPlacement(brand: PublicDealerBrand): DealerLogoPlacement {
  const headerIsDark = !isLightBrandColor(safeColor(brand.secondaryColor, '#05040b'))
  const preferredLogo = headerIsDark ? brand.logoLightUrl : brand.logoUrl
  const fallbackLogo = headerIsDark ? brand.logoUrl : brand.logoLightUrl

  if (preferredLogo) return { placement: 'header', headerIsDark, logoUrl: preferredLogo, heroUsesDarkSurface: false }
  if (!fallbackLogo) return { placement: 'header', headerIsDark, logoUrl: null, heroUsesDarkSurface: false }

  // A light/white logo without a normal counterpart is never placed on a light
  // header. A neutral dark hero card is the deterministic safe surface.
  if (!headerIsDark) return { placement: 'hero', headerIsDark, logoUrl: fallbackLogo, heroUsesDarkSurface: true }

  const likelyReadable = brandColorContrast(brand.primaryColor, brand.secondaryColor) >= 3
  return likelyReadable
    ? { placement: 'header', headerIsDark, logoUrl: fallbackLogo, heroUsesDarkSurface: false }
    : { placement: 'hero', headerIsDark, logoUrl: fallbackLogo, heroUsesDarkSurface: !brand.logoUrl && Boolean(brand.logoLightUrl) }
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
