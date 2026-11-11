import { createHmac, randomBytes } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { verifySupabaseWebhook } from './send-email.js'

function makeSignedRequest(rawBody, nowSeconds = 1_800_000_000) {
  const key = randomBytes(32)
  const secret = `v1,whsec_${key.toString('base64')}`
  const webhookId = 'msg_test_123'
  const timestamp = String(nowSeconds)
  const signature = createHmac('sha256', key)
    .update(`${webhookId}.${timestamp}.${rawBody}`)
    .digest('base64')

  return {
    secret,
    headers: {
      'webhook-id': webhookId,
      'webhook-timestamp': timestamp,
      'webhook-signature': `v1,${signature}`,
    },
  }
}

describe('Supabase Send Email webhook verification', () => {
  const payload = JSON.stringify({
    user: { email: 'reader@example.com' },
    email_data: { email_action_type: 'signup' },
  })

  it('accepts a valid Standard Webhooks signature', () => {
    const now = 1_800_000_000
    const signed = makeSignedRequest(payload, now)

    expect(
      verifySupabaseWebhook(payload, signed.headers, signed.secret, now),
    ).toBe(true)
  })

  it('rejects a modified payload', () => {
    const now = 1_800_000_000
    const signed = makeSignedRequest(payload, now)

    expect(() =>
      verifySupabaseWebhook(
        payload + ' ',
        signed.headers,
        signed.secret,
        now,
      ),
    ).toThrow('Webhook signature verification failed')
  })

  it('rejects an expired webhook timestamp', () => {
    const now = 1_800_000_000
    const signed = makeSignedRequest(payload, now - 301)

    expect(() =>
      verifySupabaseWebhook(payload, signed.headers, signed.secret, now),
    ).toThrow('Webhook timestamp is outside the allowed window')
  })

  it('rejects missing signature headers', () => {
    expect(() =>
      verifySupabaseWebhook(payload, {}, 'v1,whsec_invalid', 1_800_000_000),
    ).toThrow('Missing Standard Webhooks headers')
  })
})
