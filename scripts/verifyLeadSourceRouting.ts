import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import submitDoorBuilder from '../api/submit-door-builder'

process.env.NODE_ENV = 'production'
process.env.VERCEL_ENV = 'production'
process.env.SUPABASE_URL = 'https://dealer-portal.supabase.invalid'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
const masterWebhook = 'https://hooks.zapier.com/hooks/catch/test/master/'
const abWebhook = 'https://hooks.zapier.com/hooks/catch/test/ab/'
const wdmWebhook = 'https://hooks.zapier.com/hooks/catch/test/wdm/'
process.env.ZAPIER_DOOR_BUILDER_WEBHOOK_URL = masterWebhook
process.env.ZAPIER_AB_DOOR_BUILDER_WEBHOOK_URL = abWebhook
process.env.ZAPIER_WDM_DOOR_BUILDER_WEBHOOK_URL = wdmWebhook

const dealers = new Map([
  ['americas-best-windows-and-doors', { id: '11111111-1111-4111-8111-111111111111', company_name: "America's Best Windows and Doors" }],
  ['wdm', { id: '22222222-2222-4222-8222-222222222222', company_name: 'Windows Doors & More' }],
  ['future-dealer', { id: '33333333-3333-4333-8333-333333333333', company_name: 'Future Dealer' }],
])
let webhookRequests: Array<{ url: string; body: Record<string, unknown> }> = []
let supabaseWrites = 0

globalThis.fetch = async (input, options) => {
  const url = new URL(String(input))
  if (url.pathname.endsWith('/dealers')) {
    const slug = url.searchParams.get('slug')?.replace(/^eq\./, '') ?? ''
    const dealer = dealers.get(slug)
    return Response.json(dealer ? [{ ...dealer, slug, is_active: true }] : [])
  }
  const body = JSON.parse(String(options?.body ?? '{}')) as Record<string, unknown>
  if (url.pathname.endsWith('/leads')) {
    supabaseWrites++
    return new Response(null, { status: 201 })
  }
  webhookRequests.push({ url: url.href, body })
  return new Response(null, { status: 200 })
}

const base = {
  full_name: 'Routing Test', email: 'routing@example.invalid', phone: '5550100000', postal_code: '46741',
  doorConfiguration: { schemaVersion: 1, configuration: { finish: { id: 'paint-white', finishType: 'paint' } } },
}

async function invoke(dealerSlug?: string) {
  webhookRequests = []
  supabaseWrites = 0
  let status = 0
  let result: unknown
  await submitDoorBuilder(
    { method: 'POST', body: { ...base, submissionId: randomUUID(), dealerSlug } },
    { setHeader() {}, status(value) { status = value; return this }, json(value) { result = value } },
  )
  return { status, result, requests: [...webhookRequests], supabaseWrites }
}

const main = await invoke()
assert.equal(main.status, 200)
assert.deepEqual(main.requests.map(request => request.url), [masterWebhook])
assert.equal(main.requests[0].body.lead_source, 'HGI')

const ab = await invoke('americas-best-windows-and-doors')
assert.equal(ab.status, 200)
assert.deepEqual(ab.requests.map(request => request.url), [masterWebhook, abWebhook])
assert.ok(ab.requests.every(request => request.body.lead_source === 'AB'))
assert.ok(ab.requests.every(request => request.body.lead_source !== 'HGI'))
assert.ok(ab.requests.every(request => request.body.dealer_slug === 'americas-best-windows-and-doors'))

const wdm = await invoke('wdm')
assert.equal(wdm.status, 200)
assert.deepEqual(wdm.requests.map(request => request.url), [masterWebhook, wdmWebhook])
assert.ok(wdm.requests.every(request => request.body.lead_source === 'WDM'))
assert.ok(wdm.requests.every(request => request.body.lead_source !== 'HGI'))
assert.ok(wdm.requests.every(request => request.body.dealer_slug === 'wdm'))

const future = await invoke('future-dealer')
assert.equal(future.status, 200)
assert.deepEqual(future.requests.map(request => request.url), [masterWebhook])
assert.equal(future.requests[0].body.lead_source, 'future-dealer-door-builder-lead')

async function expectConfigurationFailure(dealerSlug?: string) {
  const result = await invoke(dealerSlug)
  assert.equal(result.status, 502)
  assert.deepEqual(result.result, { error: 'Submission could not be completed. Please try again.', destinations: { supabase: 'skipped', zapier: 'failed' } })
  assert.equal(result.supabaseWrites, 0)
  assert.deepEqual(result.requests, [])
}

delete process.env.ZAPIER_AB_DOOR_BUILDER_WEBHOOK_URL
await expectConfigurationFailure('americas-best-windows-and-doors')
process.env.ZAPIER_AB_DOOR_BUILDER_WEBHOOK_URL = abWebhook
process.env.ZAPIER_DOOR_BUILDER_WEBHOOK_URL = 'http://hooks.zapier.com/not-secure'
await expectConfigurationFailure()
process.env.ZAPIER_DOOR_BUILDER_WEBHOOK_URL = masterWebhook
process.env.ZAPIER_AB_DOOR_BUILDER_WEBHOOK_URL = masterWebhook
await expectConfigurationFailure('americas-best-windows-and-doors')

console.log('PASS main/AB/WDM webhook routing, trusted lead sources, invalid configuration rejection, and unique requests')
