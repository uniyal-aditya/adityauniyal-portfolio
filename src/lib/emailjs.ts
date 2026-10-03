/**
 * Shared EmailJS credentials for the /connect and /feedback forms — one
 * service, one template, one inbox.
 *
 * Vite env vars win when set; the literals are the current production
 * values so the forms keep working with zero env setup. There is no secret
 * here: the EmailJS public key is designed to be shipped to the browser
 * (spam protection is the honeypot + template-side validation, and the
 * service is rate-limited by EmailJS itself).
 */
const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'aditya_uniyal_portfolio'
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'portfolio_template'
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'xPYwrcIVmeLYO2V6a'

export const EMAILJS = {
  serviceId: SERVICE_ID,
  templateId: TEMPLATE_ID,
  publicKey: PUBLIC_KEY,
} as const

/**
 * True when a honeypot field was filled. Real users never see (or fill) the
 * hidden `company` input; bots do. Callers drop the message silently and
 * show a success state so the bot believes it worked.
 */
export function honeypotTripped(data: FormData): boolean {
  return String(data.get('company') || '') !== ''
}
