import { createHmac, timingSafeEqual } from 'node:crypto'

const EMAILJS_SEND_URL = 'https://api.emailjs.com/api/v1.0/email/send'
const SITE_URL = 'https://adityauniyal.is-a.dev'
const MAX_BODY_BYTES = 256 * 1024
const WEBHOOK_TOLERANCE_SECONDS = 5 * 60

// Supabase's Auth Hook has a five-second HTTP timeout. Keep each EmailJS
// request bounded so this endpoint can respond before Auth gives up.
const SINGLE_EMAIL_TIMEOUT_MS = 3500
const DUAL_EMAIL_TIMEOUT_MS = 1500
const EMAILJS_MIN_INTERVAL_MS = 1100

export const config = {
  api: {
    bodyParser: false,
  },
  maxDuration: 10,
}

function sendJson(res, status, body) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  return res.status(status).json(body)
}

function getHeader(req, name) {
  const value = req.headers?.[name.toLowerCase()]
  return Array.isArray(value) ? value[0] : value
}

async function readRawBody(req) {
  const chunks = []
  let size = 0

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.length

    if (size > MAX_BODY_BYTES) {
      const error = new Error('Request body too large')
      error.statusCode = 413
      throw error
    }

    chunks.push(buffer)
  }

  return Buffer.concat(chunks).toString('utf8')
}

function decodeWebhookSecret(value) {
  const secret = String(value || '').trim()
  const prefix = 'v1,whsec_'

  if (!secret.startsWith(prefix)) {
    throw new Error('Webhook secret must start with v1,whsec_')
  }

  const key = Buffer.from(secret.slice(prefix.length), 'base64')
  if (key.length < 16) {
    throw new Error('Webhook signing secret is invalid')
  }

  return key
}

/**
 * Verify a Supabase Standard Webhooks signature against the untouched body.
 * The helper is exported so the signing logic can be covered by unit tests.
 */
export function verifySupabaseWebhook(rawBody, headers, secretValue, nowSeconds = Math.floor(Date.now() / 1000)) {
  const webhookId = headers['webhook-id']
  const timestamp = headers['webhook-timestamp']
  const signatureHeader = headers['webhook-signature']

  if (!webhookId || !timestamp || !signatureHeader) {
    throw new Error('Missing Standard Webhooks headers')
  }

  if (!/^\d+$/.test(String(timestamp))) {
    throw new Error('Invalid webhook timestamp')
  }

  const timestampSeconds = Number(timestamp)
  if (!Number.isSafeInteger(timestampSeconds) ||
      Math.abs(nowSeconds - timestampSeconds) > WEBHOOK_TOLERANCE_SECONDS) {
    throw new Error('Webhook timestamp is outside the allowed window')
  }

  const signedContent = `${webhookId}.${timestamp}.${rawBody}`
  const signatures = String(signatureHeader)
    .trim()
    .split(/\s+/)
    .map((part) => {
      const comma = part.indexOf(',')
      return comma >= 0 ? { version: part.slice(0, comma), value: part.slice(comma + 1) } : null
    })
    .filter((part) => part?.version === 'v1' && part.value)

  if (signatures.length === 0) {
    throw new Error('No supported webhook signature found')
  }

  // Standard Webhooks supports multiple active secrets during rotation,
  // separated by |. Accept any currently configured secret.
  const secrets = String(secretValue)
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean)

  for (const secret of secrets) {
    const key = decodeWebhookSecret(secret)
    const expected = createHmac('sha256', key).update(signedContent).digest()

    for (const item of signatures) {
      let supplied
      try {
        supplied = Buffer.from(item.value, 'base64')
      } catch {
        continue
      }

      if (supplied.length === expected.length && timingSafeEqual(supplied, expected)) {
        return true
      }
    }
  }

  throw new Error('Webhook signature verification failed')
}

function getEmailContent(action) {
  const content = {
    signup: {
      subject: 'Verify your email',
      title: 'Verify your email',
      message: 'Welcome to AU_ / JOURNAL. Confirm your email to activate your account.',
      actionText: 'VERIFY EMAIL',
    },
    invite: {
      subject: "You're invited",
      title: 'Your journal invitation',
      message: "You've been invited to join AU_ / JOURNAL. Confirm your invitation to continue.",
      actionText: 'ACCEPT INVITATION',
    },
    recovery: {
      subject: 'Reset your password',
      title: 'Reset your password',
      message: 'We received a request to reset your AU_ / JOURNAL password.',
      actionText: 'RESET PASSWORD',
    },
    magiclink: {
      subject: 'Your sign-in link',
      title: 'Sign in to your journal',
      message: 'Use this secure, one-time link to sign in to AU_ / JOURNAL.',
      actionText: 'SIGN IN',
    },
    email_change: {
      subject: 'Confirm your email change',
      title: 'Confirm your email address',
      message: 'Confirm the requested email address change for your AU_ / JOURNAL account.',
      actionText: 'CONFIRM EMAIL',
    },
    reauthentication: {
      subject: 'Confirm your identity',
      title: 'Confirm your identity',
      message: 'Use the one-time verification code included in this email to confirm your identity.',
      actionText: 'OPEN JOURNAL',
    },
  }

  if (!Object.prototype.hasOwnProperty.call(content, action)) {
    throw new Error('Unsupported authentication email action')
  }

  return content[action]
}

function buildVerificationUrl(tokenHash, action, redirectTo, supabaseUrl) {
  if (typeof tokenHash !== 'string' || !tokenHash) {
    throw new Error('Missing authentication token hash')
  }

  const projectUrl = new URL(supabaseUrl)
  if (projectUrl.protocol !== 'https:') {
    throw new Error('AUTH_HOOK_SUPABASE_URL must use HTTPS')
  }

  const verifyUrl = new URL('/auth/v1/verify', projectUrl)
  verifyUrl.searchParams.set('token', tokenHash)
  verifyUrl.searchParams.set('type', action)

  if (redirectTo) {
    verifyUrl.searchParams.set('redirect_to', redirectTo)
  }

  return verifyUrl.toString()
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function sendEmailJS({ recipient, action, tokenHash, token, redirectTo, projectUrl, env, timeoutMs }) {
  if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
    throw new Error('Authentication email recipient is invalid')
  }

  const content = getEmailContent(action)
  const actionUrl = action === 'reauthentication'
    ? SITE_URL
    : buildVerificationUrl(tokenHash, action, redirectTo, projectUrl)
  const message = action === 'reauthentication' && token
    ? `${content.message} Your verification code is: ${token}`
    : content.message

  const response = await fetch(EMAILJS_SEND_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(timeoutMs),
    body: JSON.stringify({
      service_id: env.EMAILJS_SERVICE_ID,
      template_id: env.EMAILJS_TEMPLATE_ID,
      user_id: env.EMAILJS_PUBLIC_KEY,
      accessToken: env.EMAILJS_PRIVATE_KEY,
      template_params: {
        to_email: recipient,
        subject: content.subject,
        title: content.title,
        message,
        action_url: actionUrl,
        action_text: content.actionText,
        expiry_note: 'This is a secure, single-use link. Its validity depends on your authentication settings. Ignore this email if you did not request this action.',
        site_url: SITE_URL,
      },
    }),
  })

  if (!response.ok) {
    // Do not log provider response bodies: they may contain recipient or
    // request metadata. Status is sufficient for server-side diagnosis.
    console.error('[auth-email] EmailJS rejected the request', {
      status: response.status,
      action,
    })
    throw new Error(`EmailJS request failed with status ${response.status}`)
  }
}

function getConfiguration() {
  const env = {
    EMAILJS_SERVICE_ID: process.env.EMAILJS_SERVICE_ID,
    EMAILJS_TEMPLATE_ID: process.env.EMAILJS_TEMPLATE_ID,
    EMAILJS_PUBLIC_KEY: process.env.EMAILJS_PUBLIC_KEY,
    EMAILJS_PRIVATE_KEY: process.env.EMAILJS_PRIVATE_KEY,
    SEND_EMAIL_HOOK_SECRET: process.env.SEND_EMAIL_HOOK_SECRET,
    AUTH_HOOK_SUPABASE_URL: process.env.AUTH_HOOK_SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  }

  const missing = Object.entries(env)
    .filter(([, value]) => !value)
    .map(([name]) => name)

  if (missing.length) {
    console.error('[auth-email] Missing Vercel environment variables', missing)
    return null
  }

  return env
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return sendJson(res, 405, { error: 'Method not allowed' })
  }

  const env = getConfiguration()
  if (!env) {
    return sendJson(res, 500, { error: 'Authentication email service is not configured' })
  }

  let rawBody
  try {
    rawBody = await readRawBody(req)
  } catch (error) {
    return sendJson(res, error.statusCode || 400, { error: 'Unable to read webhook request' })
  }

  try {
    verifySupabaseWebhook(
      rawBody,
      {
        'webhook-id': getHeader(req, 'webhook-id'),
        'webhook-timestamp': getHeader(req, 'webhook-timestamp'),
        'webhook-signature': getHeader(req, 'webhook-signature'),
      },
      env.SEND_EMAIL_HOOK_SECRET,
    )
  } catch (error) {
    console.warn('[auth-email] Webhook verification rejected a request:', error.message)
    return sendJson(res, 401, { error: 'Invalid webhook signature' })
  }

  let event
  try {
    event = JSON.parse(rawBody)
  } catch {
    return sendJson(res, 400, { error: 'Invalid JSON payload' })
  }

  const user = event?.user
  const emailData = event?.email_data
  const action = emailData?.email_action_type

  if (!user || !emailData || typeof action !== 'string') {
    return sendJson(res, 400, { error: 'Invalid Supabase Auth Hook payload' })
  }

  const projectUrl = env.AUTH_HOOK_SUPABASE_URL
  const redirectTo = emailData.redirect_to || emailData.site_url || SITE_URL

  try {
    if (action === 'email_change' &&
        user.email &&
        user.new_email &&
        emailData.token_hash_new &&
        emailData.token_hash) {
      // Supabase's secure email-change mapping is intentionally reversed:
      // token_hash_new belongs to the current email, token_hash to new_email.
      await sendEmailJS({
        recipient: user.email,
        action,
        tokenHash: emailData.token_hash_new,
        redirectTo,
        projectUrl,
        env,
        timeoutMs: DUAL_EMAIL_TIMEOUT_MS,
      })

      // EmailJS allows one request per second.
      await delay(EMAILJS_MIN_INTERVAL_MS)

      await sendEmailJS({
        recipient: user.new_email,
        action,
        tokenHash: emailData.token_hash,
        redirectTo,
        projectUrl,
        env,
        timeoutMs: DUAL_EMAIL_TIMEOUT_MS,
      })
    } else {
      const recipient = action === 'email_change'
        ? (user.new_email || user.email)
        : user.email
      const tokenHash = emailData.token_hash || emailData.token_hash_new

      await sendEmailJS({
        recipient,
        action,
        tokenHash,
        redirectTo,
        projectUrl,
        env,
        token: emailData.token,
        timeoutMs: SINGLE_EMAIL_TIMEOUT_MS,
      })
    }

    // Supabase treats an empty HTTP 200 response as successful delivery.
    return res.status(200).end()
  } catch (error) {
    console.error('[auth-email] Delivery failed:', {
      action,
      error: error?.name === 'TimeoutError' ? 'Email provider timed out' : error.message,
    })
    return sendJson(res, 502, { error: 'Authentication email delivery failed' })
  }
}
