import { useState } from 'react'
import type { PublicDealerBrand } from '../types/dealerBranding'
import { dealerInitials, dealerLogo } from '../utils/dealerBranding'

type Props = {
  brand: PublicDealerBrand
  onDarkBackground?: boolean
}

export function DealerBrandMark({ brand, onDarkBackground = false }: Props) {
  const [failedLogo, setFailedLogo] = useState<string | null>(null)
  const logo = dealerLogo(brand, onDarkBackground)
  const showFallback = !logo || failedLogo === logo

  return <div className="dealer-brand-mark" aria-label={`${brand.companyName} dealer branding`}>
    {!showFallback
      ? <img src={logo} alt={`${brand.companyName} logo`} onError={() => setFailedLogo(logo)} />
      : <span className="dealer-brand-fallback" aria-hidden="true">{dealerInitials(brand.companyName)}</span>}
    {showFallback && <strong className="dealer-brand-fallback-name">{brand.companyName}</strong>}
  </div>
}
