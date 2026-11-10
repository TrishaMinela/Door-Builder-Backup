import { DealerResolutionError, resolveDealerIdentity } from '../server/dealerResolution.js'
import { isHiddenDecorativeGlass } from '../src/data/customerGlassAvailability.js'
import { assertCustomerFinish } from '../src/utils/customerFinish.js'
import type { Finish } from '../src/types.js'

type ApiRequest = { method?: string; body?: unknown }
declare const process: { env: Record<string, string | undefined> }
type ApiResponse = { status: (code: number) => ApiResponse; json: (body: unknown) => void; setHeader: (name: string, value: string) => void }

const SUBMISSION_FIELDS = [
  'submitted_at', 'first_name', 'last_name', 'full_name', 'email', 'phone', 'postal_code', 'notes',
  'door_configuration', 'door_line', 'door_style', 'sidelite_placement', 'sidelite_slab', 'sidelite_glass',
  'main_door_glass', 'door_finish_type', 'door_finish_color', 'jamb_type', 'jamb_finish_type',
  'jamb_finish_color', 'hardware', 'lock_setup', 'door_swing', 'hinge_option',
  'lead_source', 'dealer_name', 'dealer_slug',
] as const

const MAX_CONFIGURATION_BYTES = 128 * 1024
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
type SubmissionField = typeof SUBMISSION_FIELDS[number]
type ZapierPayload = Record<SubmissionField, string>
type JsonObject = Record<string, unknown>

function parseBody(body: unknown): JsonObject {
  if (typeof body === 'string') {
    try { const parsed = JSON.parse(body); return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as JsonObject : {} } catch { return {} }
  }
  return body && typeof body === 'object' && !Array.isArray(body) ? body as JsonObject : {}
}

function normalizePayload(source: JsonObject): ZapierPayload {
  return Object.fromEntries(SUBMISSION_FIELDS.map((field) => [field, typeof source[field] === 'string' ? source[field].trim() : ''])) as ZapierPayload
}

function configurationSnapshot(value: unknown): JsonObject | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : null
}

function byteLength(value: unknown) {
  try { return new TextEncoder().encode(JSON.stringify(value)).byteLength } catch { return Number.POSITIVE_INFINITY }
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  return { firstName: parts[0] ?? '', lastName: parts.slice(1).join(' ') }
}

const DEALER_LEAD_SOURCES: Record<string, string> = {
  'americas-best-windows-and-doors': 'AB',
  wdm: 'WDM',
}

function leadAttribution(dealer: Awaited<ReturnType<typeof resolveDealerIdentity>>) {
  if (!dealer) return { lead_source: 'HGI', dealer_name: 'Home Guard Industries', dealer_slug: '' }
  return {
    lead_source: DEALER_LEAD_SOURCES[dealer.slug] ?? `${dealer.slug}-door-builder-lead`,
    dealer_name: dealer.companyName,
    dealer_slug: dealer.slug,
  }
}

function logDevelopmentSubmission(payload: ZapierPayload) {
  if (process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV === 'production') return
  console.info('HGI Door Builder submission', {
    Name: payload.full_name, Email: payload.email, 'Door Configuration': payload.door_configuration,
    'Door Line': payload.door_line, 'Door Style': payload.door_style, 'Sidelite Placement': payload.sidelite_placement,
    'Sidelite Slab': payload.sidelite_slab, 'Sidelite Glass': payload.sidelite_glass,
    'Main Door Glass': payload.main_door_glass, 'Door Finish Type': payload.door_finish_type,
    'Door Finish Color': payload.door_finish_color, 'Jamb Type': payload.jamb_type,
    'Jamb Finish Type': payload.jamb_finish_type, 'Jamb Finish Color': payload.jamb_finish_color,
    Hardware: payload.hardware, 'Lock Setup': payload.lock_setup, 'Door Swing': payload.door_swing,
    'Hinge Option': payload.hinge_option,
  })
}

function validatedZapierUrl(value: string | undefined) {
  if (!value) throw new Error('Zapier destination is not configured.')
  let url: URL
  try { url = new URL(value) } catch { throw new Error('Zapier destination is invalid.') }
  if (url.protocol !== 'https:' || url.hostname !== 'hooks.zapier.com') throw new Error('Zapier destination is invalid.')
  return url.href
}

function zapierDestinations(dealerSlug: string) {
  const destinations = [validatedZapierUrl(process.env.ZAPIER_DOOR_BUILDER_WEBHOOK_URL)]
  if (dealerSlug === 'americas-best-windows-and-doors') destinations.push(validatedZapierUrl(process.env.ZAPIER_AB_DOOR_BUILDER_WEBHOOK_URL))
  if (dealerSlug === 'wdm') destinations.push(validatedZapierUrl(process.env.ZAPIER_WDM_DOOR_BUILDER_WEBHOOK_URL))
  if (new Set(destinations).size !== destinations.length) throw new Error('Zapier destinations must be unique.')
  return destinations
}

async function submitToZapier(payload: ZapierPayload, destinations: string[]) {
  const body = JSON.stringify(payload)
  const results = await Promise.all(destinations.map(webhookUrl => fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })))
  if (results.some(result => !result.ok)) throw new Error('One or more Zapier destinations rejected the submission.')
}

async function submitToSupabase(submissionId: string, payload: ZapierPayload, doorConfiguration: JsonObject, dealerId: string | null) {
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/+$/, '')
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) throw new Error('Supabase destination is not configured.')
  const { firstName, lastName } = splitName(payload.full_name)
  const result = await fetch(`${supabaseUrl}/rest/v1/leads?on_conflict=submission_id`, {
    method: 'POST',
    headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, 'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates,return=minimal' },
    body: JSON.stringify({
      submission_id: submissionId, dealer_id: dealerId, first_name: firstName, last_name: lastName,
      email: payload.email, phone: payload.phone || null, zip: payload.postal_code || null,
      comments: payload.notes || null, status: 'new', source: 'door_builder', door_configuration: doorConfiguration,
    }),
  })
  if (!result.ok) throw new Error(`Supabase returned HTTP ${result.status}.`)
}

function errorMessage(reason: unknown) {
  return reason instanceof Error ? reason.message : 'Unknown destination error.'
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  response.setHeader('Content-Type', 'application/json')
  if (request.method !== 'POST') { response.setHeader('Allow', 'POST'); response.status(405).json({ error: 'Method not allowed.' }); return }

  const source = parseBody(request.body)
  const payload = normalizePayload(source)
  if (!payload.full_name || !payload.email || !payload.phone || !payload.postal_code) {
    response.status(400).json({ error: 'Required customer information is missing.' }); return
  }
  const submissionId = typeof source.submissionId === 'string' ? source.submissionId.trim() : ''
  if (!UUID_PATTERN.test(submissionId)) { response.status(400).json({ error: 'Submission ID is invalid.' }); return }
  const doorConfiguration = configurationSnapshot(source.doorConfiguration)
  if (!doorConfiguration) { response.status(400).json({ error: 'Door configuration is invalid.' }); return }
  if (byteLength(doorConfiguration) > MAX_CONFIGURATION_BYTES) { response.status(413).json({ error: 'Door configuration is too large.' }); return }
  const configuration = configurationSnapshot(doorConfiguration.configuration) ?? doorConfiguration
  try { assertCustomerFinish(configuration.finish as Finish | undefined) }
  catch { response.status(400).json({ error: 'Please select a door finish before submitting.' }); return }
  const mainGlass = configurationSnapshot(configuration.mainDoorGlass)
  const glass = configurationSnapshot(configuration.glass)
  const sideliteGlass = configurationSnapshot(configuration.sideliteGlass)
  const hidden = [mainGlass, glass].some(option => option && isHiddenDecorativeGlass({ id: typeof option.id === 'string' ? option.id : '', name: typeof option.name === 'string' ? option.name : '' }))
    || [payload.main_door_glass, payload.sidelite_glass, typeof sideliteGlass?.glass === 'string' ? sideliteGlass.glass : ''].some(name => isHiddenDecorativeGlass({ name }))
  if (hidden) { response.status(400).json({ error: 'Please choose an available glass option before submitting.' }); return }

  logDevelopmentSubmission(payload)

  let dealer: Awaited<ReturnType<typeof resolveDealerIdentity>>
  try {
    dealer = await resolveDealerIdentity(source.dealerSlug)
  } catch (reason) {
    const status = reason instanceof DealerResolutionError ? reason.status : 502
    response.status(status).json({ error: status === 502 ? 'Dealer lookup is unavailable. Please try again.' : 'This dealer link is unavailable.' })
    return
  }
  const attributedPayload = { ...payload, ...leadAttribution(dealer) }
  const dealerId = dealer?.id ?? null
  let webhookDestinations: string[]
  try { webhookDestinations = zapierDestinations(attributedPayload.dealer_slug) }
  catch {
    response.status(502).json({ error: 'Submission could not be completed. Please try again.', destinations: { supabase: 'skipped', zapier: 'failed' } })
    return
  }

  try {
    await submitToSupabase(submissionId, attributedPayload, doorConfiguration, dealerId)
  } catch (reason) {
    console.error('Door Builder supabase submission failed.', errorMessage(reason))
    response.status(502).json({
      error: 'Submission could not be completed. Please try again.',
      destinations: { supabase: 'failed', zapier: 'skipped' },
    })
    return
  }

  try {
    await submitToZapier(attributedPayload, webhookDestinations)
  } catch (reason) {
    console.error('Door Builder zapier submission failed.', errorMessage(reason))
    response.status(502).json({
      error: 'Submission could not be completed. Please try again.',
      destinations: { supabase: 'succeeded', zapier: 'failed' },
    })
    return
  }

  response.status(200).json({ ok: true, destinations: { supabase: 'succeeded', zapier: 'succeeded' } })
}
