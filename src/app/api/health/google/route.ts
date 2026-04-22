import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { getGoogleClient, getAccessToken } from '@/lib/google/auth'

export async function GET() {
  const supabase = await createSupabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  // yagi_admin gate: check user_roles for role='yagi_admin' with workspace_id IS NULL
  const { data: roles } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .is('workspace_id', null)
    .eq('role', 'yagi_admin')
  if (!roles || roles.length === 0) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const auth_configured = getGoogleClient() !== null
  let token_refresh_ok = false
  if (auth_configured) {
    const token = await getAccessToken()
    token_refresh_ok = token !== null
  }

  return NextResponse.json({
    auth_configured,
    token_refresh_ok,
    last_checked_at: new Date().toISOString(),
  })
}
