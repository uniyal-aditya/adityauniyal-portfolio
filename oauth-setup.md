# OAuth Login Setup — GitHub · Google · Discord

Complete walkthrough for enabling social login on the AU_ / JOURNAL.
Follow top to bottom. ~15 minutes for GitHub + Discord, ~10 extra for Google.

---

## Step 0 — Add the redirect URLs (do this FIRST)

Supabase rejects OAuth callbacks from unlisted URLs.

1. Supabase Dashboard → your project (`qnuegizjakzwgxfvihbd`)
2. **Authentication → URL Configuration**
3. Under **Redirect URLs**, click **Add URL** and add BOTH:

   ```
   http://localhost:5173/blog/login
   https://adityauniyal.vercel.app/blog/login
   ```

4. **Save**

While you're here: **Authentication → Sign In / Providers → Email** →
turn **OFF "Confirm email"** (your owner account is currently locked by it).

---

## Step 1 — GitHub (~5 min)

**A. Create the GitHub OAuth app:**

1. Go to <https://github.com/settings/developers>
2. **New OAuth App** (or "OAuth Apps → New OAuth App")
3. Fill in:
   - **Application name:** `AU Journal`
   - **Homepage URL:** `https://adityauniyal.vercel.app`
   - **Authorization callback URL:**
     ```
     https://qnuegizjakzwgxfvihbd.supabase.co/auth/v1/callback
     ```
4. **Register application**
5. Copy the **Client ID** (shown right after registering)
6. Click **Generate a new client secret** → copy the **Client Secret**
   (you will NOT see it again)

**B. Enable it in Supabase:**

1. Dashboard → **Authentication → Sign In / Providers**
2. Expand **GitHub**
3. Toggle **Enable Sign in with GitHub** ON
4. Paste **Client ID** and **Client Secret**
5. **Save**

---

## Step 2 — Discord (~5 min)

**A. Create the Discord application:**

1. Go to <https://discord.com/developers/applications>
2. **New Application** → name it `AU Journal` → **Create**
3. Left sidebar: **OAuth2**
4. Under **Redirects**, click **Add Redirect** and paste:
   ```
   https://qnuegizjakzwgxfvihbd.supabase.co/auth/v1/callback
   ```
5. **Save Changes**
6. Copy **Client ID** (top of the OAuth2 page) and click **Reset Secret**
   → copy the **Client Secret**

**B. Enable it in Supabase:**

1. **Authentication → Sign In / Providers** → expand **Discord**
2. Toggle **Enable Sign in with Discord** ON
3. Paste **Client ID** and **Client Secret**
4. **Save**

---

## Step 3 — Google (~10 min)

Google needs a GCP project and a consent screen first.

**A. Create the OAuth consent screen:**

1. Go to <https://console.cloud.google.com/apis/credentials>
2. Top bar → create/select a project (e.g. `au-journal`)
3. **OAuth consent screen** → choose **External** → **Create**
4. Fill required fields:
   - App name: `AU Journal`
   - User support email: your email
   - Developer contact: your email
5. **Scopes** step → **Add or remove scopes** → add `.../auth/userinfo.email`
   and `.../auth/userinfo.profile` → Save
6. **Test users** step → **Add users** → add your own Gmail → Save
   (required while the app is in "Testing" mode)

**B. Create the OAuth Client ID:**

1. **Credentials → Create Credentials → OAuth client ID**
2. Application type: **Web application**
3. **Authorized redirect URIs** → add:
   ```
   https://qnuegizjakzwgxfvihbd.supabase.co/auth/v1/callback
   ```
4. **Create** → copy the **Client ID** and **Client Secret**

**C. Enable it in Supabase:**

1. **Authentication → Sign In / Providers** → expand **Google**
2. Toggle **Enable Sign in with Google** ON
3. Paste **Client ID** and **Client Secret**
4. **Save**

> Google in "Testing" mode only works for the test users you added.
> For public launch: consent screen → **Publish app**.

---

## Step 4 — Verify

1. Make sure the dev server is running (`npm run dev` → http://localhost:5173)
2. Open `http://localhost:5173/blog/login`
3. You should see the three buttons: **GitHub · Google · Discord**
4. Click one → you should be redirected to that provider's consent page →
   authorize → land back on `/blog/login` signed in
5. In Supabase → **Authentication → Users** → the new user appears
6. In **Table Editor → profiles** → a row was auto-created for them
   (the trigger from `01-schema.sql`)

---

## Troubleshooting

| Error | Fix |
| --- | --- |
| "Unsupported provider: provider is not enabled" | Provider toggle is OFF in Supabase, or secrets not saved |
| "Provider could not perform request" / provider error page | Wrong Client ID/Secret — re-paste them |
| `redirect_uri_mismatch` (Google) or callback 404 | The callback URL in the provider console doesn't exactly match `https://qnuegizjakzwgxfvihbd.supabase.co/auth/v1/callback` |
| "Redirect URL not allowed" from Supabase | The redirect URL from Step 0 is missing or mistyped |
| Logins work locally but not on production | `https://adityauniyal.vercel.app/blog/login` missing from Redirect URLs (Step 0) |
| Signed in but no profile row | Run `supabase/01-schema.sql` (contains the profile trigger) |

---

## Secrets hygiene

- Client secrets go **only** into Supabase's provider settings — never into
  the repo, never into frontend code.
- The Supabase anon key stays in `.env.local` (git-ignored); only the public
  URL + anon key ever reach the browser.
