# AU_ / JOURNAL — Supabase Auth Email via Vercel

This endpoint receives Supabase Auth's **Send Email HTTP Hook** and delivers the message using the separate AU_ / JOURNAL EmailJS account. It is separate from the browser-side EmailJS integration used by the portfolio contact form.

## Why this endpoint exists

The previous hook target was the Supabase project's own Edge Function hostname. Supabase Auth logs showed DNS lookup timeouts when Auth attempted to call that endpoint. This route runs on Vercel at a different hostname:

`https://adityauniyal.is-a.dev/api/send-email`

## 1. Configure Vercel environment variables

In Vercel → Project → Settings → Environment Variables, add the following to **Production** and **Preview** (Preview is needed to test a preview deployment):

| Variable | Value |
|---|---|
| `EMAILJS_SERVICE_ID` | Service ID from the separate AU_ / JOURNAL EmailJS account |
| `EMAILJS_TEMPLATE_ID` | The AU_ / JOURNAL auth template ID (for example, `supabase_auth_template`) |
| `EMAILJS_PUBLIC_KEY` | Public Key from the separate AU_ / JOURNAL EmailJS account |
| `EMAILJS_PRIVATE_KEY` | Private Key from the separate AU_ / JOURNAL EmailJS account |
| `SEND_EMAIL_HOOK_SECRET` | The complete secret shown in Supabase Auth Hooks, including the `v1,whsec_` prefix |
| `AUTH_HOOK_SUPABASE_URL` | The Supabase Project URL, e.g. `https://YOUR_PROJECT_REF.supabase.co` |

Do not put the EmailJS Private Key or the webhook secret in a `VITE_` variable, source file, or Git repository. Vercel environment variables only become available to a new deployment after that deployment is created; redeploy after adding or changing them.

The existing `VITE_EMAILJS_*` variables are for the public contact form only. Do not replace them with the AU_ / JOURNAL account's credentials.

## 2. Deploy and test the Vercel endpoint

After merging/deploying this branch, the endpoint will be:

`https://adityauniyal.is-a.dev/api/send-email`

A browser GET should return `405 Method not allowed`. That is expected: the route accepts POST only.

Before switching the production Auth Hook, test on a Vercel Preview deployment if possible. Use a signed Standard Webhooks test request generated locally; never disable signature verification for testing.

## 3. Update Supabase Auth Hook

In Supabase → Authentication → Hooks → Send Email:

1. Edit the existing Send Email Hook.
2. Change the endpoint to `https://adityauniyal.is-a.dev/api/send-email`.
3. Keep the existing signing secret unchanged.
4. Save the hook.

The `SEND_EMAIL_HOOK_SECRET` value in Vercel must exactly match the secret shown in the Supabase hook configuration. Keep the `v1,whsec_` prefix.

Once Vercel is handling the hook, the old `send-email` Supabase Edge Function is no longer used by this Auth Hook. It can remain deployed until the Vercel route is proven stable.

## 4. EmailJS template contract

The AU_ / JOURNAL EmailJS template must accept these parameters:

- `to_email`
- `subject`
- `title`
- `message`
- `action_url`
- `action_text`
- `expiry_note`
- `site_url`

The sender should remain the connected Gmail service's default sender, with the sender name `AU_ / JOURNAL`. Use the verified recipient supplied by Supabase as `to_email`.

## 5. Verification sequence

After switching the hook:

1. Register with a new email address.
2. Confirm a POST invocation appears in Vercel → Deployments → Functions / Runtime Logs.
3. Confirm the endpoint returns HTTP 200.
4. Confirm the email arrives and the button uses a Supabase verification URL (not a static homepage URL).
5. Click the verification link and ensure it returns to `https://adityauniyal.is-a.dev/blog/login` or the allowed redirect you configured.
6. Test password recovery, magic link, and email change separately.

A successful HTTP 200 means the email provider accepted the send request; check the inbox separately to verify final delivery.

## Notes

- Supabase's Send Email Hook uses Standard Webhooks headers and requires a successful HTTP 200 response.
- The endpoint validates the webhook signature and timestamp against `SEND_EMAIL_HOOK_SECRET`.
- EmailJS allows one request per second. Secure email change can require two emails, so the endpoint sends those sequentially.
- Do not log authentication tokens, webhook signatures, EmailJS keys, or full payloads.
- The route uses bounded upstream timeouts because Supabase Auth HTTP Hooks have a short response budget.
