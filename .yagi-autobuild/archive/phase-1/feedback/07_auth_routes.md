---
id: 07
name: Auth routes (signin, signup, callback)
evaluated_at: 2026-04-21
verdict: PASS
---

# Subtask 07 — Evaluator Feedback

## Verdict: PASS

## Checks performed

### 1. File existence
- [x] `src/app/[locale]/(auth)/layout.tsx` — exists (591 bytes)
- [x] `src/app/[locale]/(auth)/signin/page.tsx` — exists (2566 bytes)
- [x] `src/app/[locale]/(auth)/signup/page.tsx` — exists (2568 bytes)
- [x] `src/app/auth/callback/route.ts` — exists (1336 bytes)

### 2. Signin page imports
All required imports present:
- [x] `useForm` from `react-hook-form`
- [x] `zodResolver` from `@hookform/resolvers/zod`
- [x] `z` from `zod`
- [x] `toast` from `sonner`
- [x] `createSupabaseBrowser` from `@/lib/supabase/client`
- [x] `useTranslations` from `next-intl`

### 3. Signin calls `signInWithOtp` with correct `emailRedirectTo`
Confirmed — line 35-38 calls `supabase.auth.signInWithOtp` with
`options: { emailRedirectTo: \`${siteUrl}/auth/callback\` }` which points to the
callback route.

### 4. Callback route behavior
- [x] Reads `code` from query string (`searchParams.get("code")`)
- [x] Calls `exchangeCodeForSession(code)` (line 14)
- [x] Queries `profiles` table by `user.id` (`.from("profiles").select(...).eq("id", user.id)`)
- [x] Redirects to `/{locale}/onboarding` if no profile (line 39)
- [x] Redirects to `/{locale}/app` if profile exists (line 47)
- [x] Uses `createSupabaseServer` from `@/lib/supabase/server`

### 5. TypeScript check
`npx tsc --noEmit` — exit code 0, zero errors.

## Additional observations

- `layout.tsx` is correctly a server component (no `"use client"`).
- Signup page mirrors signin structure; footer link flips to `/signin` with `have_account` translation key.
- Callback also supports optional `next` query param for post-auth redirect target (bonus, spec-aligned).
- Route group `(auth)` correctly wraps signin + signup under shared layout without affecting URL.
- Callback route lives outside `[locale]` as specified.

## Result

All acceptance criteria met. Implementation matches spec verbatim.
