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
  logo_generated_light_url: string | null
  logo_placement: string | null
  primary_color: string | null
  secondary_color: string | null
  website: string | null
  heading_font_family: string | null
  heading_font_weight: number | null
  heading_font_size: number | null
  body_font_family: string | null
  body_font_weight: number | null
  body_font_size: number | null
  custom_heading_font_url: string | null
  custom_heading_font_name: string | null
  custom_heading_font_weight: number | null
  custom_body_font_url: string | null
  custom_body_font_name: string | null
  custom_body_font_weight: number | null
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
  const query = new URLSearchParams({ select: 'id,is_active,slug,company_name,logo_url,logo_light_url,logo_generated_light_url,logo_placement,primary_color,secondary_color,website,heading_font_family,heading_font_weight,heading_font_size,body_font_family,body_font_weight,body_font_size,custom_heading_font_url,custom_heading_font_name,custom_heading_font_weight,custom_body_font_url,custom_body_font_name,custom_body_font_weight', slug: `eq.${slug}`, limit: '2' })
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
    logoLightUrl: dealer.logo_light_url || dealer.logo_generated_light_url,
    logoPlacement: dealer.logo_placement === 'header' ? 'header' : 'hero',
    primaryColor: dealer.primary_color,
    secondaryColor: dealer.secondary_color,
    websiteUrl: safePublicWebsite(dealer.website),
    headingFontFamily: safeFontFamily(dealer.heading_font_family),
    headingFontWeight: safeFontWeight(dealer.heading_font_weight),
    headingFontSize: safeFontSize(dealer.heading_font_size,24,72),
    bodyFontFamily: safeFontFamily(dealer.body_font_family),
    bodyFontWeight: safeFontWeight(dealer.body_font_weight),
    bodyFontSize: safeFontSize(dealer.body_font_size,14,22),
    customHeadingFontUrl: safeFontUrl(dealer.custom_heading_font_url),
    customHeadingFontName: safeFontName(dealer.custom_heading_font_name),
    customHeadingFontWeight: safeFontWeight(dealer.custom_heading_font_weight),
    customBodyFontUrl: safeFontUrl(dealer.custom_body_font_url),
    customBodyFontName: safeFontName(dealer.custom_body_font_name),
    customBodyFontWeight: safeFontWeight(dealer.custom_body_font_weight),
  }
}

const fontFamilies=new Set(['system','arial','helvetica','verdana','tahoma','trebuchet','georgia','times','courier','montserrat','caladea','custom'])
const fontWeights=new Set([300,400,500,600,700,800])
function safeFontFamily(value:string|null){return value&&fontFamilies.has(value)?value:null}
function safeFontWeight(value:number|null){return value&&fontWeights.has(value)?value:null}
function safeFontSize(value:number|null,min:number,max:number){return Number.isInteger(value)&&value!>=min&&value!<=max?value:null}
function safeFontName(value:string|null){return value&&/^[\w .-]{1,80}$/.test(value)?value:null}
function safeFontUrl(value:string|null){
  const url=safePublicWebsite(value)
  return url&&/\/storage\/v1\/object\/public\/dealer-fonts\//.test(url)&&/\.(woff2?|WOFF2?)(\?|$)/.test(url)?url:null
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
