import { OAuth2Client } from 'google-auth-library'

let client: OAuth2Client | null = null

export function getGoogleClient(): OAuth2Client | null {
  const { GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN } = process.env
  if (!GOOGLE_OAUTH_CLIENT_ID || !GOOGLE_OAUTH_CLIENT_SECRET || !GOOGLE_OAUTH_REFRESH_TOKEN) {
    return null
  }
  if (!client) {
    client = new OAuth2Client(GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET)
    client.setCredentials({ refresh_token: GOOGLE_OAUTH_REFRESH_TOKEN })
  }
  return client
}

export async function getAccessToken(): Promise<string | null> {
  const c = getGoogleClient()
  if (!c) return null
  try {
    const { token } = await c.getAccessToken()
    return token ?? null
  } catch (e) {
    const err = e as { code?: string | number; status?: number; message?: string } | undefined
    console.error('[google] refresh token failed', {
      code: err?.code,
      status: err?.status,
      message: err?.message,
    })
    return null
  }
}
