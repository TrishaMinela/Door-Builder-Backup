import assert from 'node:assert/strict'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'

// Import emitted JavaScript with native Node ESM, not tsx/Vite: those loaders
// accept extensionless imports that the deployed serverless runtime rejects.
const suppliedHandler = process.argv[2]
const temporary = suppliedHandler ? null : await mkdtemp(join(tmpdir(), 'hgi-lead-esm-'))
const originalFetch = globalThis.fetch
const originalEnv = { ...process.env }
try {
  if (temporary) {
    const compilation = spawnSync(process.execPath, [
      'node_modules/typescript/bin/tsc', 'api/submit-door-builder.ts',
      '--outDir', temporary, '--rootDir', '.', '--target', 'ES2022',
      '--module', 'ESNext', '--moduleResolution', 'Bundler', '--strict', '--skipLibCheck',
    ], { encoding: 'utf8' })
    assert.equal(compilation.status, 0, compilation.stdout + compilation.stderr)
    await writeFile(join(temporary, 'package.json'), '{"type":"module"}')
  }
  // No real credentials or external requests are used by this test.
  process.env.NODE_ENV = 'production'
  process.env.VERCEL_ENV = 'production'
  process.env.SUPABASE_URL = 'https://supabase.example.invalid'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-only'
  process.env.ZAPIER_DOOR_BUILDER_WEBHOOK_URL = 'https://hooks.zapier.com/hooks/catch/test/master/'
  delete process.env.LEADS_DELIVERY_MODE
  const records = new Map()
  let calls = [], supabaseStatus = 201, zapierStatus = 200, dealerActive = true, networkFailure = false, zapierTimeout = false
  globalThis.fetch = async (url, options) => {
    const target = String(url)
    if (target.startsWith('https://supabase.example.invalid/rest/v1/dealers?')) {
      calls.push('dealer')
      const requestedSlug = new URL(target).searchParams.get('slug')?.replace(/^eq\./, '') ?? 'example-dealer'
      return Response.json([{ id: '11111111-1111-4111-8111-111111111111', slug: requestedSlug, company_name: 'Example Dealer', is_active: dealerActive }])
    }
    if (target === 'https://supabase.example.invalid/rest/v1/leads?on_conflict=submission_id') {
      calls.push('supabase')
      assert.match(new Headers(options.headers).get('Prefer'), /resolution=ignore-duplicates/)
      if (networkFailure) throw new Error('Mock network failure')
      const row = JSON.parse(options.body)
      if (supabaseStatus < 300 && !records.has(row.submission_id)) records.set(row.submission_id, row)
      return new Response(null, { status: supabaseStatus })
    }
    assert.equal(target, 'https://hooks.zapier.com/hooks/catch/test/master/', 'Unexpected outbound destination')
    calls.push('zapier')
    if (zapierTimeout) throw new DOMException('Mock webhook timeout', 'TimeoutError')
    return new Response(null, { status: zapierStatus })
  }
  const { default: handler } = await import(pathToFileURL(resolve(suppliedHandler ?? join(temporary, 'api/submit-door-builder.js'))).href)
  const payload = {
    submissionId: '22222222-2222-4222-8222-222222222222',
    full_name: 'Local Test', email: 'test@example.invalid', phone: '5550100000', postal_code: '46741',
    doorConfiguration: { schemaVersion: 1, configuration: { finish: { id: 'paint-white', finishType: 'paint' } } },
  }
  async function invoke(body = payload, method = 'POST') {
    calls = []
    let status, result
    const response = { setHeader() {}, status(value) { status = value; return response }, json(value) { result = value } }
    await handler({ method, body }, response)
    return { status, result }
  }
  assert.equal((await invoke({}, 'GET')).status, 405)
  assert.deepEqual(calls, [])
  assert.equal((await invoke({})).status, 400)
  assert.deepEqual(calls, [])
  assert.equal((await invoke({ ...payload, submissionId: 'invalid' })).status, 400)
  assert.deepEqual(calls, [])
  assert.equal((await invoke({ ...payload, doorConfiguration: { configuration: {} } })).status, 400)
  assert.deepEqual(calls, [])
  assert.equal((await invoke({ ...payload, main_door_glass: 'Courtyard' })).status, 400)
  assert.deepEqual(calls, [])
  supabaseStatus = 503
  assert.deepEqual(await invoke(), { status: 502, result: { error: 'Submission could not be completed. Please try again.', destinations: { supabase: 'failed', zapier: 'skipped' } } })
  assert.deepEqual(calls, ['supabase'])
  assert.equal(records.size, 0)
  supabaseStatus = 201; networkFailure = true
  assert.equal((await invoke()).status, 502)
  assert.deepEqual(calls, ['supabase'])
  networkFailure = false; zapierStatus = 503
  assert.deepEqual((await invoke()).result.destinations, { supabase: 'succeeded', zapier: 'failed' })
  assert.equal(records.size, 1)
  assert.deepEqual(calls, ['supabase', 'zapier'])
  zapierTimeout = true
  assert.deepEqual(await invoke(), { status: 502, result: { error: 'Submission could not be completed. Please try again.', destinations: { supabase: 'succeeded', zapier: 'failed' } } })
  assert.equal(records.size, 1)
  zapierTimeout = false
  zapierStatus = 200
  assert.equal((await invoke()).status, 200)
  assert.equal(records.size, 1, 'Same submission ID preserves the existing lead on retry')
  assert.deepEqual(calls, ['supabase', 'zapier'])
  const saved = records.get(payload.submissionId)
  assert.deepEqual(saved.door_configuration, payload.doorConfiguration)
  assert.equal(saved.dealer_id, null)
  assert.equal(saved.source, 'door_builder')
  dealerActive = false
  assert.equal((await invoke({ ...payload, dealerSlug: 'example-dealer' })).status, 403)
  assert.deepEqual(calls, ['dealer'])
  dealerActive = true
  const dealerId = '33333333-3333-4333-8333-333333333333'
  assert.equal((await invoke({ ...payload, submissionId: dealerId, dealerSlug: 'example-dealer' })).status, 200)
  assert.deepEqual(calls, ['dealer', 'supabase', 'zapier'])
  assert.equal(records.get(dealerId).dealer_id, '11111111-1111-4111-8111-111111111111')
  console.log('PASS native Node ESM startup and 12 mocked legacy lead validation/persistence/dealer/delivery/retry scenarios')
  console.log('Legacy behavior retained: Zapier failure returns 502 after save; retries re-forward to Zapier. Exactly-once notifications are not claimed.')
} finally {
  globalThis.fetch = originalFetch
  for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key]
  Object.assign(process.env, originalEnv)
  if (temporary) await rm(temporary, { recursive: true, force: true })
}
