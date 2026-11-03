import { isValidDealerSlug, normalizeDealerSlug } from '../src/utils/dealerSlug.js'
import type { PublicDealerBrand } from '../src/types/dealerBranding.js'

declare const process: { env: Record<string, string | undefined> }

type DealerRow = {
  id: string
  is_active: boolean
  slug: string
  company_name: string
  logo_url: string | null
  logo_light_url: string | null
  primary_color: string | null
  secondary_color: string | null
  website: string | null
}

export class DealerResolutionError extends Error {
  constructor(public readonly status: 400 | 403 | 404 | 502, message: string) {
    super(message)
  }
}

function supabaseCredentials() {
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/+$/, '')
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) throw new DealerResolutionError(502, 'Dealer lookup is unavailable.')
  return { supabaseUrl, serviceRoleKey }
}

async function resolveDealer(dealerSlug: unknown): Promise<DealerRow | null> {
  if (dealerSlug === undefined || dealerSlug === null || dealerSlug === '') return null
  if (typeof dealerSlug !== 'string') throw new DealerResolutionError(400, 'This dealer link is unavailable.')

  const slug = normalizeDealerSlug(dealerSlug)
  if (!isValidDealerSlug(slug)) throw new DealerResolutionError(400, 'This dealer link is unavailable.')

  const { supabaseUrl, serviceRoleKey } = supabaseCredentials()
  const query = new URLSearchParams({ select: 'id,is_active,slug,company_name,logo_url,logo_light_url,primary_color,secondary_color,website', slug: `eq.${slug}`, limit: '2' })
  const result = await fetch(`${supabaseUrl}/rest/v1/dealers?${query}`, {
    headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
  })
  if (!result.ok) throw new DealerResolutionError(502, 'Dealer lookup is unavailable.')

  const dealers = await result.json() as DealerRow[]
  if (dealers.length !== 1) throw new DealerResolutionError(404, 'This dealer link is unavailable.')
  if (!dealers[0].is_active) throw new DealerResolutionError(403, 'This dealer link is unavailable.')
  return dealers[0]
}

export async function resolveDealerId(dealerSlug: unknown): Promise<string | null> {
  const dealer = await resolveDealer(dealerSlug)
  return dealer?.id ?? null
}

export async function resolveDealerBrand(dealerSlug: unknown): Promise<PublicDealerBrand | null> {
  const dealer = await resolveDealer(dealerSlug)
  if (!dealer) return null
  return {
    slug: dealer.slug,
    companyName: dealer.company_name,
    logoUrl: dealer.logo_url,
    logoLightUrl: dealer.logo_light_url,
    primaryColor: dealer.primary_color,
    secondaryColor: dealer.secondary_color,
    websiteUrl: safePublicWebsite(dealer.website),
  }
}

function safePublicWebsite(value: string | null) {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null
  } catch {
    return null
  }
}
