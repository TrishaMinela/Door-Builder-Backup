import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import dealerContext from '../api/dealer-context'
import { brandColorContrast, dealerBrandStyle, dealerInitials, dealerLogo, dealerLogoPlacement, isLightBrandColor } from '../src/utils/dealerBranding'
import { dealerSlugFromPath, isValidDealerSlug } from '../src/utils/dealerSlug'
import type { PublicDealerBrand } from '../src/types/dealerBranding'

process.env.SUPABASE_URL = 'https://hgi-portal-dev.supabase.invalid'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'server-only-test-key'

const dealer = {
  id: '9f2c6160-4f8a-4709-b851-811d9bd726d0',
  is_active: true,
  slug: 'test-dealer-portal-access-qa',
  company_name: 'TEST Dealer - Portal Access QA',
  logo_url: null,
  logo_light_url: 'https://cdn.example.invalid/dealer-light.png',
  primary_color: '#2456a6',
  secondary_color: '#f0b429',
  website: 'https://dealer.example.com/home',
}

type ApiResult = { status: number; headers: Record<string, string>; body: unknown }

async function invoke(slug: string, rows: unknown[] = [dealer]): Promise<ApiResult> {
  globalThis.fetch = async (url, options) => {
    assert.match(String(url), /\/rest\/v1\/dealers\?/)
    assert.match(String(url), /slug=eq%2Etest-dealer-portal-access-qa|slug=eq\.test-dealer-portal-access-qa/)
    const headers = new Headers(options?.headers)
    assert.equal(headers.get('apikey'), 'server-only-test-key')
    return Response.json(rows)
  }
  const result: ApiResult = { status: 0, headers: {}, body: null }
  await dealerContext(
    { method: 'GET', query: { slug } },
    {
      setHeader(name, value) { result.headers[name.toLowerCase()] = value },
      status(code) { result.status = code; return this },
      json(body) { result.body = body },
    },
  )
  return result
}

const available = await invoke(dealer.slug)
assert.equal(available.status, 200)
assert.equal(available.headers['content-type'], 'application/json')
assert.equal(available.headers['cache-control'], 'private, no-store')
assert.deepEqual(available.body, {
  available: true,
  dealer: {
    slug: dealer.slug,
    companyName: dealer.company_name,
    logoUrl: dealer.logo_url,
    logoLightUrl: dealer.logo_light_url,
    primaryColor: dealer.primary_color,
    secondaryColor: dealer.secondary_color,
    websiteUrl: 'https://dealer.example.com/home',
  },
})
assert.equal(JSON.stringify(available.body).includes(dealer.id), false)
assert.equal(JSON.stringify(available.body).includes('server-only-test-key'), false)

const missing = await invoke(dealer.slug, [])
assert.equal(missing.status, 404)
const inactive = await invoke(dealer.slug, [{ ...dealer, is_active: false }])
assert.equal(inactive.status, 403)

assert.equal(dealerSlugFromPath('/test-dealer-portal-access-qa'), dealer.slug)
assert.equal(dealerSlugFromPath('/'), null)
assert.equal(dealerSlugFromPath('/api'), null)
assert.equal(dealerSlugFromPath('/auth'), null)
assert.equal(dealerSlugFromPath('/billing'), null)
assert.equal(dealerSlugFromPath('/test-dealer-portal-access-qa/extra'), null)
assert.equal(isValidDealerSlug('api'), false)
assert.equal(isValidDealerSlug('test-dealer-portal-access-qa'), true)

const publicBrand = (available.body as { dealer: PublicDealerBrand }).dealer
assert.equal(dealerLogo(publicBrand, true), dealer.logo_light_url)
assert.equal(dealerLogo(publicBrand, false), dealer.logo_light_url)
assert.equal(dealerInitials(dealer.company_name), 'TD')
assert.equal(isLightBrandColor(dealer.secondary_color), true)
assert.deepEqual(dealerBrandStyle(publicBrand), {
  '--dealer-primary': dealer.primary_color,
  '--dealer-primary-foreground': '#ffffff',
  '--dealer-secondary': dealer.secondary_color,
  '--dealer-secondary-foreground': '#101417',
  '--peacock': dealer.primary_color,
  '--green': dealer.primary_color,
})
assert.deepEqual(dealerBrandStyle({ ...publicBrand, primaryColor: 'url(javascript:bad)', secondaryColor: 'red;display:none' }), {
  '--dealer-primary': '#0d666c',
  '--dealer-primary-foreground': '#ffffff',
  '--dealer-secondary': '#05040b',
  '--dealer-secondary-foreground': '#ffffff',
  '--peacock': '#0d666c',
  '--green': '#0d666c',
})
assert.equal(dealerBrandStyle({ ...publicBrand, primaryColor: '#f7e56b' })['--dealer-primary-foreground' as keyof ReturnType<typeof dealerBrandStyle>], '#101417')
assert.equal(isLightBrandColor('#111827'), false)
assert.equal(isLightBrandColor('#f0b429'), true)
assert.ok(brandColorContrast('#2456a6', '#f0b429') >= 3)
assert.deepEqual(dealerLogoPlacement(publicBrand), {
  placement: 'hero',
  headerIsDark: false,
  logoUrl: dealer.logo_light_url,
  heroUsesDarkSurface: true,
})
assert.deepEqual(dealerLogoPlacement({ ...publicBrand, logoUrl: 'https://cdn.example.invalid/normal.png', logoLightUrl: null, primaryColor: '#111827', secondaryColor: '#111827' }), {
  placement: 'hero',
  headerIsDark: true,
  logoUrl: 'https://cdn.example.invalid/normal.png',
  heroUsesDarkSurface: false,
})

const unsafeWebsite = await invoke(dealer.slug, [{ ...dealer, website: 'javascript:alert(1)' }])
assert.equal((unsafeWebsite.body as { dealer: PublicDealerBrand }).dealer.websiteUrl, null)

const appSource = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8')
const footerSource = await readFile(new URL('../src/components/SiteFooter.tsx', import.meta.url), 'utf8')
const attributionSource = await readFile(new URL('../src/components/HgiAttribution.tsx', import.meta.url), 'utf8')
assert.doesNotMatch(appSource, /Presented by/)
assert.match(appSource, /className="dealer-website-link"/)
assert.doesNotMatch(appSource, /header>[\s\S]*?<HgiAttribution/)
assert.match(footerSource, /!dealerBrand && <a href="mailto:/)
assert.match(footerSource, /!dealerBrand && <a href="https:\/\/www\.google\.com\/maps/)
assert.match(attributionSource, /Door Builder & Visualizer provided by/)
assert.match(attributionSource, /hgi-logo-white-dealer\.png/)
assert.match(attributionSource, /hgi-logo-black\.webp/)

const vercelConfiguration = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8')) as { rewrites: Array<{ source: string; destination: string }> }
assert.deepEqual(vercelConfiguration.rewrites, [{ source: '/:dealerSlug([a-z0-9-]+)', destination: '/index.html' }])
const dealerContextSource = await readFile(new URL('../api/dealer-context.ts', import.meta.url), 'utf8')
assert.match(dealerContextSource, /from '\.\.\/server\/dealerResolution\.js'/)

console.info('Verified public-safe dealer branding lookup, WCAG contrast selection, dealer-only layout rules, slug isolation, and safe fallbacks.')
