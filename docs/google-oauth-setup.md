# Google OAuth Setup — YAGI Workshop

> **Purpose:** One-time setup to obtain a Google Calendar API refresh token for YAGI's internal account.
> Once complete, the server uses this refresh token to create/cancel calendar events on YAGI's calendar forever (no re-auth needed unless token is revoked).
>
> **Who does this:** Yagi (once). Not automated.
>
> **Time:** ~10 minutes.

---

## Prerequisites

- A Google account that will own YAGI's internal calendar (recommended: `yagi@yagiworkshop.xyz` or similar)
- Access to [Google Cloud Console](https://console.cloud.google.com)
- Node.js installed locally (for the token exchange script in Step 4)

---

## Step 1 — Create OAuth Client ID

1. Open [Google Cloud Console](https://console.cloud.google.com) with YAGI's Google account.
2. Create or select a project (e.g., `yagi-workshop`).
3. Go to **APIs & Services → Library**, search for **"Google Calendar API"**, click **Enable**.
4. Go to **APIs & Services → OAuth consent screen** (or **Google 인증 플랫폼 → 대상**):
   - User type: **External**
   - Publishing status: **Testing** (keep it here — do not submit for verification)
   - Test users: add YAGI's Google account (e.g., `yagi@yagiworkshop.xyz`)
   - Scopes: add `https://www.googleapis.com/auth/calendar.events`
5. Go to **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**
   - Name: `yagi-studio`
   - Authorized redirect URIs: `http://localhost:3003/api/auth/google/callback`
   - Click **Create**
6. Copy **Client ID** and **Client Secret** from the popup. The secret is shown only once.

---

## Step 2 — Put credentials in `.env.local`

```env
GOOGLE_OAUTH_CLIENT_ID=<your-client-id>.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=GOCSPX-<your-secret>
GOOGLE_OAUTH_REFRESH_TOKEN=
```

Leave `GOOGLE_OAUTH_REFRESH_TOKEN` blank for now — we fill it in Step 4.

---

## Step 3 — Open the consent URL in browser

Replace `YOUR_CLIENT_ID` with the actual value and open this URL in a browser where you're logged into YAGI's Google account:

```
https://accounts.google.com/o/oauth2/v2/auth?client_id=YOUR_CLIENT_ID&redirect_uri=http://localhost:3003/api/auth/google/callback&response_type=code&scope=https://www.googleapis.com/auth/calendar.events&access_type=offline&prompt=consent
```

**Critical query params:**
- `access_type=offline` — required to get a refresh token
- `prompt=consent` — forces Google to return a new refresh token even if you've consented before

Click through:
- "Google hasn't verified this app" warning → **Advanced → Go to yagi-studio (unsafe)** (this is expected in Testing mode)
- Grant calendar access

You'll land on `http://localhost:3003/api/auth/google/callback?code=4/0A...` — the page will fail to load (no server running on that port yet) but that's fine. **Copy the `code` value from the URL bar.**

---

## Step 4 — Exchange code for refresh token

Save this as `scripts/get-google-refresh-token.mjs` in the repo root:

```javascript
// scripts/get-google-refresh-token.mjs
// Usage: node scripts/get-google-refresh-token.mjs <code>

const [, , code] = process.argv
if (!code) {
  console.error('Usage: node scripts/get-google-refresh-token.mjs <code>')
  process.exit(1)
}

const { GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET } = process.env
if (!GOOGLE_OAUTH_CLIENT_ID || !GOOGLE_OAUTH_CLIENT_SECRET) {
  console.error('Missing GOOGLE_OAUTH_CLIENT_ID or GOOGLE_OAUTH_CLIENT_SECRET in env.')
  process.exit(1)
}

const res = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    code,
    client_id: GOOGLE_OAUTH_CLIENT_ID,
    client_secret: GOOGLE_OAUTH_CLIENT_SECRET,
    redirect_uri: 'http://localhost:3003/api/auth/google/callback',
    grant_type: 'authorization_code',
  }),
})

const data = await res.json()

if (!res.ok) {
  console.error('Token exchange failed:')
  console.error(JSON.stringify(data, null, 2))
  process.exit(1)
}

if (!data.refresh_token) {
  console.error('No refresh_token in response. Did you use prompt=consent and access_type=offline?')
  console.error('Response:', JSON.stringify(data, null, 2))
  process.exit(1)
}

console.log('Refresh token:\n')
console.log(data.refresh_token)
console.log('\nAdd this to .env.local as GOOGLE_OAUTH_REFRESH_TOKEN.')
```

Run it in PowerShell (Warp):

```powershell
cd C:\Users\yout4\yagi-studio\yagi-workshop

# Load env vars into current shell
$env:GOOGLE_OAUTH_CLIENT_ID = "your-client-id"
$env:GOOGLE_OAUTH_CLIENT_SECRET = "your-client-secret"

node scripts/get-google-refresh-token.mjs "4/0A...paste-code-here..."
```

The refresh token will print to the console.

---

## Step 5 — Save refresh token

Put the printed refresh token into `.env.local`:

```env
GOOGLE_OAUTH_REFRESH_TOKEN=1//0gAbc...
```

**Do not commit `.env.local`.** It's in `.gitignore` already.

---

## Step 6 — Verify

After Phase 1.3 subtask 04 is built, hit:

```
http://localhost:3003/api/health/google
```

(logged in as yagi_admin). Expected response:

```json
{
  "auth_configured": true,
  "token_refresh_ok": true,
  "last_checked_at": "2026-04-21T..."
}
```

If `token_refresh_ok: false` — check that:
1. `.env.local` has all 3 vars (CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN)
2. Calendar API is enabled on the Google Cloud project
3. Dev server was restarted after editing `.env.local` (Next.js caches env)

---

## Common failure modes

| Symptom | Cause | Fix |
|---------|-------|-----|
| "redirect_uri_mismatch" on consent screen | Typo in redirect URI | Exact string match required: `http://localhost:3003/api/auth/google/callback` |
| Token exchange returns no `refresh_token` | User previously consented without `prompt=consent` | Add `prompt=consent` to consent URL and re-run. Or revoke access at [myaccount.google.com/permissions](https://myaccount.google.com/permissions) and retry. |
| "This app isn't verified" warning blocks access | OAuth consent screen in Testing mode (expected) | Click **Advanced → Go to yagi-studio (unsafe)**. This is normal for internal-use apps. |
| 403 when calling Calendar API | Calendar API not enabled on project | Google Cloud Console → APIs & Services → Library → Enable "Google Calendar API" |
| Refresh token suddenly stops working (weeks later) | In Testing mode, Google rotates refresh tokens every 7 days if app isn't verified | Either (a) submit OAuth app for verification, or (b) re-run Step 3–5 every ~6 days. For Phase 1.3 MVP, option (b) is acceptable — document when token was issued. |

---

## Security notes

- **Never commit the refresh token to git.** It's a permanent credential.
- The refresh token grants calendar create/delete access to YAGI's account forever (until revoked).
- If leaked, revoke immediately at [myaccount.google.com/permissions](https://myaccount.google.com/permissions) and re-run this setup.
- The token should only ever live in `.env.local` (dev) or Vercel/hosting env vars (prod).
- Do NOT expose to client bundle — this is server-only. Phase 1.3 `src/lib/google/auth.ts` enforces this.

---

## When to redo this

- Refresh token revoked (manual or by Google's 7-day rotation in Testing mode)
- Client Secret rotated
- Switching to a different YAGI Google account
- App moved to a different Google Cloud project

---

**Done. Phase 1.3 can now use Google Calendar.**
