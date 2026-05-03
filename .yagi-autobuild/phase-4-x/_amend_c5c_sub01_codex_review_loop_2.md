OpenAI Codex v0.125.0 (research preview)
--------
workdir: C:\Users\yout4\yagi-studio\yagi-workshop
model: gpt-5.5
provider: openai
approval: never
sandbox: danger-full-access
reasoning effort: high
reasoning summaries: none
session id: 019deda1-d0f3-7fc1-817b-9e35af14bdc4
--------
user
K-05 ADVERSARIAL CODE REVIEW — Wave C.5c sub_01 PKCE flow LOOP 2 (verify LOOP 1 fixes).

Repository root: C:/Users/yout4/yagi-studio/yagi-workshop

LOOP 1 (read .yagi-autobuild/phase-4-x/_amend_c5c_sub01_codex_review_loop_1.md) returned HIGH-A 0 / HIGH-B 2 / MED-A 3, recommending FIX. The five non-LOW findings:

- F1 (HIGH-B) — verifyOtp does not enforce PKCE code_verifier; passive GET still consumes OTP.
- F7 (HIGH-B) — Gmail crawler invariant broken (same root cause as F1).
- F2 (MED-A) — emailRedirectTo absolute URL silently rejected by sanitizeNext.
- F8 (MED-A) — signup sanitizeNext allowed too broad a `next` surface for Dashboard allowlist scoping.
- F9 (MED-A) — `/reset-password` allowed as generic `next` could land non-recovery confirms there.

All five addressed. Targets (current working tree, uncommitted):

  1. src/app/auth/confirm/route.ts — REWRITTEN. Now exports both GET and POST.
     - GET renders a static HTML page with a `<form method="POST">` carrying token_hash/type/next as hidden inputs. NO verifyOtp call on GET. A crawler GET sees only the HTML, no OTP consumption.
     - POST reads the form payload, calls verifyOtp, then redirects.
     - sanitizeNext rewritten to accept absolute same-origin URLs (parsed via `new URL(raw, origin)`); strips locale; strips query string for matching; recovery uses its own RECOVERY_NEXT allowlist.

  2. src/app/[locale]/(auth)/signup/page.tsx — sanitizeNext narrowed to a SIGNUP_NEXT_ALLOWLIST mirror of /auth/confirm's. Reject any `/auth/*` next.

PROCESS:
1. Read both updated files in full.
2. Re-evaluate F1, F2, F7, F8, F9 against the new code.
3. Look for NEW issues introduced by the rewrite:
   - Does the GET HTML page have CSRF / clickjacking risk?
   - The POST handler doesn't check Origin/Referer — is it vulnerable to a cross-origin form submit replaying a stolen token_hash from the user's own email?
   - The HTML escapeHtml — XSS if token_hash or next contains exotic characters?
   - The intermediate page is rendered at /auth/confirm with status 200; does the noindex meta tag suffice?
   - The form submits to `/auth/confirm` (same-origin) — fine, but what if the user is on `/ko/auth/confirm` somehow? Path is locale-free per middleware, so this can't happen.
   - F11 (LOOP 1): "@supabase/ssr already defaults both browser and server clients to PKCE" — does explicitly setting flowType break anything in the new POST + getUser sequence?

FOCUS AREAS for LOOP 2:
A. F1/F7 fix verification — does the GET-renders-form / POST-verifies pattern actually defeat the Gmail crawler? Confirm by tracing what a crawler GET sees vs what a user click does.
B. F2 fix verification — does sanitizeNext now correctly handle `https://site/onboarding/workspace` as input?
C. F8 fix verification — signup SIGNUP_NEXT_ALLOWLIST aligns with /auth/confirm.
D. F9 fix verification — /reset-password only reachable via type=recovery branch.
E. CSRF on POST — does the absence of Origin/Referer / CSRF token check matter when the only knowledge being exploited (token_hash from email) is itself the auth credential?
F. XSS through hidden form values — escapeHtml correct?
G. Open-redirect through the new sanitizeNext URL parser.
H. Cookie persistence: signUp() (browser PKCE) sets verifier cookie. The server-side verifyOtp in POST reads cookies via createSupabaseServer (next/headers). Same browser session → cookie present → verify succeeds. Crawler POST scenario: would never have the verifier cookie and would have to know the token_hash — only possible if it observed the email + can replay against /auth/confirm. Mitigation?
I. The recovery flow specifically — under PKCE, when the user clicks the password-reset email link, /auth/confirm GET renders the page, user clicks Continue, POST verifyOtp succeeds, profile.locale resolved, redirect to /reset-password. Verify the reset-password page itself reads the session and prompts for new password.
J. Accessibility / locale of the intermediate HTML — only Korean copy + lang=ko. Acceptable for a 1-second click-through, but flag.

Severity scale: HIGH-A | HIGH-B | HIGH-C | MED-A | MED-B | MED-C | LOW.

Output format (markdown), one section per LOOP 1 finding (with FIXED / RESIDUAL verdict) + one section per NEW finding.

End with a 'Verdict' line summarising HIGH-A / HIGH-B / MED-A counts and recommending APPLY / FIX / HALT.

Read-only review only. Do NOT modify files.

codex
I’ll do this as a read-only review. I’m going to inspect the Loop 1 notes and the two target files first, then trace the PKCE/cookie and redirect behavior from the actual code.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -Raw 'src/app/[locale]/(auth)/signup/page.tsx'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'Get-Content -Raw .yagi-autobuild/phase-4-x/_amend_c5c_sub01_codex_review_loop_1.md' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'Get-Content -Raw src/app/auth/confirm/route.ts' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 414ms:
OpenAI Codex v0.125.0 (research preview)
--------
workdir: C:\Users\yout4\yagi-studio\yagi-workshop
model: gpt-5.5
provider: openai
approval: never
sandbox: danger-full-access
reasoning effort: high
reasoning summaries: none
session id: 019ded9b-095b-7a70-b337-7fed37dd106d
--------
user
K-05 ADVERSARIAL CODE REVIEW ??Wave C.5c sub_01 PKCE flow.

Repository root: C:/Users/yout4/yagi-studio/yagi-workshop

Targets (uncommitted working tree):
  1. src/lib/supabase/client.ts                ??flowType: 'pkce' on browser client
  2. src/lib/supabase/server.ts                ??flowType: 'pkce' on server client
  3. src/lib/supabase/middleware.ts            ??flowType: 'pkce' on middleware client
  4. src/app/auth/confirm/route.ts             ??NEW intermediate verifyOtp endpoint
  5. src/middleware.ts                         ??added auth/confirm to negative-lookahead
  6. src/app/[locale]/(auth)/signup/page.tsx   ??emailRedirectTo flipped to final destination + sanitizeNext rejects /auth/confirm
  7. src/app/[locale]/(auth)/forgot-password/page.tsx ??resetPasswordForEmail redirectTo flipped
  8. src/app/[locale]/auth/expired/page.tsx    ??resend emailRedirectTo flipped
  9. src/app/[locale]/auth/verify/page.tsx     ??resend emailRedirectTo flipped
  10. src/app/auth/callback/route.ts           ??UNCHANGED; legacy OAuth-code-flow handler kept

Background: Gmail / Outlook / corporate-mail link-preview crawlers GET email-confirm URLs before users can click them. Under the legacy `?code=...` callback, that GET single-use-consumed the OTP; real user clicks then landed on /auth/expired. PKCE moves the consume into an explicit verifyOtp() call inside our /auth/confirm route handler, gated by the code_verifier cookie that signUp() stores in the user's specific browser. A passive crawler GET fails harmlessly because it has no code_verifier cookie.

Email-template change is a yagi MANUAL action in the Supabase Dashboard (tracked as FU-C5c-01); the link must change to:
    {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next={{ .RedirectTo }}
Same change for Magic Link + Reset Password templates. Without that paste, the email body still uses the old /auth/callback?code= URL and PKCE has zero effect.

PROCESS:
1. Read each target file in full (uncommitted working tree).
2. Read the existing `src/app/auth/callback/route.ts` (unchanged) and reason about whether keeping it alive alongside /auth/confirm causes any conflict or false-positive expired bounces.
3. Audit the next-param sanitisation in /auth/confirm: NEXT_ALLOWLIST_PREFIXES + sanitizeNext.
4. Audit the verifyOtp error path: does it correctly map all expired/invalid/consumed/missing-code-verifier failures to /auth/expired without leaking the supabase error.message into the URL?
5. Audit the locale resolution path inside /auth/confirm ??profile lookup, default ko, recovery branch.
6. Verify the SSR cookie chain: createServerClient called in a Route Handler -> next/headers cookies() is mutable -> verifyOtp's setAll writes the auth-token cookies -> NextResponse.redirect carries them.
7. Verify middleware exclusion is right (auth/confirm is locale-free, like auth/callback).

FOCUS AREAS (each must be a separate finding with explicit verdict):
A. PKCE compliance ??token_hash + type alone enough? (Supabase verifyOtp signature)
B. `next` param open-redirect vector through allowlist + locale strip + re-prefix logic.
C. SSR code_verifier cookie persistence ??does the browser-side signUp() set the cookie that the server-side /auth/confirm verifyOtp reads? Cookie scope (path / domain) correct?
D. Coexistence with /auth/callback ??does the legacy OAuth-code-flow handler interfere with the PKCE link path?
E. verifyOtp error branches ??single bounce to /auth/expired sufficient? Any error class that should land elsewhere (e.g., structurally invalid token vs expired)?
F. Gmail crawler invariant ??under PKCE, does a crawler GET truly fail? Are we relying on cookie scope or something else?
G. emailRedirectTo allowlist surface ??what URLs must yagi add to the Supabase Dashboard "Redirect URLs" config for this to work?
H. Open-redirect through `next` after locale strip ??could a hostile email author craft `next=//evil.com` or `next=/api/...` to leak post-confirm?
I. Recovery flow ??`if (type === "recovery")` always wins over the next param. Is that correct? What if a user crafts `?type=signup&next=/reset-password`?
J. Forgot-password page redirectTo flip ??does the new `${siteUrl}/reset-password` value work with the dashboard's Recovery email template `{{ .RedirectTo }}` placeholder?
K. flowType: 'pkce' in the middleware client ??does adding flowType to the middleware-only updateSupabaseSession cause any session-refresh regression?
L. Race / state ??any window where the cookie is set but not yet readable by the redirect target?

Severity scale: HIGH-A (security-critical) | HIGH-B (high-impact bug) | HIGH-C (non-auto) | MED-A (defense-in-depth, auto) | MED-B (defer) | MED-C (non-auto) | LOW.

Output format (markdown), one section per finding:

## Finding F<N> ??<short title>
- Severity: <level>
- Surface: <file:lines or sql snippet>
- Verdict: <clear>
- Reasoning: <2-4 sentences>
- Proposed fix: <patch sketch> OR 'no fix needed' with rationale

End with a 'Verdict' line summarising HIGH-A / HIGH-B / MED-A counts and recommending APPLY / FIX / HALT.

Read-only review only. Do NOT modify files.

codex
I?셪l do this as a read-only adversarial review. I?셫 going to inspect the target files and relevant line numbers first, then cross-check the Supabase PKCE API behavior against the code paths rather than assuming the implementation details.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -Raw -LiteralPath 'src/lib/supabase/server.ts'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -Raw -LiteralPath 'src/lib/supabase/client.ts'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -Raw -LiteralPath 'src/lib/supabase/middleware.ts'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -Raw -LiteralPath 'src/app/auth/confirm/route.ts'" in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 377ms:
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/database.types";

// Phase 4.x Wave C.5c sub_01 ??PKCE flow.
// Why: Gmail / Outlook link-preview crawlers GET the email confirm URL
// before the user can click it, single-use-consuming the OTP and
// landing the real click on /auth/expired. PKCE moves the consume to
// an explicit verifyOtp() call inside our /auth/confirm route handler,
// so a passive crawler GET no longer drains the token.
//
// flowType = 'pkce' on the BROWSER client is what makes signUp() /
// resetPasswordForEmail() store a code_verifier locally that the
// matching /auth/confirm verify call needs.
export function createSupabaseBrowser() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { flowType: "pkce" },
    },
  );
}


 succeeded in 377ms:
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/supabase/database.types";

export async function createSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Phase 4.x Wave C.5c sub_01 ??PKCE flow. Mirrors client.ts so
      // /auth/confirm's verifyOtp call finds the matching code_verifier
      // cookie set by signUp() at signup time. See client.ts for the
      // Gmail-crawler rationale.
      auth: { flowType: "pkce" },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component (read-only cookies) ??ignore.
          }
        },
      },
    }
  );
}


 succeeded in 350ms:
import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import type { Database } from "@/lib/supabase/database.types";

export async function updateSupabaseSession(
  request: NextRequest,
  response: NextResponse
): Promise<NextResponse> {
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Phase 4.x Wave C.5c sub_01 ??PKCE flow parity with server.ts /
      // client.ts. Middleware reads/writes the same auth cookies; if the
      // flowType differs across clients, code_verifier handling drifts.
      auth: { flowType: "pkce" },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  await supabase.auth.getUser();
  return response;
}


 succeeded in 770ms:
import { type EmailOtpType } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

// Phase 4.x Wave C.5c sub_01 ??PKCE intermediate confirm endpoint.
//
// Replaces the implicit-flow / OAuth-code-flow `/auth/callback` for the
// email-link path (signup confirm, magic link, password recovery).
//
// Why an intermediate route at all:
// - Gmail / Outlook / corporate-mail link-preview crawlers GET the
//   email link before the user can click it. Under the legacy
//   `?code=...` flow, that GET single-use-consumed the OTP; the real
//   user click then landed on `/auth/expired`.
// - Under PKCE, the email-template link uses `?token_hash=...&type=...`.
//   A passive GET against this route still tries to verifyOtp, but
//   without the `code_verifier` cookie that signUp() stored on the
//   user's *browser*, the verify call fails harmlessly. Only the
//   user's actual click ??from the same browser that initiated
//   signup ??carries the cookie and consumes the OTP.
//
// Email template rewrite required (Supabase Dashboard ??Authentication
// ??Email Templates ??Confirm signup): the `{{ .ConfirmationURL }}`
// pattern must change to a hard-coded path:
//   <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next={{ .RedirectTo }}">
// Same change for Magic Link + Reset Password templates. Tracked in
// FU-C5c-01 as a yagi manual action.

// `next` allowlist ??open-redirect defense. Any caller-supplied `next`
// must match one of these prefixes; anything else falls back to
// `/onboarding/workspace`. Suffix matching is intentional: a future
// `/app/projects/abc-123` is allowed because it starts with `/app/`,
// but `//evil.com` (protocol-relative) and absolute URLs are rejected.
const NEXT_ALLOWLIST_PREFIXES: readonly string[] = [
  "/onboarding/workspace",
  "/onboarding/brand",
  "/onboarding/invite",
  "/app",
  "/auth/expired",
  "/reset-password",
];
const DEFAULT_NEXT = "/onboarding/workspace";

function sanitizeNext(raw: string | null): string {
  if (!raw) return DEFAULT_NEXT;
  if (!raw.startsWith("/")) return DEFAULT_NEXT;
  if (raw.startsWith("//")) return DEFAULT_NEXT;
  if (raw.length > 500) return DEFAULT_NEXT;
  // Strip any leading locale prefix (e.g. `/ko/app/...` -> `/app/...`)
  // before allowlist match ??we re-prefix with the user's locale below.
  const stripped = raw.replace(/^\/(ko|en)(?=\/|$)/, "");
  const candidate = stripped.length === 0 ? DEFAULT_NEXT : stripped;
  for (const prefix of NEXT_ALLOWLIST_PREFIXES) {
    if (candidate === prefix || candidate.startsWith(`${prefix}/`)) {
      return candidate;
    }
  }
  return DEFAULT_NEXT;
}

const SUPPORTED_OTP_TYPES: readonly EmailOtpType[] = [
  "signup",
  "email",
  "recovery",
  "magiclink",
  "invite",
  "email_change",
];
function isOtpType(value: string | null): value is EmailOtpType {
  return value !== null && (SUPPORTED_OTP_TYPES as readonly string[]).includes(value);
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = sanitizeNext(searchParams.get("next"));

  if (!tokenHash || !isOtpType(type)) {
    // No payload (or unrecognised type) ??passive GET / malformed link.
    // Bounce to /signin without consuming anything.
    return NextResponse.redirect(`${origin}/ko/signin?error=missing_token_hash`);
  }

  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

  if (error) {
    // verifyOtp failure modes: expired / invalid / consumed / missing
    // code_verifier (the Gmail-crawler GET path). All map to the
    // user-facing "link expired, request a new one" surface.
    return NextResponse.redirect(`${origin}/ko/auth/expired`);
  }

  // Resolve locale from the now-authenticated profile so the redirect
  // lands the user on their preferred locale prefix.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/ko/signin?error=no_user`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("locale")
    .eq("id", user.id)
    .maybeSingle();
  const locale = profile?.locale === "en" ? "en" : "ko";

  // Password recovery skips the workspace gate.
  if (type === "recovery") {
    return NextResponse.redirect(`${origin}/${locale}/reset-password`);
  }

  return NextResponse.redirect(`${origin}/${locale}${next}`);
}


codex
I?셶e read the core Supabase helpers and the new confirm route. Next I?셫 reading the locale pages, root middleware, and the legacy callback so I can evaluate redirect construction, coexistence, and middleware matching with exact surfaces.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -Raw -LiteralPath 'src/middleware.ts'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -Raw -LiteralPath 'src/app/[locale]/(auth)/signup/page.tsx'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -Raw -LiteralPath 'src/app/[locale]/(auth)/forgot-password/page.tsx'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -Raw -LiteralPath 'src/app/[locale]/auth/expired/page.tsx'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -Raw -LiteralPath 'src/app/[locale]/auth/verify/page.tsx'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -Raw -LiteralPath 'src/app/auth/callback/route.ts'" in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 377ms:
import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "@/i18n/routing";
import { updateSupabaseSession } from "@/lib/supabase/middleware";

const intlMiddleware = createMiddleware(routing);

// Phase 4.x task_05 ??/app/commission/* -> /app/projects redirect.
// Phase 2.x leftover surface; Phase 4 funnels all client intake through
// /app/projects. Open-redirect protection: we drop ALL query params
// (specifically `?next=https://evil.com` is ignored) and target a
// fixed in-app path.
//
// Matches both locale-prefixed and locale-free forms; the locale-free
// case targets the routing default locale.
const COMMISSION_WITH_LOCALE = /^\/(ko|en)\/app\/commission(?:\/.*)?$/;
const COMMISSION_NO_LOCALE = /^\/app\/commission(?:\/.*)?$/;

function maybeRedirectCommission(request: NextRequest): NextResponse | null {
  const path = request.nextUrl.pathname;
  const localedMatch = path.match(COMMISSION_WITH_LOCALE);
  if (localedMatch) {
    const locale = localedMatch[1];
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/app/projects`;
    url.search = "";
    return NextResponse.redirect(url, 308);
  }
  if (COMMISSION_NO_LOCALE.test(path)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${routing.defaultLocale}/app/projects`;
    url.search = "";
    return NextResponse.redirect(url, 308);
  }
  return null;
}

export default async function middleware(request: NextRequest) {
  const commissionRedirect = maybeRedirectCommission(request);
  if (commissionRedirect) return commissionRedirect;

  const response = intlMiddleware(request);
  return updateSupabaseSession(request, response);
}

export const config = {
  matcher: [
    // Skip: Next.js internals, Vercel internals, API, auth callback, locale-free
    // public surfaces (showcase, challenges), static files.
    //
    // Phase 2.1 G6 #5/#6 ??added `showcase` and `challenges` to the negative
    // lookahead so the locale-free public routes at src/app/showcase/[slug]/
    // and src/app/challenges/ (Phase 2.5) are NOT prefixed with a locale by
    // next-intl. Previously `/showcase/<slug>` was being redirected to
    // `/{defaultLocale}/showcase/<slug>` which matched no route, falling
    // back to Next's default 404 and making the custom not-found.tsx
    // unreachable (and the Phase 2.0 G6 L5 html/body shell fix inert).
    // Phase 4.x Wave C.5b sub_02 ??`u` removed (creator handle profile
    // tree at /u/<handle> is gone). Keeping it in the exclude was a
    // forward-leak from the deleted Phase 2.5 surface.
    // Phase 4.x Wave C.5c sub_01 ??`auth/confirm` added (PKCE
    // intermediate verify endpoint; same locale-free shape as
    // auth/callback).
    "/((?!api|_next|_vercel|auth/callback|auth/confirm|showcase|challenges|.*\\..*).*)",
  ],
};


 succeeded in 403ms:
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useRouter } from "@/i18n/routing";
import { createSupabaseBrowser } from "@/lib/supabase/client";

// Phase 2.8.1 G_B1-H (F-PUX-003): commission flow uses `?next=` to bring
// the user back to /app/commission/new after the email-confirm round-trip.
// We accept any same-origin path that starts with `/` and is not the auth
// confirm endpoint itself (avoids the trivial loop). Cross-origin URLs
// are rejected outright so a malicious caller can't bounce the user off
// the platform.
function sanitizeNext(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/")) return null;
  if (raw.startsWith("//")) return null; // protocol-relative
  if (raw.startsWith("/auth/callback")) return null;
  if (raw.startsWith("/auth/confirm")) return null;
  if (raw.length > 500) return null;
  return raw;
}

const schema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8),
    passwordConfirm: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    path: ["passwordConfirm"],
    message: "password_mismatch",
  });

type FormValues = z.infer<typeof schema>;

export default function SignUpPage() {
  const t = useTranslations("auth");
  const c = useTranslations("common");
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = sanitizeNext(searchParams.get("next"));
  const [submitting, setSubmitting] = useState(false);
  const [sentToEmail, setSentToEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  // Phase 4.x Wave C.5c sub_01 ??Under PKCE, the actual email-link path
  // is hard-coded in the Supabase Dashboard email template
  // (`{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&...`).
  // `emailRedirectTo` becomes the FINAL destination after verifyOtp
  // succeeds, embedded as `?next=` inside that template URL via the
  // `{{ .RedirectTo }}` template variable. So this URL is the
  // post-confirm landing, NOT the click target.
  function buildEmailRedirect(siteUrl: string): string {
    const base = `${siteUrl}/onboarding/workspace`;
    return next ? `${siteUrl}${next}` : base;
  }

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    const supabase = createSupabaseBrowser();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    const { error, data } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: { emailRedirectTo: buildEmailRedirect(siteUrl) },
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data.session) {
      // Email confirmation disabled in Supabase auth settings ??auto-login path.
      // Honor `next` here too so the in-product redirect mirrors the
      // email-confirm path.
      // Phase 4.x Wave C.5b sub_01: persona A ??direct to workspace creation.
      router.push((next ?? "/onboarding/workspace") as "/onboarding/workspace");
    } else {
      // Email confirmation enabled ??switch the page over to the sent-state view
      // instead of leaving the user on the form with only a toast.
      setSentToEmail(values.email);
    }
  }

  async function onResend() {
    if (!sentToEmail) return;
    setResending(true);
    const supabase = createSupabaseBrowser();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: sentToEmail,
      options: { emailRedirectTo: buildEmailRedirect(siteUrl) },
    });
    setResending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("signup_email_sent"));
  }

  // ---- Sent state ??shown after successful signUp() when email confirmation
  // is required by the project. The user stays on this view and follows the
  // mailbox link. This replaces the "toast-only and the form stays put"
  // behavior that read as a dead-end.
  // Phase 4.x Wave C.5b sub_07 ??verify-email screen on the v1.0 dark
  // editorial foundation. Headline + subtitle land on the editorial type
  // scale; the recipient block is a card-deep / border-subtle surface;
  // primary CTA is the sage "resend" beat, secondary is a calm ghost
  // button to switch addresses.
  if (sentToEmail) {
    return (
      <div className="space-y-8">
        <div className="space-y-3 text-center">
          <h1 className="font-display text-3xl tracking-tight keep-all">
            {t("check_your_email_title")}
          </h1>
          <p className="text-base ink-secondary leading-body keep-all">
            {t("check_your_email_sub")}
          </p>
        </div>

        <div className="rounded-card bg-card-deep border-subtle border p-6 text-sm space-y-4">
          <p className="ink-primary">
            <span className="ink-tertiary">{t("sent_to_label")}: </span>
            <span className="font-medium break-all">{sentToEmail}</span>
          </p>
          <ul className="text-sm ink-secondary space-y-2 leading-body">
            <li className="flex gap-2 keep-all">
              <span className="ink-tertiary">夷?/span>
              <span>{t("check_email_hint_inbox")}</span>
            </li>
            <li className="flex gap-2 keep-all">
              <span className="ink-tertiary">夷?/span>
              <span>{t("check_email_hint_spam")}</span>
            </li>
            <li className="flex gap-2 keep-all">
              <span className="ink-tertiary">夷?/span>
              <span>{t("check_email_hint_link")}</span>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <Button
            type="button"
            className="w-full bg-sage hover:brightness-105"
            size="lg"
            onClick={onResend}
            disabled={resending}
          >
            {resending ? t("sending") : t("resend_email")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            size="lg"
            onClick={() => setSentToEmail(null)}
          >
            {t("use_different_email")}
          </Button>
        </div>

        <p className="text-center text-sm ink-tertiary">
          {t("have_account")}{" "}
          <Link href="/signin" className="ink-primary hover:accent-sage transition-colors">
            {c("signin")}
          </Link>
        </p>
      </div>
    );
  }

  // ---- Default state ??signup form.
  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="font-display text-3xl tracking-tight">
          {t("signup_title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("signup_sub")}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">{t("email")}</Label>
          <Input
            id="email"
            type="email"
            placeholder={t("email_placeholder")}
            autoComplete="email"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">{t("password_label")}</Label>
          <Input
            id="password"
            type="password"
            placeholder={t("password_ph")}
            autoComplete="new-password"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="passwordConfirm">{t("password_confirm_label")}</Label>
          <Input
            id="passwordConfirm"
            type="password"
            autoComplete="new-password"
            {...register("passwordConfirm")}
          />
          {errors.passwordConfirm && (
            <p className="text-xs text-destructive">
              {errors.passwordConfirm.message === "password_mismatch"
                ? t("password_mismatch")
                : errors.passwordConfirm.message}
            </p>
          )}
        </div>
        <Button type="submit" className="w-full" size="lg" disabled={submitting}>
          {submitting ? t("sending") : c("signup")}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {t("have_account")}{" "}
        <Link href="/signin" className="text-foreground hover:underline">
          {c("signin")}
        </Link>
      </p>
    </div>
  );
}


 succeeded in 382ms:
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "@/i18n/routing";
import { createSupabaseBrowser } from "@/lib/supabase/client";

const schema = z.object({
  email: z.string().email(),
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const t = useTranslations("auth");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    const supabase = createSupabaseBrowser();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    // Phase 4.x Wave C.5c sub_01 ??PKCE: redirectTo is the FINAL
    // destination after verifyOtp succeeds at /auth/confirm. The
    // email link itself is hard-coded in the Supabase Dashboard
    // recovery template to /auth/confirm?type=recovery&...
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${siteUrl}/reset-password`,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
    toast.success(t("reset_link_sent"));
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="font-display text-3xl tracking-tight">
          {t("reset_password_title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("reset_password_sub")}</p>
      </div>

      {sent ? (
        <div className="rounded-lg border border-border bg-muted/40 px-5 py-4 text-sm">
          {t("reset_link_sent")}
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t("email")}</Label>
            <Input
              id="email"
              type="email"
              placeholder={t("email_placeholder")}
              autoComplete="email"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full" size="lg" disabled={submitting}>
            {submitting ? t("sending") : t("send_link")}
          </Button>
        </form>
      )}

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/signin" className="text-foreground hover:underline">
          {t("back_to_signin")}
        </Link>
      </p>
    </div>
  );
}


 succeeded in 400ms:
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "@/i18n/routing";
import { createSupabaseBrowser } from "@/lib/supabase/client";

// Phase 4.x Wave C.5b sub_04 ??dedicated landing for expired-OTP /
// expired-link auth callbacks. The callback route detects the expiry
// and bounces here with `?email=<address>` (when the original signup
// email is recoverable) so the resend flow doesn't ask the user to
// retype it. The form falls back to a free email input otherwise.

const schema = z.object({
  email: z.string().email(),
});

type FormValues = z.infer<typeof schema>;

export default function AuthExpiredPage() {
  const t = useTranslations("auth");
  const params = useSearchParams();
  const presetEmail = params.get("email") ?? "";
  const [resending, setResending] = useState(false);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: presetEmail },
  });

  async function onResend(values: FormValues) {
    setResending(true);
    const supabase = createSupabaseBrowser();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: values.email,
      // Phase 4.x Wave C.5c sub_01 ??PKCE: emailRedirectTo is the FINAL
      // post-verify landing; the email link itself is the dashboard's
      // /auth/confirm template URL.
      options: { emailRedirectTo: `${siteUrl}/onboarding/workspace` },
    });
    setResending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
    toast.success(t("expired_resend_success"));
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3 text-center">
        <h1 className="font-display text-3xl tracking-tight keep-all">
          {t("expired_headline")}
        </h1>
        <p className="text-sm text-muted-foreground keep-all">
          {t("expired_subtitle")}
        </p>
      </div>

      {!sent ? (
        <form onSubmit={handleSubmit(onResend)} className="space-y-4">
          <p className="text-xs text-muted-foreground keep-all">
            {t("expired_resend_hint")}
          </p>
          <div className="space-y-2">
            <Label htmlFor="email">{t("expired_resend_email_label")}</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder={t("email_placeholder")}
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={resending}>
            {resending ? t("sending") : t("expired_resend_send")}
          </Button>
        </form>
      ) : (
        <div className="rounded-card bg-card-deep border-subtle border px-5 py-4 text-sm">
          <p className="ink-secondary keep-all">{t("expired_resend_success")}</p>
        </div>
      )}

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/signin" className="text-foreground hover:underline">
          {t("expired_back_to_signin")}
        </Link>
      </p>
    </div>
  );
}


 succeeded in 406ms:
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { createSupabaseBrowser } from "@/lib/supabase/client";

// Phase 4.x Wave C.5b sub_07 ??standalone "check your email" landing.
// The post-signup path renders an inline version of this content from
// inside (auth)/signup/page.tsx (after a successful signUp() that
// requires email confirmation). This /auth/verify route is the same
// surface accessible via a direct URL ??used when the user closes
// the signup tab and later wants the recipient view back, or when
// a future email-flow lands them here directly with ?email=<addr>.

export default function AuthVerifyPage() {
  const t = useTranslations("auth");
  const c = useTranslations("common");
  const params = useSearchParams();
  const presetEmail = params.get("email") ?? "";
  const [resending, setResending] = useState(false);

  async function onResend() {
    if (!presetEmail) {
      toast.error(t("email_placeholder"));
      return;
    }
    setResending(true);
    const supabase = createSupabaseBrowser();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: presetEmail,
      // Phase 4.x Wave C.5c sub_01 ??PKCE: emailRedirectTo is the FINAL
      // post-verify landing; email link itself is the dashboard's
      // /auth/confirm template URL.
      options: { emailRedirectTo: `${siteUrl}/onboarding/workspace` },
    });
    setResending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("signup_email_sent"));
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3 text-center">
        <h1 className="font-display text-3xl tracking-tight keep-all">
          {t("check_your_email_title")}
        </h1>
        <p className="text-base ink-secondary leading-body keep-all">
          {t("check_your_email_sub")}
        </p>
      </div>

      {presetEmail && (
        <div className="rounded-card bg-card-deep border-subtle border p-6 text-sm space-y-4">
          <p className="ink-primary">
            <span className="ink-tertiary">{t("sent_to_label")}: </span>
            <span className="font-medium break-all">{presetEmail}</span>
          </p>
          <ul className="text-sm ink-secondary space-y-2 leading-body">
            <li className="flex gap-2 keep-all">
              <span className="ink-tertiary">夷?/span>
              <span>{t("check_email_hint_inbox")}</span>
            </li>
            <li className="flex gap-2 keep-all">
              <span className="ink-tertiary">夷?/span>
              <span>{t("check_email_hint_spam")}</span>
            </li>
            <li className="flex gap-2 keep-all">
              <span className="ink-tertiary">夷?/span>
              <span>{t("check_email_hint_link")}</span>
            </li>
          </ul>
        </div>
      )}

      <div className="space-y-3">
        {presetEmail && (
          <Button
            type="button"
            className="w-full bg-sage hover:brightness-105"
            size="lg"
            onClick={onResend}
            disabled={resending}
          >
            {resending ? t("sending") : t("resend_email")}
          </Button>
        )}
        <Button asChild type="button" variant="ghost" className="w-full" size="lg">
          <Link href="/signin">{c("signin")}</Link>
        </Button>
      </div>

      <p className="text-center text-sm ink-tertiary">
        {t("no_account")}{" "}
        <Link href="/signup" className="ink-primary hover:accent-sage transition-colors">
          {c("signup")}
        </Link>
      </p>
    </div>
  );
}


 succeeded in 412ms:
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

// Phase 4.x Wave C.5b sub_04 ??expired-OTP detection. Supabase reports
// expiry via either the `error_description` query param on the redirect
// (PKCE error path) or as `exchangeCodeForSession` failure with a
// message containing one of these markers.
const EXPIRY_MARKERS = ["otp_expired", "otp expired", "code expired", "expired", "invalid_grant"];
function isExpiryError(message: string): boolean {
  const lower = message.toLowerCase();
  return EXPIRY_MARKERS.some((marker) => lower.includes(marker));
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const type = searchParams.get("type");
  const errorParam = searchParams.get("error");
  const errorCodeParam = searchParams.get("error_code");
  const errorDescParam = searchParams.get("error_description");

  // Supabase Auth redirects expired/invalid links here with the failure
  // surfaced as query params instead of a `code`. Bounce to /auth/expired
  // before doing any other work.
  if (errorParam || errorCodeParam) {
    const blob = `${errorParam ?? ""} ${errorCodeParam ?? ""} ${errorDescParam ?? ""}`;
    if (isExpiryError(blob)) {
      return NextResponse.redirect(`${origin}/ko/auth/expired`);
    }
    return NextResponse.redirect(
      `${origin}/ko/signin?error=${encodeURIComponent(errorDescParam ?? errorCodeParam ?? errorParam ?? "auth_failed")}`,
    );
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/ko/signin?error=missing_code`);
  }

  const supabase = await createSupabaseServer();
  // Phase 4.x Wave C.5b sub_05 ??exchangeCodeForSession persists the
  // authenticated session via the @supabase/ssr cookie adapter wired in
  // createSupabaseServer (server.ts setAll ??cookieStore.set). Inside a
  // Route Handler, next/headers cookies() is mutable, so those Set-Cookie
  // entries land on the eventual NextResponse.redirect below ??meaning
  // the user arrives at /onboarding/workspace already authenticated.
  // No follow-up signIn() / refresh() call is required.
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    if (isExpiryError(exchangeError.message)) {
      return NextResponse.redirect(`${origin}/ko/auth/expired`);
    }
    return NextResponse.redirect(
      `${origin}/ko/signin?error=${encodeURIComponent(exchangeError.message)}`
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/ko/signin?error=no_user`);
  }

  // Phase 4.x Wave C.5b amend_01 LOOP 1 fix (Codex F12): the
  // handle_new_user DB trigger now guarantees a profiles row materialises
  // in the same transaction as auth.users INSERT, so `!profile` is no
  // longer the right onboarding gate. Use workspace membership + global
  // role instead ??the actual constraint that decides whether the user
  // can land on /app surfaces.
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, locale")
    .eq("id", user.id)
    .maybeSingle();

  const locale = profile?.locale ?? "ko";

  // Password recovery flow: send to reset-password regardless of state.
  if (type === "recovery") {
    return NextResponse.redirect(`${origin}/${locale}/reset-password`);
  }

  // Phase 2.8.1 G_B1-H (F-PUX-003): preserve the commission intent across
  // the entire signup ??confirm ??onboarding chain.
  const safeNext =
    next && next.startsWith("/") && !next.startsWith("//")
      ? next
      : null;

  const { count: workspaceMembershipCount } = await supabase
    .from("workspace_members")
    .select("workspace_id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const { data: globalRoles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .is("workspace_id", null)
    .in("role", ["creator", "yagi_admin"]);

  const hasWorkspace = (workspaceMembershipCount ?? 0) > 0;
  const hasGlobalRole = (globalRoles?.length ?? 0) > 0;

  if (!hasWorkspace && !hasGlobalRole) {
    const onboardingUrl = safeNext
      ? `${origin}/${locale}/onboarding/workspace?next=${encodeURIComponent(safeNext)}`
      : `${origin}/${locale}/onboarding/workspace`;
    return NextResponse.redirect(onboardingUrl);
  }

  if (safeNext) {
    return NextResponse.redirect(`${origin}${safeNext}`);
  }

  return NextResponse.redirect(`${origin}/${locale}/app`);
}


codex
The first pass shows the confirm route is self-contained and middleware excludes it as intended. I?셫 now checking package versions and Supabase SSR internals locally so the PKCE and cookie-chain conclusions are grounded in the installed code, not just comments.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -Raw -LiteralPath 'package.json'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'rg -n "flowType|code_verifier|verifyOtp|exchangeCodeForSession|storage" node_modules/@supabase -S' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src/app/auth/confirm/route.ts' | ForEach-Object { "'$i++; '"'{0,4}: {1}' -f "'$i, $_ }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src/middleware.ts' | ForEach-Object { "'$i++; '"'{0,4}: {1}' -f "'$i, $_ }' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 319ms:
{
  "name": "yagi-workshop",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3003",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "lint:rsc-form-action": "node scripts/test-rsc-form-action-rule.mjs",
    "check:rsc-form-action": "bash scripts/check-rsc-form-action.sh",
    "verify:rsc-form-action": "pnpm check:rsc-form-action && pnpm lint:rsc-form-action",
    "test:ssrf-defense": "node scripts/test-ssrf-defense.mjs",
    "test:saveversion-race": "node scripts/test-saveversion-race.mjs",
    "test:r2-brief-asset": "node scripts/test-r2-brief-asset.mjs",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "prepare": "husky"
  },
  "dependencies": {
    "@aws-sdk/client-s3": "^3.1035.0",
    "@aws-sdk/s3-request-presigner": "^3.1035.0",
    "@base-ui/react": "^1.4.1",
    "@dnd-kit/core": "^6.3.1",
    "@dnd-kit/sortable": "^10.0.0",
    "@hookform/resolvers": "^5.2.2",
    "@radix-ui/react-alert-dialog": "^1.1.15",
    "@radix-ui/react-avatar": "^1.1.11",
    "@radix-ui/react-checkbox": "^1.3.3",
    "@radix-ui/react-dialog": "^1.1.15",
    "@radix-ui/react-dropdown-menu": "^2.1.16",
    "@radix-ui/react-label": "^2.1.8",
    "@radix-ui/react-popover": "^1.1.15",
    "@radix-ui/react-radio-group": "^1.3.8",
    "@radix-ui/react-scroll-area": "^1.2.10",
    "@radix-ui/react-select": "^2.2.6",
    "@radix-ui/react-separator": "^1.1.8",
    "@radix-ui/react-slot": "^1.2.4",
    "@radix-ui/react-switch": "^1.2.6",
    "@radix-ui/react-tabs": "^1.1.13",
    "@radix-ui/react-tooltip": "^1.2.8",
    "@react-email/components": "^1.0.12",
    "@react-email/render": "^2.0.7",
    "@supabase/ssr": "^0.10.2",
    "@supabase/supabase-js": "^2.104.0",
    "@tanstack/react-query": "^5.99.2",
    "@tanstack/react-query-devtools": "^5.99.2",
    "@tiptap/core": "3.22.4",
    "@tiptap/pm": "3.22.4",
    "@tiptap/react": "3.22.4",
    "@tiptap/starter-kit": "3.22.4",
    "@tiptap/suggestion": "3.22.4",
    "@tldraw/tldraw": "^4.5.10",
    "@vercel/og": "^0.11.1",
    "bcryptjs": "^3.0.3",
    "cheerio": "1.2.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "cmdk": "^1.1.1",
    "date-fns": "^4.1.0",
    "framer-motion": "^12.38.0",
    "google-auth-library": "^10.6.2",
    "lucide-react": "^1.8.0",
    "next": "15.5.0",
    "next-intl": "^4.9.1",
    "next-themes": "^0.4.6",
    "pdfjs-dist": "^5.6.205",
    "react": "19.1.0",
    "react-day-picker": "^9.14.0",
    "react-dom": "19.1.0",
    "react-dropzone": "^15.0.0",
    "react-hook-form": "^7.73.1",
    "react-image-crop": "^11.0.10",
    "react-markdown": "^10.1.0",
    "rehype-sanitize": "^6.0.0",
    "resend": "^6.12.2",
    "shadcn": "^4.3.1",
    "slugify": "^1.6.9",
    "sonner": "^2.0.7",
    "tailwind-merge": "^3.5.0",
    "tailwindcss-animate": "^1.0.7",
    "tippy.js": "6.3.7",
    "tw-animate-css": "^1.4.0",
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "@content-collections/core": "^0.15.0",
    "@content-collections/mdx": "^0.2.2",
    "@content-collections/next": "^0.2.11",
    "@eslint/eslintrc": "^3",
    "@playwright/test": "1.55.0",
    "@types/bcryptjs": "^3.0.0",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@types/react-dropzone": "^5.1.0",
    "autoprefixer": "^10.5.0",
    "eslint": "^9",
    "eslint-config-next": "15.5.0",
    "husky": "^9.1.7",
    "postcss": "^8.4.31",
    "sharp": "^0.34.5",
    "tailwindcss": "^3.4.19",
    "typescript": "^5"
  }
}


 succeeded in 583ms:
   1: import createMiddleware from "next-intl/middleware";
   2: import { NextRequest, NextResponse } from "next/server";
   3: import { routing } from "@/i18n/routing";
   4: import { updateSupabaseSession } from "@/lib/supabase/middleware";
   5: 
   6: const intlMiddleware = createMiddleware(routing);
   7: 
   8: // Phase 4.x task_05 ??/app/commission/* -> /app/projects redirect.
   9: // Phase 2.x leftover surface; Phase 4 funnels all client intake through
  10: // /app/projects. Open-redirect protection: we drop ALL query params
  11: // (specifically `?next=https://evil.com` is ignored) and target a
  12: // fixed in-app path.
  13: //
  14: // Matches both locale-prefixed and locale-free forms; the locale-free
  15: // case targets the routing default locale.
  16: const COMMISSION_WITH_LOCALE = /^\/(ko|en)\/app\/commission(?:\/.*)?$/;
  17: const COMMISSION_NO_LOCALE = /^\/app\/commission(?:\/.*)?$/;
  18: 
  19: function maybeRedirectCommission(request: NextRequest): NextResponse | null {
  20:   const path = request.nextUrl.pathname;
  21:   const localedMatch = path.match(COMMISSION_WITH_LOCALE);
  22:   if (localedMatch) {
  23:     const locale = localedMatch[1];
  24:     const url = request.nextUrl.clone();
  25:     url.pathname = `/${locale}/app/projects`;
  26:     url.search = "";
  27:     return NextResponse.redirect(url, 308);
  28:   }
  29:   if (COMMISSION_NO_LOCALE.test(path)) {
  30:     const url = request.nextUrl.clone();
  31:     url.pathname = `/${routing.defaultLocale}/app/projects`;
  32:     url.search = "";
  33:     return NextResponse.redirect(url, 308);
  34:   }
  35:   return null;
  36: }
  37: 
  38: export default async function middleware(request: NextRequest) {
  39:   const commissionRedirect = maybeRedirectCommission(request);
  40:   if (commissionRedirect) return commissionRedirect;
  41: 
  42:   const response = intlMiddleware(request);
  43:   return updateSupabaseSession(request, response);
  44: }
  45: 
  46: export const config = {
  47:   matcher: [
  48:     // Skip: Next.js internals, Vercel internals, API, auth callback, locale-free
  49:     // public surfaces (showcase, challenges), static files.
  50:     //
  51:     // Phase 2.1 G6 #5/#6 ??added `showcase` and `challenges` to the negative
  52:     // lookahead so the locale-free public routes at src/app/showcase/[slug]/
  53:     // and src/app/challenges/ (Phase 2.5) are NOT prefixed with a locale by
  54:     // next-intl. Previously `/showcase/<slug>` was being redirected to
  55:     // `/{defaultLocale}/showcase/<slug>` which matched no route, falling
  56:     // back to Next's default 404 and making the custom not-found.tsx
  57:     // unreachable (and the Phase 2.0 G6 L5 html/body shell fix inert).
  58:     // Phase 4.x Wave C.5b sub_02 ??`u` removed (creator handle profile
  59:     // tree at /u/<handle> is gone). Keeping it in the exclude was a
  60:     // forward-leak from the deleted Phase 2.5 surface.
  61:     // Phase 4.x Wave C.5c sub_01 ??`auth/confirm` added (PKCE
  62:     // intermediate verify endpoint; same locale-free shape as
  63:     // auth/callback).
  64:     "/((?!api|_next|_vercel|auth/callback|auth/confirm|showcase|challenges|.*\\..*).*)",
  65:   ],
  66: };

 succeeded in 585ms:
   1: import { type EmailOtpType } from "@supabase/supabase-js";
   2: import { NextRequest, NextResponse } from "next/server";
   3: import { createSupabaseServer } from "@/lib/supabase/server";
   4: 
   5: // Phase 4.x Wave C.5c sub_01 ??PKCE intermediate confirm endpoint.
   6: //
   7: // Replaces the implicit-flow / OAuth-code-flow `/auth/callback` for the
   8: // email-link path (signup confirm, magic link, password recovery).
   9: //
  10: // Why an intermediate route at all:
  11: // - Gmail / Outlook / corporate-mail link-preview crawlers GET the
  12: //   email link before the user can click it. Under the legacy
  13: //   `?code=...` flow, that GET single-use-consumed the OTP; the real
  14: //   user click then landed on `/auth/expired`.
  15: // - Under PKCE, the email-template link uses `?token_hash=...&type=...`.
  16: //   A passive GET against this route still tries to verifyOtp, but
  17: //   without the `code_verifier` cookie that signUp() stored on the
  18: //   user's *browser*, the verify call fails harmlessly. Only the
  19: //   user's actual click ??from the same browser that initiated
  20: //   signup ??carries the cookie and consumes the OTP.
  21: //
  22: // Email template rewrite required (Supabase Dashboard ??Authentication
  23: // ??Email Templates ??Confirm signup): the `{{ .ConfirmationURL }}`
  24: // pattern must change to a hard-coded path:
  25: //   <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next={{ .RedirectTo }}">
  26: // Same change for Magic Link + Reset Password templates. Tracked in
  27: // FU-C5c-01 as a yagi manual action.
  28: 
  29: // `next` allowlist ??open-redirect defense. Any caller-supplied `next`
  30: // must match one of these prefixes; anything else falls back to
  31: // `/onboarding/workspace`. Suffix matching is intentional: a future
  32: // `/app/projects/abc-123` is allowed because it starts with `/app/`,
  33: // but `//evil.com` (protocol-relative) and absolute URLs are rejected.
  34: const NEXT_ALLOWLIST_PREFIXES: readonly string[] = [
  35:   "/onboarding/workspace",
  36:   "/onboarding/brand",
  37:   "/onboarding/invite",
  38:   "/app",
  39:   "/auth/expired",
  40:   "/reset-password",
  41: ];
  42: const DEFAULT_NEXT = "/onboarding/workspace";
  43: 
  44: function sanitizeNext(raw: string | null): string {
  45:   if (!raw) return DEFAULT_NEXT;
  46:   if (!raw.startsWith("/")) return DEFAULT_NEXT;
  47:   if (raw.startsWith("//")) return DEFAULT_NEXT;
  48:   if (raw.length > 500) return DEFAULT_NEXT;
  49:   // Strip any leading locale prefix (e.g. `/ko/app/...` -> `/app/...`)
  50:   // before allowlist match ??we re-prefix with the user's locale below.
  51:   const stripped = raw.replace(/^\/(ko|en)(?=\/|$)/, "");
  52:   const candidate = stripped.length === 0 ? DEFAULT_NEXT : stripped;
  53:   for (const prefix of NEXT_ALLOWLIST_PREFIXES) {
  54:     if (candidate === prefix || candidate.startsWith(`${prefix}/`)) {
  55:       return candidate;
  56:     }
  57:   }
  58:   return DEFAULT_NEXT;
  59: }
  60: 
  61: const SUPPORTED_OTP_TYPES: readonly EmailOtpType[] = [
  62:   "signup",
  63:   "email",
  64:   "recovery",
  65:   "magiclink",
  66:   "invite",
  67:   "email_change",
  68: ];
  69: function isOtpType(value: string | null): value is EmailOtpType {
  70:   return value !== null && (SUPPORTED_OTP_TYPES as readonly string[]).includes(value);
  71: }
  72: 
  73: export async function GET(request: NextRequest) {
  74:   const { searchParams, origin } = new URL(request.url);
  75:   const tokenHash = searchParams.get("token_hash");
  76:   const type = searchParams.get("type");
  77:   const next = sanitizeNext(searchParams.get("next"));
  78: 
  79:   if (!tokenHash || !isOtpType(type)) {
  80:     // No payload (or unrecognised type) ??passive GET / malformed link.
  81:     // Bounce to /signin without consuming anything.
  82:     return NextResponse.redirect(`${origin}/ko/signin?error=missing_token_hash`);
  83:   }
  84: 
  85:   const supabase = await createSupabaseServer();
  86:   const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  87: 
  88:   if (error) {
  89:     // verifyOtp failure modes: expired / invalid / consumed / missing
  90:     // code_verifier (the Gmail-crawler GET path). All map to the
  91:     // user-facing "link expired, request a new one" surface.
  92:     return NextResponse.redirect(`${origin}/ko/auth/expired`);
  93:   }
  94: 
  95:   // Resolve locale from the now-authenticated profile so the redirect
  96:   // lands the user on their preferred locale prefix.
  97:   const {
  98:     data: { user },
  99:   } = await supabase.auth.getUser();
 100:   if (!user) {
 101:     return NextResponse.redirect(`${origin}/ko/signin?error=no_user`);
 102:   }
 103: 
 104:   const { data: profile } = await supabase
 105:     .from("profiles")
 106:     .select("locale")
 107:     .eq("id", user.id)
 108:     .maybeSingle();
 109:   const locale = profile?.locale === "en" ? "en" : "ko";
 110: 
 111:   // Password recovery skips the workspace gate.
 112:   if (type === "recovery") {
 113:     return NextResponse.redirect(`${origin}/${locale}/reset-password`);
 114:   }
 115: 
 116:   return NextResponse.redirect(`${origin}/${locale}${next}`);
 117: }

2026-05-03T11:31:24.647050Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 1.5 seconds
Output:

 exited 1 in 1549ms:
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"@supabase/(ssr|supabase-js)|supabase-js|flowType|verifyOtp\" pnpm-lock.yaml package-lock.json yarn.lock . -g '"'!node_modules'"' -g '"'!*.next*'"' -S" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src/lib/supabase/client.ts' | ForEach-Object { "'$i++; '"'{0,4}: {1}' -f "'$i, $_ }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src/lib/supabase/server.ts' | ForEach-Object { "'$i++; '"'{0,4}: {1}' -f "'$i, $_ }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src/lib/supabase/middleware.ts' | ForEach-Object { "'$i++; '"'{0,4}: {1}' -f "'$i, $_ }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src/app/auth/callback/route.ts' | ForEach-Object { "'$i++; '"'{0,4}: {1}' -f "'$i, $_ }' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 437ms:
   1: import { createBrowserClient } from "@supabase/ssr";
   2: import type { Database } from "@/lib/supabase/database.types";
   3: 
   4: // Phase 4.x Wave C.5c sub_01 ??PKCE flow.
   5: // Why: Gmail / Outlook link-preview crawlers GET the email confirm URL
   6: // before the user can click it, single-use-consuming the OTP and
   7: // landing the real click on /auth/expired. PKCE moves the consume to
   8: // an explicit verifyOtp() call inside our /auth/confirm route handler,
   9: // so a passive crawler GET no longer drains the token.
  10: //
  11: // flowType = 'pkce' on the BROWSER client is what makes signUp() /
  12: // resetPasswordForEmail() store a code_verifier locally that the
  13: // matching /auth/confirm verify call needs.
  14: export function createSupabaseBrowser() {
  15:   return createBrowserClient<Database>(
  16:     process.env.NEXT_PUBLIC_SUPABASE_URL!,
  17:     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  18:     {
  19:       auth: { flowType: "pkce" },
  20:     },
  21:   );
  22: }

 succeeded in 412ms:
   1: import { createServerClient } from "@supabase/ssr";
   2: import { cookies } from "next/headers";
   3: import type { Database } from "@/lib/supabase/database.types";
   4: 
   5: export async function createSupabaseServer() {
   6:   const cookieStore = await cookies();
   7:   return createServerClient<Database>(
   8:     process.env.NEXT_PUBLIC_SUPABASE_URL!,
   9:     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  10:     {
  11:       // Phase 4.x Wave C.5c sub_01 ??PKCE flow. Mirrors client.ts so
  12:       // /auth/confirm's verifyOtp call finds the matching code_verifier
  13:       // cookie set by signUp() at signup time. See client.ts for the
  14:       // Gmail-crawler rationale.
  15:       auth: { flowType: "pkce" },
  16:       cookies: {
  17:         getAll() {
  18:           return cookieStore.getAll();
  19:         },
  20:         setAll(cookiesToSet) {
  21:           try {
  22:             cookiesToSet.forEach(({ name, value, options }) =>
  23:               cookieStore.set(name, value, options)
  24:             );
  25:           } catch {
  26:             // Called from a Server Component (read-only cookies) ??ignore.
  27:           }
  28:         },
  29:       },
  30:     }
  31:   );
  32: }

 succeeded in 426ms:
   1: import { createServerClient } from "@supabase/ssr";
   2: import type { NextRequest, NextResponse } from "next/server";
   3: import type { Database } from "@/lib/supabase/database.types";
   4: 
   5: export async function updateSupabaseSession(
   6:   request: NextRequest,
   7:   response: NextResponse
   8: ): Promise<NextResponse> {
   9:   const supabase = createServerClient<Database>(
  10:     process.env.NEXT_PUBLIC_SUPABASE_URL!,
  11:     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  12:     {
  13:       // Phase 4.x Wave C.5c sub_01 ??PKCE flow parity with server.ts /
  14:       // client.ts. Middleware reads/writes the same auth cookies; if the
  15:       // flowType differs across clients, code_verifier handling drifts.
  16:       auth: { flowType: "pkce" },
  17:       cookies: {
  18:         getAll() {
  19:           return request.cookies.getAll();
  20:         },
  21:         setAll(cookiesToSet) {
  22:           cookiesToSet.forEach(({ name, value, options }) => {
  23:             request.cookies.set(name, value);
  24:             response.cookies.set(name, value, options);
  25:           });
  26:         },
  27:       },
  28:     }
  29:   );
  30: 
  31:   await supabase.auth.getUser();
  32:   return response;
  33: }

 succeeded in 437ms:
   1: import { NextRequest, NextResponse } from "next/server";
   2: import { createSupabaseServer } from "@/lib/supabase/server";
   3: 
   4: // Phase 4.x Wave C.5b sub_04 ??expired-OTP detection. Supabase reports
   5: // expiry via either the `error_description` query param on the redirect
   6: // (PKCE error path) or as `exchangeCodeForSession` failure with a
   7: // message containing one of these markers.
   8: const EXPIRY_MARKERS = ["otp_expired", "otp expired", "code expired", "expired", "invalid_grant"];
   9: function isExpiryError(message: string): boolean {
  10:   const lower = message.toLowerCase();
  11:   return EXPIRY_MARKERS.some((marker) => lower.includes(marker));
  12: }
  13: 
  14: export async function GET(request: NextRequest) {
  15:   const { searchParams, origin } = new URL(request.url);
  16:   const code = searchParams.get("code");
  17:   const next = searchParams.get("next");
  18:   const type = searchParams.get("type");
  19:   const errorParam = searchParams.get("error");
  20:   const errorCodeParam = searchParams.get("error_code");
  21:   const errorDescParam = searchParams.get("error_description");
  22: 
  23:   // Supabase Auth redirects expired/invalid links here with the failure
  24:   // surfaced as query params instead of a `code`. Bounce to /auth/expired
  25:   // before doing any other work.
  26:   if (errorParam || errorCodeParam) {
  27:     const blob = `${errorParam ?? ""} ${errorCodeParam ?? ""} ${errorDescParam ?? ""}`;
  28:     if (isExpiryError(blob)) {
  29:       return NextResponse.redirect(`${origin}/ko/auth/expired`);
  30:     }
  31:     return NextResponse.redirect(
  32:       `${origin}/ko/signin?error=${encodeURIComponent(errorDescParam ?? errorCodeParam ?? errorParam ?? "auth_failed")}`,
  33:     );
  34:   }
  35: 
  36:   if (!code) {
  37:     return NextResponse.redirect(`${origin}/ko/signin?error=missing_code`);
  38:   }
  39: 
  40:   const supabase = await createSupabaseServer();
  41:   // Phase 4.x Wave C.5b sub_05 ??exchangeCodeForSession persists the
  42:   // authenticated session via the @supabase/ssr cookie adapter wired in
  43:   // createSupabaseServer (server.ts setAll ??cookieStore.set). Inside a
  44:   // Route Handler, next/headers cookies() is mutable, so those Set-Cookie
  45:   // entries land on the eventual NextResponse.redirect below ??meaning
  46:   // the user arrives at /onboarding/workspace already authenticated.
  47:   // No follow-up signIn() / refresh() call is required.
  48:   const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  49: 
  50:   if (exchangeError) {
  51:     if (isExpiryError(exchangeError.message)) {
  52:       return NextResponse.redirect(`${origin}/ko/auth/expired`);
  53:     }
  54:     return NextResponse.redirect(
  55:       `${origin}/ko/signin?error=${encodeURIComponent(exchangeError.message)}`
  56:     );
  57:   }
  58: 
  59:   const {
  60:     data: { user },
  61:   } = await supabase.auth.getUser();
  62: 
  63:   if (!user) {
  64:     return NextResponse.redirect(`${origin}/ko/signin?error=no_user`);
  65:   }
  66: 
  67:   // Phase 4.x Wave C.5b amend_01 LOOP 1 fix (Codex F12): the
  68:   // handle_new_user DB trigger now guarantees a profiles row materialises
  69:   // in the same transaction as auth.users INSERT, so `!profile` is no
  70:   // longer the right onboarding gate. Use workspace membership + global
  71:   // role instead ??the actual constraint that decides whether the user
  72:   // can land on /app surfaces.
  73:   const { data: profile } = await supabase
  74:     .from("profiles")
  75:     .select("id, locale")
  76:     .eq("id", user.id)
  77:     .maybeSingle();
  78: 
  79:   const locale = profile?.locale ?? "ko";
  80: 
  81:   // Password recovery flow: send to reset-password regardless of state.
  82:   if (type === "recovery") {
  83:     return NextResponse.redirect(`${origin}/${locale}/reset-password`);
  84:   }
  85: 
  86:   // Phase 2.8.1 G_B1-H (F-PUX-003): preserve the commission intent across
  87:   // the entire signup ??confirm ??onboarding chain.
  88:   const safeNext =
  89:     next && next.startsWith("/") && !next.startsWith("//")
  90:       ? next
  91:       : null;
  92: 
  93:   const { count: workspaceMembershipCount } = await supabase
  94:     .from("workspace_members")
  95:     .select("workspace_id", { count: "exact", head: true })
  96:     .eq("user_id", user.id);
  97: 
  98:   const { data: globalRoles } = await supabase
  99:     .from("user_roles")
 100:     .select("role")
 101:     .eq("user_id", user.id)
 102:     .is("workspace_id", null)
 103:     .in("role", ["creator", "yagi_admin"]);
 104: 
 105:   const hasWorkspace = (workspaceMembershipCount ?? 0) > 0;
 106:   const hasGlobalRole = (globalRoles?.length ?? 0) > 0;
 107: 
 108:   if (!hasWorkspace && !hasGlobalRole) {
 109:     const onboardingUrl = safeNext
 110:       ? `${origin}/${locale}/onboarding/workspace?next=${encodeURIComponent(safeNext)}`
 111:       : `${origin}/${locale}/onboarding/workspace`;
 112:     return NextResponse.redirect(onboardingUrl);
 113:   }
 114: 
 115:   if (safeNext) {
 116:     return NextResponse.redirect(`${origin}${safeNext}`);
 117:   }
 118: 
 119:   return NextResponse.redirect(`${origin}/${locale}/app`);
 120: }

2026-05-03T11:31:33.092012Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 1.1 seconds
Output:
pnpm-lock.yaml:80:      '@supabase/ssr':
pnpm-lock.yaml:82:        version: 0.10.2(@supabase/supabase-js@2.104.0)
pnpm-lock.yaml:83:      '@supabase/supabase-js':
pnpm-lock.yaml:2631:  '@supabase/ssr@0.10.2':
pnpm-lock.yaml:2634:      '@supabase/supabase-js': ^2.102.1
pnpm-lock.yaml:2640:  '@supabase/supabase-js@2.104.0':
pnpm-lock.yaml:9003:  '@supabase/ssr@0.10.2(@supabase/supabase-js@2.104.0)':
pnpm-lock.yaml:9005:      '@supabase/supabase-js': 2.104.0
pnpm-lock.yaml:9013:  '@supabase/supabase-js@2.104.0':
.\package.json:44:    "@supabase/ssr": "^0.10.2",
.\package.json:45:    "@supabase/supabase-js": "^2.104.0",
.\pnpm-lock.yaml:80:      '@supabase/ssr':
.\pnpm-lock.yaml:82:        version: 0.10.2(@supabase/supabase-js@2.104.0)
.\pnpm-lock.yaml:83:      '@supabase/supabase-js':
.\pnpm-lock.yaml:2631:  '@supabase/ssr@0.10.2':
.\pnpm-lock.yaml:2634:      '@supabase/supabase-js': ^2.102.1
.\pnpm-lock.yaml:2640:  '@supabase/supabase-js@2.104.0':
.\pnpm-lock.yaml:9003:  '@supabase/ssr@0.10.2(@supabase/supabase-js@2.104.0)':
.\pnpm-lock.yaml:9005:      '@supabase/supabase-js': 2.104.0
.\pnpm-lock.yaml:9013:  '@supabase/supabase-js@2.104.0':
.\src\app\auth\confirm\route.ts:1:import { type EmailOtpType } from "@supabase/supabase-js";
.\src\app\auth\confirm\route.ts:16://   A passive GET against this route still tries to verifyOtp, but
.\src\app\auth\confirm\route.ts:86:  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
.\src\app\auth\confirm\route.ts:89:    // verifyOtp failure modes: expired / invalid / consumed / missing
.\src\app\auth\callback\route.ts:42:  // authenticated session via the @supabase/ssr cookie adapter wired in
.\src\app\api\showcases\[id]\og\route.tsx:2:import { createClient } from "@supabase/supabase-js";
.\src\lib\team-channels\queries.ts:1:import type { SupabaseClient } from "@supabase/supabase-js";
.\src\lib\supabase\service.ts:2:import { createClient } from "@supabase/supabase-js";
.\src\lib\supabase\server.ts:1:import { createServerClient } from "@supabase/ssr";
.\src\lib\supabase\server.ts:12:      // /auth/confirm's verifyOtp call finds the matching code_verifier
.\src\lib\supabase\server.ts:15:      auth: { flowType: "pkce" },
.\src\lib\supabase\middleware.ts:1:import { createServerClient } from "@supabase/ssr";
.\src\lib\supabase\middleware.ts:15:      // flowType differs across clients, code_verifier handling drifts.
.\src\lib\supabase\middleware.ts:16:      auth: { flowType: "pkce" },
.\src\lib\supabase\client.ts:1:import { createBrowserClient } from "@supabase/ssr";
.\src\lib\supabase\client.ts:8:// an explicit verifyOtp() call inside our /auth/confirm route handler,
.\src\lib\supabase\client.ts:11:// flowType = 'pkce' on the BROWSER client is what makes signUp() /
.\src\lib\supabase\client.ts:19:      auth: { flowType: "pkce" },
.\src\lib\notifications\emit.ts:10:import { createClient } from "@supabase/supabase-js";
.\src\lib\notifications\debounce.ts:22:import { createClient, type SupabaseClient } from "@supabase/supabase-js";
.\src\app\[locale]\app\showcases\actions.ts:19:import type { SupabaseClient } from "@supabase/supabase-js";
.\supabase\functions\notify-dispatch\index.ts:23:import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
.\scripts\create-artist-account.ts:27:import { createClient, type SupabaseClient } from "@supabase/supabase-js";
.\src\app\[locale]\app\admin\challenges\[slug]\judge\actions.ts:5:import type { SupabaseClient } from "@supabase/supabase-js";
.\src\app\[locale]\(auth)\signup\page.tsx:63:  // `emailRedirectTo` becomes the FINAL destination after verifyOtp
.\src\app\unsubscribe\[token]\actions.ts:10:import { createClient } from "@supabase/supabase-js";
.\src\app\unsubscribe\[token]\page.tsx:3:import { createClient } from "@supabase/supabase-js";
.\src\app\unsubscribe\[token]\resolve-locale.ts:4:import { createClient } from "@supabase/supabase-js";
.\src\app\[locale]\(auth)\forgot-password\page.tsx:36:    // destination after verifyOtp succeeds at /auth/confirm. The
.\scripts\test-rls-brief-board.mjs:34:import { createClient } from "@supabase/supabase-js";
.\scripts\test-rls-brief-board.mjs:90:// schema and pg_catalog. supabase-js can SELECT from these via the REST
.\supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:510:--     service_role direct writes via pg_net/supabase-js server client)
.\scripts\test-saveversion-race.mjs:21:import { createClient } from "@supabase/supabase-js";
rg: package-lock.json: 吏?뺣맂 ?뚯씪??李얠쓣 ???놁뒿?덈떎. (os error 2)
rg: yarn.lock: 吏?뺣맂 ?뚯씪??李얠쓣 ???놁뒿?덈떎. (os error 2)

 exited 1 in 1054ms:
pnpm-lock.yaml:80:      '@supabase/ssr':
pnpm-lock.yaml:82:        version: 0.10.2(@supabase/supabase-js@2.104.0)
pnpm-lock.yaml:83:      '@supabase/supabase-js':
pnpm-lock.yaml:2631:  '@supabase/ssr@0.10.2':
pnpm-lock.yaml:2634:      '@supabase/supabase-js': ^2.102.1
pnpm-lock.yaml:2640:  '@supabase/supabase-js@2.104.0':
pnpm-lock.yaml:9003:  '@supabase/ssr@0.10.2(@supabase/supabase-js@2.104.0)':
pnpm-lock.yaml:9005:      '@supabase/supabase-js': 2.104.0
pnpm-lock.yaml:9013:  '@supabase/supabase-js@2.104.0':
.\package.json:44:    "@supabase/ssr": "^0.10.2",
.\package.json:45:    "@supabase/supabase-js": "^2.104.0",
.\pnpm-lock.yaml:80:      '@supabase/ssr':
.\pnpm-lock.yaml:82:        version: 0.10.2(@supabase/supabase-js@2.104.0)
.\pnpm-lock.yaml:83:      '@supabase/supabase-js':
.\pnpm-lock.yaml:2631:  '@supabase/ssr@0.10.2':
.\pnpm-lock.yaml:2634:      '@supabase/supabase-js': ^2.102.1
.\pnpm-lock.yaml:2640:  '@supabase/supabase-js@2.104.0':
.\pnpm-lock.yaml:9003:  '@supabase/ssr@0.10.2(@supabase/supabase-js@2.104.0)':
.\pnpm-lock.yaml:9005:      '@supabase/supabase-js': 2.104.0
.\pnpm-lock.yaml:9013:  '@supabase/supabase-js@2.104.0':
.\src\app\auth\confirm\route.ts:1:import { type EmailOtpType } from "@supabase/supabase-js";
.\src\app\auth\confirm\route.ts:16://   A passive GET against this route still tries to verifyOtp, but
.\src\app\auth\confirm\route.ts:86:  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
.\src\app\auth\confirm\route.ts:89:    // verifyOtp failure modes: expired / invalid / consumed / missing
.\src\app\auth\callback\route.ts:42:  // authenticated session via the @supabase/ssr cookie adapter wired in
.\src\app\api\showcases\[id]\og\route.tsx:2:import { createClient } from "@supabase/supabase-js";
.\src\lib\team-channels\queries.ts:1:import type { SupabaseClient } from "@supabase/supabase-js";
.\src\lib\supabase\service.ts:2:import { createClient } from "@supabase/supabase-js";
.\src\lib\supabase\server.ts:1:import { createServerClient } from "@supabase/ssr";
.\src\lib\supabase\server.ts:12:      // /auth/confirm's verifyOtp call finds the matching code_verifier
.\src\lib\supabase\server.ts:15:      auth: { flowType: "pkce" },
.\src\lib\supabase\middleware.ts:1:import { createServerClient } from "@supabase/ssr";
.\src\lib\supabase\middleware.ts:15:      // flowType differs across clients, code_verifier handling drifts.
.\src\lib\supabase\middleware.ts:16:      auth: { flowType: "pkce" },
.\src\lib\supabase\client.ts:1:import { createBrowserClient } from "@supabase/ssr";
.\src\lib\supabase\client.ts:8:// an explicit verifyOtp() call inside our /auth/confirm route handler,
.\src\lib\supabase\client.ts:11:// flowType = 'pkce' on the BROWSER client is what makes signUp() /
.\src\lib\supabase\client.ts:19:      auth: { flowType: "pkce" },
.\src\lib\notifications\emit.ts:10:import { createClient } from "@supabase/supabase-js";
.\src\lib\notifications\debounce.ts:22:import { createClient, type SupabaseClient } from "@supabase/supabase-js";
.\src\app\[locale]\app\showcases\actions.ts:19:import type { SupabaseClient } from "@supabase/supabase-js";
.\supabase\functions\notify-dispatch\index.ts:23:import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
.\scripts\create-artist-account.ts:27:import { createClient, type SupabaseClient } from "@supabase/supabase-js";
.\src\app\[locale]\app\admin\challenges\[slug]\judge\actions.ts:5:import type { SupabaseClient } from "@supabase/supabase-js";
.\src\app\[locale]\(auth)\signup\page.tsx:63:  // `emailRedirectTo` becomes the FINAL destination after verifyOtp
.\src\app\unsubscribe\[token]\actions.ts:10:import { createClient } from "@supabase/supabase-js";
.\src\app\unsubscribe\[token]\page.tsx:3:import { createClient } from "@supabase/supabase-js";
.\src\app\unsubscribe\[token]\resolve-locale.ts:4:import { createClient } from "@supabase/supabase-js";
.\src\app\[locale]\(auth)\forgot-password\page.tsx:36:    // destination after verifyOtp succeeds at /auth/confirm. The
.\scripts\test-rls-brief-board.mjs:34:import { createClient } from "@supabase/supabase-js";
.\scripts\test-rls-brief-board.mjs:90:// schema and pg_catalog. supabase-js can SELECT from these via the REST
.\supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:510:--     service_role direct writes via pg_net/supabase-js server client)
.\scripts\test-saveversion-race.mjs:21:import { createClient } from "@supabase/supabase-js";
rg: package-lock.json: 吏?뺣맂 ?뚯씪??李얠쓣 ???놁뒿?덈떎. (os error 2)
rg: yarn.lock: 吏?뺣맂 ?뚯씪??李얠쓣 ???놁뒿?덈떎. (os error 2)

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src/app/[locale]/(auth)/signup/page.tsx' | ForEach-Object { "'$i++; '"'{0,4}: {1}' -f "'$i, $_ }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src/app/[locale]/(auth)/forgot-password/page.tsx' | ForEach-Object { "'$i++; '"'{0,4}: {1}' -f "'$i, $_ }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src/app/[locale]/auth/expired/page.tsx' | ForEach-Object { "'$i++; '"'{0,4}: {1}' -f "'$i, $_ }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src/app/[locale]/auth/verify/page.tsx' | ForEach-Object { "'$i++; '"'{0,4}: {1}' -f "'$i, $_ }' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 427ms:
   1: "use client";
   2: 
   3: import { useState } from "react";
   4: import { useTranslations } from "next-intl";
   5: import { useForm } from "react-hook-form";
   6: import { zodResolver } from "@hookform/resolvers/zod";
   7: import { z } from "zod";
   8: import { toast } from "sonner";
   9: import { useSearchParams } from "next/navigation";
  10: import { Button } from "@/components/ui/button";
  11: import { Input } from "@/components/ui/input";
  12: import { Label } from "@/components/ui/label";
  13: import { Link, useRouter } from "@/i18n/routing";
  14: import { createSupabaseBrowser } from "@/lib/supabase/client";
  15: 
  16: // Phase 2.8.1 G_B1-H (F-PUX-003): commission flow uses `?next=` to bring
  17: // the user back to /app/commission/new after the email-confirm round-trip.
  18: // We accept any same-origin path that starts with `/` and is not the auth
  19: // confirm endpoint itself (avoids the trivial loop). Cross-origin URLs
  20: // are rejected outright so a malicious caller can't bounce the user off
  21: // the platform.
  22: function sanitizeNext(raw: string | null): string | null {
  23:   if (!raw) return null;
  24:   if (!raw.startsWith("/")) return null;
  25:   if (raw.startsWith("//")) return null; // protocol-relative
  26:   if (raw.startsWith("/auth/callback")) return null;
  27:   if (raw.startsWith("/auth/confirm")) return null;
  28:   if (raw.length > 500) return null;
  29:   return raw;
  30: }
  31: 
  32: const schema = z
  33:   .object({
  34:     email: z.string().email(),
  35:     password: z.string().min(8),
  36:     passwordConfirm: z.string(),
  37:   })
  38:   .refine((data) => data.password === data.passwordConfirm, {
  39:     path: ["passwordConfirm"],
  40:     message: "password_mismatch",
  41:   });
  42: 
  43: type FormValues = z.infer<typeof schema>;
  44: 
  45: export default function SignUpPage() {
  46:   const t = useTranslations("auth");
  47:   const c = useTranslations("common");
  48:   const router = useRouter();
  49:   const searchParams = useSearchParams();
  50:   const next = sanitizeNext(searchParams.get("next"));
  51:   const [submitting, setSubmitting] = useState(false);
  52:   const [sentToEmail, setSentToEmail] = useState<string | null>(null);
  53:   const [resending, setResending] = useState(false);
  54:   const {
  55:     register,
  56:     handleSubmit,
  57:     formState: { errors },
  58:   } = useForm<FormValues>({ resolver: zodResolver(schema) });
  59: 
  60:   // Phase 4.x Wave C.5c sub_01 ??Under PKCE, the actual email-link path
  61:   // is hard-coded in the Supabase Dashboard email template
  62:   // (`{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&...`).
  63:   // `emailRedirectTo` becomes the FINAL destination after verifyOtp
  64:   // succeeds, embedded as `?next=` inside that template URL via the
  65:   // `{{ .RedirectTo }}` template variable. So this URL is the
  66:   // post-confirm landing, NOT the click target.
  67:   function buildEmailRedirect(siteUrl: string): string {
  68:     const base = `${siteUrl}/onboarding/workspace`;
  69:     return next ? `${siteUrl}${next}` : base;
  70:   }
  71: 
  72:   async function onSubmit(values: FormValues) {
  73:     setSubmitting(true);
  74:     const supabase = createSupabaseBrowser();
  75:     const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
  76:     const { error, data } = await supabase.auth.signUp({
  77:       email: values.email,
  78:       password: values.password,
  79:       options: { emailRedirectTo: buildEmailRedirect(siteUrl) },
  80:     });
  81:     setSubmitting(false);
  82:     if (error) {
  83:       toast.error(error.message);
  84:       return;
  85:     }
  86:     if (data.session) {
  87:       // Email confirmation disabled in Supabase auth settings ??auto-login path.
  88:       // Honor `next` here too so the in-product redirect mirrors the
  89:       // email-confirm path.
  90:       // Phase 4.x Wave C.5b sub_01: persona A ??direct to workspace creation.
  91:       router.push((next ?? "/onboarding/workspace") as "/onboarding/workspace");
  92:     } else {
  93:       // Email confirmation enabled ??switch the page over to the sent-state view
  94:       // instead of leaving the user on the form with only a toast.
  95:       setSentToEmail(values.email);
  96:     }
  97:   }
  98: 
  99:   async function onResend() {
 100:     if (!sentToEmail) return;
 101:     setResending(true);
 102:     const supabase = createSupabaseBrowser();
 103:     const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
 104:     const { error } = await supabase.auth.resend({
 105:       type: "signup",
 106:       email: sentToEmail,
 107:       options: { emailRedirectTo: buildEmailRedirect(siteUrl) },
 108:     });
 109:     setResending(false);
 110:     if (error) {
 111:       toast.error(error.message);
 112:       return;
 113:     }
 114:     toast.success(t("signup_email_sent"));
 115:   }
 116: 
 117:   // ---- Sent state ??shown after successful signUp() when email confirmation
 118:   // is required by the project. The user stays on this view and follows the
 119:   // mailbox link. This replaces the "toast-only and the form stays put"
 120:   // behavior that read as a dead-end.
 121:   // Phase 4.x Wave C.5b sub_07 ??verify-email screen on the v1.0 dark
 122:   // editorial foundation. Headline + subtitle land on the editorial type
 123:   // scale; the recipient block is a card-deep / border-subtle surface;
 124:   // primary CTA is the sage "resend" beat, secondary is a calm ghost
 125:   // button to switch addresses.
 126:   if (sentToEmail) {
 127:     return (
 128:       <div className="space-y-8">
 129:         <div className="space-y-3 text-center">
 130:           <h1 className="font-display text-3xl tracking-tight keep-all">
 131:             {t("check_your_email_title")}
 132:           </h1>
 133:           <p className="text-base ink-secondary leading-body keep-all">
 134:             {t("check_your_email_sub")}
 135:           </p>
 136:         </div>
 137: 
 138:         <div className="rounded-card bg-card-deep border-subtle border p-6 text-sm space-y-4">
 139:           <p className="ink-primary">
 140:             <span className="ink-tertiary">{t("sent_to_label")}: </span>
 141:             <span className="font-medium break-all">{sentToEmail}</span>
 142:           </p>
 143:           <ul className="text-sm ink-secondary space-y-2 leading-body">
 144:             <li className="flex gap-2 keep-all">
 145:               <span className="ink-tertiary">夷?/span>
 146:               <span>{t("check_email_hint_inbox")}</span>
 147:             </li>
 148:             <li className="flex gap-2 keep-all">
 149:               <span className="ink-tertiary">夷?/span>
 150:               <span>{t("check_email_hint_spam")}</span>
 151:             </li>
 152:             <li className="flex gap-2 keep-all">
 153:               <span className="ink-tertiary">夷?/span>
 154:               <span>{t("check_email_hint_link")}</span>
 155:             </li>
 156:           </ul>
 157:         </div>
 158: 
 159:         <div className="space-y-3">
 160:           <Button
 161:             type="button"
 162:             className="w-full bg-sage hover:brightness-105"
 163:             size="lg"
 164:             onClick={onResend}
 165:             disabled={resending}
 166:           >
 167:             {resending ? t("sending") : t("resend_email")}
 168:           </Button>
 169:           <Button
 170:             type="button"
 171:             variant="ghost"
 172:             className="w-full"
 173:             size="lg"
 174:             onClick={() => setSentToEmail(null)}
 175:           >
 176:             {t("use_different_email")}
 177:           </Button>
 178:         </div>
 179: 
 180:         <p className="text-center text-sm ink-tertiary">
 181:           {t("have_account")}{" "}
 182:           <Link href="/signin" className="ink-primary hover:accent-sage transition-colors">
 183:             {c("signin")}
 184:           </Link>
 185:         </p>
 186:       </div>
 187:     );
 188:   }
 189: 
 190:   // ---- Default state ??signup form.
 191:   return (
 192:     <div className="space-y-8">
 193:       <div className="space-y-2 text-center">
 194:         <h1 className="font-display text-3xl tracking-tight">
 195:           {t("signup_title")}
 196:         </h1>
 197:         <p className="text-sm text-muted-foreground">{t("signup_sub")}</p>
 198:       </div>
 199: 
 200:       <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
 201:         <div className="space-y-2">
 202:           <Label htmlFor="email">{t("email")}</Label>
 203:           <Input
 204:             id="email"
 205:             type="email"
 206:             placeholder={t("email_placeholder")}
 207:             autoComplete="email"
 208:             {...register("email")}
 209:           />
 210:           {errors.email && (
 211:             <p className="text-xs text-destructive">{errors.email.message}</p>
 212:           )}
 213:         </div>
 214:         <div className="space-y-2">
 215:           <Label htmlFor="password">{t("password_label")}</Label>
 216:           <Input
 217:             id="password"
 218:             type="password"
 219:             placeholder={t("password_ph")}
 220:             autoComplete="new-password"
 221:             {...register("password")}
 222:           />
 223:           {errors.password && (
 224:             <p className="text-xs text-destructive">{errors.password.message}</p>
 225:           )}
 226:         </div>
 227:         <div className="space-y-2">
 228:           <Label htmlFor="passwordConfirm">{t("password_confirm_label")}</Label>
 229:           <Input
 230:             id="passwordConfirm"
 231:             type="password"
 232:             autoComplete="new-password"
 233:             {...register("passwordConfirm")}
 234:           />
 235:           {errors.passwordConfirm && (
 236:             <p className="text-xs text-destructive">
 237:               {errors.passwordConfirm.message === "password_mismatch"
 238:                 ? t("password_mismatch")
 239:                 : errors.passwordConfirm.message}
 240:             </p>
 241:           )}
 242:         </div>
 243:         <Button type="submit" className="w-full" size="lg" disabled={submitting}>
 244:           {submitting ? t("sending") : c("signup")}
 245:         </Button>
 246:       </form>
 247: 
 248:       <p className="text-center text-sm text-muted-foreground">
 249:         {t("have_account")}{" "}
 250:         <Link href="/signin" className="text-foreground hover:underline">
 251:           {c("signin")}
 252:         </Link>
 253:       </p>
 254:     </div>
 255:   );
 256: }

 succeeded in 426ms:
   1: "use client";
   2: 
   3: import { useState } from "react";
   4: import { useTranslations } from "next-intl";
   5: import { useForm } from "react-hook-form";
   6: import { zodResolver } from "@hookform/resolvers/zod";
   7: import { z } from "zod";
   8: import { toast } from "sonner";
   9: import { Button } from "@/components/ui/button";
  10: import { Input } from "@/components/ui/input";
  11: import { Label } from "@/components/ui/label";
  12: import { Link } from "@/i18n/routing";
  13: import { createSupabaseBrowser } from "@/lib/supabase/client";
  14: 
  15: const schema = z.object({
  16:   email: z.string().email(),
  17: });
  18: 
  19: type FormValues = z.infer<typeof schema>;
  20: 
  21: export default function ForgotPasswordPage() {
  22:   const t = useTranslations("auth");
  23:   const [submitting, setSubmitting] = useState(false);
  24:   const [sent, setSent] = useState(false);
  25:   const {
  26:     register,
  27:     handleSubmit,
  28:     formState: { errors },
  29:   } = useForm<FormValues>({ resolver: zodResolver(schema) });
  30: 
  31:   async function onSubmit(values: FormValues) {
  32:     setSubmitting(true);
  33:     const supabase = createSupabaseBrowser();
  34:     const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
  35:     // Phase 4.x Wave C.5c sub_01 ??PKCE: redirectTo is the FINAL
  36:     // destination after verifyOtp succeeds at /auth/confirm. The
  37:     // email link itself is hard-coded in the Supabase Dashboard
  38:     // recovery template to /auth/confirm?type=recovery&...
  39:     const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
  40:       redirectTo: `${siteUrl}/reset-password`,
  41:     });
  42:     setSubmitting(false);
  43:     if (error) {
  44:       toast.error(error.message);
  45:       return;
  46:     }
  47:     setSent(true);
  48:     toast.success(t("reset_link_sent"));
  49:   }
  50: 
  51:   return (
  52:     <div className="space-y-8">
  53:       <div className="space-y-2 text-center">
  54:         <h1 className="font-display text-3xl tracking-tight">
  55:           {t("reset_password_title")}
  56:         </h1>
  57:         <p className="text-sm text-muted-foreground">{t("reset_password_sub")}</p>
  58:       </div>
  59: 
  60:       {sent ? (
  61:         <div className="rounded-lg border border-border bg-muted/40 px-5 py-4 text-sm">
  62:           {t("reset_link_sent")}
  63:         </div>
  64:       ) : (
  65:         <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
  66:           <div className="space-y-2">
  67:             <Label htmlFor="email">{t("email")}</Label>
  68:             <Input
  69:               id="email"
  70:               type="email"
  71:               placeholder={t("email_placeholder")}
  72:               autoComplete="email"
  73:               {...register("email")}
  74:             />
  75:             {errors.email && (
  76:               <p className="text-xs text-destructive">{errors.email.message}</p>
  77:             )}
  78:           </div>
  79:           <Button type="submit" className="w-full" size="lg" disabled={submitting}>
  80:             {submitting ? t("sending") : t("send_link")}
  81:           </Button>
  82:         </form>
  83:       )}
  84: 
  85:       <p className="text-center text-sm text-muted-foreground">
  86:         <Link href="/signin" className="text-foreground hover:underline">
  87:           {t("back_to_signin")}
  88:         </Link>
  89:       </p>
  90:     </div>
  91:   );
  92: }

 succeeded in 411ms:
   1: "use client";
   2: 
   3: import { useState } from "react";
   4: import { useTranslations } from "next-intl";
   5: import { useSearchParams } from "next/navigation";
   6: import { useForm } from "react-hook-form";
   7: import { zodResolver } from "@hookform/resolvers/zod";
   8: import { z } from "zod";
   9: import { toast } from "sonner";
  10: import { Button } from "@/components/ui/button";
  11: import { Input } from "@/components/ui/input";
  12: import { Label } from "@/components/ui/label";
  13: import { Link } from "@/i18n/routing";
  14: import { createSupabaseBrowser } from "@/lib/supabase/client";
  15: 
  16: // Phase 4.x Wave C.5b sub_04 ??dedicated landing for expired-OTP /
  17: // expired-link auth callbacks. The callback route detects the expiry
  18: // and bounces here with `?email=<address>` (when the original signup
  19: // email is recoverable) so the resend flow doesn't ask the user to
  20: // retype it. The form falls back to a free email input otherwise.
  21: 
  22: const schema = z.object({
  23:   email: z.string().email(),
  24: });
  25: 
  26: type FormValues = z.infer<typeof schema>;
  27: 
  28: export default function AuthExpiredPage() {
  29:   const t = useTranslations("auth");
  30:   const params = useSearchParams();
  31:   const presetEmail = params.get("email") ?? "";
  32:   const [resending, setResending] = useState(false);
  33:   const [sent, setSent] = useState(false);
  34: 
  35:   const {
  36:     register,
  37:     handleSubmit,
  38:     formState: { errors },
  39:   } = useForm<FormValues>({
  40:     resolver: zodResolver(schema),
  41:     defaultValues: { email: presetEmail },
  42:   });
  43: 
  44:   async function onResend(values: FormValues) {
  45:     setResending(true);
  46:     const supabase = createSupabaseBrowser();
  47:     const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
  48:     const { error } = await supabase.auth.resend({
  49:       type: "signup",
  50:       email: values.email,
  51:       // Phase 4.x Wave C.5c sub_01 ??PKCE: emailRedirectTo is the FINAL
  52:       // post-verify landing; the email link itself is the dashboard's
  53:       // /auth/confirm template URL.
  54:       options: { emailRedirectTo: `${siteUrl}/onboarding/workspace` },
  55:     });
  56:     setResending(false);
  57:     if (error) {
  58:       toast.error(error.message);
  59:       return;
  60:     }
  61:     setSent(true);
  62:     toast.success(t("expired_resend_success"));
  63:   }
  64: 
  65:   return (
  66:     <div className="space-y-8">
  67:       <div className="space-y-3 text-center">
  68:         <h1 className="font-display text-3xl tracking-tight keep-all">
  69:           {t("expired_headline")}
  70:         </h1>
  71:         <p className="text-sm text-muted-foreground keep-all">
  72:           {t("expired_subtitle")}
  73:         </p>
  74:       </div>
  75: 
  76:       {!sent ? (
  77:         <form onSubmit={handleSubmit(onResend)} className="space-y-4">
  78:           <p className="text-xs text-muted-foreground keep-all">
  79:             {t("expired_resend_hint")}
  80:           </p>
  81:           <div className="space-y-2">
  82:             <Label htmlFor="email">{t("expired_resend_email_label")}</Label>
  83:             <Input
  84:               id="email"
  85:               type="email"
  86:               autoComplete="email"
  87:               placeholder={t("email_placeholder")}
  88:               {...register("email")}
  89:             />
  90:             {errors.email && (
  91:               <p className="text-xs text-destructive">{errors.email.message}</p>
  92:             )}
  93:           </div>
  94:           <Button type="submit" size="lg" className="w-full" disabled={resending}>
  95:             {resending ? t("sending") : t("expired_resend_send")}
  96:           </Button>
  97:         </form>
  98:       ) : (
  99:         <div className="rounded-card bg-card-deep border-subtle border px-5 py-4 text-sm">
 100:           <p className="ink-secondary keep-all">{t("expired_resend_success")}</p>
 101:         </div>
 102:       )}
 103: 
 104:       <p className="text-center text-sm text-muted-foreground">
 105:         <Link href="/signin" className="text-foreground hover:underline">
 106:           {t("expired_back_to_signin")}
 107:         </Link>
 108:       </p>
 109:     </div>
 110:   );
 111: }

 succeeded in 419ms:
   1: "use client";
   2: 
   3: import { useState } from "react";
   4: import { useTranslations } from "next-intl";
   5: import { useSearchParams } from "next/navigation";
   6: import { toast } from "sonner";
   7: import { Button } from "@/components/ui/button";
   8: import { Link } from "@/i18n/routing";
   9: import { createSupabaseBrowser } from "@/lib/supabase/client";
  10: 
  11: // Phase 4.x Wave C.5b sub_07 ??standalone "check your email" landing.
  12: // The post-signup path renders an inline version of this content from
  13: // inside (auth)/signup/page.tsx (after a successful signUp() that
  14: // requires email confirmation). This /auth/verify route is the same
  15: // surface accessible via a direct URL ??used when the user closes
  16: // the signup tab and later wants the recipient view back, or when
  17: // a future email-flow lands them here directly with ?email=<addr>.
  18: 
  19: export default function AuthVerifyPage() {
  20:   const t = useTranslations("auth");
  21:   const c = useTranslations("common");
  22:   const params = useSearchParams();
  23:   const presetEmail = params.get("email") ?? "";
  24:   const [resending, setResending] = useState(false);
  25: 
  26:   async function onResend() {
  27:     if (!presetEmail) {
  28:       toast.error(t("email_placeholder"));
  29:       return;
  30:     }
  31:     setResending(true);
  32:     const supabase = createSupabaseBrowser();
  33:     const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
  34:     const { error } = await supabase.auth.resend({
  35:       type: "signup",
  36:       email: presetEmail,
  37:       // Phase 4.x Wave C.5c sub_01 ??PKCE: emailRedirectTo is the FINAL
  38:       // post-verify landing; email link itself is the dashboard's
  39:       // /auth/confirm template URL.
  40:       options: { emailRedirectTo: `${siteUrl}/onboarding/workspace` },
  41:     });
  42:     setResending(false);
  43:     if (error) {
  44:       toast.error(error.message);
  45:       return;
  46:     }
  47:     toast.success(t("signup_email_sent"));
  48:   }
  49: 
  50:   return (
  51:     <div className="space-y-8">
  52:       <div className="space-y-3 text-center">
  53:         <h1 className="font-display text-3xl tracking-tight keep-all">
  54:           {t("check_your_email_title")}
  55:         </h1>
  56:         <p className="text-base ink-secondary leading-body keep-all">
  57:           {t("check_your_email_sub")}
  58:         </p>
  59:       </div>
  60: 
  61:       {presetEmail && (
  62:         <div className="rounded-card bg-card-deep border-subtle border p-6 text-sm space-y-4">
  63:           <p className="ink-primary">
  64:             <span className="ink-tertiary">{t("sent_to_label")}: </span>
  65:             <span className="font-medium break-all">{presetEmail}</span>
  66:           </p>
  67:           <ul className="text-sm ink-secondary space-y-2 leading-body">
  68:             <li className="flex gap-2 keep-all">
  69:               <span className="ink-tertiary">夷?/span>
  70:               <span>{t("check_email_hint_inbox")}</span>
  71:             </li>
  72:             <li className="flex gap-2 keep-all">
  73:               <span className="ink-tertiary">夷?/span>
  74:               <span>{t("check_email_hint_spam")}</span>
  75:             </li>
  76:             <li className="flex gap-2 keep-all">
  77:               <span className="ink-tertiary">夷?/span>
  78:               <span>{t("check_email_hint_link")}</span>
  79:             </li>
  80:           </ul>
  81:         </div>
  82:       )}
  83: 
  84:       <div className="space-y-3">
  85:         {presetEmail && (
  86:           <Button
  87:             type="button"
  88:             className="w-full bg-sage hover:brightness-105"
  89:             size="lg"
  90:             onClick={onResend}
  91:             disabled={resending}
  92:           >
  93:             {resending ? t("sending") : t("resend_email")}
  94:           </Button>
  95:         )}
  96:         <Button asChild type="button" variant="ghost" className="w-full" size="lg">
  97:           <Link href="/signin">{c("signin")}</Link>
  98:         </Button>
  99:       </div>
 100: 
 101:       <p className="text-center text-sm ink-tertiary">
 102:         {t("no_account")}{" "}
 103:         <Link href="/signup" className="ink-primary hover:accent-sage transition-colors">
 104:           {c("signup")}
 105:         </Link>
 106:       </p>
 107:     </div>
 108:   );
 109: }

web search: 
web search: site:supabase.com/docs reference javascript auth verifyOtp token_hash type email pkce
web search: 
web search: https://supabase.com/docs/guides/auth/auth-email-templates
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Test-Path -LiteralPath 'node_modules/@supabase/ssr'; Test-Path -LiteralPath 'node_modules/@supabase/supabase-js'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-ChildItem -LiteralPath 'node_modules/@supabase' -Force -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Name" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'rg -n "createBrowserClient|createServerClient|code_verifier|flowType|verifyOtp" "$env:LOCALAPPDATA'"\\pnpm\\store\" -S" in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 334ms:
True
True

 succeeded in 436ms:
ssr
supabase-js

2026-05-03T11:32:57.747849Z ERROR codex_core::tools::router: error=Exit code: 124
Wall time: 64.1 seconds
Output:
command timed out after 64088 milliseconds

 exited 124 in 64088ms:
codex
Supabase?셲 public docs confirm the intended server-side `token_hash`/`type` pattern and that `RedirectTo` is the value passed by `signUp`/`resetPasswordForEmail`. I?셫 narrowing one area now: whether the installed SSR client writes the PKCE verifier into cookies in a way the route handler can read.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-ChildItem -Recurse -LiteralPath 'node_modules/@supabase/ssr' -File | Select-Object -First 50 -ExpandProperty FullName" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"code_verifier|flowType|createBrowserClient|createServerClient|storage|cookies|setAll|getAll\" 'node_modules/@supabase/ssr' -S" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"code_verifier|flowType|verifyOtp|_verify|pkce|exchangeCodeForSession\" 'node_modules/@supabase' -S" in C:\Users\yout4\yagi-studio\yagi-workshop
2026-05-03T11:33:03.737356Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.4 seconds
Output:

 exited 1 in 392ms:
 succeeded in 434ms:
C:\Users\yout4\yagi-studio\yagi-workshop\node_modules\@supabase\ssr\CHANGELOG.md
C:\Users\yout4\yagi-studio\yagi-workshop\node_modules\@supabase\ssr\LICENSE
C:\Users\yout4\yagi-studio\yagi-workshop\node_modules\@supabase\ssr\package.json
C:\Users\yout4\yagi-studio\yagi-workshop\node_modules\@supabase\ssr\README.md
C:\Users\yout4\yagi-studio\yagi-workshop\node_modules\@supabase\ssr\release-please-config.json
C:\Users\yout4\yagi-studio\yagi-workshop\node_modules\@supabase\ssr\tsconfig.json
C:\Users\yout4\yagi-studio\yagi-workshop\node_modules\@supabase\ssr\tsconfig.main.json
C:\Users\yout4\yagi-studio\yagi-workshop\node_modules\@supabase\ssr\dist\main\cookies.d.ts
C:\Users\yout4\yagi-studio\yagi-workshop\node_modules\@supabase\ssr\dist\main\cookies.js
C:\Users\yout4\yagi-studio\yagi-workshop\node_modules\@supabase\ssr\dist\main\cookies.js.map
C:\Users\yout4\yagi-studio\yagi-workshop\node_modules\@supabase\ssr\dist\main\cookies.spec.d.ts
C:\Users\yout4\yagi-studio\yagi-workshop\node_modules\@supabase\ssr\dist\main\createBrowserClient.d.ts
C:\Users\yout4\yagi-studio\yagi-workshop\node_modules\@supabase\ssr\dist\main\createBrowserClient.js
C:\Users\yout4\yagi-studio\yagi-workshop\node_modules\@supabase\ssr\dist\main\createBrowserClient.js.map
C:\Users\yout4\yagi-studio\yagi-workshop\node_modules\@supabase\ssr\dist\main\createBrowserClient.spec.d.ts
C:\Users\yout4\yagi-studio\yagi-workshop\node_modules\@supabase\ssr\dist\main\createServerClient.d.ts
C:\Users\yout4\yagi-studio\yagi-workshop\node_modules\@supabase\ssr\dist\main\createServerClient.js
C:\Users\yout4\yagi-studio\yagi-workshop\node_modules\@supabase\ssr\dist\main\createServerClient.js.map
C:\Users\yout4\yagi-studio\yagi-workshop\node_modules\@supabase\ssr\dist\main\createServerClient.spec.d.ts
C:\Users\yout4\yagi-studio\yagi-workshop\node_modules\@supabase\ssr\dist\main\index.d.ts
C:\Users\yout4\yagi-studio\yagi-workshop\node_modules\@supabase\ssr\dist\main\index.js
C:\Users\yout4\yagi-studio\yagi-workshop\node_modules\@supabase\ssr\dist\main\index.js.map
C:\Users\yout4\yagi-studio\yagi-workshop\node_modules\@supabase\ssr\dist\main\types.d.ts
C:\Users\yout4\yagi-studio\yagi-workshop\node_modules\@supabase\ssr\dist\main\types.js
C:\Users\yout4\yagi-studio\yagi-workshop\node_modules\@supabase\ssr\dist\main\types.js.map
C:\Users\yout4\yagi-studio\yagi-workshop\node_modules\@supabase\ssr\dist\main\version.d.ts
C:\Users\yout4\yagi-studio\yagi-workshop\node_modules\@supabase\ssr\dist\main\version.js
C:\Users\yout4\yagi-studio\yagi-workshop\node_modules\@supabase\ssr\dist\main\version.js.map
C:\Users\yout4\yagi-studio\yagi-workshop\node_modules\@supabase\ssr\dist\main\utils\base64url.d.ts
C:\Users\yout4\yagi-studio\yagi-workshop\node_modules\@supabase\ssr\dist\main\utils\base64url.js
C:\Users\yout4\yagi-studio\yagi-workshop\node_modules\@supabase\ssr\dist\main\utils\base64url.js.map
C:\Users\yout4\yagi-studio\yagi-workshop\node_modules\@supabase\ssr\dist\main\utils\base64url.test.d.ts
C:\Users\yout4\yagi-studio\yagi-workshop\node_modules\@supabase\ssr\dist\main\utils\base64url.test.js
C:\Users\yout4\yagi-studio\yagi-workshop\node_modules\@supabase\ssr\dist\main\utils\base64url.test.js.map
C:\Users\yout4\yagi-studio\yagi-workshop\node_modules\@supabase\ssr\dist\main\utils\chunker.d.ts
C:\Users\yout4\yagi-studio\yagi-workshop\node_modules\@supabase\ssr\dist\main\utils\chunker.js
C:\Users\yout4\yagi-studio\yagi-workshop\node_modules\@supabase\ssr\dist\main\utils\chunker.js.map
C:\Users\yout4\yagi-studio\yagi-workshop\node_modules\@supabase\ssr\dist\main\utils\chunker.spec.d.ts
C:\Users\yout4\yagi-studio\yagi-workshop\node_modules\@supabase\ssr\dist\main\utils\constants.d.ts
C:\Users\yout4\yagi-studio\yagi-workshop\node_modules\@supabase\ssr\dist\main\utils\constants.js
C:\Users\yout4\yagi-studio\yagi-workshop\node_modules\@supabase\ssr\dist\main\utils\constants.js.map
C:\Users\yout4\yagi-studio\yagi-workshop\node_modules\@supabase\ssr\dist\main\utils\helpers.d.ts
C:\Users\yout4\yagi-studio\yagi-workshop\node_modules\@supabase\ssr\dist\main\utils\helpers.js
C:\Users\yout4\yagi-studio\yagi-workshop\node_modules\@supabase\ssr\dist\main\utils\helpers.js.map
C:\Users\yout4\yagi-studio\yagi-workshop\node_modules\@supabase\ssr\dist\main\utils\helpers.spec.d.ts
C:\Users\yout4\yagi-studio\yagi-workshop\node_modules\@supabase\ssr\dist\main\utils\index.d.ts
C:\Users\yout4\yagi-studio\yagi-workshop\node_modules\@supabase\ssr\dist\main\utils\index.js
C:\Users\yout4\yagi-studio\yagi-workshop\node_modules\@supabase\ssr\dist\main\utils\index.js.map
C:\Users\yout4\yagi-studio\yagi-workshop\node_modules\@supabase\ssr\dist\module\cookies.d.ts
C:\Users\yout4\yagi-studio\yagi-workshop\node_modules\@supabase\ssr\dist\module\cookies.js

 succeeded in 504ms:
node_modules/@supabase/ssr\CHANGELOG.md:15:* **auth:** respect user-provided auth options in createBrowserClient ([#167](https://github.com/supabase/ssr/issues/167)) ([5f04837](https://github.com/supabase/ssr/commit/5f04837780699519471bbca432f095cad7c21e81))
node_modules/@supabase/ssr\CHANGELOG.md:22:* pass cache headers to setAll to prevent CDN caching of auth responses ([#176](https://github.com/supabase/ssr/issues/176)) ([14962d2](https://github.com/supabase/ssr/commit/14962d2d64483b6fbbfe828099a552029c591d54))
node_modules/@supabase/ssr\CHANGELOG.md:44:* adds `cookies.encode` option allowing minimal cookie sizes ([#126](https://github.com/supabase/ssr/issues/126)) ([cf38b22](https://github.com/supabase/ssr/commit/cf38b2268f0c6ea1a9b8df9edf16adb9d72ca8d5))
node_modules/@supabase/ssr\CHANGELOG.md:52:* cookies console warnings ([#136](https://github.com/supabase/ssr/issues/136)) ([64ff6b3](https://github.com/supabase/ssr/commit/64ff6b3abaa76d9425eaec03a834981765c0dab9))
node_modules/@supabase/ssr\CHANGELOG.md:79:* add @types/cookies to dependencies ([#63](https://github.com/supabase/ssr/issues/63)) ([47e5f16](https://github.com/supabase/ssr/commit/47e5f16b48e4ffbe889339410f50630aba734eac))
node_modules/@supabase/ssr\CHANGELOG.md:103:* set cookies for password recovery event ([#32](https://github.com/supabase/ssr/issues/32)) ([7dc1837](https://github.com/supabase/ssr/commit/7dc1837dc4aba870b32792586969316df980ce07))
node_modules/@supabase/ssr\CHANGELOG.md:104:* set cookies when mfa challenge is verified ([#27](https://github.com/supabase/ssr/issues/27)) ([c217f53](https://github.com/supabase/ssr/commit/c217f5392b17a80a8e30709445c239e860a107d6))
node_modules/@supabase/ssr\CHANGELOG.md:111:- full rewrite using `getAll` and `setAll` cookie methods ([#1](https://github.com/supabase/ssr/issues/1)) ([b6ae192](https://github.com/supabase/ssr/commit/b6ae192aeb37ac6948637955cf1d3d6179b90065))
node_modules/@supabase/ssr\CHANGELOG.md:115:- allow use of `createBrowserClient` without `window` present ([#20](https://github.com/supabase/ssr/issues/20)) ([27d868d](https://github.com/supabase/ssr/commit/27d868d530925805fe2f3577ae716ece40dd3ab6))
node_modules/@supabase/ssr\CHANGELOG.md:117:- fix `createBrowserClient` deprecation tsdoc ([#17](https://github.com/supabase/ssr/issues/17)) ([1df70ad](https://github.com/supabase/ssr/commit/1df70ad51e65caab46cbc00342dbb42f6d498c32))
node_modules/@supabase/ssr\CHANGELOG.md:130:- faf9eac: Miscellaneous fixes to createBrowserClient
node_modules/@supabase/ssr\CHANGELOG.md:136:- 18327fc: add isServer property to server-side storage adaptors
node_modules/@supabase/ssr\CHANGELOG.md:150:- f7e5c2d: Revert cookie name to storage key change
node_modules/@supabase/ssr\CHANGELOG.md:156:- 5893215: Update storage key name with cookie name
node_modules/@supabase/ssr\README.md:34:`getSession()` returns the session directly from cookies ??no network call is
node_modules/@supabase/ssr\docs\design.md:12:In Single Page Applications (SPA) these are stored in local storage. For
node_modules/@supabase/ssr\docs\design.md:16:This is traditionally done using browser cookies [Cookies](). By storing the
node_modules/@supabase/ssr\docs\design.md:17:access token and refresh token in cookies, the browser will send them over to
node_modules/@supabase/ssr\docs\design.md:23:the request (and therefore cookies) are sent _well before any JavaScript runs
node_modules/@supabase/ssr\docs\design.md:41:Browsers tend to limit the size of individual cookies. Experimental results
node_modules/@supabase/ssr\docs\design.md:42:show that individual cookies longer than 3180 bytes will not be sent to the
node_modules/@supabase/ssr\docs\design.md:46:over multiple cookies.
node_modules/@supabase/ssr\docs\design.md:72:   non-chunked cookie, but now it needs to be split amongst multiple cookies:
node_modules/@supabase/ssr\docs\design.md:91:#### Deprecation of `get`, `set` and `remove` in favor of `getAll` and `setAll`
node_modules/@supabase/ssr\docs\design.md:95:starting in version 0.4.0 in favor of `getAll` and `setAll`.
node_modules/@supabase/ssr\docs\design.md:97:This is because when a storage item needs to be set, all cookies that have
node_modules/@supabase/ssr\docs\design.md:102:cookies:
node_modules/@supabase/ssr\docs\design.md:106:   'storage-item': 'value',
node_modules/@supabase/ssr\docs\design.md:107:   'storage-item.0': 'value',
node_modules/@supabase/ssr\docs\design.md:108:   'storage-item.1': 'value',
node_modules/@supabase/ssr\docs\design.md:109:   'storage-item.5': 'value',
node_modules/@supabase/ssr\docs\design.md:114:same cookies so it can `get` them. It must use a function like `getAll` with
node_modules/@supabase/ssr\docs\design.md:117:Let's assume that the new state of the `storage-item` is to set two chunks `.0`
node_modules/@supabase/ssr\docs\design.md:122:   'storage-item.0': 'val',
node_modules/@supabase/ssr\docs\design.md:123:   'storage-item.1': 'ue',
node_modules/@supabase/ssr\docs\design.md:130:Set-Cookie: storage-item.0=val; Max-Age=<many seconds>
node_modules/@supabase/ssr\docs\design.md:131:Set-Cookie: storage-item.1=ue;  Max-Age=<many seconds>
node_modules/@supabase/ssr\docs\design.md:132:Set-Cookie: storage-item=;   Max-Age=0
node_modules/@supabase/ssr\docs\design.md:133:Set-Cookie: storage-item.5=; Max-Age=0
node_modules/@supabase/ssr\docs\design.md:136:Notice the last two commands that clear the stale `storage-key` and
node_modules/@supabase/ssr\docs\design.md:137:`storage-item.5` cookies.
node_modules/@supabase/ssr\docs\design.md:140:maintain some reliability of the state represented by cookies, the client
node_modules/@supabase/ssr\docs\design.md:141:library will test for the storage item and its first 5 chunks and clear them if
node_modules/@supabase/ssr\docs\design.md:144:Regardless, all users must switch to `getAll` and `setAll`, as in the next
node_modules/@supabase/ssr\docs\design.md:157:Since the Supabase Auth library uses cookies only to store the session, the
node_modules/@supabase/ssr\docs\design.md:169:As mentioned previously, cookies can [only hold US ASCII characters **not including** `"`, `,`,
node_modules/@supabase/ssr\docs\design.md:174:This means that, technically, these values must not be used as-is as cookies
node_modules/@supabase/ssr\docs\design.md:188:Up to version 0.3.0 this limitation for cookies was ignored, and likely
node_modules/@supabase/ssr\docs\design.md:192:to the limitations and set as cookies.
node_modules/@supabase/ssr\docs\design.md:208:Therefore to read a value from cookies, the library uses this algorithm:
node_modules/@supabase/ssr\docs\design.md:228:   cookies and other infromation. Usually these functions have the right to
node_modules/@supabase/ssr\docs\design.md:229:   change the response headers as well, such as for setting cookies. They are
node_modules/@supabase/ssr\docs\design.md:246:   limited or not available, with the exception of access to cookies**. <ins>It is
node_modules/@supabase/ssr\docs\design.md:247:   not possible to **set cookies**.</ins>
node_modules/@supabase/ssr\docs\design.md:253:   API for reading and writing cookies.
node_modules/@supabase/ssr\docs\design.md:255:As you can see, patterns 1 and 2 allow full access to cookies on the server,
node_modules/@supabase/ssr\docs\design.md:258:cookies and always allow access to reading them.
node_modules/@supabase/ssr\docs\design.md:261:`createServerClient` function exposes an interface for getting and optionally
node_modules/@supabase/ssr\docs\design.md:262:setting cookies:
node_modules/@supabase/ssr\docs\design.md:264:- `getAll` a function that returns _all_ cookies associated with the request as
node_modules/@supabase/ssr\docs\design.md:266:  return all cookies, as the server may need to "delete" cookies by setting them
node_modules/@supabase/ssr\docs\design.md:268:- `setAll` a function whose first argument is an array of cookie objects `{
node_modules/@supabase/ssr\docs\design.md:270:  be set **both on the request (when available, usually in middlewares) and response**. If the client is used in server-rendered pages and components (pattern 3) and setting of cookies is not possible, the library must emit a warning that setting of cookies is required but not available. This is a developer aid to help identify mutations in server-rendering which is a code smell.
node_modules/@supabase/ssr\docs\design.md:272:On the browser (client) the `createBrowserClient` function will use the
node_modules/@supabase/ssr\docs\design.md:274:some reason, **both `getAll` and `setAll` must be specified.** The client must
node_modules/@supabase/ssr\docs\design.md:275:always be able to set cookies, as access tokens and refresh tokens are
node_modules/@supabase/ssr\docs\design.md:278:It is expected that `getAll` sees the changes created by `setAll`!
node_modules/@supabase/ssr\docs\design.md:280:### When does the server `setAll`?
node_modules/@supabase/ssr\docs\design.md:291:as cookies well ahead of their expiry time.
node_modules/@supabase/ssr\docs\design.md:302:   cookies in its store.
node_modules/@supabase/ssr\docs\design.md:304:3. The server client is created with a `getAll` that retrieves the cookies.
node_modules/@supabase/ssr\docs\design.md:305:4. The server client notices that the access token stored in the cookies has
node_modules/@supabase/ssr\docs\design.md:310:6. Finally calls `setAll` with the new cookies that need to be set or cleared.
node_modules/@supabase/ssr\docs\design.md:312:Once this process is complete, and the effect of `setAll` is returned to the
node_modules/@supabase/ssr\docs\design.md:321:`createServerClient`:
node_modules/@supabase/ssr\docs\design.md:326:   always get to set cookies.
node_modules/@supabase/ssr\docs\design.md:327:2. **Cookies are set when the storage values change. Set-Cookie headers should
node_modules/@supabase/ssr\docs\design.md:328:   not be sent out if there is no change.** Therefore cookies are set only on
node_modules/@supabase/ssr\src\createServerClient.ts:9:import { createStorageFromOptions, applyServerStorage } from "./cookies";
node_modules/@supabase/ssr\src\createServerClient.ts:18: * @deprecated Please specify `getAll` and `setAll` cookie methods instead of
node_modules/@supabase/ssr\src\createServerClient.ts:22:export function createServerClient<
node_modules/@supabase/ssr\src\createServerClient.ts:36:    cookies: CookieMethodsServerDeprecated;
node_modules/@supabase/ssr\src\createServerClient.ts:50: * in it. The `cookies` option must implement both `getAll` **and** `setAll`
node_modules/@supabase/ssr\src\createServerClient.ts:55: * **IMPORTANT:** Failing to implement `getAll` and `setAll` correctly **will
node_modules/@supabase/ssr\src\createServerClient.ts:64: * cookies or response headers from pages, routes or components ??in those
node_modules/@supabase/ssr\src\createServerClient.ts:65: * cases `setAll` can be omitted, but configure it if you can.
node_modules/@supabase/ssr\src\createServerClient.ts:67: * **IMPORTANT:** If cookies cannot be set from pages or components,
node_modules/@supabase/ssr\src\createServerClient.ts:71: * If `setAll` is not configured, the client emits a warning when it needs to
node_modules/@supabase/ssr\src\createServerClient.ts:72: * write cookies. This usually means one of:
node_modules/@supabase/ssr\src\createServerClient.ts:85: * `getUser()`. Token refreshes write the updated session back to cookies via
node_modules/@supabase/ssr\src\createServerClient.ts:86: * the `setAll` handler.
node_modules/@supabase/ssr\src\createServerClient.ts:92:export function createServerClient<
node_modules/@supabase/ssr\src\createServerClient.ts:106:    cookies: CookieMethodsServer;
node_modules/@supabase/ssr\src\createServerClient.ts:111:export function createServerClient<
node_modules/@supabase/ssr\src\createServerClient.ts:125:    cookies: CookieMethodsServer | CookieMethodsServerDeprecated;
node_modules/@supabase/ssr\src\createServerClient.ts:135:  const { storage, getAll, setAll, setItems, removedItems } =
node_modules/@supabase/ssr\src\createServerClient.ts:151:        "X-Client-Info": `supabase-ssr/${VERSION} createServerClient`,
node_modules/@supabase/ssr\src\createServerClient.ts:156:        ? { storageKey: options.cookieOptions.name }
node_modules/@supabase/ssr\src\createServerClient.ts:159:      flowType: "pkce",
node_modules/@supabase/ssr\src\createServerClient.ts:164:      storage,
node_modules/@supabase/ssr\src\createServerClient.ts:165:      ...(options?.cookies &&
node_modules/@supabase/ssr\src\createServerClient.ts:166:      "encode" in options.cookies &&
node_modules/@supabase/ssr\src\createServerClient.ts:167:      options.cookies.encode === "tokens-only"
node_modules/@supabase/ssr\src\createServerClient.ts:178:    // apply the storage each time it fires, only if there are changes
node_modules/@supabase/ssr\src\createServerClient.ts:194:        { getAll, setAll, setItems, removedItems },
node_modules/@supabase/ssr\src\index.ts:34:export * from "./createBrowserClient";
node_modules/@supabase/ssr\src\index.ts:35:export * from "./createServerClient";
node_modules/@supabase/ssr\src\createBrowserClient.ts:16:import { createStorageFromOptions } from "./cookies";
node_modules/@supabase/ssr\src\createBrowserClient.ts:23: * In most cases you should not configure the `options.cookies` object, as this
node_modules/@supabase/ssr\src\createBrowserClient.ts:25: * `getAll` and `setAll` functions over `get`, `set` and `remove`. The latter
node_modules/@supabase/ssr\src\createBrowserClient.ts:27: * supporting some edge-cases. Both `getAll` and `setAll` (or both `get`, `set`
node_modules/@supabase/ssr\src\createBrowserClient.ts:37:export function createBrowserClient<
node_modules/@supabase/ssr\src\createBrowserClient.ts:50:    cookies?: CookieMethodsBrowser;
node_modules/@supabase/ssr\src\createBrowserClient.ts:58: * @deprecated Please specify `getAll` and `setAll` cookie methods instead of
node_modules/@supabase/ssr\src\createBrowserClient.ts:62:export function createBrowserClient<
node_modules/@supabase/ssr\src\createBrowserClient.ts:75:    cookies: CookieMethodsBrowserDeprecated;
node_modules/@supabase/ssr\src\createBrowserClient.ts:82:export function createBrowserClient<
node_modules/@supabase/ssr\src\createBrowserClient.ts:95:    cookies?: CookieMethodsBrowser | CookieMethodsBrowserDeprecated;
node_modules/@supabase/ssr\src\createBrowserClient.ts:116:  const { storage } = createStorageFromOptions(
node_modules/@supabase/ssr\src\createBrowserClient.ts:131:        "X-Client-Info": `supabase-ssr/${VERSION} createBrowserClient`,
node_modules/@supabase/ssr\src\createBrowserClient.ts:137:        ? { storageKey: options.cookieOptions.name }
node_modules/@supabase/ssr\src\createBrowserClient.ts:139:      flowType: "pkce",
node_modules/@supabase/ssr\src\createBrowserClient.ts:143:      storage,
node_modules/@supabase/ssr\src\createBrowserClient.ts:144:      ...(options?.cookies &&
node_modules/@supabase/ssr\src\createBrowserClient.ts:145:      "encode" in options.cookies &&
node_modules/@supabase/ssr\src\createBrowserClient.ts:146:      options.cookies.encode === "tokens-only"
node_modules/@supabase/ssr\src\cookies.ts:27: * Creates a storage client that handles cookies correctly for browser and
node_modules/@supabase/ssr\src\cookies.ts:30: * @param options The options passed to createBrowserClient or createServer client.
node_modules/@supabase/ssr\src\cookies.ts:32: * @param isServerClient Whether it's called from createServerClient.
node_modules/@supabase/ssr\src\cookies.ts:37:    cookies?:
node_modules/@supabase/ssr\src\cookies.ts:46:  const cookies = options.cookies ?? null;
node_modules/@supabase/ssr\src\cookies.ts:52:  let getAll: (keyHints: string[]) => ReturnType<GetAllCookies>;
node_modules/@supabase/ssr\src\cookies.ts:53:  let setAll: SetAllCookies;
node_modules/@supabase/ssr\src\cookies.ts:55:  if (cookies) {
node_modules/@supabase/ssr\src\cookies.ts:56:    if ("get" in cookies) {
node_modules/@supabase/ssr\src\cookies.ts:57:      // Just get is not enough, because the client needs to see what cookies
node_modules/@supabase/ssr\src\cookies.ts:60:      // storage items. They are then converted to their corresponding cookie
node_modules/@supabase/ssr\src\cookies.ts:75:          const value = await cookies.get(chunkNames[i]);
node_modules/@supabase/ssr\src\cookies.ts:89:      getAll = async (keyHints: string[]) => await getWithHints(keyHints);
node_modules/@supabase/ssr\src\cookies.ts:91:      if ("set" in cookies && "remove" in cookies) {
node_modules/@supabase/ssr\src\cookies.ts:92:        setAll = async (setCookies) => {
node_modules/@supabase/ssr\src\cookies.ts:97:              await cookies.set!(name, value, options);
node_modules/@supabase/ssr\src\cookies.ts:99:              await cookies.remove!(name, options);
node_modules/@supabase/ssr\src\cookies.ts:104:        setAll = async () => {
node_modules/@supabase/ssr\src\cookies.ts:106:            "@supabase/ssr: createServerClient was configured without set and remove cookie methods, but the client needs to set cookies. This can lead to issues such as random logouts, early session termination or increased token refresh requests. If in NextJS, check your middleware.ts file, route handlers and server actions for correctness. Consider switching to the getAll and setAll cookie methods instead of get, set and remove which are deprecated and can be difficult to use correctly.",
node_modules/@supabase/ssr\src\cookies.ts:111:          "@supabase/ssr: createBrowserClient requires configuring a getAll and setAll cookie method (deprecated: alternatively both get, set and remove can be used)",
node_modules/@supabase/ssr\src\cookies.ts:114:    } else if ("getAll" in cookies) {
node_modules/@supabase/ssr\src\cookies.ts:115:      getAll = async () => await cookies.getAll!();
node_modules/@supabase/ssr\src\cookies.ts:117:      if ("setAll" in cookies) {
node_modules/@supabase/ssr\src\cookies.ts:118:        setAll = cookies.setAll!;
node_modules/@supabase/ssr\src\cookies.ts:120:        setAll = async () => {
node_modules/@supabase/ssr\src\cookies.ts:122:            "@supabase/ssr: createServerClient was configured without the setAll cookie method, but the client needs to set cookies. This can lead to issues such as random logouts, early session termination or increased token refresh requests. If in NextJS, check your middleware.ts file, route handlers and server actions for correctness.",
node_modules/@supabase/ssr\src\cookies.ts:127:          "@supabase/ssr: createBrowserClient requires configuring both getAll and setAll cookie methods (deprecated: alternatively both get, set and remove can be used)",
node_modules/@supabase/ssr\src\cookies.ts:131:      // neither get nor getAll is present on cookies, only will occur if pure JavaScript is used, but cookies is an object
node_modules/@supabase/ssr\src\cookies.ts:133:        `@supabase/ssr: ${isServerClient ? "createServerClient" : "createBrowserClient"} requires configuring getAll and setAll cookie methods (deprecated: alternatively use get, set and remove).${isBrowser() ? " As this is called in a browser runtime, consider removing the cookies option object to use the document.cookie API automatically." : ""}`,
node_modules/@supabase/ssr\src\cookies.ts:137:    // The environment is browser, so use the document.cookie API to implement getAll and setAll.
node_modules/@supabase/ssr\src\cookies.ts:148:    getAll = () => noHintGetAll();
node_modules/@supabase/ssr\src\cookies.ts:150:    setAll = (setCookies) => {
node_modules/@supabase/ssr\src\cookies.ts:157:      "@supabase/ssr: createServerClient must be initialized with cookie options that specify getAll and setAll functions (deprecated, not recommended: alternatively use get, set and remove)",
node_modules/@supabase/ssr\src\cookies.ts:160:    // getting cookies when there's no window but we're in browser mode can be OK, because the developer probably is not using auth functions
node_modules/@supabase/ssr\src\cookies.ts:161:    getAll = () => {
node_modules/@supabase/ssr\src\cookies.ts:166:    setAll = () => {
node_modules/@supabase/ssr\src\cookies.ts:168:        "@supabase/ssr: createBrowserClient in non-browser runtimes (including Next.js pre-rendering mode) was not initialized cookie options that specify getAll and setAll functions (deprecated: alternatively use get, set and remove), but they were needed",
node_modules/@supabase/ssr\src\cookies.ts:174:    // This is the storage client to be used in browsers. It only
node_modules/@supabase/ssr\src\cookies.ts:175:    // works on the cookies abstraction, unlike the server client
node_modules/@supabase/ssr\src\cookies.ts:176:    // which only uses cookies to read the initial state. When an
node_modules/@supabase/ssr\src\cookies.ts:177:    // item is set, cookies are both cleared and set to values so
node_modules/@supabase/ssr\src\cookies.ts:180:      getAll, // for type consistency
node_modules/@supabase/ssr\src\cookies.ts:181:      setAll, // for type consistency
node_modules/@supabase/ssr\src\cookies.ts:184:      storage: {
node_modules/@supabase/ssr\src\cookies.ts:187:          const allCookies = await getAll([key]);
node_modules/@supabase/ssr\src\cookies.ts:217:          const allCookies = await getAll([key]);
node_modules/@supabase/ssr\src\cookies.ts:266:            await setAll(allToSet, {});
node_modules/@supabase/ssr\src\cookies.ts:270:          const allCookies = await getAll([key]);
node_modules/@supabase/ssr\src\cookies.ts:287:            await setAll(
node_modules/@supabase/ssr\src\cookies.ts:301:  // This is the server client. It only uses getAll to read the initial
node_modules/@supabase/ssr\src\cookies.ts:303:  // setItems and removedItems objects. createServerClient *must* use
node_modules/@supabase/ssr\src\cookies.ts:304:  // getAll, setAll and the values in setItems and removedItems to
node_modules/@supabase/ssr\src\cookies.ts:309:    getAll,
node_modules/@supabase/ssr\src\cookies.ts:310:    setAll,
node_modules/@supabase/ssr\src\cookies.ts:313:    storage: {
node_modules/@supabase/ssr\src\cookies.ts:314:      // to signal to the libraries that these cookies are
node_modules/@supabase/ssr\src\cookies.ts:327:        const allCookies = await getAll([key]);
node_modules/@supabase/ssr\src\cookies.ts:362:        // set, we need to apply the storage (call `setAll` so the cookie is
node_modules/@supabase/ssr\src\cookies.ts:367:              getAll,
node_modules/@supabase/ssr\src\cookies.ts:368:              setAll,
node_modules/@supabase/ssr\src\cookies.ts:385:        // Intentionally not applying the storage when the key is the PKCE code
node_modules/@supabase/ssr\src\cookies.ts:387:        // so application of the storage will be handled by the
node_modules/@supabase/ssr\src\cookies.ts:398: * When createServerClient needs to apply the created storage to cookies, it
node_modules/@supabase/ssr\src\cookies.ts:399: * should call this function which handles correcly setting cookies for stored
node_modules/@supabase/ssr\src\cookies.ts:400: * and removed items in the storage.
node_modules/@supabase/ssr\src\cookies.ts:404:    getAll,
node_modules/@supabase/ssr\src\cookies.ts:405:    setAll,
node_modules/@supabase/ssr\src\cookies.ts:409:    getAll: (keyHints: string[]) => ReturnType<GetAllCookies>;
node_modules/@supabase/ssr\src\cookies.ts:410:    setAll: SetAllCookies;
node_modules/@supabase/ssr\src\cookies.ts:422:  const allCookies = await getAll([
node_modules/@supabase/ssr\src\cookies.ts:472:  await setAll(
node_modules/@supabase/ssr\src\types.ts:26:  cookies: { name: string; value: string; options: CookieOptions }[],
node_modules/@supabase/ssr\src\types.ts:28:   * Headers that must be set on the HTTP response alongside the cookies.
node_modules/@supabase/ssr\src\types.ts:29:   * Responses that set auth cookies must not be cached by CDNs or
node_modules/@supabase/ssr\src\types.ts:33:   * The library passes the following headers when auth cookies are set:
node_modules/@supabase/ssr\src\types.ts:41:   * setAll(cookiesToSet, headers) {
node_modules/@supabase/ssr\src\types.ts:42:   *   cookiesToSet.forEach(({ name, value, options }) =>
node_modules/@supabase/ssr\src\types.ts:43:   *     response.cookies.set(name, value, options)
node_modules/@supabase/ssr\src\types.ts:62:   * If set to true, only the user's session (access and refresh tokens) will be encoded in cookies. The user object will be encoded in local storage if the `userStorage` option is not provided when creating the client.
node_modules/@supabase/ssr\src\types.ts:64:   * You should keep this option the same between `createBrowserClient()` and `createServerClient()`. When set to `tokens-only` accessing the `user` property on the data returned from `getSession()` will only be possible if the user has already been stored in the separate storage. It's best to use `getClaims()` instead to avoid surprizes.
node_modules/@supabase/ssr\src\types.ts:70:  getAll: GetAllCookies;
node_modules/@supabase/ssr\src\types.ts:71:  setAll: SetAllCookies;
node_modules/@supabase/ssr\src\types.ts:82:   * If set to `tokens-only`, only the user's access and refresh tokens will be encoded in cookies. The user object will be encoded in memory if the `userStorage` option is not provided when creating the client. Unset value defaults to `user-and-tokens`.
node_modules/@supabase/ssr\src\types.ts:84:   * You should keep this option the same between `createBrowserClient()` and `createServerClient()`. When set to `tokens-only` accessing the `user` property on the data returned from `getSession()` will not be possible. Use `getUser()` or preferably `getClaims()` instead.
node_modules/@supabase/ssr\src\types.ts:90:  getAll: GetAllCookies;
node_modules/@supabase/ssr\src\types.ts:93:   * Called by the Supabase Client to write cookies to the response after a
node_modules/@supabase/ssr\src\types.ts:111:   * `getSession()` returns the session directly from cookies without contacting
node_modules/@supabase/ssr\src\types.ts:117:  setAll?: SetAllCookies;
node_modules/@supabase/ssr\dist\module\cookies.d.ts:3: * Creates a storage client that handles cookies correctly for browser and
node_modules/@supabase/ssr\dist\module\cookies.d.ts:6: * @param options The options passed to createBrowserClient or createServer client.
node_modules/@supabase/ssr\dist\module\cookies.d.ts:8: * @param isServerClient Whether it's called from createServerClient.
node_modules/@supabase/ssr\dist\module\cookies.d.ts:12:    cookies?: CookieMethodsBrowser | CookieMethodsBrowserDeprecated | CookieMethodsServer | CookieMethodsServerDeprecated;
node_modules/@supabase/ssr\dist\module\cookies.d.ts:15:    getAll: (keyHints: string[]) => ReturnType<GetAllCookies>;
node_modules/@supabase/ssr\dist\module\cookies.d.ts:16:    setAll: SetAllCookies;
node_modules/@supabase/ssr\dist\module\cookies.d.ts:23:    storage: {
node_modules/@supabase/ssr\dist\module\cookies.d.ts:31: * When createServerClient needs to apply the created storage to cookies, it
node_modules/@supabase/ssr\dist\module\cookies.d.ts:32: * should call this function which handles correcly setting cookies for stored
node_modules/@supabase/ssr\dist\module\cookies.d.ts:33: * and removed items in the storage.
node_modules/@supabase/ssr\dist\module\cookies.d.ts:35:export declare function applyServerStorage({ getAll, setAll, setItems, removedItems, }: {
node_modules/@supabase/ssr\dist\module\cookies.d.ts:36:    getAll: (keyHints: string[]) => ReturnType<GetAllCookies>;
node_modules/@supabase/ssr\dist\module\cookies.d.ts:37:    setAll: SetAllCookies;
node_modules/@supabase/ssr\dist\main\cookies.d.ts:3: * Creates a storage client that handles cookies correctly for browser and
node_modules/@supabase/ssr\dist\main\cookies.d.ts:6: * @param options The options passed to createBrowserClient or createServer client.
node_modules/@supabase/ssr\dist\main\cookies.d.ts:8: * @param isServerClient Whether it's called from createServerClient.
node_modules/@supabase/ssr\dist\main\cookies.d.ts:12:    cookies?: CookieMethodsBrowser | CookieMethodsBrowserDeprecated | CookieMethodsServer | CookieMethodsServerDeprecated;
node_modules/@supabase/ssr\dist\main\cookies.d.ts:15:    getAll: (keyHints: string[]) => ReturnType<GetAllCookies>;
node_modules/@supabase/ssr\dist\main\cookies.d.ts:16:    setAll: SetAllCookies;
node_modules/@supabase/ssr\dist\main\cookies.d.ts:23:    storage: {
node_modules/@supabase/ssr\dist\main\cookies.d.ts:31: * When createServerClient needs to apply the created storage to cookies, it
node_modules/@supabase/ssr\dist\main\cookies.d.ts:32: * should call this function which handles correcly setting cookies for stored
node_modules/@supabase/ssr\dist\main\cookies.d.ts:33: * and removed items in the storage.
node_modules/@supabase/ssr\dist\main\cookies.d.ts:35:export declare function applyServerStorage({ getAll, setAll, setItems, removedItems, }: {
node_modules/@supabase/ssr\dist\main\cookies.d.ts:36:    getAll: (keyHints: string[]) => ReturnType<GetAllCookies>;
node_modules/@supabase/ssr\dist\main\cookies.d.ts:37:    setAll: SetAllCookies;
node_modules/@supabase/ssr\dist\main\cookies.js:9: * Creates a storage client that handles cookies correctly for browser and
node_modules/@supabase/ssr\dist\main\cookies.js:12: * @param options The options passed to createBrowserClient or createServer client.
node_modules/@supabase/ssr\dist\main\cookies.js:14: * @param isServerClient Whether it's called from createServerClient.
node_modules/@supabase/ssr\dist\main\cookies.js:17:    const cookies = options.cookies ?? null;
node_modules/@supabase/ssr\dist\main\cookies.js:21:    let getAll;
node_modules/@supabase/ssr\dist\main\cookies.js:22:    let setAll;
node_modules/@supabase/ssr\dist\main\cookies.js:23:    if (cookies) {
node_modules/@supabase/ssr\dist\main\cookies.js:24:        if ("get" in cookies) {
node_modules/@supabase/ssr\dist\main\cookies.js:25:            // Just get is not enough, because the client needs to see what cookies
node_modules/@supabase/ssr\dist\main\cookies.js:28:            // storage items. They are then converted to their corresponding cookie
node_modules/@supabase/ssr\dist\main\cookies.js:40:                    const value = await cookies.get(chunkNames[i]);
node_modules/@supabase/ssr\dist\main\cookies.js:49:            getAll = async (keyHints) => await getWithHints(keyHints);
node_modules/@supabase/ssr\dist\main\cookies.js:50:            if ("set" in cookies && "remove" in cookies) {
node_modules/@supabase/ssr\dist\main\cookies.js:51:                setAll = async (setCookies) => {
node_modules/@supabase/ssr\dist\main\cookies.js:55:                            await cookies.set(name, value, options);
node_modules/@supabase/ssr\dist\main\cookies.js:58:                            await cookies.remove(name, options);
node_modules/@supabase/ssr\dist\main\cookies.js:64:                setAll = async () => {
node_modules/@supabase/ssr\dist\main\cookies.js:65:                    console.warn("@supabase/ssr: createServerClient was configured without set and remove cookie methods, but the client needs to set cookies. This can lead to issues such as random logouts, early session termination or increased token refresh requests. If in NextJS, check your middleware.ts file, route handlers and server actions for correctness. Consider switching to the getAll and setAll cookie methods instead of get, set and remove which are deprecated and can be difficult to use correctly.");
node_modules/@supabase/ssr\dist\main\cookies.js:69:                throw new Error("@supabase/ssr: createBrowserClient requires configuring a getAll and setAll cookie method (deprecated: alternatively both get, set and remove can be used)");
node_modules/@supabase/ssr\dist\main\cookies.js:72:        else if ("getAll" in cookies) {
node_modules/@supabase/ssr\dist\main\cookies.js:73:            getAll = async () => await cookies.getAll();
node_modules/@supabase/ssr\dist\main\cookies.js:74:            if ("setAll" in cookies) {
node_modules/@supabase/ssr\dist\main\cookies.js:75:                setAll = cookies.setAll;
node_modules/@supabase/ssr\dist\main\cookies.js:78:                setAll = async () => {
node_modules/@supabase/ssr\dist\main\cookies.js:79:                    console.warn("@supabase/ssr: createServerClient was configured without the setAll cookie method, but the client needs to set cookies. This can lead to issues such as random logouts, early session termination or increased token refresh requests. If in NextJS, check your middleware.ts file, route handlers and server actions for correctness.");
node_modules/@supabase/ssr\dist\main\cookies.js:83:                throw new Error("@supabase/ssr: createBrowserClient requires configuring both getAll and setAll cookie methods (deprecated: alternatively both get, set and remove can be used)");
node_modules/@supabase/ssr\dist\main\cookies.js:87:            // neither get nor getAll is present on cookies, only will occur if pure JavaScript is used, but cookies is an object
node_modules/@supabase/ssr\dist\main\cookies.js:88:            throw new Error(`@supabase/ssr: ${isServerClient ? "createServerClient" : "createBrowserClient"} requires configuring getAll and setAll cookie methods (deprecated: alternatively use get, set and remove).${(0, utils_1.isBrowser)() ? " As this is called in a browser runtime, consider removing the cookies option object to use the document.cookie API automatically." : ""}`);
node_modules/@supabase/ssr\dist\main\cookies.js:92:        // The environment is browser, so use the document.cookie API to implement getAll and setAll.
node_modules/@supabase/ssr\dist\main\cookies.js:100:        getAll = () => noHintGetAll();
node_modules/@supabase/ssr\dist\main\cookies.js:101:        setAll = (setCookies) => {
node_modules/@supabase/ssr\dist\main\cookies.js:108:        throw new Error("@supabase/ssr: createServerClient must be initialized with cookie options that specify getAll and setAll functions (deprecated, not recommended: alternatively use get, set and remove)");
node_modules/@supabase/ssr\dist\main\cookies.js:111:        // getting cookies when there's no window but we're in browser mode can be OK, because the developer probably is not using auth functions
node_modules/@supabase/ssr\dist\main\cookies.js:112:        getAll = () => {
node_modules/@supabase/ssr\dist\main\cookies.js:116:        setAll = () => {
node_modules/@supabase/ssr\dist\main\cookies.js:117:            throw new Error("@supabase/ssr: createBrowserClient in non-browser runtimes (including Next.js pre-rendering mode) was not initialized cookie options that specify getAll and setAll functions (deprecated: alternatively use get, set and remove), but they were needed");
node_modules/@supabase/ssr\dist\main\cookies.js:121:        // This is the storage client to be used in browsers. It only
node_modules/@supabase/ssr\dist\main\cookies.js:122:        // works on the cookies abstraction, unlike the server client
node_modules/@supabase/ssr\dist\main\cookies.js:123:        // which only uses cookies to read the initial state. When an
node_modules/@supabase/ssr\dist\main\cookies.js:124:        // item is set, cookies are both cleared and set to values so
node_modules/@supabase/ssr\dist\main\cookies.js:127:            getAll, // for type consistency
node_modules/@supabase/ssr\dist\main\cookies.js:128:            setAll, // for type consistency
node_modules/@supabase/ssr\dist\main\cookies.js:131:            storage: {
node_modules/@supabase/ssr\dist\main\cookies.js:134:                    const allCookies = await getAll([key]);
node_modules/@supabase/ssr\dist\main\cookies.js:152:                    const allCookies = await getAll([key]);
node_modules/@supabase/ssr\dist\main\cookies.js:190:                        await setAll(allToSet, {});
node_modules/@supabase/ssr\dist\main\cookies.js:194:                    const allCookies = await getAll([key]);
node_modules/@supabase/ssr\dist\main\cookies.js:206:                        await setAll(removeCookies.map((name) => ({
node_modules/@supabase/ssr\dist\main\cookies.js:216:    // This is the server client. It only uses getAll to read the initial
node_modules/@supabase/ssr\dist\main\cookies.js:218:    // setItems and removedItems objects. createServerClient *must* use
node_modules/@supabase/ssr\dist\main\cookies.js:219:    // getAll, setAll and the values in setItems and removedItems to
node_modules/@supabase/ssr\dist\main\cookies.js:224:        getAll,
node_modules/@supabase/ssr\dist\main\cookies.js:225:        setAll,
node_modules/@supabase/ssr\dist\main\cookies.js:228:        storage: {
node_modules/@supabase/ssr\dist\main\cookies.js:229:            // to signal to the libraries that these cookies are
node_modules/@supabase/ssr\dist\main\cookies.js:240:                const allCookies = await getAll([key]);
node_modules/@supabase/ssr\dist\main\cookies.js:261:                // set, we need to apply the storage (call `setAll` so the cookie is
node_modules/@supabase/ssr\dist\main\cookies.js:265:                        getAll,
node_modules/@supabase/ssr\dist\main\cookies.js:266:                        setAll,
node_modules/@supabase/ssr\dist\main\cookies.js:280:                // Intentionally not applying the storage when the key is the PKCE code
node_modules/@supabase/ssr\dist\main\cookies.js:282:                // so application of the storage will be handled by the
node_modules/@supabase/ssr\dist\main\cookies.js:292: * When createServerClient needs to apply the created storage to cookies, it
node_modules/@supabase/ssr\dist\main\cookies.js:293: * should call this function which handles correcly setting cookies for stored
node_modules/@supabase/ssr\dist\main\cookies.js:294: * and removed items in the storage.
node_modules/@supabase/ssr\dist\main\cookies.js:296:async function applyServerStorage({ getAll, setAll, setItems, removedItems, }, options) {
node_modules/@supabase/ssr\dist\main\cookies.js:299:    const allCookies = await getAll([
node_modules/@supabase/ssr\dist\main\cookies.js:334:    await setAll([
node_modules/@supabase/ssr\dist\main\cookies.js:351://# sourceMappingURL=cookies.js.map
node_modules/@supabase/ssr\dist\main\cookies.js.map:1:{"version":3,"file":"cookies.js","sourceRoot":"","sources":["../../src/cookies.ts"],"names":[],"mappings":"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"}
node_modules/@supabase/ssr\dist\module\cookies.js:5: * Creates a storage client that handles cookies correctly for browser and
node_modules/@supabase/ssr\dist\module\cookies.js:8: * @param options The options passed to createBrowserClient or createServer client.
node_modules/@supabase/ssr\dist\module\cookies.js:10: * @param isServerClient Whether it's called from createServerClient.
node_modules/@supabase/ssr\dist\module\cookies.js:13:    const cookies = options.cookies ?? null;
node_modules/@supabase/ssr\dist\module\cookies.js:17:    let getAll;
node_modules/@supabase/ssr\dist\module\cookies.js:18:    let setAll;
node_modules/@supabase/ssr\dist\module\cookies.js:19:    if (cookies) {
node_modules/@supabase/ssr\dist\module\cookies.js:20:        if ("get" in cookies) {
node_modules/@supabase/ssr\dist\module\cookies.js:21:            // Just get is not enough, because the client needs to see what cookies
node_modules/@supabase/ssr\dist\module\cookies.js:24:            // storage items. They are then converted to their corresponding cookie
node_modules/@supabase/ssr\dist\module\cookies.js:36:                    const value = await cookies.get(chunkNames[i]);
node_modules/@supabase/ssr\dist\module\cookies.js:45:            getAll = async (keyHints) => await getWithHints(keyHints);
node_modules/@supabase/ssr\dist\module\cookies.js:46:            if ("set" in cookies && "remove" in cookies) {
node_modules/@supabase/ssr\dist\module\cookies.js:47:                setAll = async (setCookies) => {
node_modules/@supabase/ssr\dist\module\cookies.js:51:                            await cookies.set(name, value, options);
node_modules/@supabase/ssr\dist\module\cookies.js:54:                            await cookies.remove(name, options);
node_modules/@supabase/ssr\dist\module\cookies.js:60:                setAll = async () => {
node_modules/@supabase/ssr\dist\module\cookies.js:61:                    console.warn("@supabase/ssr: createServerClient was configured without set and remove cookie methods, but the client needs to set cookies. This can lead to issues such as random logouts, early session termination or increased token refresh requests. If in NextJS, check your middleware.ts file, route handlers and server actions for correctness. Consider switching to the getAll and setAll cookie methods instead of get, set and remove which are deprecated and can be difficult to use correctly.");
node_modules/@supabase/ssr\dist\module\cookies.js:65:                throw new Error("@supabase/ssr: createBrowserClient requires configuring a getAll and setAll cookie method (deprecated: alternatively both get, set and remove can be used)");
node_modules/@supabase/ssr\dist\module\cookies.js:68:        else if ("getAll" in cookies) {
node_modules/@supabase/ssr\dist\module\cookies.js:69:            getAll = async () => await cookies.getAll();
node_modules/@supabase/ssr\dist\module\cookies.js:70:            if ("setAll" in cookies) {
node_modules/@supabase/ssr\dist\module\cookies.js:71:                setAll = cookies.setAll;
node_modules/@supabase/ssr\dist\module\cookies.js:74:                setAll = async () => {
node_modules/@supabase/ssr\dist\module\cookies.js:75:                    console.warn("@supabase/ssr: createServerClient was configured without the setAll cookie method, but the client needs to set cookies. This can lead to issues such as random logouts, early session termination or increased token refresh requests. If in NextJS, check your middleware.ts file, route handlers and server actions for correctness.");
node_modules/@supabase/ssr\dist\module\cookies.js:79:                throw new Error("@supabase/ssr: createBrowserClient requires configuring both getAll and setAll cookie methods (deprecated: alternatively both get, set and remove can be used)");
node_modules/@supabase/ssr\dist\module\cookies.js:83:            // neither get nor getAll is present on cookies, only will occur if pure JavaScript is used, but cookies is an object
node_modules/@supabase/ssr\dist\module\cookies.js:84:            throw new Error(`@supabase/ssr: ${isServerClient ? "createServerClient" : "createBrowserClient"} requires configuring getAll and setAll cookie methods (deprecated: alternatively use get, set and remove).${isBrowser() ? " As this is called in a browser runtime, consider removing the cookies option object to use the document.cookie API automatically." : ""}`);
node_modules/@supabase/ssr\dist\module\cookies.js:88:        // The environment is browser, so use the document.cookie API to implement getAll and setAll.
node_modules/@supabase/ssr\dist\module\cookies.js:96:        getAll = () => noHintGetAll();
node_modules/@supabase/ssr\dist\module\cookies.js:97:        setAll = (setCookies) => {
node_modules/@supabase/ssr\dist\module\cookies.js:104:        throw new Error("@supabase/ssr: createServerClient must be initialized with cookie options that specify getAll and setAll functions (deprecated, not recommended: alternatively use get, set and remove)");
node_modules/@supabase/ssr\dist\module\cookies.js:107:        // getting cookies when there's no window but we're in browser mode can be OK, because the developer probably is not using auth functions
node_modules/@supabase/ssr\dist\module\cookies.js:108:        getAll = () => {
node_modules/@supabase/ssr\dist\module\cookies.js:112:        setAll = () => {
node_modules/@supabase/ssr\dist\module\cookies.js:113:            throw new Error("@supabase/ssr: createBrowserClient in non-browser runtimes (including Next.js pre-rendering mode) was not initialized cookie options that specify getAll and setAll functions (deprecated: alternatively use get, set and remove), but they were needed");
node_modules/@supabase/ssr\dist\module\cookies.js:117:        // This is the storage client to be used in browsers. It only
node_modules/@supabase/ssr\dist\module\cookies.js:118:        // works on the cookies abstraction, unlike the server client
node_modules/@supabase/ssr\dist\module\cookies.js:119:        // which only uses cookies to read the initial state. When an
node_modules/@supabase/ssr\dist\module\cookies.js:120:        // item is set, cookies are both cleared and set to values so
node_modules/@supabase/ssr\dist\module\cookies.js:123:            getAll, // for type consistency
node_modules/@supabase/ssr\dist\module\cookies.js:124:            setAll, // for type consistency
node_modules/@supabase/ssr\dist\module\cookies.js:127:            storage: {
node_modules/@supabase/ssr\dist\module\cookies.js:130:                    const allCookies = await getAll([key]);
node_modules/@supabase/ssr\dist\module\cookies.js:148:                    const allCookies = await getAll([key]);
node_modules/@supabase/ssr\dist\module\cookies.js:186:                        await setAll(allToSet, {});
node_modules/@supabase/ssr\dist\module\cookies.js:190:                    const allCookies = await getAll([key]);
node_modules/@supabase/ssr\dist\module\cookies.js:202:                        await setAll(removeCookies.map((name) => ({
node_modules/@supabase/ssr\dist\module\cookies.js:212:    // This is the server client. It only uses getAll to read the initial
node_modules/@supabase/ssr\dist\module\cookies.js:214:    // setItems and removedItems objects. createServerClient *must* use
node_modules/@supabase/ssr\dist\module\cookies.js:215:    // getAll, setAll and the values in setItems and removedItems to
node_modules/@supabase/ssr\dist\module\cookies.js:220:        getAll,
node_modules/@supabase/ssr\dist\module\cookies.js:221:        setAll,
node_modules/@supabase/ssr\dist\module\cookies.js:224:        storage: {
node_modules/@supabase/ssr\dist\module\cookies.js:225:            // to signal to the libraries that these cookies are
node_modules/@supabase/ssr\dist\module\cookies.js:236:                const allCookies = await getAll([key]);
node_modules/@supabase/ssr\dist\module\cookies.js:257:                // set, we need to apply the storage (call `setAll` so the cookie is
node_modules/@supabase/ssr\dist\module\cookies.js:261:                        getAll,
node_modules/@supabase/ssr\dist\module\cookies.js:262:                        setAll,
node_modules/@supabase/ssr\dist\module\cookies.js:276:                // Intentionally not applying the storage when the key is the PKCE code
node_modules/@supabase/ssr\dist\module\cookies.js:278:                // so application of the storage will be handled by the
node_modules/@supabase/ssr\dist\module\cookies.js:288: * When createServerClient needs to apply the created storage to cookies, it
node_modules/@supabase/ssr\dist\module\cookies.js:289: * should call this function which handles correcly setting cookies for stored
node_modules/@supabase/ssr\dist\module\cookies.js:290: * and removed items in the storage.
node_modules/@supabase/ssr\dist\module\cookies.js:292:export async function applyServerStorage({ getAll, setAll, setItems, removedItems, }, options) {
node_modules/@supabase/ssr\dist\module\cookies.js:295:    const allCookies = await getAll([
node_modules/@supabase/ssr\dist\module\cookies.js:330:    await setAll([
node_modules/@supabase/ssr\dist\module\cookies.js:347://# sourceMappingURL=cookies.js.map
node_modules/@supabase/ssr\dist\module\cookies.js.map:1:{"version":3,"file":"cookies.js","sourceRoot":"","sources":["../../src/cookies.ts"],"names":[],"mappings":"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"}
node_modules/@supabase/ssr\dist\main\createBrowserClient.js:3:exports.createBrowserClient = createBrowserClient;
node_modules/@supabase/ssr\dist\main\createBrowserClient.js:7:const cookies_1 = require("./cookies");
node_modules/@supabase/ssr\dist\main\createBrowserClient.js:9:function createBrowserClient(supabaseUrl, supabaseKey, options) {
node_modules/@supabase/ssr\dist\main\createBrowserClient.js:19:    const { storage } = (0, cookies_1.createStorageFromOptions)({
node_modules/@supabase/ssr\dist\main\createBrowserClient.js:30:                "X-Client-Info": `supabase-ssr/${version_1.VERSION} createBrowserClient`,
node_modules/@supabase/ssr\dist\main\createBrowserClient.js:36:                ? { storageKey: options.cookieOptions.name }
node_modules/@supabase/ssr\dist\main\createBrowserClient.js:38:            flowType: "pkce",
node_modules/@supabase/ssr\dist\main\createBrowserClient.js:42:            storage,
node_modules/@supabase/ssr\dist\main\createBrowserClient.js:43:            ...(options?.cookies &&
node_modules/@supabase/ssr\dist\main\createBrowserClient.js:44:                "encode" in options.cookies &&
node_modules/@supabase/ssr\dist\main\createBrowserClient.js:45:                options.cookies.encode === "tokens-only"
node_modules/@supabase/ssr\dist\main\createBrowserClient.js:57://# sourceMappingURL=createBrowserClient.js.map
node_modules/@supabase/ssr\dist\module\createBrowserClient.d.ts:6: * In most cases you should not configure the `options.cookies` object, as this
node_modules/@supabase/ssr\dist\module\createBrowserClient.d.ts:8: * `getAll` and `setAll` functions over `get`, `set` and `remove`. The latter
node_modules/@supabase/ssr\dist\module\createBrowserClient.d.ts:10: * supporting some edge-cases. Both `getAll` and `setAll` (or both `get`, `set`
node_modules/@supabase/ssr\dist\module\createBrowserClient.d.ts:20:export declare function createBrowserClient<Database = any, SchemaName extends string & keyof Omit<Database, "__InternalSupabase"> = "public" extends keyof Omit<Database, "__InternalSupabase"> ? "public" : string & keyof Omit<Database, "__InternalSupabase">>(supabaseUrl: string, supabaseKey: string, options?: SupabaseClientOptions<SchemaName> & {
node_modules/@supabase/ssr\dist\module\createBrowserClient.d.ts:21:    cookies?: CookieMethodsBrowser;
node_modules/@supabase/ssr\dist\module\createBrowserClient.d.ts:27: * @deprecated Please specify `getAll` and `setAll` cookie methods instead of
node_modules/@supabase/ssr\dist\module\createBrowserClient.d.ts:31:export declare function createBrowserClient<Database = any, SchemaName extends string & keyof Omit<Database, "__InternalSupabase"> = "public" extends keyof Omit<Database, "__InternalSupabase"> ? "public" : string & keyof Omit<Database, "__InternalSupabase">>(supabaseUrl: string, supabaseKey: string, options?: SupabaseClientOptions<SchemaName> & {
node_modules/@supabase/ssr\dist\module\createBrowserClient.d.ts:32:    cookies: CookieMethodsBrowserDeprecated;
node_modules/@supabase/ssr\dist\main\createBrowserClient.js.map:1:{"version":3,"file":"createBrowserClient.js","sourceRoot":"","sources":["../../src/createBrowserClient.ts"],"names":[],"mappings":";;AAiFA,kDA6EC;AA9JD,uDAI+B;AAE/B,uCAAoC;AACpC,mCAAoC;AAQpC,uCAAqD;AAErD,IAAI,mBAA8D,CAAC;AAgEnE,SAAgB,mBAAmB,CAUjC,WAAmB,EACnB,WAAmB,EACnB,OAKC;IAED,2HAA2H;IAC3H,MAAM,kBAAkB,GACtB,OAAO,EAAE,WAAW,KAAK,IAAI;QAC7B,CAAC,CAAC,CAAC,OAAO,IAAI,CAAC,CAAC,aAAa,IAAI,OAAO,CAAC,CAAC,IAAI,IAAA,iBAAS,GAAE,CAAC,CAAC;IAE7D,IAAI,kBAAkB,IAAI,mBAAmB,EAAE,CAAC;QAC9C,OAAO,mBAAmB,CAAC;IAC7B,CAAC;IAED,IAAI,CAAC,WAAW,IAAI,CAAC,WAAW,EAAE,CAAC;QACjC,MAAM,IAAI,KAAK,CACb,qNAAqN,CACtN,CAAC;IACJ,CAAC;IAED,MAAM,EAAE,OAAO,EAAE,GAAG,IAAA,kCAAwB,EAC1C;QACE,GAAG,OAAO;QACV,cAAc,EAAE,OAAO,EAAE,cAAc,IAAI,WAAW;KACvD,EACD,KAAK,CACN,CAAC;IAEF,MAAM,MAAM,GAAG,IAAA,0BAAY,EAAuB,WAAW,EAAE,WAAW,EAAE;QAC1E,2BAA2B;QAC3B,GAAI,OAAe;QACnB,MAAM,EAAE;YACN,GAAG,OAAO,EAAE,MAAM;YAClB,OAAO,EAAE;gBACP,GAAG,OAAO,EAAE,MAAM,EAAE,OAAO;gBAC3B,eAAe,EAAE,gBAAgB,iBAAO,sBAAsB;aAC/D;SACF;QACD,IAAI,EAAE;YACJ,GAAG,OAAO,EAAE,IAAI;YAChB,GAAG,CAAC,OAAO,EAAE,aAAa,EAAE,IAAI;gBAC9B,CAAC,CAAC,EAAE,UAAU,EAAE,OAAO,CAAC,aAAa,CAAC,IAAI,EAAE;gBAC5C,CAAC,CAAC,IAAI,CAAC;YACT,QAAQ,EAAE,MAAM;YAChB,gBAAgB,EAAE,OAAO,EAAE,IAAI,EAAE,gBAAgB,IAAI,IAAA,iBAAS,GAAE;YAChE,kBAAkB,EAAE,OAAO,EAAE,IAAI,EAAE,kBAAkB,IAAI,IAAA,iBAAS,GAAE;YACpE,cAAc,EAAE,OAAO,EAAE,IAAI,EAAE,cAAc,IAAI,IAAI;YACrD,OAAO;YACP,GAAG,CAAC,OAAO,EAAE,OAAO;gBACpB,QAAQ,IAAI,OAAO,CAAC,OAAO;gBAC3B,OAAO,CAAC,OAAO,CAAC,MAAM,KAAK,aAAa;gBACtC,CAAC,CAAC;oBACE,WAAW,EAAE,OAAO,EAAE,IAAI,EAAE,WAAW,IAAI,MAAM,CAAC,YAAY;iBAC/D;gBACH,CAAC,CAAC,IAAI,CAAC;SACV;KACF,CAAC,CAAC;IAEH,IAAI,kBAAkB,EAAE,CAAC;QACvB,mBAAmB,GAAG,MAAM,CAAC;IAC/B,CAAC;IAED,OAAO,MAAM,CAAC;AAChB,CAAC"}
node_modules/@supabase/ssr\dist\main\createBrowserClient.d.ts:6: * In most cases you should not configure the `options.cookies` object, as this
node_modules/@supabase/ssr\dist\main\createBrowserClient.d.ts:8: * `getAll` and `setAll` functions over `get`, `set` and `remove`. The latter
node_modules/@supabase/ssr\dist\main\createBrowserClient.d.ts:10: * supporting some edge-cases. Both `getAll` and `setAll` (or both `get`, `set`
node_modules/@supabase/ssr\dist\main\createBrowserClient.d.ts:20:export declare function createBrowserClient<Database = any, SchemaName extends string & keyof Omit<Database, "__InternalSupabase"> = "public" extends keyof Omit<Database, "__InternalSupabase"> ? "public" : string & keyof Omit<Database, "__InternalSupabase">>(supabaseUrl: string, supabaseKey: string, options?: SupabaseClientOptions<SchemaName> & {
node_modules/@supabase/ssr\dist\main\createBrowserClient.d.ts:21:    cookies?: CookieMethodsBrowser;
node_modules/@supabase/ssr\dist\main\createBrowserClient.d.ts:27: * @deprecated Please specify `getAll` and `setAll` cookie methods instead of
node_modules/@supabase/ssr\dist\main\createBrowserClient.d.ts:31:export declare function createBrowserClient<Database = any, SchemaName extends string & keyof Omit<Database, "__InternalSupabase"> = "public" extends keyof Omit<Database, "__InternalSupabase"> ? "public" : string & keyof Omit<Database, "__InternalSupabase">>(supabaseUrl: string, supabaseKey: string, options?: SupabaseClientOptions<SchemaName> & {
node_modules/@supabase/ssr\dist\main\createBrowserClient.d.ts:32:    cookies: CookieMethodsBrowserDeprecated;
node_modules/@supabase/ssr\dist\main\createServerClient.d.ts:4: * @deprecated Please specify `getAll` and `setAll` cookie methods instead of
node_modules/@supabase/ssr\dist\main\createServerClient.d.ts:8:export declare function createServerClient<Database = any, SchemaName extends string & keyof Omit<Database, "__InternalSupabase"> = "public" extends keyof Omit<Database, "__InternalSupabase"> ? "public" : string & keyof Omit<Database, "__InternalSupabase">>(supabaseUrl: string, supabaseKey: string, options: SupabaseClientOptions<SchemaName> & {
node_modules/@supabase/ssr\dist\main\createServerClient.d.ts:10:    cookies: CookieMethodsServerDeprecated;
node_modules/@supabase/ssr\dist\main\createServerClient.d.ts:22: * in it. The `cookies` option must implement both `getAll` **and** `setAll`
node_modules/@supabase/ssr\dist\main\createServerClient.d.ts:27: * **IMPORTANT:** Failing to implement `getAll` and `setAll` correctly **will
node_modules/@supabase/ssr\dist\main\createServerClient.d.ts:36: * cookies or response headers from pages, routes or components ??in those
node_modules/@supabase/ssr\dist\main\createServerClient.d.ts:37: * cases `setAll` can be omitted, but configure it if you can.
node_modules/@supabase/ssr\dist\main\createServerClient.d.ts:39: * **IMPORTANT:** If cookies cannot be set from pages or components,
node_modules/@supabase/ssr\dist\main\createServerClient.d.ts:43: * If `setAll` is not configured, the client emits a warning when it needs to
node_modules/@supabase/ssr\dist\main\createServerClient.d.ts:44: * write cookies. This usually means one of:
node_modules/@supabase/ssr\dist\main\createServerClient.d.ts:57: * `getUser()`. Token refreshes write the updated session back to cookies via
node_modules/@supabase/ssr\dist\main\createServerClient.d.ts:58: * the `setAll` handler.
node_modules/@supabase/ssr\dist\main\createServerClient.d.ts:64:export declare function createServerClient<Database = any, SchemaName extends string & keyof Omit<Database, "__InternalSupabase"> = "public" extends keyof Omit<Database, "__InternalSupabase"> ? "public" : string & keyof Omit<Database, "__InternalSupabase">>(supabaseUrl: string, supabaseKey: string, options: SupabaseClientOptions<SchemaName> & {
node_modules/@supabase/ssr\dist\main\createServerClient.d.ts:66:    cookies: CookieMethodsServer;
node_modules/@supabase/ssr\dist\main\createServerClient.js:3:exports.createServerClient = createServerClient;
node_modules/@supabase/ssr\dist\main\createServerClient.js:6:const cookies_1 = require("./cookies");
node_modules/@supabase/ssr\dist\main\createServerClient.js:8:function createServerClient(supabaseUrl, supabaseKey, options) {
node_modules/@supabase/ssr\dist\main\createServerClient.js:12:    const { storage, getAll, setAll, setItems, removedItems } = (0, cookies_1.createStorageFromOptions)({
node_modules/@supabase/ssr\dist\main\createServerClient.js:23:                "X-Client-Info": `supabase-ssr/${version_1.VERSION} createServerClient`,
node_modules/@supabase/ssr\dist\main\createServerClient.js:28:                ? { storageKey: options.cookieOptions.name }
node_modules/@supabase/ssr\dist\main\createServerClient.js:31:            flowType: "pkce",
node_modules/@supabase/ssr\dist\main\createServerClient.js:36:            storage,
node_modules/@supabase/ssr\dist\main\createServerClient.js:37:            ...(options?.cookies &&
node_modules/@supabase/ssr\dist\main\createServerClient.js:38:                "encode" in options.cookies &&
node_modules/@supabase/ssr\dist\main\createServerClient.js:39:                options.cookies.encode === "tokens-only"
node_modules/@supabase/ssr\dist\main\createServerClient.js:48:        // apply the storage each time it fires, only if there are changes
node_modules/@supabase/ssr\dist\main\createServerClient.js:59:            await (0, cookies_1.applyServerStorage)({ getAll, setAll, setItems, removedItems }, {
node_modules/@supabase/ssr\dist\main\createServerClient.js:67://# sourceMappingURL=createServerClient.js.map
node_modules/@supabase/ssr\dist\main\createServerClient.js.map:1:{"version":3,"file":"createServerClient.js","sourceRoot":"","sources":["../../src/createServerClient.ts"],"names":[],"mappings":";;AA8GA,gDA6FC;AA3MD,uDAK+B;AAE/B,uCAAoC;AACpC,uCAAyE;AAMzE,6CAA4D;AAgG5D,SAAgB,kBAAkB,CAUhC,WAAmB,EACnB,WAAmB,EACnB,OAIC;IAED,IAAI,CAAC,WAAW,IAAI,CAAC,WAAW,EAAE,CAAC;QACjC,MAAM,IAAI,KAAK,CACb,kMAAkM,CACnM,CAAC;IACJ,CAAC;IAED,MAAM,EAAE,OAAO,EAAE,MAAM,EAAE,MAAM,EAAE,QAAQ,EAAE,YAAY,EAAE,GACvD,IAAA,kCAAwB,EACtB;QACE,GAAG,OAAO;QACV,cAAc,EAAE,OAAO,EAAE,cAAc,IAAI,WAAW;KACvD,EACD,IAAI,CACL,CAAC;IAEJ,MAAM,MAAM,GAAG,IAAA,0BAAY,EAAuB,WAAW,EAAE,WAAW,EAAE;QAC1E,2BAA2B;QAC3B,GAAI,OAAe;QACnB,MAAM,EAAE;YACN,GAAG,OAAO,EAAE,MAAM;YAClB,OAAO,EAAE;gBACP,GAAG,OAAO,EAAE,MAAM,EAAE,OAAO;gBAC3B,eAAe,EAAE,gBAAgB,iBAAO,qBAAqB;aAC9D;SACF;QACD,IAAI,EAAE;YACJ,GAAG,CAAC,OAAO,EAAE,aAAa,EAAE,IAAI;gBAC9B,CAAC,CAAC,EAAE,UAAU,EAAE,OAAO,CAAC,aAAa,CAAC,IAAI,EAAE;gBAC5C,CAAC,CAAC,IAAI,CAAC;YACT,GAAG,OAAO,EAAE,IAAI;YAChB,QAAQ,EAAE,MAAM;YAChB,gBAAgB,EAAE,KAAK;YACvB,kBAAkB,EAAE,KAAK;YACzB,cAAc,EAAE,IAAI;YACpB,kBAAkB,EAAE,IAAI;YACxB,OAAO;YACP,GAAG,CAAC,OAAO,EAAE,OAAO;gBACpB,QAAQ,IAAI,OAAO,CAAC,OAAO;gBAC3B,OAAO,CAAC,OAAO,CAAC,MAAM,KAAK,aAAa;gBACtC,CAAC,CAAC;oBACE,WAAW,EACT,OAAO,EAAE,IAAI,EAAE,WAAW,IAAI,IAAA,mCAAyB,GAAE;iBAC5D;gBACH,CAAC,CAAC,IAAI,CAAC;SACV;KACF,CAAC,CAAC;IAEH,MAAM,CAAC,IAAI,CAAC,iBAAiB,CAAC,KAAK,EAAE,KAAsB,EAAE,EAAE;QAC7D,gEAAgE;QAChE,kEAAkE;QAClE,iEAAiE;QACjE,QAAQ;QACR,MAAM,iBAAiB,GACrB,MAAM,CAAC,IAAI,CAAC,QAAQ,CAAC,CAAC,MAAM,GAAG,CAAC,IAAI,MAAM,CAAC,IAAI,CAAC,YAAY,CAAC,CAAC,MAAM,GAAG,CAAC,CAAC;QAE3E,IACE,iBAAiB;YACjB,CAAC,KAAK,KAAK,WAAW;gBACpB,KAAK,KAAK,iBAAiB;gBAC3B,KAAK,KAAK,cAAc;gBACxB,KAAK,KAAK,mBAAmB;gBAC7B,KAAK,KAAK,YAAY;gBACtB,KAAK,KAAK,wBAAwB,CAAC,EACrC,CAAC;YACD,MAAM,IAAA,4BAAkB,EACtB,EAAE,MAAM,EAAE,MAAM,EAAE,QAAQ,EAAE,YAAY,EAAE,EAC1C;gBACE,aAAa,EAAE,OAAO,EAAE,aAAa,IAAI,IAAI;gBAC7C,cAAc,EAAE,OAAO,EAAE,cAAc,IAAI,WAAW;aACvD,CACF,CAAC;QACJ,CAAC;IACH,CAAC,CAAC,CAAC;IAEH,OAAO,MAAM,CAAC;AAChB,CAAC"}
node_modules/@supabase/ssr\dist\main\index.d.ts:1:export * from "./createBrowserClient";
node_modules/@supabase/ssr\dist\main\index.d.ts:2:export * from "./createServerClient";
node_modules/@supabase/ssr\dist\main\index.js:48:__exportStar(require("./createBrowserClient"), exports);
node_modules/@supabase/ssr\dist\main\index.js:49:__exportStar(require("./createServerClient"), exports);
node_modules/@supabase/ssr\dist\main\types.d.ts:16:export type SetAllCookies = (cookies: {
node_modules/@supabase/ssr\dist\main\types.d.ts:22: * Headers that must be set on the HTTP response alongside the cookies.
node_modules/@supabase/ssr\dist\main\types.d.ts:23: * Responses that set auth cookies must not be cached by CDNs or
node_modules/@supabase/ssr\dist\main\types.d.ts:27: * The library passes the following headers when auth cookies are set:
node_modules/@supabase/ssr\dist\main\types.d.ts:35: * setAll(cookiesToSet, headers) {
node_modules/@supabase/ssr\dist\main\types.d.ts:36: *   cookiesToSet.forEach(({ name, value, options }) =>
node_modules/@supabase/ssr\dist\main\types.d.ts:37: *     response.cookies.set(name, value, options)
node_modules/@supabase/ssr\dist\main\types.d.ts:53:     * If set to true, only the user's session (access and refresh tokens) will be encoded in cookies. The user object will be encoded in local storage if the `userStorage` option is not provided when creating the client.
node_modules/@supabase/ssr\dist\main\types.d.ts:55:     * You should keep this option the same between `createBrowserClient()` and `createServerClient()`. When set to `tokens-only` accessing the `user` property on the data returned from `getSession()` will only be possible if the user has already been stored in the separate storage. It's best to use `getClaims()` instead to avoid surprizes.
node_modules/@supabase/ssr\dist\main\types.d.ts:60:    getAll: GetAllCookies;
node_modules/@supabase/ssr\dist\main\types.d.ts:61:    setAll: SetAllCookies;
node_modules/@supabase/ssr\dist\main\types.d.ts:70:     * If set to `tokens-only`, only the user's access and refresh tokens will be encoded in cookies. The user object will be encoded in memory if the `userStorage` option is not provided when creating the client. Unset value defaults to `user-and-tokens`.
node_modules/@supabase/ssr\dist\main\types.d.ts:72:     * You should keep this option the same between `createBrowserClient()` and `createServerClient()`. When set to `tokens-only` accessing the `user` property on the data returned from `getSession()` will not be possible. Use `getUser()` or preferably `getClaims()` instead.
node_modules/@supabase/ssr\dist\main\types.d.ts:77:    getAll: GetAllCookies;
node_modules/@supabase/ssr\dist\main\types.d.ts:79:     * Called by the Supabase Client to write cookies to the response after a
node_modules/@supabase/ssr\dist\main\types.d.ts:97:     * `getSession()` returns the session directly from cookies without contacting
node_modules/@supabase/ssr\dist\main\types.d.ts:103:    setAll?: SetAllCookies;
node_modules/@supabase/ssr\dist\module\createBrowserClient.js:4:import { createStorageFromOptions } from "./cookies";
node_modules/@supabase/ssr\dist\module\createBrowserClient.js:6:export function createBrowserClient(supabaseUrl, supabaseKey, options) {
node_modules/@supabase/ssr\dist\module\createBrowserClient.js:16:    const { storage } = createStorageFromOptions({
node_modules/@supabase/ssr\dist\module\createBrowserClient.js:27:                "X-Client-Info": `supabase-ssr/${VERSION} createBrowserClient`,
node_modules/@supabase/ssr\dist\module\createBrowserClient.js:33:                ? { storageKey: options.cookieOptions.name }
node_modules/@supabase/ssr\dist\module\createBrowserClient.js:35:            flowType: "pkce",
node_modules/@supabase/ssr\dist\module\createBrowserClient.js:39:            storage,
node_modules/@supabase/ssr\dist\module\createBrowserClient.js:40:            ...(options?.cookies &&
node_modules/@supabase/ssr\dist\module\createBrowserClient.js:41:                "encode" in options.cookies &&
node_modules/@supabase/ssr\dist\module\createBrowserClient.js:42:                options.cookies.encode === "tokens-only"
node_modules/@supabase/ssr\dist\module\createBrowserClient.js:54://# sourceMappingURL=createBrowserClient.js.map
node_modules/@supabase/ssr\dist\module\createBrowserClient.js.map:1:{"version":3,"file":"createBrowserClient.js","sourceRoot":"","sources":["../../src/createBrowserClient.ts"],"names":[],"mappings":"AAAA,OAAO,EACL,YAAY,GAGb,MAAM,uBAAuB,CAAC;AAE/B,OAAO,EAAE,OAAO,EAAE,MAAM,WAAW,CAAC;AACpC,OAAO,EAAE,SAAS,EAAE,MAAM,SAAS,CAAC;AAQpC,OAAO,EAAE,wBAAwB,EAAE,MAAM,WAAW,CAAC;AAErD,IAAI,mBAA8D,CAAC;AAgEnE,MAAM,UAAU,mBAAmB,CAUjC,WAAmB,EACnB,WAAmB,EACnB,OAKC;IAED,2HAA2H;IAC3H,MAAM,kBAAkB,GACtB,OAAO,EAAE,WAAW,KAAK,IAAI;QAC7B,CAAC,CAAC,CAAC,OAAO,IAAI,CAAC,CAAC,aAAa,IAAI,OAAO,CAAC,CAAC,IAAI,SAAS,EAAE,CAAC,CAAC;IAE7D,IAAI,kBAAkB,IAAI,mBAAmB,EAAE,CAAC;QAC9C,OAAO,mBAAmB,CAAC;IAC7B,CAAC;IAED,IAAI,CAAC,WAAW,IAAI,CAAC,WAAW,EAAE,CAAC;QACjC,MAAM,IAAI,KAAK,CACb,qNAAqN,CACtN,CAAC;IACJ,CAAC;IAED,MAAM,EAAE,OAAO,EAAE,GAAG,wBAAwB,CAC1C;QACE,GAAG,OAAO;QACV,cAAc,EAAE,OAAO,EAAE,cAAc,IAAI,WAAW;KACvD,EACD,KAAK,CACN,CAAC;IAEF,MAAM,MAAM,GAAG,YAAY,CAAuB,WAAW,EAAE,WAAW,EAAE;QAC1E,2BAA2B;QAC3B,GAAI,OAAe;QACnB,MAAM,EAAE;YACN,GAAG,OAAO,EAAE,MAAM;YAClB,OAAO,EAAE;gBACP,GAAG,OAAO,EAAE,MAAM,EAAE,OAAO;gBAC3B,eAAe,EAAE,gBAAgB,OAAO,sBAAsB;aAC/D;SACF;QACD,IAAI,EAAE;YACJ,GAAG,OAAO,EAAE,IAAI;YAChB,GAAG,CAAC,OAAO,EAAE,aAAa,EAAE,IAAI;gBAC9B,CAAC,CAAC,EAAE,UAAU,EAAE,OAAO,CAAC,aAAa,CAAC,IAAI,EAAE;gBAC5C,CAAC,CAAC,IAAI,CAAC;YACT,QAAQ,EAAE,MAAM;YAChB,gBAAgB,EAAE,OAAO,EAAE,IAAI,EAAE,gBAAgB,IAAI,SAAS,EAAE;YAChE,kBAAkB,EAAE,OAAO,EAAE,IAAI,EAAE,kBAAkB,IAAI,SAAS,EAAE;YACpE,cAAc,EAAE,OAAO,EAAE,IAAI,EAAE,cAAc,IAAI,IAAI;YACrD,OAAO;YACP,GAAG,CAAC,OAAO,EAAE,OAAO;gBACpB,QAAQ,IAAI,OAAO,CAAC,OAAO;gBAC3B,OAAO,CAAC,OAAO,CAAC,MAAM,KAAK,aAAa;gBACtC,CAAC,CAAC;oBACE,WAAW,EAAE,OAAO,EAAE,IAAI,EAAE,WAAW,IAAI,MAAM,CAAC,YAAY;iBAC/D;gBACH,CAAC,CAAC,IAAI,CAAC;SACV;KACF,CAAC,CAAC;IAEH,IAAI,kBAAkB,EAAE,CAAC;QACvB,mBAAmB,GAAG,MAAM,CAAC;IAC/B,CAAC;IAED,OAAO,MAAM,CAAC;AAChB,CAAC"}
node_modules/@supabase/ssr\dist\module\createServerClient.d.ts:4: * @deprecated Please specify `getAll` and `setAll` cookie methods instead of
node_modules/@supabase/ssr\dist\module\createServerClient.d.ts:8:export declare function createServerClient<Database = any, SchemaName extends string & keyof Omit<Database, "__InternalSupabase"> = "public" extends keyof Omit<Database, "__InternalSupabase"> ? "public" : string & keyof Omit<Database, "__InternalSupabase">>(supabaseUrl: string, supabaseKey: string, options: SupabaseClientOptions<SchemaName> & {
node_modules/@supabase/ssr\dist\module\createServerClient.d.ts:10:    cookies: CookieMethodsServerDeprecated;
node_modules/@supabase/ssr\dist\module\createServerClient.d.ts:22: * in it. The `cookies` option must implement both `getAll` **and** `setAll`
node_modules/@supabase/ssr\dist\module\createServerClient.d.ts:27: * **IMPORTANT:** Failing to implement `getAll` and `setAll` correctly **will
node_modules/@supabase/ssr\dist\module\createServerClient.d.ts:36: * cookies or response headers from pages, routes or components ??in those
node_modules/@supabase/ssr\dist\module\createServerClient.d.ts:37: * cases `setAll` can be omitted, but configure it if you can.
node_modules/@supabase/ssr\dist\module\createServerClient.d.ts:39: * **IMPORTANT:** If cookies cannot be set from pages or components,
node_modules/@supabase/ssr\dist\module\createServerClient.d.ts:43: * If `setAll` is not configured, the client emits a warning when it needs to
node_modules/@supabase/ssr\dist\module\createServerClient.d.ts:44: * write cookies. This usually means one of:
node_modules/@supabase/ssr\dist\module\createServerClient.d.ts:57: * `getUser()`. Token refreshes write the updated session back to cookies via
node_modules/@supabase/ssr\dist\module\createServerClient.d.ts:58: * the `setAll` handler.
node_modules/@supabase/ssr\dist\module\createServerClient.d.ts:64:export declare function createServerClient<Database = any, SchemaName extends string & keyof Omit<Database, "__InternalSupabase"> = "public" extends keyof Omit<Database, "__InternalSupabase"> ? "public" : string & keyof Omit<Database, "__InternalSupabase">>(supabaseUrl: string, supabaseKey: string, options: SupabaseClientOptions<SchemaName> & {
node_modules/@supabase/ssr\dist\module\createServerClient.d.ts:66:    cookies: CookieMethodsServer;
node_modules/@supabase/ssr\dist\module\createServerClient.js:3:import { createStorageFromOptions, applyServerStorage } from "./cookies";
node_modules/@supabase/ssr\dist\module\createServerClient.js:5:export function createServerClient(supabaseUrl, supabaseKey, options) {
node_modules/@supabase/ssr\dist\module\createServerClient.js:9:    const { storage, getAll, setAll, setItems, removedItems } = createStorageFromOptions({
node_modules/@supabase/ssr\dist\module\createServerClient.js:20:                "X-Client-Info": `supabase-ssr/${VERSION} createServerClient`,
node_modules/@supabase/ssr\dist\module\createServerClient.js:25:                ? { storageKey: options.cookieOptions.name }
node_modules/@supabase/ssr\dist\module\createServerClient.js:28:            flowType: "pkce",
node_modules/@supabase/ssr\dist\module\createServerClient.js:33:            storage,
node_modules/@supabase/ssr\dist\module\createServerClient.js:34:            ...(options?.cookies &&
node_modules/@supabase/ssr\dist\module\createServerClient.js:35:                "encode" in options.cookies &&
node_modules/@supabase/ssr\dist\module\createServerClient.js:36:                options.cookies.encode === "tokens-only"
node_modules/@supabase/ssr\dist\module\createServerClient.js:45:        // apply the storage each time it fires, only if there are changes
node_modules/@supabase/ssr\dist\module\createServerClient.js:56:            await applyServerStorage({ getAll, setAll, setItems, removedItems }, {
node_modules/@supabase/ssr\dist\module\createServerClient.js:64://# sourceMappingURL=createServerClient.js.map
node_modules/@supabase/ssr\dist\module\index.d.ts:1:export * from "./createBrowserClient";
node_modules/@supabase/ssr\dist\module\index.d.ts:2:export * from "./createServerClient";
node_modules/@supabase/ssr\dist\module\createServerClient.js.map:1:{"version":3,"file":"createServerClient.js","sourceRoot":"","sources":["../../src/createServerClient.ts"],"names":[],"mappings":"AAAA,OAAO,EAEL,YAAY,GAGb,MAAM,uBAAuB,CAAC;AAE/B,OAAO,EAAE,OAAO,EAAE,MAAM,WAAW,CAAC;AACpC,OAAO,EAAE,wBAAwB,EAAE,kBAAkB,EAAE,MAAM,WAAW,CAAC;AAMzE,OAAO,EAAE,yBAAyB,EAAE,MAAM,iBAAiB,CAAC;AAgG5D,MAAM,UAAU,kBAAkB,CAUhC,WAAmB,EACnB,WAAmB,EACnB,OAIC;IAED,IAAI,CAAC,WAAW,IAAI,CAAC,WAAW,EAAE,CAAC;QACjC,MAAM,IAAI,KAAK,CACb,kMAAkM,CACnM,CAAC;IACJ,CAAC;IAED,MAAM,EAAE,OAAO,EAAE,MAAM,EAAE,MAAM,EAAE,QAAQ,EAAE,YAAY,EAAE,GACvD,wBAAwB,CACtB;QACE,GAAG,OAAO;QACV,cAAc,EAAE,OAAO,EAAE,cAAc,IAAI,WAAW;KACvD,EACD,IAAI,CACL,CAAC;IAEJ,MAAM,MAAM,GAAG,YAAY,CAAuB,WAAW,EAAE,WAAW,EAAE;QAC1E,2BAA2B;QAC3B,GAAI,OAAe;QACnB,MAAM,EAAE;YACN,GAAG,OAAO,EAAE,MAAM;YAClB,OAAO,EAAE;gBACP,GAAG,OAAO,EAAE,MAAM,EAAE,OAAO;gBAC3B,eAAe,EAAE,gBAAgB,OAAO,qBAAqB;aAC9D;SACF;QACD,IAAI,EAAE;YACJ,GAAG,CAAC,OAAO,EAAE,aAAa,EAAE,IAAI;gBAC9B,CAAC,CAAC,EAAE,UAAU,EAAE,OAAO,CAAC,aAAa,CAAC,IAAI,EAAE;gBAC5C,CAAC,CAAC,IAAI,CAAC;YACT,GAAG,OAAO,EAAE,IAAI;YAChB,QAAQ,EAAE,MAAM;YAChB,gBAAgB,EAAE,KAAK;YACvB,kBAAkB,EAAE,KAAK;YACzB,cAAc,EAAE,IAAI;YACpB,kBAAkB,EAAE,IAAI;YACxB,OAAO;YACP,GAAG,CAAC,OAAO,EAAE,OAAO;gBACpB,QAAQ,IAAI,OAAO,CAAC,OAAO;gBAC3B,OAAO,CAAC,OAAO,CAAC,MAAM,KAAK,aAAa;gBACtC,CAAC,CAAC;oBACE,WAAW,EACT,OAAO,EAAE,IAAI,EAAE,WAAW,IAAI,yBAAyB,EAAE;iBAC5D;gBACH,CAAC,CAAC,IAAI,CAAC;SACV;KACF,CAAC,CAAC;IAEH,MAAM,CAAC,IAAI,CAAC,iBAAiB,CAAC,KAAK,EAAE,KAAsB,EAAE,EAAE;QAC7D,gEAAgE;QAChE,kEAAkE;QAClE,iEAAiE;QACjE,QAAQ;QACR,MAAM,iBAAiB,GACrB,MAAM,CAAC,IAAI,CAAC,QAAQ,CAAC,CAAC,MAAM,GAAG,CAAC,IAAI,MAAM,CAAC,IAAI,CAAC,YAAY,CAAC,CAAC,MAAM,GAAG,CAAC,CAAC;QAE3E,IACE,iBAAiB;YACjB,CAAC,KAAK,KAAK,WAAW;gBACpB,KAAK,KAAK,iBAAiB;gBAC3B,KAAK,KAAK,cAAc;gBACxB,KAAK,KAAK,mBAAmB;gBAC7B,KAAK,KAAK,YAAY;gBACtB,KAAK,KAAK,wBAAwB,CAAC,EACrC,CAAC;YACD,MAAM,kBAAkB,CACtB,EAAE,MAAM,EAAE,MAAM,EAAE,QAAQ,EAAE,YAAY,EAAE,EAC1C;gBACE,aAAa,EAAE,OAAO,EAAE,aAAa,IAAI,IAAI;gBAC7C,cAAc,EAAE,OAAO,EAAE,cAAc,IAAI,WAAW;aACvD,CACF,CAAC;QACJ,CAAC;IACH,CAAC,CAAC,CAAC;IAEH,OAAO,MAAM,CAAC;AAChB,CAAC"}
node_modules/@supabase/ssr\dist\module\index.js:32:export * from "./createBrowserClient";
node_modules/@supabase/ssr\dist\module\index.js:33:export * from "./createServerClient";
node_modules/@supabase/ssr\dist\module\types.d.ts:16:export type SetAllCookies = (cookies: {
node_modules/@supabase/ssr\dist\module\types.d.ts:22: * Headers that must be set on the HTTP response alongside the cookies.
node_modules/@supabase/ssr\dist\module\types.d.ts:23: * Responses that set auth cookies must not be cached by CDNs or
node_modules/@supabase/ssr\dist\module\types.d.ts:27: * The library passes the following headers when auth cookies are set:
node_modules/@supabase/ssr\dist\module\types.d.ts:35: * setAll(cookiesToSet, headers) {
node_modules/@supabase/ssr\dist\module\types.d.ts:36: *   cookiesToSet.forEach(({ name, value, options }) =>
node_modules/@supabase/ssr\dist\module\types.d.ts:37: *     response.cookies.set(name, value, options)
node_modules/@supabase/ssr\dist\module\types.d.ts:53:     * If set to true, only the user's session (access and refresh tokens) will be encoded in cookies. The user object will be encoded in local storage if the `userStorage` option is not provided when creating the client.
node_modules/@supabase/ssr\dist\module\types.d.ts:55:     * You should keep this option the same between `createBrowserClient()` and `createServerClient()`. When set to `tokens-only` accessing the `user` property on the data returned from `getSession()` will only be possible if the user has already been stored in the separate storage. It's best to use `getClaims()` instead to avoid surprizes.
node_modules/@supabase/ssr\dist\module\types.d.ts:60:    getAll: GetAllCookies;
node_modules/@supabase/ssr\dist\module\types.d.ts:61:    setAll: SetAllCookies;
node_modules/@supabase/ssr\dist\module\types.d.ts:70:     * If set to `tokens-only`, only the user's access and refresh tokens will be encoded in cookies. The user object will be encoded in memory if the `userStorage` option is not provided when creating the client. Unset value defaults to `user-and-tokens`.
node_modules/@supabase/ssr\dist\module\types.d.ts:72:     * You should keep this option the same between `createBrowserClient()` and `createServerClient()`. When set to `tokens-only` accessing the `user` property on the data returned from `getSession()` will not be possible. Use `getUser()` or preferably `getClaims()` instead.
node_modules/@supabase/ssr\dist\module\types.d.ts:77:    getAll: GetAllCookies;
node_modules/@supabase/ssr\dist\module\types.d.ts:79:     * Called by the Supabase Client to write cookies to the response after a
node_modules/@supabase/ssr\dist\module\types.d.ts:97:     * `getSession()` returns the session directly from cookies without contacting
node_modules/@supabase/ssr\dist\module\types.d.ts:103:    setAll?: SetAllCookies;

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"code_verifier|flowType|verifyOtp|exchangeCodeForSession|token_hash\" 'node_modules/@supabase/auth-js' 'node_modules/@supabase/supabase-js' -S" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'node_modules/@supabase/ssr/src/createBrowserClient.ts' | ForEach-Object { "'$i++; if ($i -le 180) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'node_modules/@supabase/ssr/src/createServerClient.ts' | ForEach-Object { "'$i++; if ($i -le 230) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'node_modules/@supabase/ssr/src/cookies.ts' | ForEach-Object { "'$i++; if (($i -ge 135 -and $i -le 220) -or ($i -ge 252 -and $i -le 320) -or ($i -ge 430 -and $i -le 485)) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 398ms:
   1: import {
   2:   createClient,
   3:   SupabaseClient,
   4:   SupabaseClientOptions,
   5: } from "@supabase/supabase-js";
   6: 
   7: import { VERSION } from "./version";
   8: import { isBrowser } from "./utils";
   9: 
  10: import type {
  11:   CookieMethodsBrowser,
  12:   CookieMethodsBrowserDeprecated,
  13:   CookieOptionsWithName,
  14: } from "./types";
  15: 
  16: import { createStorageFromOptions } from "./cookies";
  17: 
  18: let cachedBrowserClient: SupabaseClient<any, any, any> | undefined;
  19: 
  20: /**
  21:  * Creates a Supabase Client for use in a browser environment.
  22:  *
  23:  * In most cases you should not configure the `options.cookies` object, as this
  24:  * is automatically handled for you. If you do customize this, prefer using the
  25:  * `getAll` and `setAll` functions over `get`, `set` and `remove`. The latter
  26:  * are deprecated due to being difficult to correctly implement and not
  27:  * supporting some edge-cases. Both `getAll` and `setAll` (or both `get`, `set`
  28:  * and `remove`) must be provided. Failing to provide the methods for setting
  29:  * will throw an exception, and in previous versions of the library will result
  30:  * in difficult to debug authentication issues such as random logouts, early
  31:  * session termination or problems with inconsistent state.
  32:  *
  33:  * @param supabaseUrl The URL of the Supabase project.
  34:  * @param supabaseKey The `anon` API key of the Supabase project.
  35:  * @param options Various configuration options.
  36:  */
  37: export function createBrowserClient<
  38:   Database = any,
  39:   SchemaName extends string &
  40:     keyof Omit<Database, "__InternalSupabase"> = "public" extends keyof Omit<
  41:     Database,
  42:     "__InternalSupabase"
  43:   >
  44:     ? "public"
  45:     : string & keyof Omit<Database, "__InternalSupabase">,
  46: >(
  47:   supabaseUrl: string,
  48:   supabaseKey: string,
  49:   options?: SupabaseClientOptions<SchemaName> & {
  50:     cookies?: CookieMethodsBrowser;
  51:     cookieOptions?: CookieOptionsWithName;
  52:     cookieEncoding?: "raw" | "base64url";
  53:     isSingleton?: boolean;
  54:   },
  55: ): SupabaseClient<Database, SchemaName>;
  56: 
  57: /**
  58:  * @deprecated Please specify `getAll` and `setAll` cookie methods instead of
  59:  * the `get`, `set` and `remove`. These will not be supported in the next major
  60:  * version.
  61:  */
  62: export function createBrowserClient<
  63:   Database = any,
  64:   SchemaName extends string &
  65:     keyof Omit<Database, "__InternalSupabase"> = "public" extends keyof Omit<
  66:     Database,
  67:     "__InternalSupabase"
  68:   >
  69:     ? "public"
  70:     : string & keyof Omit<Database, "__InternalSupabase">,
  71: >(
  72:   supabaseUrl: string,
  73:   supabaseKey: string,
  74:   options?: SupabaseClientOptions<SchemaName> & {
  75:     cookies: CookieMethodsBrowserDeprecated;
  76:     cookieOptions?: CookieOptionsWithName;
  77:     cookieEncoding?: "raw" | "base64url";
  78:     isSingleton?: boolean;
  79:   },
  80: ): SupabaseClient<Database, SchemaName>;
  81: 
  82: export function createBrowserClient<
  83:   Database = any,
  84:   SchemaName extends string &
  85:     keyof Omit<Database, "__InternalSupabase"> = "public" extends keyof Omit<
  86:     Database,
  87:     "__InternalSupabase"
  88:   >
  89:     ? "public"
  90:     : string & keyof Omit<Database, "__InternalSupabase">,
  91: >(
  92:   supabaseUrl: string,
  93:   supabaseKey: string,
  94:   options?: SupabaseClientOptions<SchemaName> & {
  95:     cookies?: CookieMethodsBrowser | CookieMethodsBrowserDeprecated;
  96:     cookieOptions?: CookieOptionsWithName;
  97:     cookieEncoding?: "raw" | "base64url";
  98:     isSingleton?: boolean;
  99:   },
 100: ): SupabaseClient<Database, SchemaName> {
 101:   // singleton client is created only if isSingleton is set to true, or if isSingleton is not defined and we detect a browser
 102:   const shouldUseSingleton =
 103:     options?.isSingleton === true ||
 104:     ((!options || !("isSingleton" in options)) && isBrowser());
 105: 
 106:   if (shouldUseSingleton && cachedBrowserClient) {
 107:     return cachedBrowserClient;
 108:   }
 109: 
 110:   if (!supabaseUrl || !supabaseKey) {
 111:     throw new Error(
 112:       `@supabase/ssr: Your project's URL and API key are required to create a Supabase client!\n\nCheck your Supabase project's API settings to find these values\n\nhttps://supabase.com/dashboard/project/_/settings/api`,
 113:     );
 114:   }
 115: 
 116:   const { storage } = createStorageFromOptions(
 117:     {
 118:       ...options,
 119:       cookieEncoding: options?.cookieEncoding ?? "base64url",
 120:     },
 121:     false,
 122:   );
 123: 
 124:   const client = createClient<Database, SchemaName>(supabaseUrl, supabaseKey, {
 125:     // TODO: resolve type error
 126:     ...(options as any),
 127:     global: {
 128:       ...options?.global,
 129:       headers: {
 130:         ...options?.global?.headers,
 131:         "X-Client-Info": `supabase-ssr/${VERSION} createBrowserClient`,
 132:       },
 133:     },
 134:     auth: {
 135:       ...options?.auth,
 136:       ...(options?.cookieOptions?.name
 137:         ? { storageKey: options.cookieOptions.name }
 138:         : null),
 139:       flowType: "pkce",
 140:       autoRefreshToken: options?.auth?.autoRefreshToken ?? isBrowser(),
 141:       detectSessionInUrl: options?.auth?.detectSessionInUrl ?? isBrowser(),
 142:       persistSession: options?.auth?.persistSession ?? true,
 143:       storage,
 144:       ...(options?.cookies &&
 145:       "encode" in options.cookies &&
 146:       options.cookies.encode === "tokens-only"
 147:         ? {
 148:             userStorage: options?.auth?.userStorage ?? window.localStorage,
 149:           }
 150:         : null),
 151:     },
 152:   });
 153: 
 154:   if (shouldUseSingleton) {
 155:     cachedBrowserClient = client;
 156:   }
 157: 
 158:   return client;
 159: }

 succeeded in 405ms:
   1: import {
   2:   AuthChangeEvent,
   3:   createClient,
   4:   SupabaseClient,
   5:   SupabaseClientOptions,
   6: } from "@supabase/supabase-js";
   7: 
   8: import { VERSION } from "./version";
   9: import { createStorageFromOptions, applyServerStorage } from "./cookies";
  10: import type {
  11:   CookieOptionsWithName,
  12:   CookieMethodsServer,
  13:   CookieMethodsServerDeprecated,
  14: } from "./types";
  15: import { memoryLocalStorageAdapter } from "./utils/helpers";
  16: 
  17: /**
  18:  * @deprecated Please specify `getAll` and `setAll` cookie methods instead of
  19:  * the `get`, `set` and `remove`. These will not be supported in the next major
  20:  * version.
  21:  */
  22: export function createServerClient<
  23:   Database = any,
  24:   SchemaName extends string &
  25:     keyof Omit<Database, "__InternalSupabase"> = "public" extends keyof Omit<
  26:     Database,
  27:     "__InternalSupabase"
  28:   >
  29:     ? "public"
  30:     : string & keyof Omit<Database, "__InternalSupabase">,
  31: >(
  32:   supabaseUrl: string,
  33:   supabaseKey: string,
  34:   options: SupabaseClientOptions<SchemaName> & {
  35:     cookieOptions?: CookieOptionsWithName;
  36:     cookies: CookieMethodsServerDeprecated;
  37:     cookieEncoding?: "raw" | "base64url";
  38:   },
  39: ): SupabaseClient<Database, SchemaName>;
  40: 
  41: /**
  42:  * Creates a Supabase Client for use on the server-side of a server-side
  43:  * rendering (SSR) framework.
  44:  *
  45:  * **Use in middlewares.**
  46:  *
  47:  * Middlewares are functions that run before any rendering logic and can
  48:  * inspect and modify both the incoming request and the outgoing response. In
  49:  * most SSR frameworks you *must set up a middleware* and call this function
  50:  * in it. The `cookies` option must implement both `getAll` **and** `setAll`
  51:  * so that token refreshes can be written back to the response. The deprecated
  52:  * `get`, `set`, and `remove` methods are not recommended ??they miss
  53:  * important edge cases and will be removed in a future major version.
  54:  *
  55:  * **IMPORTANT:** Failing to implement `getAll` and `setAll` correctly **will
  56:  * cause significant and difficult to debug authentication issues**: random
  57:  * logouts, early session termination, JSON parsing errors, increased refresh
  58:  * token requests, or relying on garbage state.
  59:  *
  60:  * **Use in pages, routes or components.**
  61:  *
  62:  * *Always* create a new client with this function for each server render ?? * never share a client across requests. Not all frameworks allow setting
  63:  * cookies or response headers from pages, routes or components ??in those
  64:  * cases `setAll` can be omitted, but configure it if you can.
  65:  *
  66:  * **IMPORTANT:** If cookies cannot be set from pages or components,
  67:  * middleware *must* handle session updates ??omitting it will cause
  68:  * significant and difficult to debug authentication issues.
  69:  *
  70:  * If `setAll` is not configured, the client emits a warning when it needs to
  71:  * write cookies. This usually means one of:
  72:  *
  73:  * - A middleware client was not configured.
  74:  * - There is a bug in your middleware.
  75:  * - You are calling `supabase.auth.updateUser()` server-side.
  76:  *
  77:  * Please consult the [Supabase SSR guides](https://supabase.com/docs/guides/auth/server-side)
  78:  * for your framework.
  79:  *
  80:  * **Session initialization.**
  81:  *
  82:  * This client uses lazy session initialization (`skipAutoInitialize: true`).
  83:  * The session is not loaded until the first call to `getSession()` or
  84:  * `getUser()`. Token refreshes write the updated session back to cookies via
  85:  * the `setAll` handler.
  86:  *
  87:  * @param supabaseUrl The URL of the Supabase project.
  88:  * @param supabaseKey The `anon` API key of the Supabase project.
  89:  * @param options Various configuration options.
  90:  */
  91: export function createServerClient<
  92:   Database = any,
  93:   SchemaName extends string &
  94:     keyof Omit<Database, "__InternalSupabase"> = "public" extends keyof Omit<
  95:     Database,
  96:     "__InternalSupabase"
  97:   >
  98:     ? "public"
  99:     : string & keyof Omit<Database, "__InternalSupabase">,
 100: >(
 101:   supabaseUrl: string,
 102:   supabaseKey: string,
 103:   options: SupabaseClientOptions<SchemaName> & {
 104:     cookieOptions?: CookieOptionsWithName;
 105:     cookies: CookieMethodsServer;
 106:     cookieEncoding?: "raw" | "base64url";
 107:   },
 108: ): SupabaseClient<Database, SchemaName>;
 109: 
 110: export function createServerClient<
 111:   Database = any,
 112:   SchemaName extends string &
 113:     keyof Omit<Database, "__InternalSupabase"> = "public" extends keyof Omit<
 114:     Database,
 115:     "__InternalSupabase"
 116:   >
 117:     ? "public"
 118:     : string & keyof Omit<Database, "__InternalSupabase">,
 119: >(
 120:   supabaseUrl: string,
 121:   supabaseKey: string,
 122:   options: SupabaseClientOptions<SchemaName> & {
 123:     cookieOptions?: CookieOptionsWithName;
 124:     cookies: CookieMethodsServer | CookieMethodsServerDeprecated;
 125:     cookieEncoding?: "raw" | "base64url";
 126:   },
 127: ): SupabaseClient<Database, SchemaName> {
 128:   if (!supabaseUrl || !supabaseKey) {
 129:     throw new Error(
 130:       `Your project's URL and Key are required to create a Supabase client!\n\nCheck your Supabase project's API settings to find these values\n\nhttps://supabase.com/dashboard/project/_/settings/api`,
 131:     );
 132:   }
 133: 
 134:   const { storage, getAll, setAll, setItems, removedItems } =
 135:     createStorageFromOptions(
 136:       {
 137:         ...options,
 138:         cookieEncoding: options?.cookieEncoding ?? "base64url",
 139:       },
 140:       true,
 141:     );
 142: 
 143:   const client = createClient<Database, SchemaName>(supabaseUrl, supabaseKey, {
 144:     // TODO: resolve type error
 145:     ...(options as any),
 146:     global: {
 147:       ...options?.global,
 148:       headers: {
 149:         ...options?.global?.headers,
 150:         "X-Client-Info": `supabase-ssr/${VERSION} createServerClient`,
 151:       },
 152:     },
 153:     auth: {
 154:       ...(options?.cookieOptions?.name
 155:         ? { storageKey: options.cookieOptions.name }
 156:         : null),
 157:       ...options?.auth,
 158:       flowType: "pkce",
 159:       autoRefreshToken: false,
 160:       detectSessionInUrl: false,
 161:       persistSession: true,
 162:       skipAutoInitialize: true,
 163:       storage,
 164:       ...(options?.cookies &&
 165:       "encode" in options.cookies &&
 166:       options.cookies.encode === "tokens-only"
 167:         ? {
 168:             userStorage:
 169:               options?.auth?.userStorage ?? memoryLocalStorageAdapter(),
 170:           }
 171:         : null),
 172:     },
 173:   });
 174: 
 175:   client.auth.onAuthStateChange(async (event: AuthChangeEvent) => {
 176:     // The SIGNED_IN event is fired very often, but we don't need to
 177:     // apply the storage each time it fires, only if there are changes
 178:     // that need to be set -- which is if setItems / removeItems have
 179:     // data.
 180:     const hasStorageChanges =
 181:       Object.keys(setItems).length > 0 || Object.keys(removedItems).length > 0;
 182: 
 183:     if (
 184:       hasStorageChanges &&
 185:       (event === "SIGNED_IN" ||
 186:         event === "TOKEN_REFRESHED" ||
 187:         event === "USER_UPDATED" ||
 188:         event === "PASSWORD_RECOVERY" ||
 189:         event === "SIGNED_OUT" ||
 190:         event === "MFA_CHALLENGE_VERIFIED")
 191:     ) {
 192:       await applyServerStorage(
 193:         { getAll, setAll, setItems, removedItems },
 194:         {
 195:           cookieOptions: options?.cookieOptions ?? null,
 196:           cookieEncoding: options?.cookieEncoding ?? "base64url",
 197:         },
 198:       );
 199:     }
 200:   });
 201: 
 202:   return client;
 203: }

 succeeded in 427ms:
 135:     }
 136:   } else if (!isServerClient && isBrowser()) {
 137:     // The environment is browser, so use the document.cookie API to implement getAll and setAll.
 138: 
 139:     const noHintGetAll = () => {
 140:       const parsed = parse(document.cookie);
 141: 
 142:       return Object.keys(parsed).map((name) => ({
 143:         name,
 144:         value: parsed[name] ?? "",
 145:       }));
 146:     };
 147: 
 148:     getAll = () => noHintGetAll();
 149: 
 150:     setAll = (setCookies) => {
 151:       setCookies.forEach(({ name, value, options }) => {
 152:         document.cookie = serialize(name, value, options);
 153:       });
 154:     };
 155:   } else if (isServerClient) {
 156:     throw new Error(
 157:       "@supabase/ssr: createServerClient must be initialized with cookie options that specify getAll and setAll functions (deprecated, not recommended: alternatively use get, set and remove)",
 158:     );
 159:   } else {
 160:     // getting cookies when there's no window but we're in browser mode can be OK, because the developer probably is not using auth functions
 161:     getAll = () => {
 162:       return [];
 163:     };
 164: 
 165:     // this is NOT OK because the developer is using auth functions that require setting some state, so that must error out
 166:     setAll = () => {
 167:       throw new Error(
 168:         "@supabase/ssr: createBrowserClient in non-browser runtimes (including Next.js pre-rendering mode) was not initialized cookie options that specify getAll and setAll functions (deprecated: alternatively use get, set and remove), but they were needed",
 169:       );
 170:     };
 171:   }
 172: 
 173:   if (!isServerClient) {
 174:     // This is the storage client to be used in browsers. It only
 175:     // works on the cookies abstraction, unlike the server client
 176:     // which only uses cookies to read the initial state. When an
 177:     // item is set, cookies are both cleared and set to values so
 178:     // that stale chunks are not left remaining.
 179:     return {
 180:       getAll, // for type consistency
 181:       setAll, // for type consistency
 182:       setItems, // for type consistency
 183:       removedItems, // for type consistency
 184:       storage: {
 185:         isServer: false,
 186:         getItem: async (key: string) => {
 187:           const allCookies = await getAll([key]);
 188:           const chunkedCookie = await combineChunks(
 189:             key,
 190:             async (chunkName: string) => {
 191:               const cookie =
 192:                 allCookies?.find(({ name }) => name === chunkName) || null;
 193: 
 194:               if (!cookie) {
 195:                 return null;
 196:               }
 197: 
 198:               return cookie.value;
 199:             },
 200:           );
 201: 
 202:           if (!chunkedCookie) {
 203:             return null;
 204:           }
 205: 
 206:           let decoded = chunkedCookie;
 207: 
 208:           if (chunkedCookie.startsWith(BASE64_PREFIX)) {
 209:             decoded = stringFromBase64URL(
 210:               chunkedCookie.substring(BASE64_PREFIX.length),
 211:             );
 212:           }
 213: 
 214:           return decoded;
 215:         },
 216:         setItem: async (key: string, value: string) => {
 217:           const allCookies = await getAll([key]);
 218:           const cookieNames = allCookies?.map(({ name }) => name) || [];
 219: 
 220:           const removeCookies = new Set(
 252:           const allToSet = [
 253:             ...[...removeCookies].map((name) => ({
 254:               name,
 255:               value: "",
 256:               options: removeCookieOptions,
 257:             })),
 258:             ...setCookies.map(({ name, value }) => ({
 259:               name,
 260:               value,
 261:               options: setCookieOptions,
 262:             })),
 263:           ];
 264: 
 265:           if (allToSet.length > 0) {
 266:             await setAll(allToSet, {});
 267:           }
 268:         },
 269:         removeItem: async (key: string) => {
 270:           const allCookies = await getAll([key]);
 271:           const cookieNames = allCookies?.map(({ name }) => name) || [];
 272:           const removeCookies = cookieNames.filter((name) =>
 273:             isChunkLike(name, key),
 274:           );
 275: 
 276:           const removeCookieOptions = {
 277:             ...DEFAULT_COOKIE_OPTIONS,
 278:             ...options?.cookieOptions,
 279:             maxAge: 0,
 280:           };
 281: 
 282:           // the NextJS cookieStore API can get confused if the `name` from
 283:           // options.cookieOptions leaks
 284:           delete removeCookieOptions.name;
 285: 
 286:           if (removeCookies.length > 0) {
 287:             await setAll(
 288:               removeCookies.map((name) => ({
 289:                 name,
 290:                 value: "",
 291:                 options: removeCookieOptions,
 292:               })),
 293:               {},
 294:             );
 295:           }
 296:         },
 297:       },
 298:     };
 299:   }
 300: 
 301:   // This is the server client. It only uses getAll to read the initial
 302:   // state. Any subsequent changes to the items is persisted in the
 303:   // setItems and removedItems objects. createServerClient *must* use
 304:   // getAll, setAll and the values in setItems and removedItems to
 305:   // persist the changes *at once* when appropriate (usually only when
 306:   // the TOKEN_REFRESHED, USER_UPDATED or SIGNED_OUT events are fired by
 307:   // the Supabase Auth client).
 308:   return {
 309:     getAll,
 310:     setAll,
 311:     setItems,
 312:     removedItems,
 313:     storage: {
 314:       // to signal to the libraries that these cookies are
 315:       // coming from a server environment and their value
 316:       // should not be trusted
 317:       isServer: true,
 318:       getItem: async (key: string) => {
 319:         if (typeof setItems[key] === "string") {
 320:           return setItems[key];
 430:       return cookieNames.filter((name) => isChunkLike(name, itemName));
 431:     },
 432:   );
 433: 
 434:   const setCookies = Object.keys(setItems).flatMap((itemName) => {
 435:     const removeExistingCookiesForItem = new Set(
 436:       cookieNames.filter((name) => isChunkLike(name, itemName)),
 437:     );
 438: 
 439:     let encoded = setItems[itemName];
 440: 
 441:     if (cookieEncoding === "base64url") {
 442:       encoded = BASE64_PREFIX + stringToBase64URL(encoded);
 443:     }
 444: 
 445:     const chunks = createChunks(itemName, encoded);
 446: 
 447:     chunks.forEach((chunk) => {
 448:       removeExistingCookiesForItem.delete(chunk.name);
 449:     });
 450: 
 451:     removeCookies.push(...removeExistingCookiesForItem);
 452: 
 453:     return chunks;
 454:   });
 455: 
 456:   const removeCookieOptions = {
 457:     ...DEFAULT_COOKIE_OPTIONS,
 458:     ...cookieOptions,
 459:     maxAge: 0,
 460:   };
 461:   const setCookieOptions = {
 462:     ...DEFAULT_COOKIE_OPTIONS,
 463:     ...cookieOptions,
 464:     maxAge: DEFAULT_COOKIE_OPTIONS.maxAge,
 465:   };
 466: 
 467:   // the NextJS cookieStore API can get confused if the `name` from
 468:   // options.cookieOptions leaks
 469:   delete (removeCookieOptions as any).name;
 470:   delete (setCookieOptions as any).name;
 471: 
 472:   await setAll(
 473:     [
 474:       ...removeCookies.map((name) => ({
 475:         name,
 476:         value: "",
 477:         options: removeCookieOptions,
 478:       })),
 479:       ...setCookies.map(({ name, value }) => ({
 480:         name,
 481:         value,
 482:         options: setCookieOptions,
 483:       })),
 484:     ],
 485:     {

2026-05-03T11:33:11.704057Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.5 seconds
Total output lines: 18
Output:
node_modules/@supabase/supabase-js\dist\index.cjs.map:1:{"version":3,"file":"index.cjs","names":["DEFAULT_AUTH_OPTIONS: SupabaseAuthClientOptions","DEFAULT_REALTIME_OPTIONS: RealtimeClientOptions","fetch","DEFAULT_DB_OPTIONS","DEFAULT_AUTH_OPTIONS","DEFAULT_REALTIME_OPTIONS","DEFAULT_GLOBAL_OPTIONS","result: Required<SupabaseClientOptions<SchemaName>>","AuthClient","supabaseUrl: string","supabaseKey: string","PostgrestClient","SupabaseStorageClient","FunctionsClient","this","RealtimeClient"],"sources":["../src/lib/version.ts","../src/lib/constants.ts","../src/lib/fetch.ts","../src/lib/helpers.ts","../src/lib/SupabaseAuthClient.ts","../src/SupabaseClient.ts","../src/index.ts"],"sourcesContent":["// Generated automatically during releases by scripts/update-version-files.ts\n// This file provides runtime access to the package version for:\n// - HTTP request headers (e.g., X-Client-Info header for API requests)\n// - Debugging and support (identifying which version is running)\n// - Telemetry and logging (version reporting in errors/analytics)\n// - Ensuring build artifacts match the published package version\nexport const version = '2.104.0'\n","// constants.ts\nimport { RealtimeClientOptions } from '@supabase/realtime-js'\nimport { SupabaseAuthClientOptions } from './types'\nimport { version } from './version'\n\nlet JS_ENV = ''\n// @ts-ignore\nif (typeof Deno !== 'undefined') {\n  JS_ENV = 'deno'\n} else if (typeof document !== 'undefined') {\n  JS_ENV = 'web'\n} else if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {\n  JS_ENV = 'react-native'\n} else {\n  JS_ENV = 'node'\n}\n\nexport const DEFAULT_HEADERS = { 'X-Client-Info': `supabase-js-${JS_ENV}/${version}` }\n\nexport const DEFAULT_GLOBAL_OPTIONS = {\n  headers: DEFAULT_HEADERS,\n}\n\nexport const DEFAULT_DB_OPTIONS = {\n  schema: 'public',\n}\n\nexport const DEFAULT_AUTH_OPTIONS: SupabaseAuthClientOptions = {\n  autoRefreshToken: true,\n  persistSession: true,\n  detectSessionInUrl: true,\n  flowType: 'implicit',\n}\n\nexport const DEFAULT_REALTIME_OPTIONS: RealtimeClientOptions = {}\n","type Fetch = typeof fetch\n\nexport const resolveFetch = (customFetch?: Fetch): Fetch => {\n  if (customFetch) {\n    return (...args: Parameters<Fetch>) => customFetch(...args)\n  }\n  return (...args: Parameters<Fetch>) => fetch(...args)\n}\n\nexport const resolveHeadersConstructor = () => {\n  return Headers\n}\n\nexport const fetchWithAuth = (\n  supabaseKey: string,\n  getAccessToken: () => Promise<string | null>,\n  customFetch?: Fetch\n): Fetch => {\n  const fetch = resolveFetch(customFetch)\n  const HeadersConstructor = resolveHeadersConstructor()\n\n  return async (input, init) => {\n    const accessToken = (await getAccessToken()) ?? supabaseKey\n    let headers = new HeadersConstructor(init?.headers)\n\n    if (!headers.has('apikey')) {\n      headers.set('apikey', supabaseKey)\n    }\n\n    if (!headers.has('Authorization')) {\n      headers.set('Authorization', `Bearer ${accessToken}`)\n    }\n\n    return fetch(input, { ...init, headers })\n  }\n}\n","// helpers.ts\nimport { SupabaseClientOptions } from './types'\n\nexport function uuid() {\n  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {\n    var r = (Math.random() * 16) | 0,\n      v = c == 'x' ? r : (r & 0x3) | 0x8\n    return v.toString(16)\n  })\n}\n\nexport function ensureTrailingSlash(url: string): string {\n  return url.endsWith('/') ? url : url + '/'\n}\n\nexport const isBrowser = () => typeof window !== 'undefined'\n\nexport function applySettingDefaults<\n  Database = any,\n  SchemaName extends string & keyof Database = 'public' extends keyof Database\n    ? 'public'\n    : string & keyof Database,\n>(\n  options: SupabaseClientOptions<SchemaName>,\n  defaults: SupabaseClientOptions<any>\n): Required<SupabaseClientOptions<SchemaName>> {\n  const {\n    db: dbOptions,\n    auth: authOptions,\n    realtime: realtimeOptions,\n    global: globalOptions,\n  } = options\n  const {\n    db: DEFAULT_DB_OPTIONS,\n    auth: DEFAULT_AUTH_OPTIONS,\n    realtime: DEFAULT_REALTIME_OPTIONS,\n    global: DEFAULT_GLOBAL_OPTIONS,\n  } = defaults\n\n  const result: Required<SupabaseClientOptions<SchemaName>> = {\n    db: {\n      ...DEFAULT_DB_OPTIONS,\n      ...dbOptions,\n    },\n    auth: {\n      ...DEFAULT_AUTH_OPTIONS,\n      ...authOptions,\n    },\n    realtime: {\n      ...DEFAULT_REALTIME_OPTIONS,\n      ...realtimeOptions,\n    },\n    storage: {},\n    global: {\n      ...DEFAULT_GLOBAL_OPTIONS,\n      ...globalOptions,\n      headers: {\n        ...(DEFAULT_GLOBAL_OPTIONS?.headers ?? {}),\n        ...(globalOptions?.headers ?? {}),\n      },\n    },\n    accessToken: async () => '',\n  }\n\n  if (options.accessToken) {\n    result.accessToken = options.accessToken\n  } else {\n    // hack around Required<>\n    delete (result as any).accessToken\n  }\n\n  return result\n}\n\n/**\n * Validates a Supabase client URL\n *\n * @param {string} supabaseUrl - The Supabase client URL string.\n * @returns {URL} - The validated base URL.\n * @throws {Error}\n */\nexport function validateSupabaseUrl(supabaseUrl: string): URL {\n  const trimmedUrl = supabaseUrl?.trim()\n\n  if (!trimmedUrl) {\n    throw new Error('supabaseUrl is required.')\n  }\n\n  if (!trimmedUrl.match(/^https?:\\/\\//i)) {\n    throw new Error('Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL.')\n  }\n\n  try {\n    return new URL(ensureTrailingSlash(trimmedUrl))\n  } catch {\n    throw Error('Invalid supabaseUrl: Provided URL is malformed.')\n  }\n}\n","import { AuthClient } from '@supabase/auth-js'\nimport { SupabaseAuthClientOptions } from './types'\n\nexport class SupabaseAuthClient extends AuthClient {\n  constructor(options: SupabaseAuthClientOptions) {\n    super(options)\n  }\n}\n","import type { AuthChangeEvent } from '@supabase/auth-js'\nimport { FunctionsClient } from '@supabase/functions-js'\nimport {\n  PostgrestClient,\n  type PostgrestFilterBuilder,\n  type PostgrestQueryBuilder,\n} from '@supabase/postgrest-js'\nimport {\n  type RealtimeChannel,\n  type RealtimeChannelOptions,\n  RealtimeClient,\n  type RealtimeClientOptions,\n} from '@supabase/realtime-js'\nimport { StorageClient as SupabaseStorageClient } from '@supabase/storage-js'\nimport {\n  DEFAULT_AUTH_OPTIONS,\n  DEFAULT_DB_OPTIONS,\n  DEFAULT_GLOBAL_OPTIONS,\n  DEFAULT_REALTIME_OPTIONS,\n} from './lib/constants'\nimport { fetchWithAuth } from './lib/fetch'\nimport { applySettingDefaults, validateSupabaseUrl } from './lib/helpers'\nimport { SupabaseAuthClient } from './lib/SupabaseAuthClient'\nimport type {\n  Fetch,\n  GenericSchema,\n  SupabaseAuthClientOptions,\n  SupabaseClientOptions,\n} from './lib/types'\nimport { GetRpcFunctionFilterBuilderByArgs } from './lib/rest/types/common/rpc'\n\n/**\n * Supabase Client.\n *\n * An isomorphic Javascript client for interacting with Postgres.\n */\nexport default class SupabaseClient<\n  Database = any,\n  // The second type parameter is also used for specifying db_schema, so we\n  // support both cases.\n  // TODO: Allow setting db_schema from ClientOptions.\n  SchemaNameOrClientOptions extends\n    | (string & keyof Omit<Database, '__InternalSupabase'>)\n    | { PostgrestVersion: string } = 'public' extends keyof Omit<Database, '__InternalSupabase'>\n    ? 'public'\n    : string & keyof Omit<Database, '__InternalSupabase'>,\n  SchemaName extends string &\n    keyof Omit<Database, '__InternalSupabase'> = SchemaNameOrClientOptions extends string &\n    keyof Omit<Database, '__InternalSupabase'>\n    ? SchemaNameOrClientOptions\n    : 'public' extends keyof Omit<Database, '__InternalSupabase'>\n      ? 'public'\n      : string & keyof Omit<Omit<Database, '__InternalSupabase'>, '__InternalSupabase'>,\n  Schema extends Omit<Database, '__InternalSupabase'>[SchemaName] extends GenericSchema\n    ? Omit<Database, '__InternalSupabase'>[SchemaName]\n    : never = Omit<Database, '__InternalSupabase'>[SchemaName] extends GenericSchema\n    ? Omit<Database, '__InternalSupabase'>[SchemaName]\n    : never,\n  ClientOptions extends { PostgrestVersion: string } = SchemaNameOrClientOptions extends string &\n    keyof Omit<Database, '__InternalSupabase'>\n    ? // If the version isn't explicitly set, look for it in the __InternalSupabase object to infer the right version\n      Database extends { __InternalSupabase: { PostgrestVersion: string } }\n      ? Database['__InternalSupabase']\n      : // otherwise default to 12\n        { PostgrestVersion: '12' }\n    : SchemaNameOrClientOptions extends { PostgrestVersion: string }\n      ? SchemaNameOrClientOptions\n      : never,\n> {\n  /**\n   * Supabase Auth allows you to create and manage user sessions for access to data that is secured by access policies.\n   */\n  auth: SupabaseAuthClient\n  realtime: RealtimeClient\n  /**\n   * Supabase Storage allows you to manage user-generated content, such as photos or videos.\n   */\n  storage: SupabaseStorageClient\n\n  protected realtimeUrl: URL\n  protected authUrl: URL\n  protected storageUrl: URL\n  protected functionsUrl: URL\n  protected rest: PostgrestClient<Database, ClientOptions, SchemaName>\n  protected storageKey: string\n  protected fetch?: Fetch\n  protected changedAccessToken?: string\n  protected accessToken?: () => Promise<string | null>\n\n  protected headers: Record<string, string>\n\n  /**\n   * Create a new client for use in the browser.\n   *\n   * @category Initializing\n   *\n   * @param supabaseUrl The unique Supabase URL which is supplied when you create a new project in your project dashboard.\n   * @param supabaseKey The unique Supabase Key which is supplied when you create a new project in your project dashboard.\n   * @param options.db.schema You can switch in between schemas. The schema needs to be on the list of exposed schemas inside Supabase.\n   * @param options.auth.autoRefreshToken Set to \"true\" if you want to automatically refresh the token before expiring.\n   * @param options.auth.persistSession Set to \"true\" if you want to automatically save the user session into local storage.\n   * @param options.auth.detectSessionInUrl Set to \"true\" if you want to automatically detects OAuth grants in the URL and signs in the user.\n   * @param options.realtime Options passed along to realtime-js constructor.\n   * @param options.storage Options passed along to the storage-js constructor.\n   * @param options.global.fetch A custom fetch implementation.\n   * @param options.global.headers Any additional headers to send with each network request.\n   *\n   * @example Creating a client\n   * ```js\n   * import { createClient } from '@supabase/supabase-js'\n   *\n   * // Create a single supabase client for interacting with your database\n   * const supabase = createClient('https://xyzcompany.supabase.co', 'publishable-or-anon-key')\n   * ```\n   *\n   * @example With a custom domain\n   * ```js\n   * import { createClient } from '@supabase/supabase-js'\n   *\n   * // Use a custom domain as the supabase URL\n   * const supabase = createClient('https://my-custom-domain.com', 'publishable-or-anon-key')\n   * ```\n   *\n   * @example With additional parameters\n   * ```js\n   * import { createClient } from '@supabase/supabase-js'\n   *\n   * const options = {\n   *   db: {\n   *     schema: 'public',\n   *   },\n   *   auth: {\n   *     autoRefreshToken: true,\n   *     persistSession: true,\n   *     detectSessionInUrl: true\n   *   },\n   *   global: {\n   *     headers: { 'x-my-custom-header': 'my-app-name' },\n   *   },\n   * }\n   * const supabase = createClient(\"https://xyzcompany.supabase.co\", \"publishable-or-anon-key\", options)\n   * ```\n   *\n   * @exampleDescription With custom schemas\n   * By default the API server points to the `public` schema. You can enable other database schemas within the Dashboard.\n   * Go to [Settings > API > Exposed schemas](/dashboard/project/_/settings/api) and add the schema which you want to expose to the API.\n   *\n   * Note: each client connection can only access a single schema, so the code above can access the `other_schema` schema but cannot access the `public` schema.\n   *\n   * @example With custom schemas\n   * ```js\n   * import { createClient } from '@supabase/supabase-js'\n   *\n   * const supabase = createClient('https://xyzcompany.supabase.co', 'publishable-or-anon-key', {\n   *   // Provide a custom schema. Defaults to \"public\".\n   *   db: { schema: 'other_schema' }\n   * })\n   * ```\n   *\n   * @exampleDescription Custom fetch implementation\n   * `supabase-js` uses the [`cross-fetch`](https://www.npmjs.com/package/cross-fetch) library to make HTTP requests,\n   * but an alternative `fetch` implementation can be provided as an option.\n   * This is most useful in environments where `cross-fetch` is not compatible (for instance Cloudflare Workers).\n   *\n   * @example Custom fetch implementation\n   * ```js\n   * import { createClient } from '@supabase/supabase-js'\n   *\n   * const supabase = createClient('https://xyzcompany.supabase.co', 'publishable-or-anon-key', {\n   *   global: { fetch: fetch.bind(globalThis) }\n   * })\n   * ```\n   *\n   * @exampleDescription React Native options with AsyncStorage\n   * For React Native we recommend using `AsyncStorage` as the storage implementation for Supabase Auth.\n   *\n   * @example React Native options with AsyncStorage\n   * ```js\n   * import 'react-native-url-polyfill/auto'\n   * import { createClient } from '@supabase/supabase-js'\n   * import AsyncStorage from \"@react-native-async-storage/async-storage\";\n   *\n   * const supabase = createClient(\"https://xyzcompany.supabase.co\", \"publishable-or-anon-key\", {\n   *   auth: {\n   *     storage: AsyncStorage,\n   *     autoRefreshToken: true,\n   *     persistSession: true,\n   *     detectSessionInUrl: false,\n   *   },\n   * });\n   * ```\n   *\n   * @exampleDescription React Native options with Expo SecureStore\n   * If you wish to encrypt the user's session information, you can use `aes-js` and store the encryption key in Expo SecureStore.\n   * The `aes-js` library, a reputable JavaScript-only implementation of the AES encryption algorithm in CTR mode.\n   * A new 256-bit encryption key is generated using the `react-native-get-random-values` library.\n   * This key is stored inside Expo's SecureStore, while the value is encrypted and placed inside AsyncStorage.\n   *\n   * Please make sure that:\n   * - You keep the `expo-secure-store`, `aes-js` and `react-native-get-random-values` libraries up-to-date.\n   * - Choose the correct [`SecureStoreOptions`](https://docs.expo.dev/versions/latest/sdk/securestore/#securestoreoptions) for your app's needs.\n   *   E.g. [`SecureStore.WHEN_UNLOCKED`](https://docs.expo.dev/versions/latest/sdk/securestore/#securestorewhen_unlocked) regulates when the data can be accessed.\n   * - Carefully consider optimizations or other modifications to the above example, as those can lead to introducing subtle security vulnerabilities.\n   *\n   * @example React Native options with Expo SecureStore\n   * ```ts\n   * import 'react-native-url-polyfill/auto'\n   * import { createClient } from '@supabase/supabase-js'\n   * import AsyncStorage from '@react-native-async-storage/async-storage';\n   * import * as SecureStore from 'expo-secure-store';\n   * import * as aesjs from 'aes-js';\n   * import 'react-native-get-random-values';\n   *\n   * // As Expo's SecureStore does not support values larger than 2048\n   * // bytes, an AES-256 key is generated and stored in SecureStore, while\n   * // it is used to encrypt/decrypt values stored in AsyncStorage.\n   * class LargeSecureStore {\n   *   private async _encrypt(key: string, value: string) {\n   *     const encryptionKey = crypto.getRandomValues(new Uint8Array(256 / 8));\n   *\n   *     const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1));\n   *     const encryptedBytes = cipher.encrypt(aesjs.utils.utf8.toBytes(value));\n   *\n   *     await SecureStore.setItemAsync(key, aesjs.utils.hex.fromBytes(encryptionKey));\n   *\n   *     return aesjs.utils.hex.fromBytes(encryptedBytes);\n   *   }\n   *\n   *   private async _decrypt(key: string, value: string) {\n   *     const encryptionKeyHex = await SecureStore.getItemAsync(key);\n   *     if (!encryptionKeyHex) {\n   *       return encryptionKeyHex;\n   *     }\n   *\n   *     const cipher = new aesjs.ModeOfOperation.ctr(aesjs.utils.hex.toBytes(encryptionKeyHex), new aesjs.Counter(1));\n   *     const decryptedBytes = cipher.decrypt(aesjs.utils.hex.toBytes(value));\n   *\n   *     return aesjs.utils.utf8.fromBytes(decryptedBytes);\n   *   }\n   *\n   *   async getItem(key: string) {\n   *     const encrypted = await AsyncStorage.getItem(key);\n   *     if (!encrypted) { return encrypted; }\n   *\n   *     return await this._decrypt(key, encrypted);\n   *   }\n   *\n   *   async removeItem(key: string) {\n   *     await AsyncStorage.removeItem(key);\n   *     await SecureStore.deleteItemAsync(key);\n   *   }\n   *\n   *   async setItem(key: string, value: string) {\n   *     const encrypted = await this._encrypt(key, value);\n   *\n   *     await AsyncStorage.setItem(key, encrypted);\n   *   }\n   * }\n   *\n   * const supabase = createClient(\"https://xyzcompany.supabase.co\", \"publishable-or-anon-key\", {\n   *   auth: {\n   *     storage: new LargeSecureStore(),\n   *     autoRefreshToken: true,\n   *     persistSession: true,\n   *     detectSessionInUrl: false,\n   *   },\n   * });\n   * ```\n   *\n   * @example With a database query\n   * ```ts\n   * import { createClient } from '@supabase/supabase-js'\n   *\n   * const supabase = createClient('https://xyzcompany.supabase.co', 'publishable-or-anon-key')\n   *\n   * const { data } = await supabase.from('profiles').select('*')\n   * ```\n   */\n  constructor(\n    protected supabaseUrl: string,\n    protected supabaseKey: string,\n    options?: SupabaseClientOptions<SchemaName>\n  ) {\n    const baseUrl = validateSupabaseUrl(supabaseUrl)\n    if (!supabaseKey) throw new Error('supabaseKey is required.')\n\n    this.realtimeUrl = new URL('realtime/v1', baseUrl)\n    this.realtimeUrl.protocol = this.realtimeUrl.protocol.replace('http', 'ws')\n    this.authUrl = new URL('auth/v1', baseUrl)\n    this.storageUrl = new URL('storage/v1', baseUrl)\n    this.functionsUrl = new URL('functions/v1', baseUrl)\n\n    // default storage key uses the supabase project ref as a namespace\n    const defaultStorageKey = `sb-${baseUrl.hostname.split('.')[0]}-auth-token`\n    const DEFAULTS = {\n      db: DEFAULT_DB_OPTIONS,\n      realtime: DEFAULT_REALTIME_OPTIONS,\n      auth: { ...DEFAULT_AUTH_OPTIONS, storageKey: defaultStorageKey },\n      global: DEFAULT_GLOBAL_OPTIONS,\n    }\n\n    const settings = applySettingDefaults(options ?? {}, DEFAULTS)\n\n    this.storageKey = settings.auth.storageKey ?? ''\n    this.headers = settings.global.headers ?? {}\n\n    if (!settings.accessToken) {\n      this.auth = this._initSupabaseAuthClient(\n        settings.auth ?? {},\n        this.headers,\n        settings.global.fetch\n      )\n    } else {\n      this.accessToken = settings.accessToken\n\n      this.auth = new Proxy<SupabaseAuthClient>({} as any, {\n        get: (_, prop) => {\n          throw new Error(\n            `@supabase/supabase-js: Supabase Client is configured with the accessToken option, accessing supabase.auth.${String(\n              prop\n            )} is not possible`\n          )\n        },\n      })\n    }\n\n    this.fetch = fetchWithAuth(supabaseKey, this._getAccessToken.bind(this), settings.global.fetch)\n    this.realtime = this._initRealtimeClient({\n      headers: this.headers,\n      accessToken: this._getAccessToken.bind(this),\n      ...settings.realtime,\n    })\n    if (this.accessToken) {\n      // Start auth immediately to avoid race condition with channel subscriptions\n     ??3400 tokens truncated?쫟er=n.user,await this._saveSession(t),await this._notifyAllSubscribers(`SIGNED_IN`,t)):this._debug(e,`could not get user data, skipping SIGNED_IN notification`)}catch(t){console.error(`Error getting user data:`,t),this._debug(e,`error getting user data, skipping SIGNED_IN notification`,t)}else await this._notifyAllSubscribers(`SIGNED_IN`,t)}catch(t){this._debug(e,`error`,t),console.error(t);return}finally{this._debug(e,`end`)}}async _callRefreshToken(e){var t,n;if(!e)throw new R;if(this.refreshingDeferred)return this.refreshingDeferred.promise;let r=`#_callRefreshToken(${e.substring(0,5)}...)`;this._debug(r,`begin`);try{this.refreshingDeferred=new Wn;let{data:t,error:n}=await this._refreshAccessToken(e);if(n)throw n;if(!t.session)throw new R;await this._saveSession(t.session),await this._notifyAllSubscribers(`TOKEN_REFRESHED`,t.session);let r={data:t.session,error:null};return this.refreshingDeferred.resolve(r),r}catch(e){if(this._debug(r,`error`,e),F(e)){let n={data:null,error:e};return wn(e)||await this._removeSession(),(t=this.refreshingDeferred)==null||t.resolve(n),n}throw(n=this.refreshingDeferred)==null||n.reject(e),e}finally{this.refreshingDeferred=null,this._debug(r,`end`)}}async _notifyAllSubscribers(e,t,n=!0){let r=`#_notifyAllSubscribers(${e})`;this._debug(r,`begin`,t,`broadcast = ${n}`);try{this.broadcastChannel&&n&&this.broadcastChannel.postMessage({event:e,session:t});let r=[],i=Array.from(this.stateChangeEmitters.values()).map(async n=>{try{await n.callback(e,t)}catch(e){r.push(e)}});if(await Promise.all(i),r.length>0){for(let e=0;e<r.length;e+=1)console.error(r[e]);throw r[0]}}finally{this._debug(r,`end`)}}async _saveSession(e){this._debug(`#_saveSession()`,e),this.suppressGetSessionWarning=!0,await K(this.storage,`${this.storageKey}-code-verifier`);let t=Object.assign({},e),n=t.user&&t.user.__isUserNotAvailableProxy===!0;if(this.userStorage){!n&&t.user&&await W(this.userStorage,this.storageKey+`-user`,{user:t.user});let e=Object.assign({},t);delete e.user;let r=sr(e);await W(this.storage,this.storageKey,r)}else{let e=sr(t);await W(this.storage,this.storageKey,e)}}async _removeSession(){this._debug(`#_removeSession()`),this.suppressGetSessionWarning=!1,await K(this.storage,this.storageKey),await K(this.storage,this.storageKey+`-code-verifier`),await K(this.storage,this.storageKey+`-user`),this.userStorage&&await K(this.userStorage,this.storageKey+`-user`),await this._notifyAllSubscribers(`SIGNED_OUT`,null)}_removeVisibilityChangedCallback(){this._debug(`#_removeVisibilityChangedCallback()`);let e=this.visibilityChangedCallback;this.visibilityChangedCallback=null;try{e&&H()&&window!=null&&window.removeEventListener&&window.removeEventListener(`visibilitychange`,e)}catch(e){console.error(`removing visibilitychange callback failed`,e)}}async _startAutoRefresh(){await this._stopAutoRefresh(),this._debug(`#_startAutoRefresh()`);let e=setInterval(()=>this._autoRefreshTokenTick(),N);this.autoRefreshTicker=e,e&&typeof e==`object`&&typeof e.unref==`function`?e.unref():typeof Deno<`u`&&typeof Deno.unrefTimer==`function`&&Deno.unrefTimer(e);let t=setTimeout(async()=>{await this.initializePromise,await this._autoRefreshTokenTick()},0);this.autoRefreshTickTimeout=t,t&&typeof t==`object`&&typeof t.unref==`function`?t.unref():typeof Deno<`u`&&typeof Deno.unrefTimer==`function`&&Deno.unrefTimer(t)}async _stopAutoRefresh(){this._debug(`#_stopAutoRefresh()`);let e=this.autoRefreshTicker;this.autoRefreshTicker=null,e&&clearInterval(e);let t=this.autoRefreshTickTimeout;this.autoRefreshTickTimeout=null,t&&clearTimeout(t)}async startAutoRefresh(){this._removeVisibilityChangedCallback(),await this._startAutoRefresh()}async stopAutoRefresh(){this._removeVisibilityChangedCallback(),await this._stopAutoRefresh()}async _autoRefreshTokenTick(){this._debug(`#_autoRefreshTokenTick()`,`begin`);try{await this._acquireLock(0,async()=>{try{let e=Date.now();try{return await this._useSession(async t=>{let{data:{session:n}}=t;if(!n||!n.refresh_token||!n.expires_at){this._debug(`#_autoRefreshTokenTick()`,`no session`);return}let r=Math.floor((n.expires_at*1e3-e)/N);this._debug(`#_autoRefreshTokenTick()`,`access token expires in ${r} ticks, a tick lasts ${N}ms, refresh threshold is 3 ticks`),r<=3&&await this._callRefreshToken(n.refresh_token)})}catch(e){console.error(`Auto refresh tick failed with error. This is likely a transient error.`,e)}}finally{this._debug(`#_autoRefreshTokenTick()`,`end`)}})}catch(e){if(e.isAcquireTimeout||e instanceof br)this._debug(`auto refresh token tick lock not available`);else throw e}}async _handleVisibilityChange(){if(this._debug(`#_handleVisibilityChange()`),!H()||!(window!=null&&window.addEventListener))return this.autoRefreshToken&&this.startAutoRefresh(),!1;try{this.visibilityChangedCallback=async()=>{try{await this._onVisibilityChanged(!1)}catch(e){this._debug(`#visibilityChangedCallback`,`error`,e)}},window==null||window.addEventListener(`visibilitychange`,this.visibilityChangedCallback),await this._onVisibilityChanged(!0)}catch(e){console.error(`_handleVisibilityChange`,e)}}async _onVisibilityChanged(e){let t=`#_onVisibilityChanged(${e})`;this._debug(t,`visibilityState`,document.visibilityState),document.visibilityState===`visible`?(this.autoRefreshToken&&this._startAutoRefresh(),e||(await this.initializePromise,await this._acquireLock(this.lockAcquireTimeout,async()=>{if(document.visibilityState!==`visible`){this._debug(t,`acquired the lock to recover the session, but the browser visibilityState is no longer visible, aborting`);return}await this._recoverAndRefresh()}))):document.visibilityState===`hidden`&&this.autoRefreshToken&&this._stopAutoRefresh()}async _getUrlForProvider(e,t,n){let r=[`provider=${encodeURIComponent(t)}`];if(n?.redirectTo&&r.push(`redirect_to=${encodeURIComponent(n.redirectTo)}`),n?.scopes&&r.push(`scopes=${encodeURIComponent(n.scopes)}`),this.flowType===`pkce`){let[e,t]=await Qn(this.storage,this.storageKey),n=new URLSearchParams({code_challenge:`${encodeURIComponent(e)}`,code_challenge_method:`${encodeURIComponent(t)}`});r.push(n.toString())}if(n?.queryParams){let e=new URLSearchParams(n.queryParams);r.push(e.toString())}return n?.skipBrowserRedirect&&r.push(`skip_http_redirect=${n.skipBrowserRedirect}`),`${e}?${r.join(`&`)}`}async _unenroll(e){try{return await this._useSession(async t=>{let{data:n,error:r}=t;return r?this._returnResult({data:null,error:r}):await J(this.fetch,`DELETE`,`${this.url}/factors/${e.factorId}`,{headers:this.headers,jwt:n?.session?.access_token})})}catch(e){if(F(e))return this._returnResult({data:null,error:e});throw e}}async _enroll(e){try{return await this._useSession(async t=>{let{data:n,error:r}=t;if(r)return this._returnResult({data:null,error:r});let i=Object.assign({friendly_name:e.friendlyName,factor_type:e.factorType},e.factorType===`phone`?{phone:e.phone}:e.factorType===`totp`?{issuer:e.issuer}:{}),{data:a,error:o}=await J(this.fetch,`POST`,`${this.url}/factors`,{body:i,headers:this.headers,jwt:n?.session?.access_token});return o?this._returnResult({data:null,error:o}):(e.factorType===`totp`&&a.type===`totp`&&a?.totp?.qr_code&&(a.totp.qr_code=`data:image/svg+xml;utf-8,${a.totp.qr_code}`),this._returnResult({data:a,error:null}))})}catch(e){if(F(e))return this._returnResult({data:null,error:e});throw e}}async _verify(e){return this._acquireLock(this.lockAcquireTimeout,async()=>{try{return await this._useSession(async t=>{let{data:n,error:r}=t;if(r)return this._returnResult({data:null,error:r});let i=Object.assign({challenge_id:e.challengeId},`webauthn`in e?{webauthn:Object.assign(Object.assign({},e.webauthn),{credential_response:e.webauthn.type===`create`?Lr(e.webauthn.credential_response):Rr(e.webauthn.credential_response)})}:{code:e.code}),{data:a,error:o}=await J(this.fetch,`POST`,`${this.url}/factors/${e.factorId}/verify`,{body:i,headers:this.headers,jwt:n?.session?.access_token});return o?this._returnResult({data:null,error:o}):(await this._saveSession(Object.assign({expires_at:Math.round(Date.now()/1e3)+a.expires_in},a)),await this._notifyAllSubscribers(`MFA_CHALLENGE_VERIFIED`,a),this._returnResult({data:a,error:o}))})}catch(e){if(F(e))return this._returnResult({data:null,error:e});throw e}})}async _challenge(e){return this._acquireLock(this.lockAcquireTimeout,async()=>{try{return await this._useSession(async t=>{let{data:n,error:r}=t;if(r)return this._returnResult({data:null,error:r});let i=await J(this.fetch,`POST`,`${this.url}/factors/${e.factorId}/challenge`,{body:e,headers:this.headers,jwt:n?.session?.access_token});if(i.error)return i;let{data:a}=i;if(a.type!==`webauthn`)return{data:a,error:null};switch(a.webauthn.type){case`create`:return{data:Object.assign(Object.assign({},a),{webauthn:Object.assign(Object.assign({},a.webauthn),{credential_options:Object.assign(Object.assign({},a.webauthn.credential_options),{publicKey:Fr(a.webauthn.credential_options.publicKey)})})}),error:null};case`request`:return{data:Object.assign(Object.assign({},a),{webauthn:Object.assign(Object.assign({},a.webauthn),{credential_options:Object.assign(Object.assign({},a.webauthn.credential_options),{publicKey:Ir(a.webauthn.credential_options.publicKey)})})}),error:null}}})}catch(e){if(F(e))return this._returnResult({data:null,error:e});throw e}})}async _challengeAndVerify(e){let{data:t,error:n}=await this._challenge({factorId:e.factorId});return n?this._returnResult({data:null,error:n}):await this._verify({factorId:e.factorId,challengeId:t.id,code:e.code})}async _listFactors(){let{data:{user:e},error:t}=await this.getUser();if(t)return{data:null,error:t};let n={all:[],phone:[],totp:[],webauthn:[]};for(let t of e?.factors??[])n.all.push(t),t.status===`verified`&&n[t.factor_type].push(t);return{data:n,error:null}}async _getAuthenticatorAssuranceLevel(e){if(e)try{let{payload:t}=Gn(e),n=null;t.aal&&(n=t.aal);let r=n,{data:{user:i},error:a}=await this.getUser(e);if(a)return this._returnResult({data:null,error:a});((i?.factors)?.filter(e=>e.status===`verified`)??[]).length>0&&(r=`aal2`);let o=t.amr||[];return{data:{currentLevel:n,nextLevel:r,currentAuthenticationMethods:o},error:null}}catch(e){if(F(e))return this._returnResult({data:null,error:e});throw e}let{data:{session:t},error:n}=await this.getSession();if(n)return this._returnResult({data:null,error:n});if(!t)return{data:{currentLevel:null,nextLevel:null,currentAuthenticationMethods:[]},error:null};let{payload:r}=Gn(t.access_token),i=null;r.aal&&(i=r.aal);let a=i;(t.user.factors?.filter(e=>e.status===`verified`)??[]).length>0&&(a=`aal2`);let o=r.amr||[];return{data:{currentLevel:i,nextLevel:a,currentAuthenticationMethods:o},error:null}}async _getAuthorizationDetails(e){try{return await this._useSession(async t=>{let{data:{session:n},error:r}=t;return r?this._returnResult({data:null,error:r}):n?await J(this.fetch,`GET`,`${this.url}/oauth/authorizations/${e}`,{headers:this.headers,jwt:n.access_token,xform:e=>({data:e,error:null})}):this._returnResult({data:null,error:new R})})}catch(e){if(F(e))return this._returnResult({data:null,error:e});throw e}}async _approveAuthorization(e,t){try{return await this._useSession(async n=>{let{data:{session:r},error:i}=n;if(i)return this._returnResult({data:null,error:i});if(!r)return this._returnResult({data:null,error:new R});let a=await J(this.fetch,`POST`,`${this.url}/oauth/authorizations/${e}/consent`,{headers:this.headers,jwt:r.access_token,body:{action:`approve`},xform:e=>({data:e,error:null})});return a.data&&a.data.redirect_url&&H()&&!t?.skipBrowserRedirect&&window.location.assign(a.data.redirect_url),a})}catch(e){if(F(e))return this._returnResult({data:null,error:e});throw e}}async _denyAuthorization(e,t){try{return await this._useSession(async n=>{let{data:{session:r},error:i}=n;if(i)return this._returnResult({data:null,error:i});if(!r)return this._returnResult({data:null,error:new R});let a=await J(this.fetch,`POST`,`${this.url}/oauth/authorizations/${e}/consent`,{headers:this.headers,jwt:r.access_token,body:{action:`deny`},xform:e=>({data:e,error:null})});return a.data&&a.data.redirect_url&&H()&&!t?.skipBrowserRedirect&&window.location.assign(a.data.redirect_url),a})}catch(e){if(F(e))return this._returnResult({data:null,error:e});throw e}}async _listOAuthGrants(){try{return await this._useSession(async e=>{let{data:{session:t},error:n}=e;return n?this._returnResult({data:null,error:n}):t?await J(this.fetch,`GET`,`${this.url}/user/oauth/grants`,{headers:this.headers,jwt:t.access_token,xform:e=>({data:e,error:null})}):this._returnResult({data:null,error:new R})})}catch(e){if(F(e))return this._returnResult({data:null,error:e});throw e}}async _revokeOAuthGrant(e){try{return await this._useSession(async t=>{let{data:{session:n},error:r}=t;return r?this._returnResult({data:null,error:r}):n?(await J(this.fetch,`DELETE`,`${this.url}/user/oauth/grants`,{headers:this.headers,jwt:n.access_token,query:{client_id:e.clientId},noResolveJson:!0}),{data:{},error:null}):this._returnResult({data:null,error:new R})})}catch(e){if(F(e))return this._returnResult({data:null,error:e});throw e}}async fetchJwk(e,t={keys:[]}){let n=t.keys.find(t=>t.kid===e);if(n)return n;let r=Date.now();if(n=this.jwks.keys.find(t=>t.kid===e),n&&this.jwks_cached_at+6e5>r)return n;let{data:i,error:a}=await J(this.fetch,`GET`,`${this.url}/.well-known/jwks.json`,{headers:this.headers});if(a)throw a;return!i.keys||i.keys.length===0||(this.jwks=i,this.jwks_cached_at=r,n=i.keys.find(t=>t.kid===e),!n)?null:n}async getClaims(e,t={}){try{let n=e;if(!n){let{data:e,error:t}=await this.getSession();if(t||!e.session)return this._returnResult({data:null,error:t});n=e.session.access_token}let{header:r,payload:i,signature:a,raw:{header:o,payload:s}}=Gn(n);t?.allowExpired||tr(i.exp);let c=!r.alg||r.alg.startsWith(`HS`)||!r.kid||!(`crypto`in globalThis&&`subtle`in globalThis.crypto)?null:await this.fetchJwk(r.kid,t?.keys?{keys:t.keys}:t?.jwks);if(!c){let{error:e}=await this.getUser(n);if(e)throw e;return{data:{claims:i,header:r,signature:a},error:null}}let l=nr(r.alg),u=await crypto.subtle.importKey(`jwk`,c,l,!0,[`verify`]);if(!await crypto.subtle.verify(l,u,a,Ln(`${o}.${s}`)))throw new Dn(`Invalid JWT signature`);return{data:{claims:i,header:r,signature:a},error:null}}catch(e){if(F(e))return this._returnResult({data:null,error:e});throw e}}};Zr.nextInstanceID={};var Qr=Zr,$r=vr,ei=Qr,ti=class extends ei{constructor(e){super(e)}},ni=class{constructor(e,t,n){this.supabaseUrl=e,this.supabaseKey=t;let r=sn(e);if(!t)throw Error(`supabaseKey is required.`);this.realtimeUrl=new URL(`realtime/v1`,r),this.realtimeUrl.protocol=this.realtimeUrl.protocol.replace(`http`,`ws`),this.authUrl=new URL(`auth/v1`,r),this.storageUrl=new URL(`storage/v1`,r),this.functionsUrl=new URL(`functions/v1`,r);let i=`sb-${r.hostname.split(`.`)[0]}-auth-token`,a={db:Qt,realtime:en,auth:{...$t,storageKey:i},global:Zt},o=on(n??{},a);this.storageKey=o.auth.storageKey??``,this.headers=o.global.headers??{},o.accessToken?(this.accessToken=o.accessToken,this.auth=new Proxy({},{get:(e,t)=>{throw Error(`@supabase/supabase-js: Supabase Client is configured with the accessToken option, accessing supabase.auth.${String(t)} is not possible`)}})):this.auth=this._initSupabaseAuthClient(o.auth??{},this.headers,o.global.fetch),this.fetch=rn(t,this._getAccessToken.bind(this),o.global.fetch),this.realtime=this._initRealtimeClient({headers:this.headers,accessToken:this._getAccessToken.bind(this),...o.realtime}),this.accessToken&&Promise.resolve(this.accessToken()).then(e=>this.realtime.setAuth(e)).catch(e=>console.warn(`Failed to set initial Realtime auth token:`,e)),this.rest=new le(new URL(`rest/v1`,r).href,{headers:this.headers,schema:o.db.schema,fetch:this.fetch,timeout:o.db.timeout,urlLengthLimit:o.db.urlLengthLimit}),this.storage=new Yt(this.storageUrl.href,this.headers,this.fetch,n?.storage),o.accessToken||this._listenForAuthEvents()}get functions(){return new l(this.functionsUrl.href,{headers:this.headers,customFetch:this.fetch})}from(e){return this.rest.from(e)}schema(e){return this.rest.schema(e)}rpc(e,t={},n={head:!1,get:!1,count:void 0}){return this.rest.rpc(e,t,n)}channel(e,t={config:{}}){return this.realtime.channel(e,t)}getChannels(){return this.realtime.getChannels()}removeChannel(e){return this.realtime.removeChannel(e)}removeAllChannels(){return this.realtime.removeAllChannels()}async _getAccessToken(){if(this.accessToken)return await this.accessToken();let{data:e}=await this.auth.getSession();return e.session?.access_token??this.supabaseKey}_initSupabaseAuthClient({autoRefreshToken:e,persistSession:t,detectSessionInUrl:n,storage:r,userStorage:i,storageKey:a,flowType:o,lock:s,debug:c,throwOnError:l},u,d){let f={Authorization:`Bearer ${this.supabaseKey}`,apikey:`${this.supabaseKey}`};return new ti({url:this.authUrl.href,headers:{...f,...u},storageKey:a,autoRefreshToken:e,persistSession:t,detectSessionInUrl:n,storage:r,userStorage:i,flowType:o,lock:s,debug:c,throwOnError:l,fetch:d,hasCustomAuthorizationHeader:Object.keys(this.headers).some(e=>e.toLowerCase()===`authorization`)})}_initRealtimeClient(e){return new tt(this.realtimeUrl.href,{...e,params:{apikey:this.supabaseKey,...e?.params}})}_listenForAuthEvents(){return this.auth.onAuthStateChange((e,t)=>{this._handleTokenChanged(e,`CLIENT`,t?.access_token)})}_handleTokenChanged(e,t,n){(e===`TOKEN_REFRESHED`||e===`SIGNED_IN`)&&this.changedAccessToken!==n?(this.changedAccessToken=n,this.realtime.setAuth(n)):e===`SIGNED_OUT`&&(this.realtime.setAuth(),t==`STORAGE`&&this.auth.signOut(),this.changedAccessToken=void 0)}};let ri=(e,t,n)=>new ni(e,t,n);function ii(){if(typeof window<`u`)return!1;let e=globalThis.process;if(!e)return!1;let t=e.version;if(t==null)return!1;let n=t.match(/^v(\d+)\./);return n?parseInt(n[1],10)<=18:!1}return ii()&&console.warn(`?좑툘  Node.js 18 and below are deprecated and will no longer be supported in future versions of @supabase/supabase-js. Please upgrade to Node.js 20 or later. For more information, visit: https://github.com/orgs/supabase/discussions/37217`),e.AuthAdminApi=$r,e.AuthApiError=mn,e.AuthClient=ei,e.AuthError=P,e.AuthImplicitGrantRedirectError=vn,e.AuthInvalidCredentialsError=_n,e.AuthInvalidJwtError=Dn,e.AuthInvalidTokenResponseError=z,e.AuthPKCECodeVerifierMissingError=xn,e.AuthPKCEGrantCodeExchangeError=bn,e.AuthRetryableFetchError=Cn,e.AuthSessionMissingError=R,e.AuthUnknownError=I,e.AuthWeakPasswordError=Tn,e.CustomAuthError=L,Object.defineProperty(e,`FunctionRegion`,{enumerable:!0,get:function(){return c}}),e.FunctionsError=i,e.FunctionsFetchError=a,e.FunctionsHttpError=s,e.FunctionsRelayError=o,e.GoTrueAdminApi=vr,e.GoTrueClient=Qr,e.NavigatorLockAcquireTimeoutError=xr,e.PostgrestError=p,e.REALTIME_CHANNEL_STATES=Xe,Object.defineProperty(e,`REALTIME_LISTEN_TYPES`,{enumerable:!0,get:function(){return E}}),Object.defineProperty(e,`REALTIME_POSTGRES_CHANGES_LISTEN_EVENT`,{enumerable:!0,get:function(){return Ye}}),Object.defineProperty(e,`REALTIME_PRESENCE_LISTEN_EVENTS`,{enumerable:!0,get:function(){return Ge}}),Object.defineProperty(e,`REALTIME_SUBSCRIBE_STATES`,{enumerable:!0,get:function(){return D}}),e.RealtimeChannel=Ze,e.RealtimeClient=tt,e.RealtimePresence=Ke,e.SIGN_OUT_SCOPES=_r,e.StorageApiError=_t,e.SupabaseClient=ni,e.WebSocketFactory=ue,e.createClient=ri,e.isAuthApiError=hn,e.isAuthError=F,e.isAuthImplicitGrantRedirectError=yn,e.isAuthPKCECodeVerifierMissingError=Sn,e.isAuthRetryableFetchError=wn,e.isAuthSessionMissingError=gn,e.isAuthWeakPasswordError=En,e.lockInternals=Z,e.navigatorLock=Cr,e.processLock=Tr,e})({});
node_modules/@supabase/supabase-js\src\SupabaseClient.ts:551:      flowType,
node_modules/@supabase/supabase-js\src\SupabaseClient.ts:572:      flowType,
node_modules/@supabase/supabase-js\src\lib\constants.ts:32:  flowType: 'implicit',
node_modules/@supabase/supabase-js\src\lib\types.ts:111:    flowType?: SupabaseAuthClientOptions['flowType']
rg: node_modules/@supabase/auth-js: 吏?뺣맂 ?뚯씪??李얠쓣 ???놁뒿?덈떎. (os error 2)

 exited 1 in 522ms:
node_modules/@supabase/supabase-js\dist\index.cjs.map:1:{"version":3,"file":"index.cjs","names":["DEFAULT_AUTH_OPTIONS: SupabaseAuthClientOptions","DEFAULT_REALTIME_OPTIONS: RealtimeClientOptions","fetch","DEFAULT_DB_OPTIONS","DEFAULT_AUTH_OPTIONS","DEFAULT_REALTIME_OPTIONS","DEFAULT_GLOBAL_OPTIONS","result: Required<SupabaseClientOptions<SchemaName>>","AuthClient","supabaseUrl: string","supabaseKey: string","PostgrestClient","SupabaseStorageClient","FunctionsClient","this","RealtimeClient"],"sources":["../src/lib/version.ts","../src/lib/constants.ts","../src/lib/fetch.ts","../src/lib/helpers.ts","../src/lib/SupabaseAuthClient.ts","../src/SupabaseClient.ts","../src/index.ts"],"sourcesContent":["// Generated automatically during releases by scripts/update-version-files.ts\n// This file provides runtime access to the package version for:\n// - HTTP request headers (e.g., X-Client-Info header for API requests)\n// - Debugging and support (identifying which version is running)\n// - Telemetry and logging (version reporting in errors/analytics)\n// - Ensuring build artifacts match the published package version\nexport const version = '2.104.0'\n","// constants.ts\nimport { RealtimeClientOptions } from '@supabase/realtime-js'\nimport { SupabaseAuthClientOptions } from './types'\nimport { version } from './version'\n\nlet JS_ENV = ''\n// @ts-ignore\nif (typeof Deno !== 'undefined') {\n  JS_ENV = 'deno'\n} else if (typeof document !== 'undefined') {\n  JS_ENV = 'web'\n} else if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {\n  JS_ENV = 'react-native'\n} else {\n  JS_ENV = 'node'\n}\n\nexport const DEFAULT_HEADERS = { 'X-Client-Info': `supabase-js-${JS_ENV}/${version}` }\n\nexport const DEFAULT_GLOBAL_OPTIONS = {\n  headers: DEFAULT_HEADERS,\n}\n\nexport const DEFAULT_DB_OPTIONS = {\n  schema: 'public',\n}\n\nexport const DEFAULT_AUTH_OPTIONS: SupabaseAuthClientOptions = {\n  autoRefreshToken: true,\n  persistSession: true,\n  detectSessionInUrl: true,\n  flowType: 'implicit',\n}\n\nexport const DEFAULT_REALTIME_OPTIONS: RealtimeClientOptions = {}\n","type Fetch = typeof fetch\n\nexport const resolveFetch = (customFetch?: Fetch): Fetch => {\n  if (customFetch) {\n    return (...args: Parameters<Fetch>) => customFetch(...args)\n  }\n  return (...args: Parameters<Fetch>) => fetch(...args)\n}\n\nexport const resolveHeadersConstructor = () => {\n  return Headers\n}\n\nexport const fetchWithAuth = (\n  supabaseKey: string,\n  getAccessToken: () => Promise<string | null>,\n  customFetch?: Fetch\n): Fetch => {\n  const fetch = resolveFetch(customFetch)\n  const HeadersConstructor = resolveHeadersConstructor()\n\n  return async (input, init) => {\n    const accessToken = (await getAccessToken()) ?? supabaseKey\n    let headers = new HeadersConstructor(init?.headers)\n\n    if (!headers.has('apikey')) {\n      headers.set('apikey', supabaseKey)\n    }\n\n    if (!headers.has('Authorization')) {\n      headers.set('Authorization', `Bearer ${accessToken}`)\n    }\n\n    return fetch(input, { ...init, headers })\n  }\n}\n","// helpers.ts\nimport { SupabaseClientOptions } from './types'\n\nexport function uuid() {\n  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {\n    var r = (Math.random() * 16) | 0,\n      v = c == 'x' ? r : (r & 0x3) | 0x8\n    return v.toString(16)\n  })\n}\n\nexport function ensureTrailingSlash(url: string): string {\n  return url.endsWith('/') ? url : url + '/'\n}\n\nexport const isBrowser = () => typeof window !== 'undefined'\n\nexport function applySettingDefaults<\n  Database = any,\n  SchemaName extends string & keyof Database = 'public' extends keyof Database\n    ? 'public'\n    : string & keyof Database,\n>(\n  options: SupabaseClientOptions<SchemaName>,\n  defaults: SupabaseClientOptions<any>\n): Required<SupabaseClientOptions<SchemaName>> {\n  const {\n    db: dbOptions,\n    auth: authOptions,\n    realtime: realtimeOptions,\n    global: globalOptions,\n  } = options\n  const {\n    db: DEFAULT_DB_OPTIONS,\n    auth: DEFAULT_AUTH_OPTIONS,\n    realtime: DEFAULT_REALTIME_OPTIONS,\n    global: DEFAULT_GLOBAL_OPTIONS,\n  } = defaults\n\n  const result: Required<SupabaseClientOptions<SchemaName>> = {\n    db: {\n      ...DEFAULT_DB_OPTIONS,\n      ...dbOptions,\n    },\n    auth: {\n      ...DEFAULT_AUTH_OPTIONS,\n      ...authOptions,\n    },\n    realtime: {\n      ...DEFAULT_REALTIME_OPTIONS,\n      ...realtimeOptions,\n    },\n    storage: {},\n    global: {\n      ...DEFAULT_GLOBAL_OPTIONS,\n      ...globalOptions,\n      headers: {\n        ...(DEFAULT_GLOBAL_OPTIONS?.headers ?? {}),\n        ...(globalOptions?.headers ?? {}),\n      },\n    },\n    accessToken: async () => '',\n  }\n\n  if (options.accessToken) {\n    result.accessToken = options.accessToken\n  } else {\n    // hack around Required<>\n    delete (result as any).accessToken\n  }\n\n  return result\n}\n\n/**\n * Validates a Supabase client URL\n *\n * @param {string} supabaseUrl - The Supabase client URL string.\n * @returns {URL} - The validated base URL.\n * @throws {Error}\n */\nexport function validateSupabaseUrl(supabaseUrl: string): URL {\n  const trimmedUrl = supabaseUrl?.trim()\n\n  if (!trimmedUrl) {\n    throw new Error('supabaseUrl is required.')\n  }\n\n  if (!trimmedUrl.match(/^https?:\\/\\//i)) {\n    throw new Error('Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL.')\n  }\n\n  try {\n    return new URL(ensureTrailingSlash(trimmedUrl))\n  } catch {\n    throw Error('Invalid supabaseUrl: Provided URL is malformed.')\n  }\n}\n","import { AuthClient } from '@supabase/auth-js'\nimport { SupabaseAuthClientOptions } from './types'\n\nexport class SupabaseAuthClient extends AuthClient {\n  constructor(options: SupabaseAuthClientOptions) {\n    super(options)\n  }\n}\n","import type { AuthChangeEvent } from '@supabase/auth-js'\nimport { FunctionsClient } from '@supabase/functions-js'\nimport {\n  PostgrestClient,\n  type PostgrestFilterBuilder,\n  type PostgrestQueryBuilder,\n} from '@supabase/postgrest-js'\nimport {\n  type RealtimeChannel,\n  type RealtimeChannelOptions,\n  RealtimeClient,\n  type RealtimeClientOptions,\n} from '@supabase/realtime-js'\nimport { StorageClient as SupabaseStorageClient } from '@supabase/storage-js'\nimport {\n  DEFAULT_AUTH_OPTIONS,\n  DEFAULT_DB_OPTIONS,\n  DEFAULT_GLOBAL_OPTIONS,\n  DEFAULT_REALTIME_OPTIONS,\n} from './lib/constants'\nimport { fetchWithAuth } from './lib/fetch'\nimport { applySettingDefaults, validateSupabaseUrl } from './lib/helpers'\nimport { SupabaseAuthClient } from './lib/SupabaseAuthClient'\nimport type {\n  Fetch,\n  GenericSchema,\n  SupabaseAuthClientOptions,\n  SupabaseClientOptions,\n} from './lib/types'\nimport { GetRpcFunctionFilterBuilderByArgs } from './lib/rest/types/common/rpc'\n\n/**\n * Supabase Client.\n *\n * An isomorphic Javascript client for interacting with Postgres.\n */\nexport default class SupabaseClient<\n  Database = any,\n  // The second type parameter is also used for specifying db_schema, so we\n  // support both cases.\n  // TODO: Allow setting db_schema from ClientOptions.\n  SchemaNameOrClientOptions extends\n    | (string & keyof Omit<Database, '__InternalSupabase'>)\n    | { PostgrestVersion: string } = 'public' extends keyof Omit<Database, '__InternalSupabase'>\n    ? 'public'\n    : string & keyof Omit<Database, '__InternalSupabase'>,\n  SchemaName extends string &\n    keyof Omit<Database, '__InternalSupabase'> = SchemaNameOrClientOptions extends string &\n    keyof Omit<Database, '__InternalSupabase'>\n    ? SchemaNameOrClientOptions\n    : 'public' extends keyof Omit<Database, '__InternalSupabase'>\n      ? 'public'\n      : string & keyof Omit<Omit<Database, '__InternalSupabase'>, '__InternalSupabase'>,\n  Schema extends Omit<Database, '__InternalSupabase'>[SchemaName] extends GenericSchema\n    ? Omit<Database, '__InternalSupabase'>[SchemaName]\n    : never = Omit<Database, '__InternalSupabase'>[SchemaName] extends GenericSchema\n    ? Omit<Database, '__InternalSupabase'>[SchemaName]\n    : never,\n  ClientOptions extends { PostgrestVersion: string } = SchemaNameOrClientOptions extends string &\n    keyof Omit<Database, '__InternalSupabase'>\n    ? // If the version isn't explicitly set, look for it in the __InternalSupabase object to infer the right version\n      Database extends { __InternalSupabase: { PostgrestVersion: string } }\n      ? Database['__InternalSupabase']\n      : // otherwise default to 12\n        { PostgrestVersion: '12' }\n    : SchemaNameOrClientOptions extends { PostgrestVersion: string }\n      ? SchemaNameOrClientOptions\n      : never,\n> {\n  /**\n   * Supabase Auth allows you to create and manage user sessions for access to data that is secured by access policies.\n   */\n  auth: SupabaseAuthClient\n  realtime: RealtimeClient\n  /**\n   * Supabase Storage allows you to manage user-generated content, such as photos or videos.\n   */\n  storage: SupabaseStorageClient\n\n  protected realtimeUrl: URL\n  protected authUrl: URL\n  protected storageUrl: URL\n  protected functionsUrl: URL\n  protected rest: PostgrestClient<Database, ClientOptions, SchemaName>\n  protected storageKey: string\n  protected fetch?: Fetch\n  protected changedAccessToken?: string\n  protected accessToken?: () => Promise<string | null>\n\n  protected headers: Record<string, string>\n\n  /**\n   * Create a new client for use in the browser.\n   *\n   * @category Initializing\n   *\n   * @param supabaseUrl The unique Supabase URL which is supplied when you create a new project in your project dashboard.\n   * @param supabaseKey The unique Supabase Key which is supplied when you create a new project in your project dashboard.\n   * @param options.db.schema You can switch in between schemas. The schema needs to be on the list of exposed schemas inside Supabase.\n   * @param options.auth.autoRefreshToken Set to \"true\" if you want to automatically refresh the token before expiring.\n   * @param options.auth.persistSession Set to \"true\" if you want to automatically save the user session into local storage.\n   * @param options.auth.detectSessionInUrl Set to \"true\" if you want to automatically detects OAuth grants in the URL and signs in the user.\n   * @param options.realtime Options passed along to realtime-js constructor.\n   * @param options.storage Options passed along to the storage-js constructor.\n   * @param options.global.fetch A custom fetch implementation.\n   * @param options.global.headers Any additional headers to send with each network request.\n   *\n   * @example Creating a client\n   * ```js\n   * import { createClient } from '@supabase/supabase-js'\n   *\n   * // Create a single supabase client for interacting with your database\n   * const supabase = createClient('https://xyzcompany.supabase.co', 'publishable-or-anon-key')\n   * ```\n   *\n   * @example With a custom domain\n   * ```js\n   * import { createClient } from '@supabase/supabase-js'\n   *\n   * // Use a custom domain as the supabase URL\n   * const supabase = createClient('https://my-custom-domain.com', 'publishable-or-anon-key')\n   * ```\n   *\n   * @example With additional parameters\n   * ```js\n   * import { createClient } from '@supabase/supabase-js'\n   *\n   * const options = {\n   *   db: {\n   *     schema: 'public',\n   *   },\n   *   auth: {\n   *     autoRefreshToken: true,\n   *     persistSession: true,\n   *     detectSessionInUrl: true\n   *   },\n   *   global: {\n   *     headers: { 'x-my-custom-header': 'my-app-name' },\n   *   },\n   * }\n   * const supabase = createClient(\"https://xyzcompany.supabase.co\", \"publishable-or-anon-key\", options)\n   * ```\n   *\n   * @exampleDescription With custom schemas\n   * By default the API server points to the `public` schema. You can enable other database schemas within the Dashboard.\n   * Go to [Settings > API > Exposed schemas](/dashboard/project/_/settings/api) and add the schema which you want to expose to the API.\n   *\n   * Note: each client connection can only access a single schema, so the code above can access the `other_schema` schema but cannot access the `public` schema.\n   *\n   * @example With custom schemas\n   * ```js\n   * import { createClient } from '@supabase/supabase-js'\n   *\n   * const supabase = createClient('https://xyzcompany.supabase.co', 'publishable-or-anon-key', {\n   *   // Provide a custom schema. Defaults to \"public\".\n   *   db: { schema: 'other_schema' }\n   * })\n   * ```\n   *\n   * @exampleDescription Custom fetch implementation\n   * `supabase-js` uses the [`cross-fetch`](https://www.npmjs.com/package/cross-fetch) library to make HTTP requests,\n   * but an alternative `fetch` implementation can be provided as an option.\n   * This is most useful in environments where `cross-fetch` is not compatible (for instance Cloudflare Workers).\n   *\n   * @example Custom fetch implementation\n   * ```js\n   * import { createClient } from '@supabase/supabase-js'\n   *\n   * const supabase = createClient('https://xyzcompany.supabase.co', 'publishable-or-anon-key', {\n   *   global: { fetch: fetch.bind(globalThis) }\n   * })\n   * ```\n   *\n   * @exampleDescription React Native options with AsyncStorage\n   * For React Native we recommend using `AsyncStorage` as the storage implementation for Supabase Auth.\n   *\n   * @example React Native options with AsyncStorage\n   * ```js\n   * import 'react-native-url-polyfill/auto'\n   * import { createClient } from '@supabase/supabase-js'\n   * import AsyncStorage from \"@react-native-async-storage/async-storage\";\n   *\n   * const supabase = createClient(\"https://xyzcompany.supabase.co\", \"publishable-or-anon-key\", {\n   *   auth: {\n   *     storage: AsyncStorage,\n   *     autoRefreshToken: true,\n   *     persistSession: true,\n   *     detectSessionInUrl: false,\n   *   },\n   * });\n   * ```\n   *\n   * @exampleDescription React Native options with Expo SecureStore\n   * If you wish to encrypt the user's session information, you can use `aes-js` and store the encryption key in Expo SecureStore.\n   * The `aes-js` library, a reputable JavaScript-only implementation of the AES encryption algorithm in CTR mode.\n   * A new 256-bit encryption key is generated using the `react-native-get-random-values` library.\n   * This key is stored inside Expo's SecureStore, while the value is encrypted and placed inside AsyncStorage.\n   *\n   * Please make sure that:\n   * - You keep the `expo-secure-store`, `aes-js` and `react-native-get-random-values` libraries up-to-date.\n   * - Choose the correct [`SecureStoreOptions`](https://docs.expo.dev/versions/latest/sdk/securestore/#securestoreoptions) for your app's needs.\n   *   E.g. [`SecureStore.WHEN_UNLOCKED`](https://docs.expo.dev/versions/latest/sdk/securestore/#securestorewhen_unlocked) regulates when the data can be accessed.\n   * - Carefully consider optimizations or other modifications to the above example, as those can lead to introducing subtle security vulnerabilities.\n   *\n   * @example React Native options with Expo SecureStore\n   * ```ts\n   * import 'react-native-url-polyfill/auto'\n   * import { createClient } from '@supabase/supabase-js'\n   * import AsyncStorage from '@react-native-async-storage/async-storage';\n   * import * as SecureStore from 'expo-secure-store';\n   * import * as aesjs from 'aes-js';\n   * import 'react-native-get-random-values';\n   *\n   * // As Expo's SecureStore does not support values larger than 2048\n   * // bytes, an AES-256 key is generated and stored in SecureStore, while\n   * // it is used to encrypt/decrypt values stored in AsyncStorage.\n   * class LargeSecureStore {\n   *   private async _encrypt(key: string, value: string) {\n   *     const encryptionKey = crypto.getRandomValues(new Uint8Array(256 / 8));\n   *\n   *     const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1));\n   *     const encryptedBytes = cipher.encrypt(aesjs.utils.utf8.toBytes(value));\n   *\n   *     await SecureStore.setItemAsync(key, aesjs.utils.hex.fromBytes(encryptionKey));\n   *\n   *     return aesjs.utils.hex.fromBytes(encryptedBytes);\n   *   }\n   *\n   *   private async _decrypt(key: string, value: string) {\n   *     const encryptionKeyHex = await SecureStore.getItemAsync(key);\n   *     if (!encryptionKeyHex) {\n   *       return encryptionKeyHex;\n   *     }\n   *\n   *     const cipher = new aesjs.ModeOfOperation.ctr(aesjs.utils.hex.toBytes(encryptionKeyHex), new aesjs.Counter(1));\n   *     const decryptedBytes = cipher.decrypt(aesjs.utils.hex.toBytes(value));\n   *\n   *     return aesjs.utils.utf8.fromBytes(decryptedBytes);\n   *   }\n   *\n   *   async getItem(key: string) {\n   *     const encrypted = await AsyncStorage.getItem(key);\n   *     if (!encrypted) { return encrypted; }\n   *\n   *     return await this._decrypt(key, encrypted);\n   *   }\n   *\n   *   async removeItem(key: string) {\n   *     await AsyncStorage.removeItem(key);\n   *     await SecureStore.deleteItemAsync(key);\n   *   }\n   *\n   *   async setItem(key: string, value: string) {\n   *     const encrypted = await this._encrypt(key, value);\n   *\n   *     await AsyncStorage.setItem(key, encrypted);\n   *   }\n   * }\n   *\n   * const supabase = createClient(\"https://xyzcompany.supabase.co\", \"publishable-or-anon-key\", {\n   *   auth: {\n   *     storage: new LargeSecureStore(),\n   *     autoRefreshToken: true,\n   *     persistSession: true,\n   *     detectSessionInUrl: false,\n   *   },\n   * });\n   * ```\n   *\n   * @example With a database query\n   * ```ts\n   * import { createClient } from '@supabase/supabase-js'\n   *\n   * const supabase = createClient('https://xyzcompany.supabase.co', 'publishable-or-anon-key')\n   *\n   * const { data } = await supabase.from('profiles').select('*')\n   * ```\n   */\n  constructor(\n    protected supabaseUrl: string,\n    protected supabaseKey: string,\n    options?: SupabaseClientOptions<SchemaName>\n  ) {\n    const baseUrl = validateSupabaseUrl(supabaseUrl)\n    if (!supabaseKey) throw new Error('supabaseKey is required.')\n\n    this.realtimeUrl = new URL('realtime/v1', baseUrl)\n    this.realtimeUrl.protocol = this.realtimeUrl.protocol.replace('http', 'ws')\n    this.authUrl = new URL('auth/v1', baseUrl)\n    this.storageUrl = new URL('storage/v1', baseUrl)\n    this.functionsUrl = new URL('functions/v1', baseUrl)\n\n    // default storage key uses the supabase project ref as a namespace\n    const defaultStorageKey = `sb-${baseUrl.hostname.split('.')[0]}-auth-token`\n    const DEFAULTS = {\n      db: DEFAULT_DB_OPTIONS,\n      realtime: DEFAULT_REALTIME_OPTIONS,\n      auth: { ...DEFAULT_AUTH_OPTIONS, storageKey: defaultStorageKey },\n      global: DEFAULT_GLOBAL_OPTIONS,\n    }\n\n    const settings = applySettingDefaults(options ?? {}, DEFAULTS)\n\n    this.storageKey = settings.auth.storageKey ?? ''\n    this.headers = settings.global.headers ?? {}\n\n    if (!settings.accessToken) {\n      this.auth = this._initSupabaseAuthClient(\n        settings.auth ?? {},\n        this.headers,\n        settings.global.fetch\n      )\n    } else {\n      this.accessToken = settings.accessToken\n\n      this.auth = new Proxy<SupabaseAuthClient>({} as any, {\n        get: (_, prop) => {\n          throw new Error(\n            `@supabase/supabase-js: Supabase Client is configured with the accessToken option, accessing supabase.auth.${String(\n              prop\n            )} is not possible`\n          )\n        },\n      })\n    }\n\n    this.fetch = fetchWithAuth(supabaseKey, this._getAccessToken.bind(this), settings.global.fetch)\n    this.realtime = this._initRealtimeClient({\n      headers: this.headers,\n      accessToken: this._getAccessToken.bind(this),\n      ...settings.realtime,\n    })\n    if (this.accessToken) {\n      // Start auth immediately to avoid race condition with channel subscriptions\n      // Wrap Promise to avoid Firefox extension cross-context Promise access errors\n      Promise.resolve(this.accessToken())\n        .then((token) => this.realtime.setAuth(token))\n        .catch((e) => console.warn('Failed to set initial Realtime auth token:', e))\n    }\n\n    this.rest = new PostgrestClient(new URL('rest/v1', baseUrl).href, {\n      headers: this.headers,\n      schema: settings.db.schema,\n      fetch: this.fetch,\n      timeout: settings.db.timeout,\n      urlLengthLimit: settings.db.urlLengthLimit,\n    })\n\n    this.storage = new SupabaseStorageClient(\n      this.storageUrl.href,\n      this.headers,\n      this.fetch,\n      options?.storage\n    )\n\n    if (!settings.accessToken) {\n      this._listenForAuthEvents()\n    }\n  }\n\n  /**\n   * Supabase Functions allows you to deploy and invoke edge functions.\n   */\n  get functions(): FunctionsClient {\n    return new FunctionsClient(this.functionsUrl.href, {\n      headers: this.headers,\n      customFetch: this.fetch,\n    })\n  }\n\n  // NOTE: signatures must be kept in sync with PostgrestClient.from\n  from<\n    TableName extends string & keyof Schema['Tables'],\n    Table extends Schema['Tables'][TableName],\n  >(relation: TableName): PostgrestQueryBuilder<ClientOptions, Schema, Table, TableName>\n  from<ViewName extends string & keyof Schema['Views'], View extends Schema['Views'][ViewName]>(\n    relation: ViewName\n  ): PostgrestQueryBuilder<ClientOptions, Schema, View, ViewName>\n  /**\n   * Perform a query on a table or a view.\n   *\n   * @param relation - The table or view name to query\n   */\n  from(relation: string): PostgrestQueryBuilder<ClientOptions, Schema, any> {\n    return this.rest.from(relation)\n  }\n\n  // NOTE: signatures must be kept in sync with PostgrestClient.schema\n  /**\n   * Select a schema to query or perform an function (rpc) call.\n   *\n   * The schema needs to be on the list of exposed schemas inside Supabase.\n   *\n   * @param schema - The schema to query\n   */\n  schema<DynamicSchema extends string & keyof Omit<Database, '__InternalSupabase'>>(\n    schema: DynamicSchema\n  ): PostgrestClient<\n    Database,\n    ClientOptions,\n    DynamicSchema,\n    Database[DynamicSchema] extends GenericSchema ? Database[DynamicSchema] : any\n  > {\n    return this.rest.schema<DynamicSchema>(schema)\n  }\n\n  // NOTE: signatures must be kept in sync with PostgrestClient.rpc\n  /**\n   * Perform a function call.\n   *\n   * @param fn - The function name to call\n   * @param args - The arguments to pass to the function call\n   * @param options - Named parameters\n   * @param options.head - When set to `true`, `data` will not be returned.\n   * Useful if you only need the count.\n   * @param options.get - When set to `true`, the function will be called with\n   * read-only access mode.\n   * @param options.count - Count algorithm to use to count rows returned by the\n   * function. Only applicable for [set-returning\n   * functions](https://www.postgresql.org/docs/current/functions-srf.html).\n   *\n   * `\"exact\"`: Exact but slow count algorithm. Performs a `COUNT(*)` under the\n   * hood.\n   *\n   * `\"planned\"`: Approximated but fast count algorithm. Uses the Postgres\n   * statistics under the hood.\n   *\n   * `\"estimated\"`: Uses exact count for low numbers and planned count for high\n   * numbers.\n   */\n  rpc<\n    FnName extends string & keyof Schema['Functions'],\n    Args extends Schema['Functions'][FnName]['Args'] = never,\n    FilterBuilder extends GetRpcFunctionFilterBuilderByArgs<\n      Schema,\n      FnName,\n      Args\n    > = GetRpcFunctionFilterBuilderByArgs<Schema, FnName, Args>,\n  >(\n    fn: FnName,\n    args: Args = {} as Args,\n    options: {\n      head?: boolean\n      get?: boolean\n      count?: 'exact' | 'planned' | 'estimated'\n    } = {\n      head: false,\n      get: false,\n      count: undefined,\n    }\n  ): PostgrestFilterBuilder<\n    ClientOptions,\n    Schema,\n    FilterBuilder['Row'],\n    FilterBuilder['Result'],\n    FilterBuilder['RelationName'],\n    FilterBuilder['Relationships'],\n    'RPC'\n  > {\n    return this.rest.rpc(fn, args, options) as unknown as PostgrestFilterBuilder<\n      ClientOptions,\n      Schema,\n      FilterBuilder['Row'],\n      FilterBuilder['Result'],\n      FilterBuilder['RelationName'],\n      FilterBuilder['Relationships'],\n      'RPC'\n    >\n  }\n\n  /**\n   * Creates a Realtime channel with Broadcast, Presence, and Postgres Changes.\n   *\n   * @param {string} name - The name of the Realtime channel.\n   * @param {Object} opts - The options to pass to the Realtime channel.\n   *\n   */\n  channel(name: string, opts: RealtimeChannelOptions = { config: {} }): RealtimeChannel {\n    return this.realtime.channel(name, opts)\n  }\n\n  /**\n   * Returns all Realtime channels.\n   *\n   * @category Initializing\n   *\n   * @example Get all channels\n   * ```js\n   * const channels = supabase.getChannels()\n   * ```\n   */\n  getChannels(): RealtimeChannel[] {\n    return this.realtime.getChannels()\n  }\n\n  /**\n   * Unsubscribes and removes Realtime channel from Realtime client.\n   *\n   * @param {RealtimeChannel} channel - The name of the Realtime channel.\n   *\n   *\n   * @category Initializing\n   *\n   * @remarks\n   * - Removing a channel is a great way to maintain the performance of your project's Realtime service as well as your database if you're listening to Postgres changes. Supabase will automatically handle cleanup 30 seconds after a client is disconnected, but unused channels may cause degradation as more clients are simultaneously subscribed.\n   *\n   * @example Removes a channel\n   * ```js\n   * supabase.removeChannel(myChannel)\n   * ```\n   */\n  removeChannel(channel: RealtimeChannel): Promise<'ok' | 'timed out' | 'error'> {\n    return this.realtime.removeChannel(channel)\n  }\n\n  /**\n   * Unsubscribes and removes all Realtime channels from Realtime client.\n   *\n   * @category Initializing\n   *\n   * @remarks\n   * - Removing channels is a great way to maintain the performance of your project's Realtime service as well as your database if you're listening to Postgres changes. Supabase will automatically handle cleanup 30 seconds after a client is disconnected, but unused channels may cause degradation as more clients are simultaneously subscribed.\n   *\n   * @example Remove all channels\n   * ```js\n   * supabase.removeAllChannels()\n   * ```\n   */\n  removeAllChannels(): Promise<('ok' | 'timed out' | 'error')[]> {\n    return this.realtime.removeAllChannels()\n  }\n\n  private async _getAccessToken() {\n    if (this.accessToken) {\n      return await this.accessToken()\n    }\n\n    const { data } = await this.auth.getSession()\n\n    return data.session?.access_token ?? this.supabaseKey\n  }\n\n  private _initSupabaseAuthClient(\n    {\n      autoRefreshToken,\n      persistSession,\n      detectSessionInUrl,\n      storage,\n      userStorage,\n      storageKey,\n      flowType,\n      lock,\n      debug,\n      throwOnError,\n    }: SupabaseAuthClientOptions,\n    headers?: Record<string, string>,\n    fetch?: Fetch\n  ) {\n    const authHeaders = {\n      Authorization: `Bearer ${this.supabaseKey}`,\n      apikey: `${this.supabaseKey}`,\n    }\n    return new SupabaseAuthClient({\n      url: this.authUrl.href,\n      headers: { ...authHeaders, ...headers },\n      storageKey: storageKey,\n      autoRefreshToken,\n      persistSession,\n      detectSessionInUrl,\n      storage,\n      userStorage,\n      flowType,\n      lock,\n      debug,\n      throwOnError,\n      fetch,\n      // auth checks if there is a custom authorizaiton header using this flag\n      // so it knows whether to return an error when getUser is called with no session\n      hasCustomAuthorizationHeader: Object.keys(this.headers).some(\n        (key) => key.toLowerCase() === 'authorization'\n      ),\n    })\n  }\n\n  private _initRealtimeClient(options: RealtimeClientOptions) {\n    return new RealtimeClient(this.realtimeUrl.href, {\n      ...options,\n      params: { ...{ apikey: this.supabaseKey }, ...options?.params },\n    })\n  }\n\n  private _listenForAuthEvents() {\n    const data = this.auth.onAuthStateChange((event, session) => {\n      this._handleTokenChanged(event, 'CLIENT', session?.access_token)\n    })\n    return data\n  }\n\n  private _handleTokenChanged(\n    event: AuthChangeEvent,\n    source: 'CLIENT' | 'STORAGE',\n    token?: string\n  ) {\n    if (\n      (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') &&\n      this.changedAccessToken !== token\n    ) {\n      this.changedAccessToken = token\n      this.realtime.setAuth(token)\n    } else if (event === 'SIGNED_OUT') {\n      this.realtime.setAuth()\n      if (source == 'STORAGE') this.auth.signOut()\n      this.changedAccessToken = undefined\n    }\n  }\n}\n","import SupabaseClient from './SupabaseClient'\nimport type { SupabaseClientOptions } from './lib/types'\n\nexport * from '@supabase/auth-js'\nexport type { User as AuthUser, Session as AuthSession } from '@supabase/auth-js'\nexport type {\n  PostgrestResponse,\n  PostgrestSingleResponse,\n  PostgrestMaybeSingleResponse,\n  PostgrestBuilder,\n  PostgrestFilterBuilder,\n  PostgrestTransformBuilder,\n  PostgrestQueryBuilder,\n} from '@supabase/postgrest-js'\nexport { PostgrestError } from '@supabase/postgrest-js'\nexport { StorageApiError } from '@supabase/storage-js'\nexport type { FunctionInvokeOptions } from '@supabase/functions-js'\nexport {\n  FunctionsHttpError,\n  FunctionsFetchError,\n  FunctionsRelayError,\n  FunctionsError,\n  FunctionRegion,\n} from '@supabase/functions-js'\nexport * from '@supabase/realtime-js'\nexport { default as SupabaseClient } from './SupabaseClient'\nexport type {\n  SupabaseClientOptions,\n  QueryResult,\n  QueryData,\n  QueryError,\n  DatabaseWithoutInternals,\n} from './lib/types'\n\n/**\n * Creates a new Supabase Client.\n *\n * @example Creating a Supabase client\n * ```ts\n * import { createClient } from '@supabase/supabase-js'\n *\n * const supabase = createClient('https://xyzcompany.supabase.co', 'publishable-or-anon-key')\n * const { data, error } = await supabase.from('profiles').select('*')\n * ```\n */\nexport const createClient = <\n  Database = any,\n  SchemaNameOrClientOptions extends\n    | (string & keyof Omit<Database, '__InternalSupabase'>)\n    | { PostgrestVersion: string } = 'public' extends keyof Omit<Database, '__InternalSupabase'>\n    ? 'public'\n    : string & keyof Omit<Database, '__InternalSupabase'>,\n  SchemaName extends string &\n    keyof Omit<Database, '__InternalSupabase'> = SchemaNameOrClientOptions extends string &\n    keyof Omit<Database, '__InternalSupabase'>\n    ? SchemaNameOrClientOptions\n    : 'public' extends keyof Omit<Database, '__InternalSupabase'>\n      ? 'public'\n      : string & keyof Omit<Omit<Database, '__InternalSupabase'>, '__InternalSupabase'>,\n>(\n  supabaseUrl: string,\n  supabaseKey: string,\n  options?: SupabaseClientOptions<SchemaName>\n): SupabaseClient<Database, SchemaNameOrClientOptions, SchemaName> => {\n  return new SupabaseClient<Database, SchemaNameOrClientOptions, SchemaName>(\n    supabaseUrl,\n    supabaseKey,\n    options\n  )\n}\n\n// Check for Node.js <= 18 deprecation\nfunction shouldShowDeprecationWarning(): boolean {\n  // Skip in browser environments\n  if (typeof window !== 'undefined') {\n    return false\n  }\n\n  // Skip if process is not available (e.g., Edge Runtime)\n  // Use dynamic property access to avoid Next.js Edge Runtime static analysis warnings\n  const _process = (globalThis as any)['process']\n  if (!_process) {\n    return false\n  }\n\n  const processVersion = _process['version']\n  if (processVersion === undefined || processVersion === null) {\n    return false\n  }\n\n  const versionMatch = processVersion.match(/^v(\\d+)\\./)\n  if (!versionMatch) {\n    return false\n  }\n\n  const majorVersion = parseInt(versionMatch[1], 10)\n  return majorVersion <= 18\n}\n\nif (shouldShowDeprecationWarning()) {\n  console.warn(\n    `?좑툘  Node.js 18 and below are deprecated and will no longer be supported in future versions of @supabase/supabase-js. ` +\n      `Please upgrade to Node.js 20 or later. ` +\n      `For more information, visit: https://github.com/orgs/supabase/discussions/37217`\n  )\n}\n"],"mappings":";;;;;;;AAMA,MAAa,UAAU;;;;ACDvB,IAAI,SAAS;AAEb,IAAI,OAAO,SAAS,YAClB,UAAS;SACA,OAAO,aAAa,YAC7B,UAAS;SACA,OAAO,cAAc,eAAe,UAAU,YAAY,cACnE,UAAS;IAET,UAAS;AAGX,MAAa,kBAAkB,EAAE,iBAAiB,eAAe,OAAO,GAAG,WAAW;AAEtF,MAAa,yBAAyB,EACpC,SAAS,iBACV;AAED,MAAa,qBAAqB,EAChC,QAAQ,UACT;AAED,MAAaA,uBAAkD;CAC7D,kBAAkB;CAClB,gBAAgB;CAChB,oBAAoB;CACpB,UAAU;CACX;AAED,MAAaC,2BAAkD,EAAE;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;AChCjE,MAAa,gBAAgB,gBAA+B;AAC1D,KAAI,YACF,SAAQ,GAAG,SAA4B,YAAY,GAAG,KAAK;AAE7D,SAAQ,GAAG,SAA4B,MAAM,GAAG,KAAK;;AAGvD,MAAa,kCAAkC;AAC7C,QAAO;;AAGT,MAAa,iBACX,aACA,gBACA,gBACU;CACV,MAAMC,UAAQ,aAAa,YAAY;CACvC,MAAM,qBAAqB,2BAA2B;AAEtD,QAAO,OAAO,OAAO,SAAS;;EAC5B,MAAM,uCAAe,MAAM,gBAAgB,yEAAK;EAChD,IAAI,UAAU,IAAI,+DAAmB,KAAM,QAAQ;AAEnD,MAAI,CAAC,QAAQ,IAAI,SAAS,CACxB,SAAQ,IAAI,UAAU,YAAY;AAGpC,MAAI,CAAC,QAAQ,IAAI,gBAAgB,CAC/B,SAAQ,IAAI,iBAAiB,UAAU,cAAc;AAGvD,SAAOA,QAAM,yCAAY,aAAM,WAAU;;;;;;ACtB7C,SAAgB,oBAAoB,KAAqB;AACvD,QAAO,IAAI,SAAS,IAAI,GAAG,MAAM,MAAM;;AAKzC,SAAgB,qBAMd,SACA,UAC6C;;CAC7C,MAAM,EACJ,IAAI,WACJ,MAAM,aACN,UAAU,iBACV,QAAQ,kBACN;CACJ,MAAM,EACJ,IAAIC,sBACJ,MAAMC,wBACN,UAAUC,4BACV,QAAQC,6BACN;CAEJ,MAAMC,SAAsD;EAC1D,sCACKJ,uBACA;EAEL,wCACKC,yBACA;EAEL,4CACKC,6BACA;EAEL,SAAS,EAAE;EACX,yDACKC,2BACA,sBACH,wJACMA,yBAAwB,gFAAW,EAAE,0FACrC,cAAe,gFAAW,EAAE;EAGpC,aAAa,YAAY;EAC1B;AAED,KAAI,QAAQ,YACV,QAAO,cAAc,QAAQ;KAG7B,QAAQ,OAAe;AAGzB,QAAO;;;;;;;;;AAUT,SAAgB,oBAAoB,aAA0B;CAC5D,MAAM,uEAAa,YAAa,MAAM;AAEtC,KAAI,CAAC,WACH,OAAM,IAAI,MAAM,2BAA2B;AAG7C,KAAI,CAAC,WAAW,MAAM,gBAAgB,CACpC,OAAM,IAAI,MAAM,0DAA0D;AAG5E,KAAI;AACF,SAAO,IAAI,IAAI,oBAAoB,WAAW,CAAC;mBACzC;AACN,QAAM,MAAM,kDAAkD;;;;;;AC5FlE,IAAa,qBAAb,cAAwCE,8BAAW;CACjD,YAAY,SAAoC;AAC9C,QAAM,QAAQ;;;;;;;;;;;AC+BlB,IAAqB,iBAArB,MAgCE;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;CAkNA,YACE,AAAUC,aACV,AAAUC,aACV,SACA;;EAHU;EACA;EAGV,MAAM,UAAU,oBAAoB,YAAY;AAChD,MAAI,CAAC,YAAa,OAAM,IAAI,MAAM,2BAA2B;AAE7D,OAAK,cAAc,IAAI,IAAI,eAAe,QAAQ;AAClD,OAAK,YAAY,WAAW,KAAK,YAAY,SAAS,QAAQ,QAAQ,KAAK;AAC3E,OAAK,UAAU,IAAI,IAAI,WAAW,QAAQ;AAC1C,OAAK,aAAa,IAAI,IAAI,cAAc,QAAQ;AAChD,OAAK,eAAe,IAAI,IAAI,gBAAgB,QAAQ;EAGpD,MAAM,oBAAoB,MAAM,QAAQ,SAAS,MAAM,IAAI,CAAC,GAAG;EAC/D,MAAM,WAAW;GACf,IAAI;GACJ,UAAU;GACV,wCAAW,6BAAsB,YAAY;GAC7C,QAAQ;GACT;EAED,MAAM,WAAW,qBAAqB,mDAAW,EAAE,EAAE,SAAS;AAE9D,OAAK,sCAAa,SAAS,KAAK,mFAAc;AAC9C,OAAK,mCAAU,SAAS,OAAO,gFAAW,EAAE;AAE5C,MAAI,CAAC,SAAS,aAAa;;AACzB,QAAK,OAAO,KAAK,0CACf,SAAS,+DAAQ,EAAE,EACnB,KAAK,SACL,SAAS,OAAO,MACjB;SACI;AACL,QAAK,cAAc,SAAS;AAE5B,QAAK,OAAO,IAAI,MAA0B,EAAE,EAAS,EACnD,MAAM,GAAG,SAAS;AAChB,UAAM,IAAI,MACR,6GAA6G,OAC3G,KACD,CAAC,kBACH;MAEJ,CAAC;;AAGJ,OAAK,QAAQ,cAAc,aAAa,KAAK,gBAAgB,KAAK,KAAK,EAAE,SAAS,OAAO,MAAM;AAC/F,OAAK,WAAW,KAAK;GACnB,SAAS,KAAK;GACd,aAAa,KAAK,gBAAgB,KAAK,KAAK;KACzC,SAAS,UACZ;AACF,MAAI,KAAK,YAGP,SAAQ,QAAQ,KAAK,aAAa,CAAC,CAChC,MAAM,UAAU,KAAK,SAAS,QAAQ,MAAM,CAAC,CAC7C,OAAO,MAAM,QAAQ,KAAK,8CAA8C,EAAE,CAAC;AAGhF,OAAK,OAAO,IAAIC,wCAAgB,IAAI,IAAI,WAAW,QAAQ,CAAC,MAAM;GAChE,SAAS,KAAK;GACd,QAAQ,SAAS,GAAG;GACpB,OAAO,KAAK;GACZ,SAAS,SAAS,GAAG;GACrB,gBAAgB,SAAS,GAAG;GAC7B,CAAC;AAEF,OAAK,UAAU,IAAIC,oCACjB,KAAK,WAAW,MAChB,KAAK,SACL,KAAK,yDACL,QAAS,QACV;AAED,MAAI,CAAC,SAAS,YACZ,MAAK,sBAAsB;;;;;CAO/B,IAAI,YAA6B;AAC/B,SAAO,IAAIC,wCAAgB,KAAK,aAAa,MAAM;GACjD,SAAS,KAAK;GACd,aAAa,KAAK;GACnB,CAAC;;;;;;;CAgBJ,KAAK,UAAqE;AACxE,SAAO,KAAK,KAAK,KAAK,SAAS;;;;;;;;;CAWjC,OACE,QAMA;AACA,SAAO,KAAK,KAAK,OAAsB,OAAO;;;;;;;;;;;;;;;;;;;;;;;;;CA2BhD,IASE,IACA,OAAa,EAAE,EACf,UAII;EACF,MAAM;EACN,KAAK;EACL,OAAO;EACR,EASD;AACA,SAAO,KAAK,KAAK,IAAI,IAAI,MAAM,QAAQ;;;;;;;;;CAkBzC,QAAQ,MAAc,OAA+B,EAAE,QAAQ,EAAE,EAAE,EAAmB;AACpF,SAAO,KAAK,SAAS,QAAQ,MAAM,KAAK;;;;;;;;;;;;CAa1C,cAAiC;AAC/B,SAAO,KAAK,SAAS,aAAa;;;;;;;;;;;;;;;;;;CAmBpC,cAAc,SAAiE;AAC7E,SAAO,KAAK,SAAS,cAAc,QAAQ;;;;;;;;;;;;;;;CAgB7C,oBAA+D;AAC7D,SAAO,KAAK,SAAS,mBAAmB;;CAG1C,MAAc,kBAAkB;;;AAC9B,MAAIC,MAAK,YACP,QAAO,MAAMA,MAAK,aAAa;EAGjC,MAAM,EAAE,SAAS,MAAMA,MAAK,KAAK,YAAY;AAE7C,mDAAO,KAAK,uEAAS,qFAAgBA,MAAK;;CAG5C,AAAQ,wBACN,EACE,kBACA,gBACA,oBACA,SACA,aACA,YACA,UACA,MACA,OACA,gBAEF,SACA,SACA;EACA,MAAM,cAAc;GAClB,eAAe,UAAU,KAAK;GAC9B,QAAQ,GAAG,KAAK;GACjB;AACD,SAAO,IAAI,mBAAmB;GAC5B,KAAK,KAAK,QAAQ;GAClB,2CAAc,cAAgB;GAClB;GACZ;GACA;GACA;GACA;GACA;GACA;GACA;GACA;GACA;GACA;GAGA,8BAA8B,OAAO,KAAK,KAAK,QAAQ,CAAC,MACrD,QAAQ,IAAI,aAAa,KAAK,gBAChC;GACF,CAAC;;CAGJ,AAAQ,oBAAoB,SAAgC;AAC1D,SAAO,IAAIC,sCAAe,KAAK,YAAY,wCACtC,gBACH,0CAAa,EAAE,QAAQ,KAAK,aAAa,qDAAK,QAAS,WACvD;;CAGJ,AAAQ,uBAAuB;AAI7B,SAHa,KAAK,KAAK,mBAAmB,OAAO,YAAY;AAC3D,QAAK,oBAAoB,OAAO,4DAAU,QAAS,aAAa;IAChE;;CAIJ,AAAQ,oBACN,OACA,QACA,OACA;AACA,OACG,UAAU,qBAAqB,UAAU,gBAC1C,KAAK,uBAAuB,OAC5B;AACA,QAAK,qBAAqB;AAC1B,QAAK,SAAS,QAAQ,MAAM;aACnB,UAAU,cAAc;AACjC,QAAK,SAAS,SAAS;AACvB,OAAI,UAAU,UAAW,MAAK,KAAK,SAAS;AAC5C,QAAK,qBAAqB;;;;;;;;;;;;;;;;;;ACvjBhC,MAAa,gBAeX,aACA,aACA,YACoE;AACpE,QAAO,IAAI,eACT,aACA,aACA,QACD;;AAIH,SAAS,+BAAwC;AAE/C,KAAI,OAAO,WAAW,YACpB,QAAO;CAKT,MAAM,WAAY,WAAmB;AACrC,KAAI,CAAC,SACH,QAAO;CAGT,MAAM,iBAAiB,SAAS;AAChC,KAAI,mBAAmB,UAAa,mBAAmB,KACrD,QAAO;CAGT,MAAM,eAAe,eAAe,MAAM,YAAY;AACtD,KAAI,CAAC,aACH,QAAO;AAIT,QADqB,SAAS,aAAa,IAAI,GAAG,IAC3B;;AAGzB,IAAI,8BAA8B,CAChC,SAAQ,KACN,8OAGD"}
node_modules/@supabase/supabase-js\dist\index.cjs:24:	flowType: "implicit"
node_modules/@supabase/supabase-js\dist\index.cjs:526:	_initSupabaseAuthClient({ autoRefreshToken, persistSession, detectSessionInUrl, storage, userStorage, storageKey, flowType, lock, debug, throwOnError }, headers, fetch$1) {
node_modules/@supabase/supabase-js\dist\index.cjs:540:			flowType,
node_modules/@supabase/supabase-js\dist\index.d.cts:140:    flowType?: SupabaseAuthClientOptions['flowType'];
node_modules/@supabase/supabase-js\dist\index.d.mts:140:    flowType?: SupabaseAuthClientOptions['flowType'];
node_modules/@supabase/supabase-js\dist\index.mjs:28:	flowType: "implicit"
node_modules/@supabase/supabase-js\dist\index.mjs:530:	_initSupabaseAuthClient({ autoRefreshToken, persistSession, detectSessionInUrl, storage, userStorage, storageKey, flowType, lock, debug, throwOnError }, headers, fetch$1) {
node_modules/@supabase/supabase-js\dist\index.mjs:544:			flowType,
node_modules/@supabase/supabase-js\dist\index.mjs.map:1:{"version":3,"file":"index.mjs","names":["DEFAULT_AUTH_OPTIONS: SupabaseAuthClientOptions","DEFAULT_REALTIME_OPTIONS: RealtimeClientOptions","fetch","DEFAULT_DB_OPTIONS","DEFAULT_AUTH_OPTIONS","DEFAULT_REALTIME_OPTIONS","DEFAULT_GLOBAL_OPTIONS","result: Required<SupabaseClientOptions<SchemaName>>","supabaseUrl: string","supabaseKey: string","SupabaseStorageClient","this"],"sources":["../src/lib/version.ts","../src/lib/constants.ts","../src/lib/fetch.ts","../src/lib/helpers.ts","../src/lib/SupabaseAuthClient.ts","../src/SupabaseClient.ts","../src/index.ts"],"sourcesContent":["// Generated automatically during releases by scripts/update-version-files.ts\n// This file provides runtime access to the package version for:\n// - HTTP request headers (e.g., X-Client-Info header for API requests)\n// - Debugging and support (identifying which version is running)\n// - Telemetry and logging (version reporting in errors/analytics)\n// - Ensuring build artifacts match the published package version\nexport const version = '2.104.0'\n","// constants.ts\nimport { RealtimeClientOptions } from '@supabase/realtime-js'\nimport { SupabaseAuthClientOptions } from './types'\nimport { version } from './version'\n\nlet JS_ENV = ''\n// @ts-ignore\nif (typeof Deno !== 'undefined') {\n  JS_ENV = 'deno'\n} else if (typeof document !== 'undefined') {\n  JS_ENV = 'web'\n} else if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {\n  JS_ENV = 'react-native'\n} else {\n  JS_ENV = 'node'\n}\n\nexport const DEFAULT_HEADERS = { 'X-Client-Info': `supabase-js-${JS_ENV}/${version}` }\n\nexport const DEFAULT_GLOBAL_OPTIONS = {\n  headers: DEFAULT_HEADERS,\n}\n\nexport const DEFAULT_DB_OPTIONS = {\n  schema: 'public',\n}\n\nexport const DEFAULT_AUTH_OPTIONS: SupabaseAuthClientOptions = {\n  autoRefreshToken: true,\n  persistSession: true,\n  detectSessionInUrl: true,\n  flowType: 'implicit',\n}\n\nexport const DEFAULT_REALTIME_OPTIONS: RealtimeClientOptions = {}\n","type Fetch = typeof fetch\n\nexport const resolveFetch = (customFetch?: Fetch): Fetch => {\n  if (customFetch) {\n    return (...args: Parameters<Fetch>) => customFetch(...args)\n  }\n  return (...args: Parameters<Fetch>) => fetch(...args)\n}\n\nexport const resolveHeadersConstructor = () => {\n  return Headers\n}\n\nexport const fetchWithAuth = (\n  supabaseKey: string,\n  getAccessToken: () => Promise<string | null>,\n  customFetch?: Fetch\n): Fetch => {\n  const fetch = resolveFetch(customFetch)\n  const HeadersConstructor = resolveHeadersConstructor()\n\n  return async (input, init) => {\n    const accessToken = (await getAccessToken()) ?? supabaseKey\n    let headers = new HeadersConstructor(init?.headers)\n\n    if (!headers.has('apikey')) {\n      headers.set('apikey', supabaseKey)\n    }\n\n    if (!headers.has('Authorization')) {\n      headers.set('Authorization', `Bearer ${accessToken}`)\n    }\n\n    return fetch(input, { ...init, headers })\n  }\n}\n","// helpers.ts\nimport { SupabaseClientOptions } from './types'\n\nexport function uuid() {\n  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {\n    var r = (Math.random() * 16) | 0,\n      v = c == 'x' ? r : (r & 0x3) | 0x8\n    return v.toString(16)\n  })\n}\n\nexport function ensureTrailingSlash(url: string): string {\n  return url.endsWith('/') ? url : url + '/'\n}\n\nexport const isBrowser = () => typeof window !== 'undefined'\n\nexport function applySettingDefaults<\n  Database = any,\n  SchemaName extends string & keyof Database = 'public' extends keyof Database\n    ? 'public'\n    : string & keyof Database,\n>(\n  options: SupabaseClientOptions<SchemaName>,\n  defaults: SupabaseClientOptions<any>\n): Required<SupabaseClientOptions<SchemaName>> {\n  const {\n    db: dbOptions,\n    auth: authOptions,\n    realtime: realtimeOptions,\n    global: globalOptions,\n  } = options\n  const {\n    db: DEFAULT_DB_OPTIONS,\n    auth: DEFAULT_AUTH_OPTIONS,\n    realtime: DEFAULT_REALTIME_OPTIONS,\n    global: DEFAULT_GLOBAL_OPTIONS,\n  } = defaults\n\n  const result: Required<SupabaseClientOptions<SchemaName>> = {\n    db: {\n      ...DEFAULT_DB_OPTIONS,\n      ...dbOptions,\n    },\n    auth: {\n      ...DEFAULT_AUTH_OPTIONS,\n      ...authOptions,\n    },\n    realtime: {\n      ...DEFAULT_REALTIME_OPTIONS,\n      ...realtimeOptions,\n    },\n    storage: {},\n    global: {\n      ...DEFAULT_GLOBAL_OPTIONS,\n      ...globalOptions,\n      headers: {\n        ...(DEFAULT_GLOBAL_OPTIONS?.headers ?? {}),\n        ...(globalOptions?.headers ?? {}),\n      },\n    },\n    accessToken: async () => '',\n  }\n\n  if (options.accessToken) {\n    result.accessToken = options.accessToken\n  } else {\n    // hack around Required<>\n    delete (result as any).accessToken\n  }\n\n  return result\n}\n\n/**\n * Validates a Supabase client URL\n *\n * @param {string} supabaseUrl - The Supabase client URL string.\n * @returns {URL} - The validated base URL.\n * @throws {Error}\n */\nexport function validateSupabaseUrl(supabaseUrl: string): URL {\n  const trimmedUrl = supabaseUrl?.trim()\n\n  if (!trimmedUrl) {\n    throw new Error('supabaseUrl is required.')\n  }\n\n  if (!trimmedUrl.match(/^https?:\\/\\//i)) {\n    throw new Error('Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL.')\n  }\n\n  try {\n    return new URL(ensureTrailingSlash(trimmedUrl))\n  } catch {\n    throw Error('Invalid supabaseUrl: Provided URL is malformed.')\n  }\n}\n","import { AuthClient } from '@supabase/auth-js'\nimport { SupabaseAuthClientOptions } from './types'\n\nexport class SupabaseAuthClient extends AuthClient {\n  constructor(options: SupabaseAuthClientOptions) {\n    super(options)\n  }\n}\n","import type { AuthChangeEvent } from '@supabase/auth-js'\nimport { FunctionsClient } from '@supabase/functions-js'\nimport {\n  PostgrestClient,\n  type PostgrestFilterBuilder,\n  type PostgrestQueryBuilder,\n} from '@supabase/postgrest-js'\nimport {\n  type RealtimeChannel,\n  type RealtimeChannelOptions,\n  RealtimeClient,\n  type RealtimeClientOptions,\n} from '@supabase/realtime-js'\nimport { StorageClient as SupabaseStorageClient } from '@supabase/storage-js'\nimport {\n  DEFAULT_AUTH_OPTIONS,\n  DEFAULT_DB_OPTIONS,\n  DEFAULT_GLOBAL_OPTIONS,\n  DEFAULT_REALTIME_OPTIONS,\n} from './lib/constants'\nimport { fetchWithAuth } from './lib/fetch'\nimport { applySettingDefaults, validateSupabaseUrl } from './lib/helpers'\nimport { SupabaseAuthClient } from './lib/SupabaseAuthClient'\nimport type {\n  Fetch,\n  GenericSchema,\n  SupabaseAuthClientOptions,\n  SupabaseClientOptions,\n} from './lib/types'\nimport { GetRpcFunctionFilterBuilderByArgs } from './lib/rest/types/common/rpc'\n\n/**\n * Supabase Client.\n *\n * An isomorphic Javascript client for interacting with Postgres.\n */\nexport default class SupabaseClient<\n  Database = any,\n  // The second type parameter is also used for specifying db_schema, so we\n  // support both cases.\n  // TODO: Allow setting db_schema from ClientOptions.\n  SchemaNameOrClientOptions extends\n    | (string & keyof Omit<Database, '__InternalSupabase'>)\n    | { PostgrestVersion: string } = 'public' extends keyof Omit<Database, '__InternalSupabase'>\n    ? 'public'\n    : string & keyof Omit<Database, '__InternalSupabase'>,\n  SchemaName extends string &\n    keyof Omit<Database, '__InternalSupabase'> = SchemaNameOrClientOptions extends string &\n    keyof Omit<Database, '__InternalSupabase'>\n    ? SchemaNameOrClientOptions\n    : 'public' extends keyof Omit<Database, '__InternalSupabase'>\n      ? 'public'\n      : string & keyof Omit<Omit<Database, '__InternalSupabase'>, '__InternalSupabase'>,\n  Schema extends Omit<Database, '__InternalSupabase'>[SchemaName] extends GenericSchema\n    ? Omit<Database, '__InternalSupabase'>[SchemaName]\n    : never = Omit<Database, '__InternalSupabase'>[SchemaName] extends GenericSchema\n    ? Omit<Database, '__InternalSupabase'>[SchemaName]\n    : never,\n  ClientOptions extends { PostgrestVersion: string } = SchemaNameOrClientOptions extends string &\n    keyof Omit<Database, '__InternalSupabase'>\n    ? // If the version isn't explicitly set, look for it in the __InternalSupabase object to infer the right version\n      Database extends { __InternalSupabase: { PostgrestVersion: string } }\n      ? Database['__InternalSupabase']\n      : // otherwise default to 12\n        { PostgrestVersion: '12' }\n    : SchemaNameOrClientOptions extends { PostgrestVersion: string }\n      ? SchemaNameOrClientOptions\n      : never,\n> {\n  /**\n   * Supabase Auth allows you to create and manage user sessions for access to data that is secured by access policies.\n   */\n  auth: SupabaseAuthClient\n  realtime: RealtimeClient\n  /**\n   * Supabase Storage allows you to manage user-generated content, such as photos or videos.\n   */\n  storage: SupabaseStorageClient\n\n  protected realtimeUrl: URL\n  protected authUrl: URL\n  protected storageUrl: URL\n  protected functionsUrl: URL\n  protected rest: PostgrestClient<Database, ClientOptions, SchemaName>\n  protected storageKey: string\n  protected fetch?: Fetch\n  protected changedAccessToken?: string\n  protected accessToken?: () => Promise<string | null>\n\n  protected headers: Record<string, string>\n\n  /**\n   * Create a new client for use in the browser.\n   *\n   * @category Initializing\n   *\n   * @param supabaseUrl The unique Supabase URL which is supplied when you create a new project in your project dashboard.\n   * @param supabaseKey The unique Supabase Key which is supplied when you create a new project in your project dashboard.\n   * @param options.db.schema You can switch in between schemas. The schema needs to be on the list of exposed schemas inside Supabase.\n   * @param options.auth.autoRefreshToken Set to \"true\" if you want to automatically refresh the token before expiring.\n   * @param options.auth.persistSession Set to \"true\" if you want to automatically save the user session into local storage.\n   * @param options.auth.detectSessionInUrl Set to \"true\" if you want to automatically detects OAuth grants in the URL and signs in the user.\n   * @param options.realtime Options passed along to realtime-js constructor.\n   * @param options.storage Options passed along to the storage-js constructor.\n   * @param options.global.fetch A custom fetch implementation.\n   * @param options.global.headers Any additional headers to send with each network request.\n   *\n   * @example Creating a client\n   * ```js\n   * import { createClient } from '@supabase/supabase-js'\n   *\n   * // Create a single supabase client for interacting with your database\n   * const supabase = createClient('https://xyzcompany.supabase.co', 'publishable-or-anon-key')\n   * ```\n   *\n   * @example With a custom domain\n   * ```js\n   * import { createClient } from '@supabase/supabase-js'\n   *\n   * // Use a custom domain as the supabase URL\n   * const supabase = createClient('https://my-custom-domain.com', 'publishable-or-anon-key')\n   * ```\n   *\n   * @example With additional parameters\n   * ```js\n   * import { createClient } from '@supabase/supabase-js'\n   *\n   * const options = {\n   *   db: {\n   *     schema: 'public',\n   *   },\n   *   auth: {\n   *     autoRefreshToken: true,\n   *     persistSession: true,\n   *     detectSessionInUrl: true\n   *   },\n   *   global: {\n   *     headers: { 'x-my-custom-header': 'my-app-name' },\n   *   },\n   * }\n   * const supabase = createClient(\"https://xyzcompany.supabase.co\", \"publishable-or-anon-key\", options)\n   * ```\n   *\n   * @exampleDescription With custom schemas\n   * By default the API server points to the `public` schema. You can enable other database schemas within the Dashboard.\n   * Go to [Settings > API > Exposed schemas](/dashboard/project/_/settings/api) and add the schema which you want to expose to the API.\n   *\n   * Note: each client connection can only access a single schema, so the code above can access the `other_schema` schema but cannot access the `public` schema.\n   *\n   * @example With custom schemas\n   * ```js\n   * import { createClient } from '@supabase/supabase-js'\n   *\n   * const supabase = createClient('https://xyzcompany.supabase.co', 'publishable-or-anon-key', {\n   *   // Provide a custom schema. Defaults to \"public\".\n   *   db: { schema: 'other_schema' }\n   * })\n   * ```\n   *\n   * @exampleDescription Custom fetch implementation\n   * `supabase-js` uses the [`cross-fetch`](https://www.npmjs.com/package/cross-fetch) library to make HTTP requests,\n   * but an alternative `fetch` implementation can be provided as an option.\n   * This is most useful in environments where `cross-fetch` is not compatible (for instance Cloudflare Workers).\n   *\n   * @example Custom fetch implementation\n   * ```js\n   * import { createClient } from '@supabase/supabase-js'\n   *\n   * const supabase = createClient('https://xyzcompany.supabase.co', 'publishable-or-anon-key', {\n   *   global: { fetch: fetch.bind(globalThis) }\n   * })\n   * ```\n   *\n   * @exampleDescription React Native options with AsyncStorage\n   * For React Native we recommend using `AsyncStorage` as the storage implementation for Supabase Auth.\n   *\n   * @example React Native options with AsyncStorage\n   * ```js\n   * import 'react-native-url-polyfill/auto'\n   * import { createClient } from '@supabase/supabase-js'\n   * import AsyncStorage from \"@react-native-async-storage/async-storage\";\n   *\n   * const supabase = createClient(\"https://xyzcompany.supabase.co\", \"publishable-or-anon-key\", {\n   *   auth: {\n   *     storage: AsyncStorage,\n   *     autoRefreshToken: true,\n   *     persistSession: true,\n   *     detectSessionInUrl: false,\n   *   },\n   * });\n   * ```\n   *\n   * @exampleDescription React Native options with Expo SecureStore\n   * If you wish to encrypt the user's session information, you can use `aes-js` and store the encryption key in Expo SecureStore.\n   * The `aes-js` library, a reputable JavaScript-only implementation of the AES encryption algorithm in CTR mode.\n   * A new 256-bit encryption key is generated using the `react-native-get-random-values` library.\n   * This key is stored inside Expo's SecureStore, while the value is encrypted and placed inside AsyncStorage.\n   *\n   * Please make sure that:\n   * - You keep the `expo-secure-store`, `aes-js` and `react-native-get-random-values` libraries up-to-date.\n   * - Choose the correct [`SecureStoreOptions`](https://docs.expo.dev/versions/latest/sdk/securestore/#securestoreoptions) for your app's needs.\n   *   E.g. [`SecureStore.WHEN_UNLOCKED`](https://docs.expo.dev/versions/latest/sdk/securestore/#securestorewhen_unlocked) regulates when the data can be accessed.\n   * - Carefully consider optimizations or other modifications to the above example, as those can lead to introducing subtle security vulnerabilities.\n   *\n   * @example React Native options with Expo SecureStore\n   * ```ts\n   * import 'react-native-url-polyfill/auto'\n   * import { createClient } from '@supabase/supabase-js'\n   * import AsyncStorage from '@react-native-async-storage/async-storage';\n   * import * as SecureStore from 'expo-secure-store';\n   * import * as aesjs from 'aes-js';\n   * import 'react-native-get-random-values';\n   *\n   * // As Expo's SecureStore does not support values larger than 2048\n   * // bytes, an AES-256 key is generated and stored in SecureStore, while\n   * // it is used to encrypt/decrypt values stored in AsyncStorage.\n   * class LargeSecureStore {\n   *   private async _encrypt(key: string, value: string) {\n   *     const encryptionKey = crypto.getRandomValues(new Uint8Array(256 / 8));\n   *\n   *     const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1));\n   *     const encryptedBytes = cipher.encrypt(aesjs.utils.utf8.toBytes(value));\n   *\n   *     await SecureStore.setItemAsync(key, aesjs.utils.hex.fromBytes(encryptionKey));\n   *\n   *     return aesjs.utils.hex.fromBytes(encryptedBytes);\n   *   }\n   *\n   *   private async _decrypt(key: string, value: string) {\n   *     const encryptionKeyHex = await SecureStore.getItemAsync(key);\n   *     if (!encryptionKeyHex) {\n   *       return encryptionKeyHex;\n   *     }\n   *\n   *     const cipher = new aesjs.ModeOfOperation.ctr(aesjs.utils.hex.toBytes(encryptionKeyHex), new aesjs.Counter(1));\n   *     const decryptedBytes = cipher.decrypt(aesjs.utils.hex.toBytes(value));\n   *\n   *     return aesjs.utils.utf8.fromBytes(decryptedBytes);\n   *   }\n   *\n   *   async getItem(key: string) {\n   *     const encrypted = await AsyncStorage.getItem(key);\n   *     if (!encrypted) { return encrypted; }\n   *\n   *     return await this._decrypt(key, encrypted);\n   *   }\n   *\n   *   async removeItem(key: string) {\n   *     await AsyncStorage.removeItem(key);\n   *     await SecureStore.deleteItemAsync(key);\n   *   }\n   *\n   *   async setItem(key: string, value: string) {\n   *     const encrypted = await this._encrypt(key, value);\n   *\n   *     await AsyncStorage.setItem(key, encrypted);\n   *   }\n   * }\n   *\n   * const supabase = createClient(\"https://xyzcompany.supabase.co\", \"publishable-or-anon-key\", {\n   *   auth: {\n   *     storage: new LargeSecureStore(),\n   *     autoRefreshToken: true,\n   *     persistSession: true,\n   *     detectSessionInUrl: false,\n   *   },\n   * });\n   * ```\n   *\n   * @example With a database query\n   * ```ts\n   * import { createClient } from '@supabase/supabase-js'\n   *\n   * const supabase = createClient('https://xyzcompany.supabase.co', 'publishable-or-anon-key')\n   *\n   * const { data } = await supabase.from('profiles').select('*')\n   * ```\n   */\n  constructor(\n    protected supabaseUrl: string,\n    protected supabaseKey: string,\n    options?: SupabaseClientOptions<SchemaName>\n  ) {\n    const baseUrl = validateSupabaseUrl(supabaseUrl)\n    if (!supabaseKey) throw new Error('supabaseKey is required.')\n\n    this.realtimeUrl = new URL('realtime/v1', baseUrl)\n    this.realtimeUrl.protocol = this.realtimeUrl.protocol.replace('http', 'ws')\n    this.authUrl = new URL('auth/v1', baseUrl)\n    this.storageUrl = new URL('storage/v1', baseUrl)\n    this.functionsUrl = new URL('functions/v1', baseUrl)\n\n    // default storage key uses the supabase project ref as a namespace\n    const defaultStorageKey = `sb-${baseUrl.hostname.split('.')[0]}-auth-token`\n    const DEFAULTS = {\n      db: DEFAULT_DB_OPTIONS,\n      realtime: DEFAULT_REALTIME_OPTIONS,\n      auth: { ...DEFAULT_AUTH_OPTIONS, storageKey: defaultStorageKey },\n      global: DEFAULT_GLOBAL_OPTIONS,\n    }\n\n    const settings = applySettingDefaults(options ?? {}, DEFAULTS)\n\n    this.storageKey = settings.auth.storageKey ?? ''\n    this.headers = settings.global.headers ?? {}\n\n    if (!settings.accessToken) {\n      this.auth = this._initSupabaseAuthClient(\n        settings.auth ?? {},\n        this.headers,\n        settings.global.fetch\n      )\n    } else {\n      this.accessToken = settings.accessToken\n\n      this.auth = new Proxy<SupabaseAuthClient>({} as any, {\n        get: (_, prop) => {\n          throw new Error(\n            `@supabase/supabase-js: Supabase Client is configured with the accessToken option, accessing supabase.auth.${String(\n              prop\n            )} is not possible`\n          )\n        },\n      })\n    }\n\n    this.fetch = fetchWithAuth(supabaseKey, this._getAccessToken.bind(this), settings.global.fetch)\n    this.realtime = this._initRealtimeClient({\n      headers: this.headers,\n      accessToken: this._getAccessToken.bind(this),\n      ...settings.realtime,\n    })\n    if (this.accessToken) {\n      // Start auth immediately to avoid race condition with channel subscriptions\n      // Wrap Promise to avoid Firefox extension cross-context Promise access errors\n      Promise.resolve(this.accessToken())\n        .then((token) => this.realtime.setAuth(token))\n        .catch((e) => console.warn('Failed to set initial Realtime auth token:', e))\n    }\n\n    this.rest = new PostgrestClient(new URL('rest/v1', baseUrl).href, {\n      headers: this.headers,\n      schema: settings.db.schema,\n      fetch: this.fetch,\n      timeout: settings.db.timeout,\n      urlLengthLimit: settings.db.urlLengthLimit,\n    })\n\n    this.storage = new SupabaseStorageClient(\n      this.storageUrl.href,\n      this.headers,\n      this.fetch,\n      options?.storage\n    )\n\n    if (!settings.accessToken) {\n      this._listenForAuthEvents()\n    }\n  }\n\n  /**\n   * Supabase Functions allows you to deploy and invoke edge functions.\n   */\n  get functions(): FunctionsClient {\n    return new FunctionsClient(this.functionsUrl.href, {\n      headers: this.headers,\n      customFetch: this.fetch,\n    })\n  }\n\n  // NOTE: signatures must be kept in sync with PostgrestClient.from\n  from<\n    TableName extends string & keyof Schema['Tables'],\n    Table extends Schema['Tables'][TableName],\n  >(relation: TableName): PostgrestQueryBuilder<ClientOptions, Schema, Table, TableName>\n  from<ViewName extends string & keyof Schema['Views'], View extends Schema['Views'][ViewName]>(\n    relation: ViewName\n  ): PostgrestQueryBuilder<ClientOptions, Schema, View, ViewName>\n  /**\n   * Perform a query on a table or a view.\n   *\n   * @param relation - The table or view name to query\n   */\n  from(relation: string): PostgrestQueryBuilder<ClientOptions, Schema, any> {\n    return this.rest.from(relation)\n  }\n\n  // NOTE: signatures must be kept in sync with PostgrestClient.schema\n  /**\n   * Select a schema to query or perform an function (rpc) call.\n   *\n   * The schema needs to be on the list of exposed schemas inside Supabase.\n   *\n   * @param schema - The schema to query\n   */\n  schema<DynamicSchema extends string & keyof Omit<Database, '__InternalSupabase'>>(\n    schema: DynamicSchema\n  ): PostgrestClient<\n    Database,\n    ClientOptions,\n    DynamicSchema,\n    Database[DynamicSchema] extends GenericSchema ? Database[DynamicSchema] : any\n  > {\n    return this.rest.schema<DynamicSchema>(schema)\n  }\n\n  // NOTE: signatures must be kept in sync with PostgrestClient.rpc\n  /**\n   * Perform a function call.\n   *\n   * @param fn - The function name to call\n   * @param args - The arguments to pass to the function call\n   * @param options - Named parameters\n   * @param options.head - When set to `true`, `data` will not be returned.\n   * Useful if you only need the count.\n   * @param options.get - When set to `true`, the function will be called with\n   * read-only access mode.\n   * @param options.count - Count algorithm to use to count rows returned by the\n   * function. Only applicable for [set-returning\n   * functions](https://www.postgresql.org/docs/current/functions-srf.html).\n   *\n   * `\"exact\"`: Exact but slow count algorithm. Performs a `COUNT(*)` under the\n   * hood.\n   *\n   * `\"planned\"`: Approximated but fast count algorithm. Uses the Postgres\n   * statistics under the hood.\n   *\n   * `\"estimated\"`: Uses exact count for low numbers and planned count for high\n   * numbers.\n   */\n  rpc<\n    FnName extends string & keyof Schema['Functions'],\n    Args extends Schema['Functions'][FnName]['Args'] = never,\n    FilterBuilder extends GetRpcFunctionFilterBuilderByArgs<\n      Schema,\n      FnName,\n      Args\n    > = GetRpcFunctionFilterBuilderByArgs<Schema, FnName, Args>,\n  >(\n    fn: FnName,\n    args: Args = {} as Args,\n    options: {\n      head?: boolean\n      get?: boolean\n      count?: 'exact' | 'planned' | 'estimated'\n    } = {\n      head: false,\n      get: false,\n      count: undefined,\n    }\n  ): PostgrestFilterBuilder<\n    ClientOptions,\n    Schema,\n    FilterBuilder['Row'],\n    FilterBuilder['Result'],\n    FilterBuilder['RelationName'],\n    FilterBuilder['Relationships'],\n    'RPC'\n  > {\n    return this.rest.rpc(fn, args, options) as unknown as PostgrestFilterBuilder<\n      ClientOptions,\n      Schema,\n      FilterBuilder['Row'],\n      FilterBuilder['Result'],\n      FilterBuilder['RelationName'],\n      FilterBuilder['Relationships'],\n      'RPC'\n    >\n  }\n\n  /**\n   * Creates a Realtime channel with Broadcast, Presence, and Postgres Changes.\n   *\n   * @param {string} name - The name of the Realtime channel.\n   * @param {Object} opts - The options to pass to the Realtime channel.\n   *\n   */\n  channel(name: string, opts: RealtimeChannelOptions = { config: {} }): RealtimeChannel {\n    return this.realtime.channel(name, opts)\n  }\n\n  /**\n   * Returns all Realtime channels.\n   *\n   * @category Initializing\n   *\n   * @example Get all channels\n   * ```js\n   * const channels = supabase.getChannels()\n   * ```\n   */\n  getChannels(): RealtimeChannel[] {\n    return this.realtime.getChannels()\n  }\n\n  /**\n   * Unsubscribes and removes Realtime channel from Realtime client.\n   *\n   * @param {RealtimeChannel} channel - The name of the Realtime channel.\n   *\n   *\n   * @category Initializing\n   *\n   * @remarks\n   * - Removing a channel is a great way to maintain the performance of your project's Realtime service as well as your database if you're listening to Postgres changes. Supabase will automatically handle cleanup 30 seconds after a client is disconnected, but unused channels may cause degradation as more clients are simultaneously subscribed.\n   *\n   * @example Removes a channel\n   * ```js\n   * supabase.removeChannel(myChannel)\n   * ```\n   */\n  removeChannel(channel: RealtimeChannel): Promise<'ok' | 'timed out' | 'error'> {\n    return this.realtime.removeChannel(channel)\n  }\n\n  /**\n   * Unsubscribes and removes all Realtime channels from Realtime client.\n   *\n   * @category Initializing\n   *\n   * @remarks\n   * - Removing channels is a great way to maintain the performance of your project's Realtime service as well as your database if you're listening to Postgres changes. Supabase will automatically handle cleanup 30 seconds after a client is disconnected, but unused channels may cause degradation as more clients are simultaneously subscribed.\n   *\n   * @example Remove all channels\n   * ```js\n   * supabase.removeAllChannels()\n   * ```\n   */\n  removeAllChannels(): Promise<('ok' | 'timed out' | 'error')[]> {\n    return this.realtime.removeAllChannels()\n  }\n\n  private async _getAccessToken() {\n    if (this.accessToken) {\n      return await this.accessToken()\n    }\n\n    const { data } = await this.auth.getSession()\n\n    return data.session?.access_token ?? this.supabaseKey\n  }\n\n  private _initSupabaseAuthClient(\n    {\n      autoRefreshToken,\n      persistSession,\n      detectSessionInUrl,\n      storage,\n      userStorage,\n      storageKey,\n      flowType,\n      lock,\n      debug,\n      throwOnError,\n    }: SupabaseAuthClientOptions,\n    headers?: Record<string, string>,\n    fetch?: Fetch\n  ) {\n    const authHeaders = {\n      Authorization: `Bearer ${this.supabaseKey}`,\n      apikey: `${this.supabaseKey}`,\n    }\n    return new SupabaseAuthClient({\n      url: this.authUrl.href,\n      headers: { ...authHeaders, ...headers },\n      storageKey: storageKey,\n      autoRefreshToken,\n      persistSession,\n      detectSessionInUrl,\n      storage,\n      userStorage,\n      flowType,\n      lock,\n      debug,\n      throwOnError,\n      fetch,\n      // auth checks if there is a custom authorizaiton header using this flag\n      // so it knows whether to return an error when getUser is called with no session\n      hasCustomAuthorizationHeader: Object.keys(this.headers).some(\n        (key) => key.toLowerCase() === 'authorization'\n      ),\n    })\n  }\n\n  private _initRealtimeClient(options: RealtimeClientOptions) {\n    return new RealtimeClient(this.realtimeUrl.href, {\n      ...options,\n      params: { ...{ apikey: this.supabaseKey }, ...options?.params },\n    })\n  }\n\n  private _listenForAuthEvents() {\n    const data = this.auth.onAuthStateChange((event, session) => {\n      this._handleTokenChanged(event, 'CLIENT', session?.access_token)\n    })\n    return data\n  }\n\n  private _handleTokenChanged(\n    event: AuthChangeEvent,\n    source: 'CLIENT' | 'STORAGE',\n    token?: string\n  ) {\n    if (\n      (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') &&\n      this.changedAccessToken !== token\n    ) {\n      this.changedAccessToken = token\n      this.realtime.setAuth(token)\n    } else if (event === 'SIGNED_OUT') {\n      this.realtime.setAuth()\n      if (source == 'STORAGE') this.auth.signOut()\n      this.changedAccessToken = undefined\n    }\n  }\n}\n","import SupabaseClient from './SupabaseClient'\nimport type { SupabaseClientOptions } from './lib/types'\n\nexport * from '@supabase/auth-js'\nexport type { User as AuthUser, Session as AuthSession } from '@supabase/auth-js'\nexport type {\n  PostgrestResponse,\n  PostgrestSingleResponse,\n  PostgrestMaybeSingleResponse,\n  PostgrestBuilder,\n  PostgrestFilterBuilder,\n  PostgrestTransformBuilder,\n  PostgrestQueryBuilder,\n} from '@supabase/postgrest-js'\nexport { PostgrestError } from '@supabase/postgrest-js'\nexport { StorageApiError } from '@supabase/storage-js'\nexport type { FunctionInvokeOptions } from '@supabase/functions-js'\nexport {\n  FunctionsHttpError,\n  FunctionsFetchError,\n  FunctionsRelayError,\n  FunctionsError,\n  FunctionRegion,\n} from '@supabase/functions-js'\nexport * from '@supabase/realtime-js'\nexport { default as SupabaseClient } from './SupabaseClient'\nexport type {\n  SupabaseClientOptions,\n  QueryResult,\n  QueryData,\n  QueryError,\n  DatabaseWithoutInternals,\n} from './lib/types'\n\n/**\n * Creates a new Supabase Client.\n *\n * @example Creating a Supabase client\n * ```ts\n * import { createClient } from '@supabase/supabase-js'\n *\n * const supabase = createClient('https://xyzcompany.supabase.co', 'publishable-or-anon-key')\n * const { data, error } = await supabase.from('profiles').select('*')\n * ```\n */\nexport const createClient = <\n  Database = any,\n  SchemaNameOrClientOptions extends\n    | (string & keyof Omit<Database, '__InternalSupabase'>)\n    | { PostgrestVersion: string } = 'public' extends keyof Omit<Database, '__InternalSupabase'>\n    ? 'public'\n    : string & keyof Omit<Database, '__InternalSupabase'>,\n  SchemaName extends string &\n    keyof Omit<Database, '__InternalSupabase'> = SchemaNameOrClientOptions extends string &\n    keyof Omit<Database, '__InternalSupabase'>\n    ? SchemaNameOrClientOptions\n    : 'public' extends keyof Omit<Database, '__InternalSupabase'>\n      ? 'public'\n      : string & keyof Omit<Omit<Database, '__InternalSupabase'>, '__InternalSupabase'>,\n>(\n  supabaseUrl: string,\n  supabaseKey: string,\n  options?: SupabaseClientOptions<SchemaName>\n): SupabaseClient<Database, SchemaNameOrClientOptions, SchemaName> => {\n  return new SupabaseClient<Database, SchemaNameOrClientOptions, SchemaName>(\n    supabaseUrl,\n    supabaseKey,\n    options\n  )\n}\n\n// Check for Node.js <= 18 deprecation\nfunction shouldShowDeprecationWarning(): boolean {\n  // Skip in browser environments\n  if (typeof window !== 'undefined') {\n    return false\n  }\n\n  // Skip if process is not available (e.g., Edge Runtime)\n  // Use dynamic property access to avoid Next.js Edge Runtime static analysis warnings\n  const _process = (globalThis as any)['process']\n  if (!_process) {\n    return false\n  }\n\n  const processVersion = _process['version']\n  if (processVersion === undefined || processVersion === null) {\n    return false\n  }\n\n  const versionMatch = processVersion.match(/^v(\\d+)\\./)\n  if (!versionMatch) {\n    return false\n  }\n\n  const majorVersion = parseInt(versionMatch[1], 10)\n  return majorVersion <= 18\n}\n\nif (shouldShowDeprecationWarning()) {\n  console.warn(\n    `?좑툘  Node.js 18 and below are deprecated and will no longer be supported in future versions of @supabase/supabase-js. ` +\n      `Please upgrade to Node.js 20 or later. ` +\n      `For more information, visit: https://github.com/orgs/supabase/discussions/37217`\n  )\n}\n"],"mappings":"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"}
node_modules/@supabase/supabase-js\dist\umd\supabase.js:20:  });`],{type:`application/javascript`});t=URL.createObjectURL(e)}return t}_initializeOptions(e){this.worker=e?.worker??!1,this.accessToken=e?.accessToken??null;let t={};t.timeout=e?.timeout??1e4,t.heartbeatIntervalMs=e?.heartbeatIntervalMs??$e.HEARTBEAT_INTERVAL,t.transport=e?.transport??ue.getWebSocketConstructor(),t.params=e?.params,t.logger=e?.logger,t.heartbeatCallback=this._wrapHeartbeatCallback(e?.heartbeatCallback),t.reconnectAfterMs=e?.reconnectAfterMs??(e=>et[e-1]||1e4);let n,r,i=e?.vsn??`2.0.0`;switch(i){case`1.0.0`:n=(e,t)=>t(JSON.stringify(e)),r=(e,t)=>t(JSON.parse(e));break;case`2.0.0`:n=this.serializer.encode.bind(this.serializer),r=this.serializer.decode.bind(this.serializer);break;default:throw Error(`Unsupported serializer version: ${t.vsn}`)}if(t.vsn=i,t.encode=e?.encode??n,t.decode=e?.decode??r,t.beforeReconnect=this._reconnectAuth.bind(this),(e?.logLevel||e?.log_level)&&(this.logLevel=e.logLevel||e.log_level,t.params=Object.assign(Object.assign({},t.params),{log_level:this.logLevel})),this.worker){if(typeof window<`u`&&!window.Worker)throw Error(`Web Worker is not supported`);this.workerUrl=e?.workerUrl,t.autoSendHeartbeat=!this.worker}return t}async _reconnectAuth(){await this._waitForAuthIfNeeded(),this.isConnected()||this.connect()}},nt=class extends Error{constructor(e,t){super(e),this.name=`IcebergError`,this.status=t.status,this.icebergType=t.icebergType,this.icebergCode=t.icebergCode,this.details=t.details,this.isCommitStateUnknown=t.icebergType===`CommitStateUnknownException`||[500,502,504].includes(t.status)&&t.icebergType?.includes(`CommitState`)===!0}isNotFound(){return this.status===404}isConflict(){return this.status===409}isAuthenticationTimeout(){return this.status===419}};function rt(e,t,n){let r=new URL(t,e);if(n)for(let[e,t]of Object.entries(n))t!==void 0&&r.searchParams.set(e,t);return r.toString()}async function it(e){return!e||e.type===`none`?{}:e.type===`bearer`?{Authorization:`Bearer ${e.token}`}:e.type===`header`?{[e.name]:e.value}:e.type===`custom`?await e.getHeaders():{}}function at(e){let t=e.fetchImpl??globalThis.fetch;return{async request({method:n,path:r,query:i,body:a,headers:o}){let s=rt(e.baseUrl,r,i),c=await it(e.auth),l=await t(s,{method:n,headers:{...a?{"Content-Type":`application/json`}:{},...c,...o},body:a?JSON.stringify(a):void 0}),u=await l.text(),d=(l.headers.get(`content-type`)||``).includes(`application/json`),f=d&&u?JSON.parse(u):u;if(!l.ok){let e=d?f:void 0,t=e?.error;throw new nt(t?.message??`Request failed with status ${l.status}`,{status:l.status,icebergType:t?.type,icebergCode:t?.code,details:e})}return{status:l.status,headers:l.headers,data:f}}}}function ot(e){return e.join(``)}var st=class{constructor(e,t=``){this.client=e,this.prefix=t}async listNamespaces(e){let t=e?{parent:ot(e.namespace)}:void 0;return(await this.client.request({method:`GET`,path:`${this.prefix}/namespaces`,query:t})).data.namespaces.map(e=>({namespace:e}))}async createNamespace(e,t){let n={namespace:e.namespace,properties:t?.properties};return(await this.client.request({method:`POST`,path:`${this.prefix}/namespaces`,body:n})).data}async dropNamespace(e){await this.client.request({method:`DELETE`,path:`${this.prefix}/namespaces/${ot(e.namespace)}`})}async loadNamespaceMetadata(e){return{properties:(await this.client.request({method:`GET`,path:`${this.prefix}/namespaces/${ot(e.namespace)}`})).data.properties}}async namespaceExists(e){try{return await this.client.request({method:`HEAD`,path:`${this.prefix}/namespaces/${ot(e.namespace)}`}),!0}catch(e){if(e instanceof nt&&e.status===404)return!1;throw e}}async createNamespaceIfNotExists(e,t){try{return await this.createNamespace(e,t)}catch(e){if(e instanceof nt&&e.status===409)return;throw e}}};function O(e){return e.join(``)}var ct=class{constructor(e,t=``,n){this.client=e,this.prefix=t,this.accessDelegation=n}async listTables(e){return(await this.client.request({method:`GET`,path:`${this.prefix}/namespaces/${O(e.namespace)}/tables`})).data.identifiers}async createTable(e,t){let n={};return this.accessDelegation&&(n[`X-Iceberg-Access-Delegation`]=this.accessDelegation),(await this.client.request({method:`POST`,path:`${this.prefix}/namespaces/${O(e.namespace)}/tables`,body:t,headers:n})).data.metadata}async updateTable(e,t){let n=await this.client.request({method:`POST`,path:`${this.prefix}/namespaces/${O(e.namespace)}/tables/${e.name}`,body:t});return{"metadata-location":n.data[`metadata-location`],metadata:n.data.metadata}}async dropTable(e,t){await this.client.request({method:`DELETE`,path:`${this.prefix}/namespaces/${O(e.namespace)}/tables/${e.name}`,query:{purgeRequested:String(t?.purge??!1)}})}async loadTable(e){let t={};return this.accessDelegation&&(t[`X-Iceberg-Access-Delegation`]=this.accessDelegation),(await this.client.request({method:`GET`,path:`${this.prefix}/namespaces/${O(e.namespace)}/tables/${e.name}`,headers:t})).data.metadata}async tableExists(e){let t={};this.accessDelegation&&(t[`X-Iceberg-Access-Delegation`]=this.accessDelegation);try{return await this.client.request({method:`HEAD`,path:`${this.prefix}/namespaces/${O(e.namespace)}/tables/${e.name}`,headers:t}),!0}catch(e){if(e instanceof nt&&e.status===404)return!1;throw e}}async createTableIfNotExists(e,t){try{return await this.createTable(e,t)}catch(n){if(n instanceof nt&&n.status===409)return await this.loadTable({namespace:e.namespace,name:t.name});throw n}}},lt=class{constructor(e){let t=`v1`;e.catalogName&&(t+=`/${e.catalogName}`),this.client=at({baseUrl:e.baseUrl.endsWith(`/`)?e.baseUrl:`${e.baseUrl}/`,auth:e.auth,fetchImpl:e.fetch}),this.accessDelegation=e.accessDelegation?.join(`,`),this.namespaceOps=new st(this.client,t),this.tableOps=new ct(this.client,t,this.accessDelegation)}async listNamespaces(e){return this.namespaceOps.listNamespaces(e)}async createNamespace(e,t){return this.namespaceOps.createNamespace(e,t)}async dropNamespace(e){await this.namespaceOps.dropNamespace(e)}async loadNamespaceMetadata(e){return this.namespaceOps.loadNamespaceMetadata(e)}async listTables(e){return this.tableOps.listTables(e)}async createTable(e,t){return this.tableOps.createTable(e,t)}async updateTable(e,t){return this.tableOps.updateTable(e,t)}async dropTable(e,t){await this.tableOps.dropTable(e,t)}async loadTable(e){return this.tableOps.loadTable(e)}async namespaceExists(e){return this.namespaceOps.namespaceExists(e)}async tableExists(e){return this.tableOps.tableExists(e)}async createNamespaceIfNotExists(e,t){return this.namespaceOps.createNamespaceIfNotExists(e,t)}async createTableIfNotExists(e,t){return this.tableOps.createTableIfNotExists(e,t)}};function ut(e){"@babel/helpers - typeof";return ut=typeof Symbol==`function`&&typeof Symbol.iterator==`symbol`?function(e){return typeof e}:function(e){return e&&typeof Symbol==`function`&&e.constructor===Symbol&&e!==Symbol.prototype?`symbol`:typeof e},ut(e)}function dt(e,t){if(ut(e)!=`object`||!e)return e;var n=e[Symbol.toPrimitive];if(n!==void 0){var r=n.call(e,t||`default`);if(ut(r)!=`object`)return r;throw TypeError(`@@toPrimitive must return a primitive value.`)}return(t===`string`?String:Number)(e)}function ft(e){var t=dt(e,`string`);return ut(t)==`symbol`?t:t+``}function pt(e,t,n){return(t=ft(t))in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function mt(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter(function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable})),n.push.apply(n,r)}return n}function k(e){for(var t=1;t<arguments.length;t++){var n=arguments[t]==null?{}:arguments[t];t%2?mt(Object(n),!0).forEach(function(t){pt(e,t,n[t])}):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):mt(Object(n)).forEach(function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))})}return e}var ht=class extends Error{constructor(e,t=`storage`,n,r){super(e),this.__isStorageError=!0,this.namespace=t,this.name=t===`vectors`?`StorageVectorsError`:`StorageError`,this.status=n,this.statusCode=r}toJSON(){return{name:this.name,message:this.message,status:this.status,statusCode:this.statusCode}}};function gt(e){return typeof e==`object`&&!!e&&`__isStorageError`in e}var _t=class extends ht{constructor(e,t,n,r=`storage`){super(e,r,t,n),this.name=r===`vectors`?`StorageVectorsApiError`:`StorageApiError`,this.status=t,this.statusCode=n}toJSON(){return k({},super.toJSON())}},vt=class extends ht{constructor(e,t,n=`storage`){super(e,n),this.name=n===`vectors`?`StorageVectorsUnknownError`:`StorageUnknownError`,this.originalError=t}};function yt(e,t,n){let r=k({},e),i=t.toLowerCase();for(let e of Object.keys(r))e.toLowerCase()===i&&delete r[e];return r[i]=n,r}function bt(e){let t={};for(let[n,r]of Object.entries(e))t[n.toLowerCase()]=r;return t}let xt=e=>e?(...t)=>e(...t):(...e)=>fetch(...e),St=e=>{if(typeof e!=`object`||!e)return!1;let t=Object.getPrototypeOf(e);return(t===null||t===Object.prototype||Object.getPrototypeOf(t)===null)&&!(Symbol.toStringTag in e)&&!(Symbol.iterator in e)},Ct=e=>{if(Array.isArray(e))return e.map(e=>Ct(e));if(typeof e==`function`||e!==Object(e))return e;let t={};return Object.entries(e).forEach(([e,n])=>{let r=e.replace(/([-_][a-z])/gi,e=>e.toUpperCase().replace(/[-_]/g,``));t[r]=Ct(n)}),t},wt=e=>!e||typeof e!=`string`||e.length===0||e.length>100||e.trim()!==e||e.includes(`/`)||e.includes(`\\`)?!1:/^[\w!.\*'() &$@=;:+,?-]+$/.test(e),Tt=e=>e.msg||e.message||e.error_description||(typeof e.error==`string`?e.error:e.error?.message)||JSON.stringify(e),Et=async(e,t,n,r)=>{if(typeof e==`object`&&e&&typeof e.json==`function`){let n=e,i=parseInt(n.status,10);Number.isFinite(i)||(i=500),n.json().then(e=>{let n=e?.statusCode||e?.code||i+``;t(new _t(Tt(e),i,n,r))}).catch(()=>{let e=i+``;t(new _t(n.statusText||`HTTP ${i} error`,i,e,r))})}else t(new vt(Tt(e),e,r))},Dt=(e,t,n,r)=>{let i={method:e,headers:t?.headers||{}};if(e===`GET`||e===`HEAD`||!r)return k(k({},i),n);if(St(r)){let e=t?.headers||{},n;for(let[t,r]of Object.entries(e))t.toLowerCase()===`content-type`&&(n=r);i.headers=yt(e,`Content-Type`,n??`application/json`),i.body=JSON.stringify(r)}else i.body=r;return t?.duplex&&(i.duplex=t.duplex),k(k({},i),n)};async function Ot(e,t,n,r,i,a,o){return new Promise((s,c)=>{e(n,Dt(t,r,i,a)).then(e=>{if(!e.ok)throw e;if(r?.noResolveJson)return e;if(o===`vectors`){let t=e.headers.get(`content-type`);if(e.headers.get(`content-length`)===`0`||e.status===204||!t||!t.includes(`application/json`))return{}}return e.json()}).then(e=>s(e)).catch(e=>Et(e,c,r,o))})}function kt(e=`storage`){return{get:async(t,n,r,i)=>Ot(t,`GET`,n,r,i,void 0,e),post:async(t,n,r,i,a)=>Ot(t,`POST`,n,i,a,r,e),put:async(t,n,r,i,a)=>Ot(t,`PUT`,n,i,a,r,e),head:async(t,n,r,i)=>Ot(t,`HEAD`,n,k(k({},r),{},{noResolveJson:!0}),i,void 0,e),remove:async(t,n,r,i,a)=>Ot(t,`DELETE`,n,i,a,r,e)}}let{get:At,post:A,put:jt,head:Mt,remove:Nt}=kt(`storage`),j=kt(`vectors`);var M=class{constructor(e,t={},n,r=`storage`){this.shouldThrowOnError=!1,this.url=e,this.headers=bt(t),this.fetch=xt(n),this.namespace=r}throwOnError(){return this.shouldThrowOnError=!0,this}setHeader(e,t){return this.headers=yt(this.headers,e,t),this}async handleOperation(e){var t=this;try{return{data:await e(),error:null}}catch(e){if(t.shouldThrowOnError)throw e;if(gt(e))return{data:null,error:e};throw e}}},Pt=class{constructor(e,t){this.downloadFn=e,this.shouldThrowOnError=t}then(e,t){return this.execute().then(e,t)}async execute(){var e=this;try{return{data:(await e.downloadFn()).body,error:null}}catch(t){if(e.shouldThrowOnError)throw t;if(gt(t))return{data:null,error:t};throw t}}};let Ft;Ft=Symbol.toStringTag;var It=class{constructor(e,t){this.downloadFn=e,this.shouldThrowOnError=t,this[Ft]=`BlobDownloadBuilder`,this.promise=null}asStream(){return new Pt(this.downloadFn,this.shouldThrowOnError)}then(e,t){return this.getPromise().then(e,t)}catch(e){return this.getPromise().catch(e)}finally(e){return this.getPromise().finally(e)}getPromise(){return this.promise||=this.execute(),this.promise}async execute(){var e=this;try{return{data:await(await e.downloadFn()).blob(),error:null}}catch(t){if(e.shouldThrowOnError)throw t;if(gt(t))return{data:null,error:t};throw t}}};let Lt={limit:100,offset:0,sortBy:{column:`name`,order:`asc`}},Rt={cacheControl:`3600`,contentType:`text/plain;charset=UTF-8`,upsert:!1};var zt=class extends M{constructor(e,t={},n,r){super(e,t,r,`storage`),this.bucketId=n}async uploadOrUpdate(e,t,n,r){var i=this;return i.handleOperation(async()=>{let a,o=k(k({},Rt),r),s=k(k({},i.headers),e===`POST`&&{"x-upsert":String(o.upsert)}),c=o.metadata;if(typeof Blob<`u`&&n instanceof Blob?(a=new FormData,a.append(`cacheControl`,o.cacheControl),c&&a.append(`metadata`,i.encodeMetadata(c)),a.append(``,n)):typeof FormData<`u`&&n instanceof FormData?(a=n,a.has(`cacheControl`)||a.append(`cacheControl`,o.cacheControl),c&&!a.has(`metadata`)&&a.append(`metadata`,i.encodeMetadata(c))):(a=n,s[`cache-control`]=`max-age=${o.cacheControl}`,s[`content-type`]=o.contentType,c&&(s[`x-metadata`]=i.toBase64(i.encodeMetadata(c))),(typeof ReadableStream<`u`&&a instanceof ReadableStream||a&&typeof a==`object`&&`pipe`in a&&typeof a.pipe==`function`)&&!o.duplex&&(o.duplex=`half`)),r?.headers)for(let[e,t]of Object.entries(r.headers))s=yt(s,e,t);let l=i._removeEmptyFolders(t),u=i._getFinalPath(l),d=await(e==`PUT`?jt:A)(i.fetch,`${i.url}/object/${u}`,a,k({headers:s},o?.duplex?{duplex:o.duplex}:{}));return{path:l,id:d.Id,fullPath:d.Key}})}async upload(e,t,n){return this.uploadOrUpdate(`POST`,e,t,n)}async uploadToSignedUrl(e,t,n,r){var i=this;let a=i._removeEmptyFolders(e),o=i._getFinalPath(a),s=new URL(i.url+`/object/upload/sign/${o}`);return s.searchParams.set(`token`,t),i.handleOperation(async()=>{let e,t=k(k({},Rt),r),o=k(k({},i.headers),{"x-upsert":String(t.upsert)});return typeof Blob<`u`&&n instanceof Blob?(e=new FormData,e.append(`cacheControl`,t.cacheControl),e.append(``,n)):typeof FormData<`u`&&n instanceof FormData?(e=n,e.append(`cacheControl`,t.cacheControl)):(e=n,o[`cache-control`]=`max-age=${t.cacheControl}`,o[`content-type`]=t.contentType),{path:a,fullPath:(await jt(i.fetch,s.toString(),e,{headers:o})).Key}})}async createSignedUploadUrl(e,t){var n=this;return n.handleOperation(async()=>{let r=n._getFinalPath(e),i=k({},n.headers);t?.upsert&&(i[`x-upsert`]=`true`);let a=await A(n.fetch,`${n.url}/object/upload/sign/${r}`,{},{headers:i}),o=new URL(n.url+a.url),s=o.searchParams.get(`token`);if(!s)throw new ht(`No token returned by API`);return{signedUrl:o.toString(),path:e,token:s}})}async update(e,t,n){return this.uploadOrUpdate(`PUT`,e,t,n)}async move(e,t,n){var r=this;return r.handleOperation(async()=>await A(r.fetch,`${r.url}/object/move`,{bucketId:r.bucketId,sourceKey:e,destinationKey:t,destinationBucket:n?.destinationBucket},{headers:r.headers}))}async copy(e,t,n){var r=this;return r.handleOperation(async()=>({path:(await A(r.fetch,`${r.url}/object/copy`,{bucketId:r.bucketId,sourceKey:e,destinationKey:t,destinationBucket:n?.destinationBucket},{headers:r.headers})).Key}))}async createSignedUrl(e,t,n){var r=this;return r.handleOperation(async()=>{let i=r._getFinalPath(e),a=typeof n?.transform==`object`&&n.transform!==null&&Object.keys(n.transform).length>0,o=await A(r.fetch,`${r.url}/object/sign/${i}`,k({expiresIn:t},a?{transform:n.transform}:{}),{headers:r.headers}),s=new URLSearchParams;n?.download&&s.set(`download`,n.download===!0?``:n.download),n?.cacheNonce!=null&&s.set(`cacheNonce`,String(n.cacheNonce));let c=s.toString();return{signedUrl:encodeURI(`${r.url}${o.signedURL}${c?`&${c}`:``}`)}})}async createSignedUrls(e,t,n){var r=this;return r.handleOperation(async()=>{let i=await A(r.fetch,`${r.url}/object/sign/${r.bucketId}`,{expiresIn:t,paths:e},{headers:r.headers}),a=new URLSearchParams;n?.download&&a.set(`download`,n.download===!0?``:n.download),n?.cacheNonce!=null&&a.set(`cacheNonce`,String(n.cacheNonce));let o=a.toString();return i.map(e=>k(k({},e),{},{signedUrl:e.signedURL?encodeURI(`${r.url}${e.signedURL}${o?`&${o}`:``}`):null}))})}download(e,t,n){let r=typeof t?.transform==`object`&&t.transform!==null&&Object.keys(t.transform).length>0?`render/image/authenticated`:`object`,i=new URLSearchParams;t?.transform&&this.applyTransformOptsToQuery(i,t.transform),t?.cacheNonce!=null&&i.set(`cacheNonce`,String(t.cacheNonce));let a=i.toString(),o=this._getFinalPath(e);return new It(()=>At(this.fetch,`${this.url}/${r}/${o}${a?`?${a}`:``}`,{headers:this.headers,noResolveJson:!0},n),this.shouldThrowOnError)}async info(e){var t=this;let n=t._getFinalPath(e);return t.handleOperation(async()=>Ct(await At(t.fetch,`${t.url}/object/info/${n}`,{headers:t.headers})))}async exists(e){var t=this;let n=t._getFinalPath(e);try{return await Mt(t.fetch,`${t.url}/object/${n}`,{headers:t.headers}),{data:!0,error:null}}catch(e){if(t.shouldThrowOnError)throw e;if(gt(e)){let t=e instanceof _t?e.status:e instanceof vt?e.originalError?.status:void 0;if(t!==void 0&&[400,404].includes(t))return{data:!1,error:e}}throw e}}getPublicUrl(e,t){let n=this._getFinalPath(e),r=new URLSearchParams;t?.download&&r.set(`download`,t.download===!0?``:t.download),t?.transform&&this.applyTransformOptsToQuery(r,t.transform),t?.cacheNonce!=null&&r.set(`cacheNonce`,String(t.cacheNonce));let i=r.toString(),a=typeof t?.transform==`object`&&t.transform!==null&&Object.keys(t.transform).length>0?`render/image`:`object`;return{data:{publicUrl:encodeURI(`${this.url}/${a}/public/${n}`)+(i?`?${i}`:``)}}}async remove(e){var t=this;return t.handleOperation(async()=>await Nt(t.fetch,`${t.url}/object/${t.bucketId}`,{prefixes:e},{headers:t.headers}))}async list(e,t,n){var r=this;return r.handleOperation(async()=>{let i=k(k(k({},Lt),t),{},{prefix:e||``});return await A(r.fetch,`${r.url}/object/list/${r.bucketId}`,i,{headers:r.headers},n)})}async listV2(e,t){var n=this;return n.handleOperation(async()=>{let r=k({},e);return await A(n.fetch,`${n.url}/object/list-v2/${n.bucketId}`,r,{headers:n.headers},t)})}encodeMetadata(e){return JSON.stringify(e)}toBase64(e){return typeof Buffer<`u`?Buffer.from(e).toString(`base64`):btoa(e)}_getFinalPath(e){return`${this.bucketId}/${e.replace(/^\/+/,``)}`}_removeEmptyFolders(e){return e.replace(/^\/|\/$/g,``).replace(/\/+/g,`/`)}applyTransformOptsToQuery(e,t){return t.width&&e.set(`width`,t.width.toString()),t.height&&e.set(`height`,t.height.toString()),t.resize&&e.set(`resize`,t.resize),t.format&&e.set(`format`,t.format),t.quality&&e.set(`quality`,t.quality.toString()),e}};let Bt={"X-Client-Info":`storage-js/2.104.0`};var Vt=class extends M{constructor(e,t={},n,r){let i=new URL(e);r?.useNewHostname&&/supabase\.(co|in|red)$/.test(i.hostname)&&!i.hostname.includes(`storage.supabase.`)&&(i.hostname=i.hostname.replace(`supabase.`,`storage.supabase.`));let a=i.href.replace(/\/$/,``),o=k(k({},Bt),t);super(a,o,n,`storage`)}async listBuckets(e){var t=this;return t.handleOperation(async()=>{let n=t.listBucketOptionsToQueryString(e);return await At(t.fetch,`${t.url}/bucket${n}`,{headers:t.headers})})}async getBucket(e){var t=this;return t.handleOperation(async()=>await At(t.fetch,`${t.url}/bucket/${e}`,{headers:t.headers}))}async createBucket(e,t={public:!1}){var n=this;return n.handleOperation(async()=>await A(n.fetch,`${n.url}/bucket`,{id:e,name:e,type:t.type,public:t.public,file_size_limit:t.fileSizeLimit,allowed_mime_types:t.allowedMimeTypes},{headers:n.headers}))}async updateBucket(e,t){var n=this;return n.handleOperation(async()=>await jt(n.fetch,`${n.url}/bucket/${e}`,{id:e,name:e,public:t.public,file_size_limit:t.fileSizeLimit,allowed_mime_types:t.allowedMimeTypes},{headers:n.headers}))}async emptyBucket(e){var t=this;return t.handleOperation(async()=>await A(t.fetch,`${t.url}/bucket/${e}/empty`,{},{headers:t.headers}))}async deleteBucket(e){var t=this;return t.handleOperation(async()=>await Nt(t.fetch,`${t.url}/bucket/${e}`,{},{headers:t.headers}))}listBucketOptionsToQueryString(e){let t={};return e&&(`limit`in e&&(t.limit=String(e.limit)),`offset`in e&&(t.offset=String(e.offset)),e.search&&(t.search=e.search),e.sortColumn&&(t.sortColumn=e.sortColumn),e.sortOrder&&(t.sortOrder=e.sortOrder)),Object.keys(t).length>0?`?`+new URLSearchParams(t).toString():``}},Ht=class extends M{constructor(e,t={},n){let r=e.replace(/\/$/,``),i=k(k({},Bt),t);super(r,i,n,`storage`)}async createBucket(e){var t=this;return t.handleOperation(async()=>await A(t.fetch,`${t.url}/bucket`,{name:e},{headers:t.headers}))}async listBuckets(e){var t=this;return t.handleOperation(async()=>{let n=new URLSearchParams;e?.limit!==void 0&&n.set(`limit`,e.limit.toString()),e?.offset!==void 0&&n.set(`offset`,e.offset.toString()),e?.sortColumn&&n.set(`sortColumn`,e.sortColumn),e?.sortOrder&&n.set(`sortOrder`,e.sortOrder),e?.search&&n.set(`search`,e.search);let r=n.toString(),i=r?`${t.url}/bucket?${r}`:`${t.url}/bucket`;return await At(t.fetch,i,{headers:t.headers})})}async deleteBucket(e){var t=this;return t.handleOperation(async()=>await Nt(t.fetch,`${t.url}/bucket/${e}`,{},{headers:t.headers}))}from(e){var t=this;if(!wt(e))throw new ht(`Invalid bucket name: File, folder, and bucket names must follow AWS object key naming guidelines and should avoid the use of any other characters.`);let n=new lt({baseUrl:this.url,catalogName:e,auth:{type:`custom`,getHeaders:async()=>t.headers},fetch:this.fetch}),r=this.shouldThrowOnError;return new Proxy(n,{get(e,t){let n=e[t];return typeof n==`function`?async(...t)=>{try{return{data:await n.apply(e,t),error:null}}catch(e){if(r)throw e;return{data:null,error:e}}}:n}})}},Ut=class extends M{constructor(e,t={},n){let r=e.replace(/\/$/,``),i=k(k({},Bt),{},{"Content-Type":`application/json`},t);super(r,i,n,`vectors`)}async createIndex(e){var t=this;return t.handleOperation(async()=>await j.post(t.fetch,`${t.url}/CreateIndex`,e,{headers:t.headers})||{})}async getIndex(e,t){var n=this;return n.handleOperation(async()=>await j.post(n.fetch,`${n.url}/GetIndex`,{vectorBucketName:e,indexName:t},{headers:n.headers}))}async listIndexes(e){var t=this;return t.handleOperation(async()=>await j.post(t.fetch,`${t.url}/ListIndexes`,e,{headers:t.headers}))}async deleteIndex(e,t){var n=this;return n.handleOperation(async()=>await j.post(n.fetch,`${n.url}/DeleteIndex`,{vectorBucketName:e,indexName:t},{headers:n.headers})||{})}},Wt=class extends M{constructor(e,t={},n){let r=e.replace(/\/$/,``),i=k(k({},Bt),{},{"Content-Type":`application/json`},t);super(r,i,n,`vectors`)}async putVectors(e){var t=this;if(e.vectors.length<1||e.vectors.length>500)throw Error(`Vector batch size must be between 1 and 500 items`);return t.handleOperation(async()=>await j.post(t.fetch,`${t.url}/PutVectors`,e,{headers:t.headers})||{})}async getVectors(e){var t=this;return t.handleOperation(async()=>await j.post(t.fetch,`${t.url}/GetVectors`,e,{headers:t.headers}))}async listVectors(e){var t=this;if(e.segmentCount!==void 0){if(e.segmentCount<1||e.segmentCount>16)throw Error(`segmentCount must be between 1 and 16`);if(e.segmentIndex!==void 0&&(e.segmentIndex<0||e.segmentIndex>=e.segmentCount))throw Error(`segmentIndex must be between 0 and ${e.segmentCount-1}`)}return t.handleOperation(async()=>await j.post(t.fetch,`${t.url}/ListVectors`,e,{headers:t.headers}))}async queryVectors(e){var t=this;return t.handleOperation(async()=>await j.post(t.fetch,`${t.url}/QueryVectors`,e,{headers:t.headers}))}async deleteVectors(e){var t=this;if(e.keys.length<1||e.keys.length>500)throw Error(`Keys batch size must be between 1 and 500 items`);return t.handleOperation(async()=>await j.post(t.fetch,`${t.url}/DeleteVectors`,e,{headers:t.headers})||{})}},Gt=class extends M{constructor(e,t={},n){let r=e.replace(/\/$/,``),i=k(k({},Bt),{},{"Content-Type":`application/json`},t);super(r,i,n,`vectors`)}async createBucket(e){var t=this;return t.handleOperation(async()=>await j.post(t.fetch,`${t.url}/CreateVectorBucket`,{vectorBucketName:e},{headers:t.headers})||{})}async getBucket(e){var t=this;return t.handleOperation(async()=>await j.post(t.fetch,`${t.url}/GetVectorBucket`,{vectorBucketName:e},{headers:t.headers}))}async listBuckets(e={}){var t=this;return t.handleOperation(async()=>await j.post(t.fetch,`${t.url}/ListVectorBuckets`,e,{headers:t.headers}))}async deleteBucket(e){var t=this;return t.handleOperation(async()=>await j.post(t.fetch,`${t.url}/DeleteVectorBucket`,{vectorBucketName:e},{headers:t.headers})||{})}},Kt=class extends Gt{constructor(e,t={}){super(e,t.headers||{},t.fetch)}from(e){return new qt(this.url,this.headers,e,this.fetch)}async createBucket(e){var t=()=>super.createBucket,n=this;return t().call(n,e)}async getBucket(e){var t=()=>super.getBucket,n=this;return t().call(n,e)}async listBuckets(e={}){var t=()=>super.listBuckets,n=this;return t().call(n,e)}async deleteBucket(e){var t=()=>super.deleteBucket,n=this;return t().call(n,e)}},qt=class extends Ut{constructor(e,t,n,r){super(e,t,r),this.vectorBucketName=n}async createIndex(e){var t=()=>super.createIndex,n=this;return t().call(n,k(k({},e),{},{vectorBucketName:n.vectorBucketName}))}async listIndexes(e={}){var t=()=>super.listIndexes,n=this;return t().call(n,k(k({},e),{},{vectorBucketName:n.vectorBucketName}))}async getIndex(e){var t=()=>super.getIndex,n=this;return t().call(n,n.vectorBucketName,e)}async deleteIndex(e){var t=()=>super.deleteIndex,n=this;return t().call(n,n.vectorBucketName,e)}index(e){return new Jt(this.url,this.headers,this.vectorBucketName,e,this.fetch)}},Jt=class extends Wt{constructor(e,t,n,r,i){super(e,t,i),this.vectorBucketName=n,this.indexName=r}async putVectors(e){var t=()=>super.putVectors,n=this;return t().call(n,k(k({},e),{},{vectorBucketName:n.vectorBucketName,indexName:n.indexName}))}async getVectors(e){var t=()=>super.getVectors,n=this;return t().call(n,k(k({},e),{},{vectorBucketName:n.vectorBucketName,indexName:n.indexName}))}async listVectors(e={}){var t=()=>super.listVectors,n=this;return t().call(n,k(k({},e),{},{vectorBucketName:n.vectorBucketName,indexName:n.indexName}))}async queryVectors(e){var t=()=>super.queryVectors,n=this;return t().call(n,k(k({},e),{},{vectorBucketName:n.vectorBucketName,indexName:n.indexName}))}async deleteVectors(e){var t=()=>super.deleteVectors,n=this;return t().call(n,k(k({},e),{},{vectorBucketName:n.vectorBucketName,indexName:n.indexName}))}},Yt=class extends Vt{constructor(e,t={},n,r){super(e,t,n,r)}from(e){return new zt(this.url,this.headers,e,this.fetch)}get vectors(){return new Kt(this.url+`/vector`,{headers:this.headers,fetch:this.fetch})}get analytics(){return new Ht(this.url+`/iceberg`,this.headers,this.fetch)}};let Xt=``;Xt=typeof Deno<`u`?`deno`:typeof document<`u`?`web`:typeof navigator<`u`&&navigator.product===`ReactNative`?`react-native`:`node`;let Zt={headers:{"X-Client-Info":`supabase-js-${Xt}/2.104.0`}},Qt={schema:`public`},$t={autoRefreshToken:!0,persistSession:!0,detectSessionInUrl:!0,flowType:`implicit`},en={},tn=e=>e?(...t)=>e(...t):(...e)=>fetch(...e),nn=()=>Headers,rn=(e,t,n)=>{let r=tn(n),i=nn();return async(n,a)=>{let o=await t()??e,s=new i(a?.headers);return s.has(`apikey`)||s.set(`apikey`,e),s.has(`Authorization`)||s.set(`Authorization`,`Bearer ${o}`),r(n,{...a,headers:s})}};function an(e){return e.endsWith(`/`)?e:e+`/`}function on(e,t){let{db:n,auth:r,realtime:i,global:a}=e,{db:o,auth:s,realtime:c,global:l}=t,u={db:{...o,...n},auth:{...s,...r},realtime:{...c,...i},storage:{},global:{...l,...a,headers:{...l?.headers??{},...a?.headers??{}}},accessToken:async()=>``};return e.accessToken?u.accessToken=e.accessToken:delete u.accessToken,u}function sn(e){let t=e?.trim();if(!t)throw Error(`supabaseUrl is required.`);if(!t.match(/^https?:\/\//i))throw Error(`Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL.`);try{return new URL(an(t))}catch{throw Error(`Invalid supabaseUrl: Provided URL is malformed.`)}}let cn=`2.104.0`,N=30*1e3,ln=3*N,un={"X-Client-Info":`gotrue-js/${cn}`},dn=`X-Supabase-Api-Version`,fn={"2024-01-01":{timestamp:Date.parse(`2024-01-01T00:00:00.0Z`),name:`2024-01-01`}},pn=/^([a-z0-9_-]{4})*($|[a-z0-9_-]{3}$|[a-z0-9_-]{2}$)$/i;var P=class extends Error{constructor(e,t,n){super(e),this.__isAuthError=!0,this.name=`AuthError`,this.status=t,this.code=n}toJSON(){return{name:this.name,message:this.message,status:this.status,code:this.code}}};function F(e){return typeof e==`object`&&!!e&&`__isAuthError`in e}var mn=class extends P{constructor(e,t,n){super(e,t,n),this.name=`AuthApiError`,this.status=t,this.code=n}};function hn(e){return F(e)&&e.name===`AuthApiError`}var I=class extends P{constructor(e,t){super(e),this.name=`AuthUnknownError`,this.originalError=t}},L=class extends P{constructor(e,t,n,r){super(e,n,r),this.name=t,this.status=n}},R=class extends L{constructor(){super(`Auth session missing!`,`AuthSessionMissingError`,400,void 0)}};function gn(e){return F(e)&&e.name===`AuthSessionMissingError`}var z=class extends L{constructor(){super(`Auth session or user missing`,`AuthInvalidTokenResponseError`,500,void 0)}},_n=class extends L{constructor(e){super(e,`AuthInvalidCredentialsError`,400,void 0)}},vn=class extends L{constructor(e,t=null){super(e,`AuthImplicitGrantRedirectError`,500,void 0),this.details=null,this.details=t}toJSON(){return Object.assign(Object.assign({},super.toJSON()),{details:this.details})}};function yn(e){return F(e)&&e.name===`AuthImplicitGrantRedirectError`}var bn=class extends L{constructor(e,t=null){super(e,`AuthPKCEGrantCodeExchangeError`,500,void 0),this.details=null,this.details=t}toJSON(){return Object.assign(Object.assign({},super.toJSON()),{details:this.details})}},xn=class extends L{constructor(){super(`PKCE code verifier not found in storage. This can happen if the auth flow was initiated in a different browser or device, or if the storage was cleared. For SSR frameworks (Next.js, SvelteKit, etc.), use @supabase/ssr on both the server and client to store the code verifier in cookies.`,`AuthPKCECodeVerifierMissingError`,400,`pkce_code_verifier_not_found`)}};function Sn(e){return F(e)&&e.name===`AuthPKCECodeVerifierMissingError`}var Cn=class extends L{constructor(e,t){super(e,`AuthRetryableFetchError`,t,void 0)}};function wn(e){return F(e)&&e.name===`AuthRetryableFetchError`}var Tn=class extends L{constructor(e,t,n){super(e,`AuthWeakPasswordError`,t,`weak_password`),this.reasons=n}toJSON(){return Object.assign(Object.assign({},super.toJSON()),{reasons:this.reasons})}};function En(e){return F(e)&&e.name===`AuthWeakPasswordError`}var Dn=class extends L{constructor(e){super(e,`AuthInvalidJwtError`,400,`invalid_jwt`)}};let On=`ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_`.split(``),kn=` 	
node_modules/@supabase/supabase-js\dist\umd\supabase.js:23:Resources:`;for(let t of c){if(!t||typeof t!=`string`)throw Error(`@supabase/auth-js: Invalid SIWE message field "resources". Every resource must be a valid string. Provided value: ${t}`);e+=`\n- ${t}`}m+=e}return`${p}\n${m}`}var Q=class extends Error{constructor({message:e,code:t,cause:n,name:r}){super(e,{cause:n}),this.__isWebAuthnError=!0,this.name=r??(n instanceof Error?n.name:void 0)??`Unknown Error`,this.code=t}},jr=class extends Q{constructor(e,t){super({code:`ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY`,cause:t,message:e}),this.name=`WebAuthnUnknownError`,this.originalError=t}};function Mr({error:e,options:t}){let{publicKey:n}=t;if(!n)throw Error(`options was missing required publicKey property`);if(e.name===`AbortError`){if(t.signal instanceof AbortSignal)return new Q({message:`Registration ceremony was sent an abort signal`,code:`ERROR_CEREMONY_ABORTED`,cause:e})}else if(e.name===`ConstraintError`){if(n.authenticatorSelection?.requireResidentKey===!0)return new Q({message:`Discoverable credentials were required but no available authenticator supported it`,code:`ERROR_AUTHENTICATOR_MISSING_DISCOVERABLE_CREDENTIAL_SUPPORT`,cause:e});if(t.mediation===`conditional`&&n.authenticatorSelection?.userVerification===`required`)return new Q({message:`User verification was required during automatic registration but it could not be performed`,code:`ERROR_AUTO_REGISTER_USER_VERIFICATION_FAILURE`,cause:e});if(n.authenticatorSelection?.userVerification===`required`)return new Q({message:`User verification was required but no available authenticator supported it`,code:`ERROR_AUTHENTICATOR_MISSING_USER_VERIFICATION_SUPPORT`,cause:e})}else if(e.name===`InvalidStateError`)return new Q({message:`The authenticator was previously registered`,code:`ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED`,cause:e});else if(e.name===`NotAllowedError`)return new Q({message:e.message,code:`ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY`,cause:e});else if(e.name===`NotSupportedError`)return n.pubKeyCredParams.filter(e=>e.type===`public-key`).length===0?new Q({message:`No entry in pubKeyCredParams was of type "public-key"`,code:`ERROR_MALFORMED_PUBKEYCREDPARAMS`,cause:e}):new Q({message:`No available authenticator supported any of the specified pubKeyCredParams algorithms`,code:`ERROR_AUTHENTICATOR_NO_SUPPORTED_PUBKEYCREDPARAMS_ALG`,cause:e});else if(e.name===`SecurityError`){let t=window.location.hostname;if(zr(t)){if(n.rp.id!==t)return new Q({message:`The RP ID "${n.rp.id}" is invalid for this domain`,code:`ERROR_INVALID_RP_ID`,cause:e})}else return new Q({message:`${window.location.hostname} is an invalid domain`,code:`ERROR_INVALID_DOMAIN`,cause:e})}else if(e.name===`TypeError`){if(n.user.id.byteLength<1||n.user.id.byteLength>64)return new Q({message:`User ID was not between 1 and 64 characters`,code:`ERROR_INVALID_USER_ID_LENGTH`,cause:e})}else if(e.name===`UnknownError`)return new Q({message:`The authenticator was unable to process the specified options, or could not create a new credential`,code:`ERROR_AUTHENTICATOR_GENERAL_ERROR`,cause:e});return new Q({message:`a Non-Webauthn related error has occurred`,code:`ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY`,cause:e})}function Nr({error:e,options:t}){let{publicKey:n}=t;if(!n)throw Error(`options was missing required publicKey property`);if(e.name===`AbortError`){if(t.signal instanceof AbortSignal)return new Q({message:`Authentication ceremony was sent an abort signal`,code:`ERROR_CEREMONY_ABORTED`,cause:e})}else if(e.name===`NotAllowedError`)return new Q({message:e.message,code:`ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY`,cause:e});else if(e.name===`SecurityError`){let t=window.location.hostname;if(zr(t)){if(n.rpId!==t)return new Q({message:`The RP ID "${n.rpId}" is invalid for this domain`,code:`ERROR_INVALID_RP_ID`,cause:e})}else return new Q({message:`${window.location.hostname} is an invalid domain`,code:`ERROR_INVALID_DOMAIN`,cause:e})}else if(e.name===`UnknownError`)return new Q({message:`The authenticator was unable to process the specified options, or could not create a new assertion signature`,code:`ERROR_AUTHENTICATOR_GENERAL_ERROR`,cause:e});return new Q({message:`a Non-Webauthn related error has occurred`,code:`ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY`,cause:e})}let Pr=new class{createNewAbortSignal(){if(this.controller){let e=Error(`Cancelling existing WebAuthn API call for new one`);e.name=`AbortError`,this.controller.abort(e)}let e=new AbortController;return this.controller=e,e.signal}cancelCeremony(){if(this.controller){let e=Error(`Manually cancelling existing WebAuthn API call`);e.name=`AbortError`,this.controller.abort(e),this.controller=void 0}}};function Fr(e){if(!e)throw Error(`Credential creation options are required`);if(typeof PublicKeyCredential<`u`&&`parseCreationOptionsFromJSON`in PublicKeyCredential&&typeof PublicKeyCredential.parseCreationOptionsFromJSON==`function`)return PublicKeyCredential.parseCreationOptionsFromJSON(e);let{challenge:n,user:r,excludeCredentials:i}=e,a=t(e,[`challenge`,`user`,`excludeCredentials`]),o=B(n).buffer,s=Object.assign(Object.assign({},r),{id:B(r.id).buffer}),c=Object.assign(Object.assign({},a),{challenge:o,user:s});if(i&&i.length>0){c.excludeCredentials=Array(i.length);for(let e=0;e<i.length;e++){let t=i[e];c.excludeCredentials[e]=Object.assign(Object.assign({},t),{id:B(t.id).buffer,type:t.type||`public-key`,transports:t.transports})}}return c}function Ir(e){if(!e)throw Error(`Credential request options are required`);if(typeof PublicKeyCredential<`u`&&`parseRequestOptionsFromJSON`in PublicKeyCredential&&typeof PublicKeyCredential.parseRequestOptionsFromJSON==`function`)return PublicKeyCredential.parseRequestOptionsFromJSON(e);let{challenge:n,allowCredentials:r}=e,i=t(e,[`challenge`,`allowCredentials`]),a=B(n).buffer,o=Object.assign(Object.assign({},i),{challenge:a});if(r&&r.length>0){o.allowCredentials=Array(r.length);for(let e=0;e<r.length;e++){let t=r[e];o.allowCredentials[e]=Object.assign(Object.assign({},t),{id:B(t.id).buffer,type:t.type||`public-key`,transports:t.transports})}}return o}function Lr(e){if(`toJSON`in e&&typeof e.toJSON==`function`)return e.toJSON();let t=e;return{id:e.id,rawId:e.id,response:{attestationObject:V(new Uint8Array(e.response.attestationObject)),clientDataJSON:V(new Uint8Array(e.response.clientDataJSON))},type:`public-key`,clientExtensionResults:e.getClientExtensionResults(),authenticatorAttachment:t.authenticatorAttachment??void 0}}function Rr(e){if(`toJSON`in e&&typeof e.toJSON==`function`)return e.toJSON();let t=e,n=e.getClientExtensionResults(),r=e.response;return{id:e.id,rawId:e.id,response:{authenticatorData:V(new Uint8Array(r.authenticatorData)),clientDataJSON:V(new Uint8Array(r.clientDataJSON)),signature:V(new Uint8Array(r.signature)),userHandle:r.userHandle?V(new Uint8Array(r.userHandle)):void 0},type:`public-key`,clientExtensionResults:n,authenticatorAttachment:t.authenticatorAttachment??void 0}}function zr(e){return e===`localhost`||/^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i.test(e)}function Br(){return!!(H()&&`PublicKeyCredential`in window&&window.PublicKeyCredential&&`credentials`in navigator&&typeof(navigator==null?void 0:navigator.credentials)?.create==`function`&&typeof(navigator==null?void 0:navigator.credentials)?.get==`function`)}async function Vr(e){try{let t=await navigator.credentials.create(e);return t?t instanceof PublicKeyCredential?{data:t,error:null}:{data:null,error:new jr(`Browser returned unexpected credential type`,t)}:{data:null,error:new jr(`Empty credential response`,t)}}catch(t){return{data:null,error:Mr({error:t,options:e})}}}async function Hr(e){try{let t=await navigator.credentials.get(e);return t?t instanceof PublicKeyCredential?{data:t,error:null}:{data:null,error:new jr(`Browser returned unexpected credential type`,t)}:{data:null,error:new jr(`Empty credential response`,t)}}catch(t){return{data:null,error:Nr({error:t,options:e})}}}let Ur={hints:[`security-key`],authenticatorSelection:{authenticatorAttachment:`cross-platform`,requireResidentKey:!1,userVerification:`preferred`,residentKey:`discouraged`},attestation:`direct`},Wr={userVerification:`preferred`,hints:[`security-key`],attestation:`direct`};function Gr(...e){let t=e=>typeof e==`object`&&!!e&&!Array.isArray(e),n=e=>e instanceof ArrayBuffer||ArrayBuffer.isView(e),r={};for(let i of e)if(i)for(let e in i){let a=i[e];if(a!==void 0)if(Array.isArray(a))r[e]=a;else if(n(a))r[e]=a;else if(t(a)){let n=r[e];t(n)?r[e]=Gr(n,a):r[e]=Gr(a)}else r[e]=a}return r}function Kr(e,t){return Gr(Ur,e,t||{})}function qr(e,t){return Gr(Wr,e,t||{})}var Jr=class{constructor(e){this.client=e,this.enroll=this._enroll.bind(this),this.challenge=this._challenge.bind(this),this.verify=this._verify.bind(this),this.authenticate=this._authenticate.bind(this),this.register=this._register.bind(this)}async _enroll(e){return this.client.mfa.enroll(Object.assign(Object.assign({},e),{factorType:`webauthn`}))}async _challenge({factorId:e,webauthn:t,friendlyName:n,signal:r},i){try{let{data:a,error:o}=await this.client.mfa.challenge({factorId:e,webauthn:t});if(!a)return{data:null,error:o};let s=r??Pr.createNewAbortSignal();if(a.webauthn.type===`create`){let{user:e}=a.webauthn.credential_options.publicKey;if(!e.name){let t=n;if(t)e.name=`${e.id}:${t}`;else{let t=(await this.client.getUser()).data.user,n=t?.user_metadata?.name||t?.email||t?.id||`User`;e.name=`${e.id}:${n}`}}e.displayName||=e.name}switch(a.webauthn.type){case`create`:{let{data:t,error:n}=await Vr({publicKey:Kr(a.webauthn.credential_options.publicKey,i?.create),signal:s});return t?{data:{factorId:e,challengeId:a.id,webauthn:{type:a.webauthn.type,credential_response:t}},error:null}:{data:null,error:n}}case`request`:{let t=qr(a.webauthn.credential_options.publicKey,i?.request),{data:n,error:r}=await Hr(Object.assign(Object.assign({},a.webauthn.credential_options),{publicKey:t,signal:s}));return n?{data:{factorId:e,challengeId:a.id,webauthn:{type:a.webauthn.type,credential_response:n}},error:null}:{data:null,error:r}}}}catch(e){return F(e)?{data:null,error:e}:{data:null,error:new I(`Unexpected error in challenge`,e)}}}async _verify({challengeId:e,factorId:t,webauthn:n}){return this.client.mfa.verify({factorId:t,challengeId:e,webauthn:n})}async _authenticate({factorId:e,webauthn:{rpId:t=typeof window<`u`?window.location.hostname:void 0,rpOrigins:n=typeof window<`u`?[window.location.origin]:void 0,signal:r}={}},i){if(!t)return{data:null,error:new P(`rpId is required for WebAuthn authentication`)};try{if(!Br())return{data:null,error:new I(`Browser does not support WebAuthn`,null)};let{data:a,error:o}=await this.challenge({factorId:e,webauthn:{rpId:t,rpOrigins:n},signal:r},{request:i});if(!a)return{data:null,error:o};let{webauthn:s}=a;return this._verify({factorId:e,challengeId:a.challengeId,webauthn:{type:s.type,rpId:t,rpOrigins:n,credential_response:s.credential_response}})}catch(e){return F(e)?{data:null,error:e}:{data:null,error:new I(`Unexpected error in authenticate`,e)}}}async _register({friendlyName:e,webauthn:{rpId:t=typeof window<`u`?window.location.hostname:void 0,rpOrigins:n=typeof window<`u`?[window.location.origin]:void 0,signal:r}={}},i){if(!t)return{data:null,error:new P(`rpId is required for WebAuthn registration`)};try{if(!Br())return{data:null,error:new I(`Browser does not support WebAuthn`,null)};let{data:a,error:o}=await this._enroll({friendlyName:e});if(!a)return await this.client.mfa.listFactors().then(t=>t.data?.all.find(t=>t.factor_type===`webauthn`&&t.friendly_name===e&&t.status!==`unverified`)).then(e=>e?this.client.mfa.unenroll({factorId:e?.id}):void 0),{data:null,error:o};let{data:s,error:c}=await this._challenge({factorId:a.id,friendlyName:a.friendly_name,webauthn:{rpId:t,rpOrigins:n},signal:r},{create:i});return s?this._verify({factorId:a.id,challengeId:s.challengeId,webauthn:{rpId:t,rpOrigins:n,type:s.webauthn.type,credential_response:s.webauthn.credential_response}}):{data:null,error:c}}catch(e){return F(e)?{data:null,error:e}:{data:null,error:new I(`Unexpected error in register`,e)}}}};Er();let Yr={url:`http://localhost:9999`,storageKey:`supabase.auth.token`,autoRefreshToken:!0,persistSession:!0,detectSessionInUrl:!0,headers:un,flowType:`implicit`,debug:!1,hasCustomAuthorizationHeader:!1,throwOnError:!1,lockAcquireTimeout:5e3,skipAutoInitialize:!1};async function Xr(e,t,n){return await n()}let $={};var Zr=class e{get jwks(){return $[this.storageKey]?.jwks??{keys:[]}}set jwks(e){$[this.storageKey]=Object.assign(Object.assign({},$[this.storageKey]),{jwks:e})}get jwks_cached_at(){return $[this.storageKey]?.cachedAt??-(2**53-1)}set jwks_cached_at(e){$[this.storageKey]=Object.assign(Object.assign({},$[this.storageKey]),{cachedAt:e})}constructor(t){var n;this.userStorage=null,this.memoryStorage=null,this.stateChangeEmitters=new Map,this.autoRefreshTicker=null,this.autoRefreshTickTimeout=null,this.visibilityChangedCallback=null,this.refreshingDeferred=null,this.initializePromise=null,this.detectSessionInUrl=!0,this.hasCustomAuthorizationHeader=!1,this.suppressGetSessionWarning=!1,this.lockAcquired=!1,this.pendingInLock=[],this.broadcastChannel=null,this.logger=console.log;let r=Object.assign(Object.assign({},Yr),t);if(this.storageKey=r.storageKey,this.instanceID=e.nextInstanceID[this.storageKey]??0,e.nextInstanceID[this.storageKey]=this.instanceID+1,this.logDebugMessages=!!r.debug,typeof r.debug==`function`&&(this.logger=r.debug),this.instanceID>0&&H()){let e=`${this._logPrefix()} Multiple GoTrueClient instances detected in the same browser context. It is not an error, but this should be avoided as it may produce undefined behavior when used concurrently under the same storage key.`;console.warn(e),this.logDebugMessages&&console.trace(e)}if(this.persistSession=r.persistSession,this.autoRefreshToken=r.autoRefreshToken,this.admin=new vr({url:r.url,headers:r.headers,fetch:r.fetch}),this.url=r.url,this.headers=r.headers,this.fetch=Hn(r.fetch),this.lock=r.lock||Xr,this.detectSessionInUrl=r.detectSessionInUrl,this.flowType=r.flowType,this.hasCustomAuthorizationHeader=r.hasCustomAuthorizationHeader,this.throwOnError=r.throwOnError,this.lockAcquireTimeout=r.lockAcquireTimeout,r.lock?this.lock=r.lock:this.persistSession&&H()&&(globalThis==null?void 0:globalThis.navigator)?.locks?this.lock=Cr:this.lock=Xr,this.jwks||(this.jwks={keys:[]},this.jwks_cached_at=-(2**53-1)),this.mfa={verify:this._verify.bind(this),enroll:this._enroll.bind(this),unenroll:this._unenroll.bind(this),challenge:this._challenge.bind(this),listFactors:this._listFactors.bind(this),challengeAndVerify:this._challengeAndVerify.bind(this),getAuthenticatorAssuranceLevel:this._getAuthenticatorAssuranceLevel.bind(this),webauthn:new Jr(this)},this.oauth={getAuthorizationDetails:this._getAuthorizationDetails.bind(this),approveAuthorization:this._approveAuthorization.bind(this),denyAuthorization:this._denyAuthorization.bind(this),listGrants:this._listOAuthGrants.bind(this),revokeGrant:this._revokeOAuthGrant.bind(this)},this.persistSession?(r.storage?this.storage=r.storage:Bn()?this.storage=globalThis.localStorage:(this.memoryStorage={},this.storage=yr(this.memoryStorage)),r.userStorage&&(this.userStorage=r.userStorage)):(this.memoryStorage={},this.storage=yr(this.memoryStorage)),H()&&globalThis.BroadcastChannel&&this.persistSession&&this.storageKey){try{this.broadcastChannel=new globalThis.BroadcastChannel(this.storageKey)}catch(e){console.error(`Failed to create a new BroadcastChannel, multi-tab state changes will not be available`,e)}(n=this.broadcastChannel)==null||n.addEventListener(`message`,async e=>{this._debug(`received broadcast notification from other tab or client`,e);try{await this._notifyAllSubscribers(e.data.event,e.data.session,!1)}catch(e){this._debug(`#broadcastChannel`,`error`,e)}})}r.skipAutoInitialize||this.initialize().catch(e=>{this._debug(`#initialize()`,`error`,e)})}isThrowOnErrorEnabled(){return this.throwOnError}_returnResult(e){if(this.throwOnError&&e&&e.error)throw e.error;return e}_logPrefix(){return`GoTrueClient@${this.storageKey}:${this.instanceID} (${cn}) ${new Date().toISOString()}`}_debug(...e){return this.logDebugMessages&&this.logger(this._logPrefix(),...e),this}async initialize(){return this.initializePromise||=(async()=>await this._acquireLock(this.lockAcquireTimeout,async()=>await this._initialize()))(),await this.initializePromise}async _initialize(){try{let e={},t=`none`;if(H()&&(e=Vn(window.location.href),this._isImplicitGrantCallback(e)?t=`implicit`:await this._isPKCECallback(e)&&(t=`pkce`)),H()&&this.detectSessionInUrl&&t!==`none`){let{data:n,error:r}=await this._getSessionFromURL(e,t);if(r){if(this._debug(`#_initialize()`,`error detecting session from URL`,r),yn(r)){let e=r.details?.code;if(e===`identity_already_exists`||e===`identity_not_found`||e===`single_identity_not_deletable`)return{error:r}}return{error:r}}let{session:i,redirectType:a}=n;return this._debug(`#_initialize()`,`detected session in URL`,i,`redirect type`,a),await this._saveSession(i),setTimeout(async()=>{a===`recovery`?await this._notifyAllSubscribers(`PASSWORD_RECOVERY`,i):await this._notifyAllSubscribers(`SIGNED_IN`,i)},0),{error:null}}return await this._recoverAndRefresh(),{error:null}}catch(e){return F(e)?this._returnResult({error:e}):this._returnResult({error:new I(`Unexpected error during initialization`,e)})}finally{await this._handleVisibilityChange(),this._debug(`#_initialize()`,`end`)}}async signInAnonymously(e){try{let{data:t,error:n}=await J(this.fetch,`POST`,`${this.url}/signup`,{headers:this.headers,body:{data:e?.options?.data??{},gotrue_meta_security:{captcha_token:e?.options?.captchaToken}},xform:Y});if(n||!t)return this._returnResult({data:{user:null,session:null},error:n});let r=t.session,i=t.user;return t.session&&(await this._saveSession(t.session),await this._notifyAllSubscribers(`SIGNED_IN`,r)),this._returnResult({data:{user:i,session:r},error:null})}catch(e){if(F(e))return this._returnResult({data:{user:null,session:null},error:e});throw e}}async signUp(e){try{let t;if(`email`in e){let{email:n,password:r,options:i}=e,a=null,o=null;this.flowType===`pkce`&&([a,o]=await Qn(this.storage,this.storageKey)),t=await J(this.fetch,`POST`,`${this.url}/signup`,{headers:this.headers,redirectTo:i?.emailRedirectTo,body:{email:n,password:r,data:i?.data??{},gotrue_meta_security:{captcha_token:i?.captchaToken},code_challenge:a,code_challenge_method:o},xform:Y})}else if(`phone`in e){let{phone:n,password:r,options:i}=e;t=await J(this.fetch,`POST`,`${this.url}/signup`,{headers:this.headers,body:{phone:n,password:r,data:i?.data??{},channel:i?.channel??`sms`,gotrue_meta_security:{captcha_token:i?.captchaToken}},xform:Y})}else throw new _n(`You must provide either an email or phone number and a password`);let{data:n,error:r}=t;if(r||!n)return await K(this.storage,`${this.storageKey}-code-verifier`),this._returnResult({data:{user:null,session:null},error:r});let i=n.session,a=n.user;return n.session&&(await this._saveSession(n.session),await this._notifyAllSubscribers(`SIGNED_IN`,i)),this._returnResult({data:{user:a,session:i},error:null})}catch(e){if(await K(this.storage,`${this.storageKey}-code-verifier`),F(e))return this._returnResult({data:{user:null,session:null},error:e});throw e}}async signInWithPassword(e){try{let t;if(`email`in e){let{email:n,password:r,options:i}=e;t=await J(this.fetch,`POST`,`${this.url}/token?grant_type=password`,{headers:this.headers,body:{email:n,password:r,gotrue_meta_security:{captcha_token:i?.captchaToken}},xform:fr})}else if(`phone`in e){let{phone:n,password:r,options:i}=e;t=await J(this.fetch,`POST`,`${this.url}/token?grant_type=password`,{headers:this.headers,body:{phone:n,password:r,gotrue_meta_security:{captcha_token:i?.captchaToken}},xform:fr})}else throw new _n(`You must provide either an email or phone number and a password`);let{data:n,error:r}=t;if(r)return this._returnResult({data:{user:null,session:null},error:r});if(!n||!n.session||!n.user){let e=new z;return this._returnResult({data:{user:null,session:null},error:e})}return n.session&&(await this._saveSession(n.session),await this._notifyAllSubscribers(`SIGNED_IN`,n.session)),this._returnResult({data:Object.assign({user:n.user,session:n.session},n.weak_password?{weakPassword:n.weak_password}:null),error:r})}catch(e){if(F(e))return this._returnResult({data:{user:null,session:null},error:e});throw e}}async signInWithOAuth(e){return await this._handleProviderSignIn(e.provider,{redirectTo:e.options?.redirectTo,scopes:e.options?.scopes,queryParams:e.options?.queryParams,skipBrowserRedirect:e.options?.skipBrowserRedirect})}async exchangeCodeForSession(e){return await this.initializePromise,this._acquireLock(this.lockAcquireTimeout,async()=>this._exchangeCodeForSession(e))}async signInWithWeb3(e){let{chain:t}=e;switch(t){case`ethereum`:return await this.signInWithEthereum(e);case`solana`:return await this.signInWithSolana(e);default:throw Error(`@supabase/auth-js: Unsupported chain "${t}"`)}}async signInWithEthereum(e){let t,n;if(`message`in e)t=e.message,n=e.signature;else{let{chain:r,wallet:i,statement:a,options:o}=e,s;if(H())if(typeof i==`object`)s=i;else{let e=window;if(`ethereum`in e&&typeof e.ethereum==`object`&&`request`in e.ethereum&&typeof e.ethereum.request==`function`)s=e.ethereum;else throw Error(`@supabase/auth-js: No compatible Ethereum wallet interface on the window object (window.ethereum) detected. Make sure the user already has a wallet installed and connected for this app. Prefer passing the wallet interface object directly to signInWithWeb3({ chain: 'ethereum', wallet: resolvedUserWallet }) instead.`)}else{if(typeof i!=`object`||!o?.url)throw Error(`@supabase/auth-js: Both wallet and url must be specified in non-browser environments.`);s=i}let c=new URL(o?.url??window.location.href),l=await s.request({method:`eth_requestAccounts`}).then(e=>e).catch(()=>{throw Error(`@supabase/auth-js: Wallet method eth_requestAccounts is missing or invalid`)});if(!l||l.length===0)throw Error(`@supabase/auth-js: No accounts available. Please ensure the wallet is connected.`);let u=Dr(l[0]),d=o?.signInWithEthereum?.chainId;d||=Or(await s.request({method:`eth_chainId`})),t=Ar({domain:c.host,address:u,statement:a,uri:c.href,version:`1`,chainId:d,nonce:o?.signInWithEthereum?.nonce,issuedAt:o?.signInWithEthereum?.issuedAt??new Date,expirationTime:o?.signInWithEthereum?.expirationTime,notBefore:o?.signInWithEthereum?.notBefore,requestId:o?.signInWithEthereum?.requestId,resources:o?.signInWithEthereum?.resources}),n=await s.request({method:`personal_sign`,params:[kr(t),u]})}try{let{data:r,error:i}=await J(this.fetch,`POST`,`${this.url}/token?grant_type=web3`,{headers:this.headers,body:Object.assign({chain:`ethereum`,message:t,signature:n},e.options?.captchaToken?{gotrue_meta_security:{captcha_token:e.options?.captchaToken}}:null),xform:Y});if(i)throw i;if(!r||!r.session||!r.user){let e=new z;return this._returnResult({data:{user:null,session:null},error:e})}return r.session&&(await this._saveSession(r.session),await this._notifyAllSubscribers(`SIGNED_IN`,r.session)),this._returnResult({data:Object.assign({},r),error:i})}catch(e){if(F(e))return this._returnResult({data:{user:null,session:null},error:e});throw e}}async signInWithSolana(e){let t,n;if(`message`in e)t=e.message,n=e.signature;else{let{chain:r,wallet:i,statement:a,options:o}=e,s;if(H())if(typeof i==`object`)s=i;else{let e=window;if(`solana`in e&&typeof e.solana==`object`&&(`signIn`in e.solana&&typeof e.solana.signIn==`function`||`signMessage`in e.solana&&typeof e.solana.signMessage==`function`))s=e.solana;else throw Error(`@supabase/auth-js: No compatible Solana wallet interface on the window object (window.solana) detected. Make sure the user already has a wallet installed and connected for this app. Prefer passing the wallet interface object directly to signInWithWeb3({ chain: 'solana', wallet: resolvedUserWallet }) instead.`)}else{if(typeof i!=`object`||!o?.url)throw Error(`@supabase/auth-js: Both wallet and url must be specified in non-browser environments.`);s=i}let c=new URL(o?.url??window.location.href);if(`signIn`in s&&s.signIn){let e=await s.signIn(Object.assign(Object.assign(Object.assign({issuedAt:new Date().toISOString()},o?.signInWithSolana),{version:`1`,domain:c.host,uri:c.href}),a?{statement:a}:null)),r;if(Array.isArray(e)&&e[0]&&typeof e[0]==`object`)r=e[0];else if(e&&typeof e==`object`&&`signedMessage`in e&&`signature`in e)r=e;else throw Error(`@supabase/auth-js: Wallet method signIn() returned unrecognized value`);if(`signedMessage`in r&&`signature`in r&&(typeof r.signedMessage==`string`||r.signedMessage instanceof Uint8Array)&&r.signature instanceof Uint8Array)t=typeof r.signedMessage==`string`?r.signedMessage:new TextDecoder().decode(r.signedMessage),n=r.signature;else throw Error(`@supabase/auth-js: Wallet method signIn() API returned object without signedMessage and signature fields`)}else{if(!(`signMessage`in s)||typeof s.signMessage!=`function`||!(`publicKey`in s)||typeof s!=`object`||!s.publicKey||!(`toBase58`in s.publicKey)||typeof s.publicKey.toBase58!=`function`)throw Error(`@supabase/auth-js: Wallet does not have a compatible signMessage() and publicKey.toBase58() API`);t=[`${c.host} wants you to sign in with your Solana account:`,s.publicKey.toBase58(),...a?[``,a,``]:[``],`Version: 1`,`URI: ${c.href}`,`Issued At: ${o?.signInWithSolana?.issuedAt??new Date().toISOString()}`,...o?.signInWithSolana?.notBefore?[`Not Before: ${o.signInWithSolana.notBefore}`]:[],...o?.signInWithSolana?.expirationTime?[`Expiration Time: ${o.signInWithSolana.expirationTime}`]:[],...o?.signInWithSolana?.chainId?[`Chain ID: ${o.signInWithSolana.chainId}`]:[],...o?.signInWithSolana?.nonce?[`Nonce: ${o.signInWithSolana.nonce}`]:[],...o?.signInWithSolana?.requestId?[`Request ID: ${o.signInWithSolana.requestId}`]:[],...o?.signInWithSolana?.resources?.length?[`Resources`,...o.signInWithSolana.resources.map(e=>`- ${e}`)]:[]].join(`
node_modules/@supabase/supabase-js\dist\umd\supabase.js:24:`);let e=await s.signMessage(new TextEncoder().encode(t),`utf8`);if(!e||!(e instanceof Uint8Array))throw Error(`@supabase/auth-js: Wallet signMessage() API returned an recognized value`);n=e}}try{let{data:r,error:i}=await J(this.fetch,`POST`,`${this.url}/token?grant_type=web3`,{headers:this.headers,body:Object.assign({chain:`solana`,message:t,signature:V(n)},e.options?.captchaToken?{gotrue_meta_security:{captcha_token:e.options?.captchaToken}}:null),xform:Y});if(i)throw i;if(!r||!r.session||!r.user){let e=new z;return this._returnResult({data:{user:null,session:null},error:e})}return r.session&&(await this._saveSession(r.session),await this._notifyAllSubscribers(`SIGNED_IN`,r.session)),this._returnResult({data:Object.assign({},r),error:i})}catch(e){if(F(e))return this._returnResult({data:{user:null,session:null},error:e});throw e}}async _exchangeCodeForSession(e){let[t,n]=(await G(this.storage,`${this.storageKey}-code-verifier`)??``).split(`/`);try{if(!t&&this.flowType===`pkce`)throw new xn;let{data:r,error:i}=await J(this.fetch,`POST`,`${this.url}/token?grant_type=pkce`,{headers:this.headers,body:{auth_code:e,code_verifier:t},xform:Y});if(await K(this.storage,`${this.storageKey}-code-verifier`),i)throw i;if(!r||!r.session||!r.user){let e=new z;return this._returnResult({data:{user:null,session:null,redirectType:null},error:e})}return r.session&&(await this._saveSession(r.session),await this._notifyAllSubscribers(`SIGNED_IN`,r.session)),this._returnResult({data:Object.assign(Object.assign({},r),{redirectType:n??null}),error:i})}catch(e){if(await K(this.storage,`${this.storageKey}-code-verifier`),F(e))return this._returnResult({data:{user:null,session:null,redirectType:null},error:e});throw e}}async signInWithIdToken(e){try{let{options:t,provider:n,token:r,access_token:i,nonce:a}=e,{data:o,error:s}=await J(this.fetch,`POST`,`${this.url}/token?grant_type=id_token`,{headers:this.headers,body:{provider:n,id_token:r,access_token:i,nonce:a,gotrue_meta_security:{captcha_token:t?.captchaToken}},xform:Y});if(s)return this._returnResult({data:{user:null,session:null},error:s});if(!o||!o.session||!o.user){let e=new z;return this._returnResult({data:{user:null,session:null},error:e})}return o.session&&(await this._saveSession(o.session),await this._notifyAllSubscribers(`SIGNED_IN`,o.session)),this._returnResult({data:o,error:s})}catch(e){if(F(e))return this._returnResult({data:{user:null,session:null},error:e});throw e}}async signInWithOtp(e){try{if(`email`in e){let{email:t,options:n}=e,r=null,i=null;this.flowType===`pkce`&&([r,i]=await Qn(this.storage,this.storageKey));let{error:a}=await J(this.fetch,`POST`,`${this.url}/otp`,{headers:this.headers,body:{email:t,data:n?.data??{},create_user:n?.shouldCreateUser??!0,gotrue_meta_security:{captcha_token:n?.captchaToken},code_challenge:r,code_challenge_method:i},redirectTo:n?.emailRedirectTo});return this._returnResult({data:{user:null,session:null},error:a})}if(`phone`in e){let{phone:t,options:n}=e,{data:r,error:i}=await J(this.fetch,`POST`,`${this.url}/otp`,{headers:this.headers,body:{phone:t,data:n?.data??{},create_user:n?.shouldCreateUser??!0,gotrue_meta_security:{captcha_token:n?.captchaToken},channel:n?.channel??`sms`}});return this._returnResult({data:{user:null,session:null,messageId:r?.message_id},error:i})}throw new _n(`You must provide either an email or phone number.`)}catch(e){if(await K(this.storage,`${this.storageKey}-code-verifier`),F(e))return this._returnResult({data:{user:null,session:null},error:e});throw e}}async verifyOtp(e){try{let t,n;`options`in e&&(t=e.options?.redirectTo,n=e.options?.captchaToken);let{data:r,error:i}=await J(this.fetch,`POST`,`${this.url}/verify`,{headers:this.headers,body:Object.assign(Object.assign({},e),{gotrue_meta_security:{captcha_token:n}}),redirectTo:t,xform:Y});if(i)throw i;if(!r)throw Error(`An error occurred on token verification.`);let a=r.session,o=r.user;return a?.access_token&&(await this._saveSession(a),await this._notifyAllSubscribers(e.type==`recovery`?`PASSWORD_RECOVERY`:`SIGNED_IN`,a)),this._returnResult({data:{user:o,session:a},error:null})}catch(e){if(F(e))return this._returnResult({data:{user:null,session:null},error:e});throw e}}async signInWithSSO(e){try{let t=null,n=null;this.flowType===`pkce`&&([t,n]=await Qn(this.storage,this.storageKey));let r=await J(this.fetch,`POST`,`${this.url}/sso`,{body:Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({},`providerId`in e?{provider_id:e.providerId}:null),`domain`in e?{domain:e.domain}:null),{redirect_to:e.options?.redirectTo??void 0}),e?.options?.captchaToken?{gotrue_meta_security:{captcha_token:e.options.captchaToken}}:null),{skip_http_redirect:!0,code_challenge:t,code_challenge_method:n}),headers:this.headers,xform:pr});return r.data?.url&&H()&&!e.options?.skipBrowserRedirect&&window.location.assign(r.data.url),this._returnResult(r)}catch(e){if(await K(this.storage,`${this.storageKey}-code-verifier`),F(e))return this._returnResult({data:null,error:e});throw e}}async reauthenticate(){return await this.initializePromise,await this._acquireLock(this.lockAcquireTimeout,async()=>await this._reauthenticate())}async _reauthenticate(){try{return await this._useSession(async e=>{let{data:{session:t},error:n}=e;if(n)throw n;if(!t)throw new R;let{error:r}=await J(this.fetch,`GET`,`${this.url}/reauthenticate`,{headers:this.headers,jwt:t.access_token});return this._returnResult({data:{user:null,session:null},error:r})})}catch(e){if(F(e))return this._returnResult({data:{user:null,session:null},error:e});throw e}}async resend(e){try{let t=`${this.url}/resend`;if(`email`in e){let{email:n,type:r,options:i}=e,{error:a}=await J(this.fetch,`POST`,t,{headers:this.headers,body:{email:n,type:r,gotrue_meta_security:{captcha_token:i?.captchaToken}},redirectTo:i?.emailRedirectTo});return this._returnResult({data:{user:null,session:null},error:a})}else if(`phone`in e){let{phone:n,type:r,options:i}=e,{data:a,error:o}=await J(this.fetch,`POST`,t,{headers:this.headers,body:{phone:n,type:r,gotrue_meta_security:{captcha_token:i?.captchaToken}}});return this._returnResult({data:{user:null,session:null,messageId:a?.message_id},error:o})}throw new _n(`You must provide either an email or phone number and a type`)}catch(e){if(F(e))return this._returnResult({data:{user:null,session:null},error:e});throw e}}async getSession(){return await this.initializePromise,await this._acquireLock(this.lockAcquireTimeout,async()=>this._useSession(async e=>e))}async _acquireLock(e,t){this._debug(`#_acquireLock`,`begin`,e);try{if(this.lockAcquired){let e=this.pendingInLock.length?this.pendingInLock[this.pendingInLock.length-1]:Promise.resolve(),n=(async()=>(await e,await t()))();return this.pendingInLock.push((async()=>{try{await n}catch{}})()),n}return await this.lock(`lock:${this.storageKey}`,e,async()=>{this._debug(`#_acquireLock`,`lock acquired for storage key`,this.storageKey);try{this.lockAcquired=!0;let e=t();for(this.pendingInLock.push((async()=>{try{await e}catch{}})()),await e;this.pendingInLock.length;){let e=[...this.pendingInLock];await Promise.all(e),this.pendingInLock.splice(0,e.length)}return await e}finally{this._debug(`#_acquireLock`,`lock released for storage key`,this.storageKey),this.lockAcquired=!1}})}finally{this._debug(`#_acquireLock`,`end`)}}async _useSession(e){this._debug(`#_useSession`,`begin`);try{return await e(await this.__loadSession())}finally{this._debug(`#_useSession`,`end`)}}async __loadSession(){this._debug(`#__loadSession()`,`begin`),this.lockAcquired||this._debug(`#__loadSession()`,`used outside of an acquired lock!`,Error().stack);try{let e=null,t=await G(this.storage,this.storageKey);if(this._debug(`#getSession()`,`session from storage`,t),t!==null&&(this._isValidSession(t)?e=t:(this._debug(`#getSession()`,`session from storage is not valid`),await this._removeSession())),!e)return{data:{session:null},error:null};let n=e.expires_at?e.expires_at*1e3-Date.now()<ln:!1;if(this._debug(`#__loadSession()`,`session has${n?``:` not`} expired`,`expires_at`,e.expires_at),!n){if(this.userStorage){let t=await G(this.userStorage,this.storageKey+`-user`);t?.user?e.user=t.user:e.user=ar()}if(this.storage.isServer&&e.user&&!e.user.__isUserNotAvailableProxy){let t={value:this.suppressGetSessionWarning};e.user=or(e.user,t),t.value&&(this.suppressGetSessionWarning=!0)}return{data:{session:e},error:null}}let{data:r,error:i}=await this._callRefreshToken(e.refresh_token);return i?this._returnResult({data:{session:null},error:i}):this._returnResult({data:{session:r},error:null})}finally{this._debug(`#__loadSession()`,`end`)}}async getUser(e){if(e)return await this._getUser(e);await this.initializePromise;let t=await this._acquireLock(this.lockAcquireTimeout,async()=>await this._getUser());return t.data.user&&(this.suppressGetSessionWarning=!0),t}async _getUser(e){try{return e?await J(this.fetch,`GET`,`${this.url}/user`,{headers:this.headers,jwt:e,xform:X}):await this._useSession(async e=>{let{data:t,error:n}=e;if(n)throw n;return!t.session?.access_token&&!this.hasCustomAuthorizationHeader?{data:{user:null},error:new R}:await J(this.fetch,`GET`,`${this.url}/user`,{headers:this.headers,jwt:t.session?.access_token??void 0,xform:X})})}catch(e){if(F(e))return gn(e)&&(await this._removeSession(),await K(this.storage,`${this.storageKey}-code-verifier`)),this._returnResult({data:{user:null},error:e});throw e}}async updateUser(e,t={}){return await this.initializePromise,await this._acquireLock(this.lockAcquireTimeout,async()=>await this._updateUser(e,t))}async _updateUser(e,t={}){try{return await this._useSession(async n=>{let{data:r,error:i}=n;if(i)throw i;if(!r.session)throw new R;let a=r.session,o=null,s=null;this.flowType===`pkce`&&e.email!=null&&([o,s]=await Qn(this.storage,this.storageKey));let{data:c,error:l}=await J(this.fetch,`PUT`,`${this.url}/user`,{headers:this.headers,redirectTo:t?.emailRedirectTo,body:Object.assign(Object.assign({},e),{code_challenge:o,code_challenge_method:s}),jwt:a.access_token,xform:X});if(l)throw l;return a.user=c.user,await this._saveSession(a),await this._notifyAllSubscribers(`USER_UPDATED`,a),this._returnResult({data:{user:a.user},error:null})})}catch(e){if(await K(this.storage,`${this.storageKey}-code-verifier`),F(e))return this._returnResult({data:{user:null},error:e});throw e}}async setSession(e){return await this.initializePromise,await this._acquireLock(this.lockAcquireTimeout,async()=>await this._setSession(e))}async _setSession(e){try{if(!e.access_token||!e.refresh_token)throw new R;let t=Date.now()/1e3,n=t,r=!0,i=null,{payload:a}=Gn(e.access_token);if(a.exp&&(n=a.exp,r=n<=t),r){let{data:t,error:n}=await this._callRefreshToken(e.refresh_token);if(n)return this._returnResult({data:{user:null,session:null},error:n});if(!t)return{data:{user:null,session:null},error:null};i=t}else{let{data:r,error:a}=await this._getUser(e.access_token);if(a)return this._returnResult({data:{user:null,session:null},error:a});i={access_token:e.access_token,refresh_token:e.refresh_token,user:r.user,token_type:`bearer`,expires_in:n-t,expires_at:n},await this._saveSession(i),await this._notifyAllSubscribers(`SIGNED_IN`,i)}return this._returnResult({data:{user:i.user,session:i},error:null})}catch(e){if(F(e))return this._returnResult({data:{session:null,user:null},error:e});throw e}}async refreshSession(e){return await this.initializePromise,await this._acquireLock(this.lockAcquireTimeout,async()=>await this._refreshSession(e))}async _refreshSession(e){try{return await this._useSession(async t=>{if(!e){let{data:n,error:r}=t;if(r)throw r;e=n.session??void 0}if(!e?.refresh_token)throw new R;let{data:n,error:r}=await this._callRefreshToken(e.refresh_token);return r?this._returnResult({data:{user:null,session:null},error:r}):n?this._returnResult({data:{user:n.user,session:n},error:null}):this._returnResult({data:{user:null,session:null},error:null})})}catch(e){if(F(e))return this._returnResult({data:{user:null,session:null},error:e});throw e}}async _getSessionFromURL(e,t){try{if(!H())throw new vn(`No browser detected.`);if(e.error||e.error_description||e.error_code)throw new vn(e.error_description||`Error in URL with unspecified error_description`,{error:e.error||`unspecified_error`,code:e.error_code||`unspecified_code`});switch(t){case`implicit`:if(this.flowType===`pkce`)throw new bn(`Not a valid PKCE flow url.`);break;case`pkce`:if(this.flowType===`implicit`)throw new vn(`Not a valid implicit grant flow url.`);break;default:}if(t===`pkce`){if(this._debug(`#_initialize()`,`begin`,`is PKCE flow`,!0),!e.code)throw new bn(`No code detected.`);let{data:t,error:n}=await this._exchangeCodeForSession(e.code);if(n)throw n;let r=new URL(window.location.href);return r.searchParams.delete(`code`),window.history.replaceState(window.history.state,``,r.toString()),{data:{session:t.session,redirectType:null},error:null}}let{provider_token:n,provider_refresh_token:r,access_token:i,refresh_token:a,expires_in:o,expires_at:s,token_type:c}=e;if(!i||!o||!a||!c)throw new vn(`No session defined in URL`);let l=Math.round(Date.now()/1e3),u=parseInt(o),d=l+u;s&&(d=parseInt(s));let f=d-l;f*1e3<=N&&console.warn(`@supabase/gotrue-js: Session as retrieved from URL expires in ${f}s, should have been closer to ${u}s`);let p=d-u;l-p>=120?console.warn(`@supabase/gotrue-js: Session as retrieved from URL was issued over 120s ago, URL could be stale`,p,d,l):l-p<0&&console.warn(`@supabase/gotrue-js: Session as retrieved from URL was issued in the future? Check the device clock for skew`,p,d,l);let{data:m,error:h}=await this._getUser(i);if(h)throw h;let ee={provider_token:n,provider_refresh_token:r,access_token:i,expires_in:u,expires_at:d,refresh_token:a,token_type:c,user:m.user};return window.location.hash=``,this._debug(`#_getSessionFromURL()`,`clearing window.location.hash`),this._returnResult({data:{session:ee,redirectType:e.type},error:null})}catch(e){if(F(e))return this._returnResult({data:{session:null,redirectType:null},error:e});throw e}}_isImplicitGrantCallback(e){return typeof this.detectSessionInUrl==`function`?this.detectSessionInUrl(new URL(window.location.href),e):!!(e.access_token||e.error_description)}async _isPKCECallback(e){let t=await G(this.storage,`${this.storageKey}-code-verifier`);return!!(e.code&&t)}async signOut(e={scope:`global`}){return await this.initializePromise,await this._acquireLock(this.lockAcquireTimeout,async()=>await this._signOut(e))}async _signOut({scope:e}={scope:`global`}){return await this._useSession(async t=>{let{data:n,error:r}=t;if(r&&!gn(r))return this._returnResult({error:r});let i=n.session?.access_token;if(i){let{error:t}=await this.admin.signOut(i,e);if(t&&!(hn(t)&&(t.status===404||t.status===401||t.status===403)||gn(t)))return this._returnResult({error:t})}return e!==`others`&&(await this._removeSession(),await K(this.storage,`${this.storageKey}-code-verifier`)),this._returnResult({error:null})})}onAuthStateChange(e){let t=zn(),n={id:t,callback:e,unsubscribe:()=>{this._debug(`#unsubscribe()`,`state change callback with id removed`,t),this.stateChangeEmitters.delete(t)}};return this._debug(`#onAuthStateChange()`,`registered callback with id`,t),this.stateChangeEmitters.set(t,n),(async()=>{await this.initializePromise,await this._acquireLock(this.lockAcquireTimeout,async()=>{this._emitInitialSession(t)})})(),{data:{subscription:n}}}async _emitInitialSession(e){return await this._useSession(async t=>{try{let{data:{session:n},error:r}=t;if(r)throw r;await this.stateChangeEmitters.get(e)?.callback(`INITIAL_SESSION`,n),this._debug(`INITIAL_SESSION`,`callback id`,e,`session`,n)}catch(t){await this.stateChangeEmitters.get(e)?.callback(`INITIAL_SESSION`,null),this._debug(`INITIAL_SESSION`,`callback id`,e,`error`,t),gn(t)?console.warn(t):console.error(t)}})}async resetPasswordForEmail(e,t={}){let n=null,r=null;this.flowType===`pkce`&&([n,r]=await Qn(this.storage,this.storageKey,!0));try{return await J(this.fetch,`POST`,`${this.url}/recover`,{body:{email:e,code_challenge:n,code_challenge_method:r,gotrue_meta_security:{captcha_token:t.captchaToken}},headers:this.headers,redirectTo:t.redirectTo})}catch(e){if(await K(this.storage,`${this.storageKey}-code-verifier`),F(e))return this._returnResult({data:null,error:e});throw e}}async getUserIdentities(){try{let{data:e,error:t}=await this.getUser();if(t)throw t;return this._returnResult({data:{identities:e.user.identities??[]},error:null})}catch(e){if(F(e))return this._returnResult({data:null,error:e});throw e}}async linkIdentity(e){return`token`in e?this.linkIdentityIdToken(e):this.linkIdentityOAuth(e)}async linkIdentityOAuth(e){try{let{data:t,error:n}=await this._useSession(async t=>{let{data:n,error:r}=t;if(r)throw r;let i=await this._getUrlForProvider(`${this.url}/user/identities/authorize`,e.provider,{redirectTo:e.options?.redirectTo,scopes:e.options?.scopes,queryParams:e.options?.queryParams,skipBrowserRedirect:!0});return await J(this.fetch,`GET`,i,{headers:this.headers,jwt:n.session?.access_token??void 0})});if(n)throw n;return H()&&!e.options?.skipBrowserRedirect&&window.location.assign(t?.url),this._returnResult({data:{provider:e.provider,url:t?.url},error:null})}catch(t){if(F(t))return this._returnResult({data:{provider:e.provider,url:null},error:t});throw t}}async linkIdentityIdToken(e){return await this._useSession(async t=>{try{let{error:n,data:{session:r}}=t;if(n)throw n;let{options:i,provider:a,token:o,access_token:s,nonce:c}=e,{data:l,error:u}=await J(this.fetch,`POST`,`${this.url}/token?grant_type=id_token`,{headers:this.headers,jwt:r?.access_token??void 0,body:{provider:a,id_token:o,access_token:s,nonce:c,link_identity:!0,gotrue_meta_security:{captcha_token:i?.captchaToken}},xform:Y});return u?this._returnResult({data:{user:null,session:null},error:u}):!l||!l.session||!l.user?this._returnResult({data:{user:null,session:null},error:new z}):(l.session&&(await this._saveSession(l.session),await this._notifyAllSubscribers(`USER_UPDATED`,l.session)),this._returnResult({data:l,error:u}))}catch(e){if(await K(this.storage,`${this.storageKey}-code-verifier`),F(e))return this._returnResult({data:{user:null,session:null},error:e});throw e}})}async unlinkIdentity(e){try{return await this._useSession(async t=>{let{data:n,error:r}=t;if(r)throw r;return await J(this.fetch,`DELETE`,`${this.url}/user/identities/${e.identity_id}`,{headers:this.headers,jwt:n.session?.access_token??void 0})})}catch(e){if(F(e))return this._returnResult({data:null,error:e});throw e}}async _refreshAccessToken(e){let t=`#_refreshAccessToken(${e.substring(0,5)}...)`;this._debug(t,`begin`);try{let n=Date.now();return await qn(async n=>(n>0&&await Kn(200*2**(n-1)),this._debug(t,`refreshing attempt`,n),await J(this.fetch,`POST`,`${this.url}/token?grant_type=refresh_token`,{body:{refresh_token:e},headers:this.headers,xform:Y})),(e,t)=>{let r=200*2**e;return t&&wn(t)&&Date.now()+r-n<N})}catch(e){if(this._debug(t,`error`,e),F(e))return this._returnResult({data:{session:null,user:null},error:e});throw e}finally{this._debug(t,`end`)}}_isValidSession(e){return typeof e==`object`&&!!e&&`access_token`in e&&`refresh_token`in e&&`expires_at`in e}async _handleProviderSignIn(e,t){let n=await this._getUrlForProvider(`${this.url}/authorize`,e,{redirectTo:t.redirectTo,scopes:t.scopes,queryParams:t.queryParams});return this._debug(`#_handleProviderSignIn()`,`provider`,e,`options`,t,`url`,n),H()&&!t.skipBrowserRedirect&&window.location.assign(n),{data:{provider:e,url:n},error:null}}async _recoverAndRefresh(){let e=`#_recoverAndRefresh()`;this._debug(e,`begin`);try{let t=await G(this.storage,this.storageKey);if(t&&this.userStorage){let e=await G(this.userStorage,this.storageKey+`-user`);!this.storage.isServer&&Object.is(this.storage,this.userStorage)&&!e&&(e={user:t.user},await W(this.userStorage,this.storageKey+`-user`,e)),t.user=e?.user??ar()}else if(t&&!t.user&&!t.user){let e=await G(this.storage,this.storageKey+`-user`);e&&e?.user?(t.user=e.user,await K(this.storage,this.storageKey+`-user`),await W(this.storage,this.storageKey,t)):t.user=ar()}if(this._debug(e,`session from storage`,t),!this._isValidSession(t)){this._debug(e,`session is not valid`),t!==null&&await this._removeSession();return}let n=(t.expires_at??1/0)*1e3-Date.now()<ln;if(this._debug(e,`session has${n?``:` not`} expired with margin of ${ln}s`),n){if(this.autoRefreshToken&&t.refresh_token){let{error:n}=await this._callRefreshToken(t.refresh_token);n&&(console.error(n),wn(n)||(this._debug(e,`refresh failed with a non-retryable error, removing the session`,n),await this._removeSession()))}}else if(t.user&&t.user.__isUserNotAvailableProxy===!0)try{let{data:n,error:r}=await this._getUser(t.access_token);!r&&n?.user?(t.user=n.user,await this._saveSession(t),await this._notifyAllSubscribers(`SIGNED_IN`,t)):this._debug(e,`could not get user data, skipping SIGNED_IN notification`)}catch(t){console.error(`Error getting user data:`,t),this._debug(e,`error getting user data, skipping SIGNED_IN notification`,t)}else await this._notifyAllSubscribers(`SIGNED_IN`,t)}catch(t){this._debug(e,`error`,t),console.error(t);return}finally{this._debug(e,`end`)}}async _callRefreshToken(e){var t,n;if(!e)throw new R;if(this.refreshingDeferred)return this.refreshingDeferred.promise;let r=`#_callRefreshToken(${e.substring(0,5)}...)`;this._debug(r,`begin`);try{this.refreshingDeferred=new Wn;let{data:t,error:n}=await this._refreshAccessToken(e);if(n)throw n;if(!t.session)throw new R;await this._saveSession(t.session),await this._notifyAllSubscribers(`TOKEN_REFRESHED`,t.session);let r={data:t.session,error:null};return this.refreshingDeferred.resolve(r),r}catch(e){if(this._debug(r,`error`,e),F(e)){let n={data:null,error:e};return wn(e)||await this._removeSession(),(t=this.refreshingDeferred)==null||t.resolve(n),n}throw(n=this.refreshingDeferred)==null||n.reject(e),e}finally{this.refreshingDeferred=null,this._debug(r,`end`)}}async _notifyAllSubscribers(e,t,n=!0){let r=`#_notifyAllSubscribers(${e})`;this._debug(r,`begin`,t,`broadcast = ${n}`);try{this.broadcastChannel&&n&&this.broadcastChannel.postMessage({event:e,session:t});let r=[],i=Array.from(this.stateChangeEmitters.values()).map(async n=>{try{await n.callback(e,t)}catch(e){r.push(e)}});if(await Promise.all(i),r.length>0){for(let e=0;e<r.length;e+=1)console.error(r[e]);throw r[0]}}finally{this._debug(r,`end`)}}async _saveSession(e){this._debug(`#_saveSession()`,e),this.suppressGetSessionWarning=!0,await K(this.storage,`${this.storageKey}-code-verifier`);let t=Object.assign({},e),n=t.user&&t.user.__isUserNotAvailableProxy===!0;if(this.userStorage){!n&&t.user&&await W(this.userStorage,this.storageKey+`-user`,{user:t.user});let e=Object.assign({},t);delete e.user;let r=sr(e);await W(this.storage,this.storageKey,r)}else{let e=sr(t);await W(this.storage,this.storageKey,e)}}async _removeSession(){this._debug(`#_removeSession()`),this.suppressGetSessionWarning=!1,await K(this.storage,this.storageKey),await K(this.storage,this.storageKey+`-code-verifier`),await K(this.storage,this.storageKey+`-user`),this.userStorage&&await K(this.userStorage,this.storageKey+`-user`),await this._notifyAllSubscribers(`SIGNED_OUT`,null)}_removeVisibilityChangedCallback(){this._debug(`#_removeVisibilityChangedCallback()`);let e=this.visibilityChangedCallback;this.visibilityChangedCallback=null;try{e&&H()&&window!=null&&window.removeEventListener&&window.removeEventListener(`visibilitychange`,e)}catch(e){console.error(`removing visibilitychange callback failed`,e)}}async _startAutoRefresh(){await this._stopAutoRefresh(),this._debug(`#_startAutoRefresh()`);let e=setInterval(()=>this._autoRefreshTokenTick(),N);this.autoRefreshTicker=e,e&&typeof e==`object`&&typeof e.unref==`function`?e.unref():typeof Deno<`u`&&typeof Deno.unrefTimer==`function`&&Deno.unrefTimer(e);let t=setTimeout(async()=>{await this.initializePromise,await this._autoRefreshTokenTick()},0);this.autoRefreshTickTimeout=t,t&&typeof t==`object`&&typeof t.unref==`function`?t.unref():typeof Deno<`u`&&typeof Deno.unrefTimer==`function`&&Deno.unrefTimer(t)}async _stopAutoRefresh(){this._debug(`#_stopAutoRefresh()`);let e=this.autoRefreshTicker;this.autoRefreshTicker=null,e&&clearInterval(e);let t=this.autoRefreshTickTimeout;this.autoRefreshTickTimeout=null,t&&clearTimeout(t)}async startAutoRefresh(){this._removeVisibilityChangedCallback(),await this._startAutoRefresh()}async stopAutoRefresh(){this._removeVisibilityChangedCallback(),await this._stopAutoRefresh()}async _autoRefreshTokenTick(){this._debug(`#_autoRefreshTokenTick()`,`begin`);try{await this._acquireLock(0,async()=>{try{let e=Date.now();try{return await this._useSession(async t=>{let{data:{session:n}}=t;if(!n||!n.refresh_token||!n.expires_at){this._debug(`#_autoRefreshTokenTick()`,`no session`);return}let r=Math.floor((n.expires_at*1e3-e)/N);this._debug(`#_autoRefreshTokenTick()`,`access token expires in ${r} ticks, a tick lasts ${N}ms, refresh threshold is 3 ticks`),r<=3&&await this._callRefreshToken(n.refresh_token)})}catch(e){console.error(`Auto refresh tick failed with error. This is likely a transient error.`,e)}}finally{this._debug(`#_autoRefreshTokenTick()`,`end`)}})}catch(e){if(e.isAcquireTimeout||e instanceof br)this._debug(`auto refresh token tick lock not available`);else throw e}}async _handleVisibilityChange(){if(this._debug(`#_handleVisibilityChange()`),!H()||!(window!=null&&window.addEventListener))return this.autoRefreshToken&&this.startAutoRefresh(),!1;try{this.visibilityChangedCallback=async()=>{try{await this._onVisibilityChanged(!1)}catch(e){this._debug(`#visibilityChangedCallback`,`error`,e)}},window==null||window.addEventListener(`visibilitychange`,this.visibilityChangedCallback),await this._onVisibilityChanged(!0)}catch(e){console.error(`_handleVisibilityChange`,e)}}async _onVisibilityChanged(e){let t=`#_onVisibilityChanged(${e})`;this._debug(t,`visibilityState`,document.visibilityState),document.visibilityState===`visible`?(this.autoRefreshToken&&this._startAutoRefresh(),e||(await this.initializePromise,await this._acquireLock(this.lockAcquireTimeout,async()=>{if(document.visibilityState!==`visible`){this._debug(t,`acquired the lock to recover the session, but the browser visibilityState is no longer visible, aborting`);return}await this._recoverAndRefresh()}))):document.visibilityState===`hidden`&&this.autoRefreshToken&&this._stopAutoRefresh()}async _getUrlForProvider(e,t,n){let r=[`provider=${encodeURIComponent(t)}`];if(n?.redirectTo&&r.push(`redirect_to=${encodeURIComponent(n.redirectTo)}`),n?.scopes&&r.push(`scopes=${encodeURIComponent(n.scopes)}`),this.flowType===`pkce`){let[e,t]=await Qn(this.storage,this.storageKey),n=new URLSearchParams({code_challenge:`${encodeURIComponent(e)}`,code_challenge_method:`${encodeURIComponent(t)}`});r.push(n.toString())}if(n?.queryParams){let e=new URLSearchParams(n.queryParams);r.push(e.toString())}return n?.skipBrowserRedirect&&r.push(`skip_http_redirect=${n.skipBrowserRedirect}`),`${e}?${r.join(`&`)}`}async _unenroll(e){try{return await this._useSession(async t=>{let{data:n,error:r}=t;return r?this._returnResult({data:null,error:r}):await J(this.fetch,`DELETE`,`${this.url}/factors/${e.factorId}`,{headers:this.headers,jwt:n?.session?.access_token})})}catch(e){if(F(e))return this._returnResult({data:null,error:e});throw e}}async _enroll(e){try{return await this._useSession(async t=>{let{data:n,error:r}=t;if(r)return this._returnResult({data:null,error:r});let i=Object.assign({friendly_name:e.friendlyName,factor_type:e.factorType},e.factorType===`phone`?{phone:e.phone}:e.factorType===`totp`?{issuer:e.issuer}:{}),{data:a,error:o}=await J(this.fetch,`POST`,`${this.url}/factors`,{body:i,headers:this.headers,jwt:n?.session?.access_token});return o?this._returnResult({data:null,error:o}):(e.factorType===`totp`&&a.type===`totp`&&a?.totp?.qr_code&&(a.totp.qr_code=`data:image/svg+xml;utf-8,${a.totp.qr_code}`),this._returnResult({data:a,error:null}))})}catch(e){if(F(e))return this._returnResult({data:null,error:e});throw e}}async _verify(e){return this._acquireLock(this.lockAcquireTimeout,async()=>{try{return await this._useSession(async t=>{let{data:n,error:r}=t;if(r)return this._returnResult({data:null,error:r});let i=Object.assign({challenge_id:e.challengeId},`webauthn`in e?{webauthn:Object.assign(Object.assign({},e.webauthn),{credential_response:e.webauthn.type===`create`?Lr(e.webauthn.credential_response):Rr(e.webauthn.credential_response)})}:{code:e.code}),{data:a,error:o}=await J(this.fetch,`POST`,`${this.url}/factors/${e.factorId}/verify`,{body:i,headers:this.headers,jwt:n?.session?.access_token});return o?this._returnResult({data:null,error:o}):(await this._saveSession(Object.assign({expires_at:Math.round(Date.now()/1e3)+a.expires_in},a)),await this._notifyAllSubscribers(`MFA_CHALLENGE_VERIFIED`,a),this._returnResult({data:a,error:o}))})}catch(e){if(F(e))return this._returnResult({data:null,error:e});throw e}})}async _challenge(e){return this._acquireLock(this.lockAcquireTimeout,async()=>{try{return await this._useSession(async t=>{let{data:n,error:r}=t;if(r)return this._returnResult({data:null,error:r});let i=await J(this.fetch,`POST`,`${this.url}/factors/${e.factorId}/challenge`,{body:e,headers:this.headers,jwt:n?.session?.access_token});if(i.error)return i;let{data:a}=i;if(a.type!==`webauthn`)return{data:a,error:null};switch(a.webauthn.type){case`create`:return{data:Object.assign(Object.assign({},a),{webauthn:Object.assign(Object.assign({},a.webauthn),{credential_options:Object.assign(Object.assign({},a.webauthn.credential_options),{publicKey:Fr(a.webauthn.credential_options.publicKey)})})}),error:null};case`request`:return{data:Object.assign(Object.assign({},a),{webauthn:Object.assign(Object.assign({},a.webauthn),{credential_options:Object.assign(Object.assign({},a.webauthn.credential_options),{publicKey:Ir(a.webauthn.credential_options.publicKey)})})}),error:null}}})}catch(e){if(F(e))return this._returnResult({data:null,error:e});throw e}})}async _challengeAndVerify(e){let{data:t,error:n}=await this._challenge({factorId:e.factorId});return n?this._returnResult({data:null,error:n}):await this._verify({factorId:e.factorId,challengeId:t.id,code:e.code})}async _listFactors(){let{data:{user:e},error:t}=await this.getUser();if(t)return{data:null,error:t};let n={all:[],phone:[],totp:[],webauthn:[]};for(let t of e?.factors??[])n.all.push(t),t.status===`verified`&&n[t.factor_type].push(t);return{data:n,error:null}}async _getAuthenticatorAssuranceLevel(e){if(e)try{let{payload:t}=Gn(e),n=null;t.aal&&(n=t.aal);let r=n,{data:{user:i},error:a}=await this.getUser(e);if(a)return this._returnResult({data:null,error:a});((i?.factors)?.filter(e=>e.status===`verified`)??[]).length>0&&(r=`aal2`);let o=t.amr||[];return{data:{currentLevel:n,nextLevel:r,currentAuthenticationMethods:o},error:null}}catch(e){if(F(e))return this._returnResult({data:null,error:e});throw e}let{data:{session:t},error:n}=await this.getSession();if(n)return this._returnResult({data:null,error:n});if(!t)return{data:{currentLevel:null,nextLevel:null,currentAuthenticationMethods:[]},error:null};let{payload:r}=Gn(t.access_token),i=null;r.aal&&(i=r.aal);let a=i;(t.user.factors?.filter(e=>e.status===`verified`)??[]).length>0&&(a=`aal2`);let o=r.amr||[];return{data:{currentLevel:i,nextLevel:a,currentAuthenticationMethods:o},error:null}}async _getAuthorizationDetails(e){try{return await this._useSession(async t=>{let{data:{session:n},error:r}=t;return r?this._returnResult({data:null,error:r}):n?await J(this.fetch,`GET`,`${this.url}/oauth/authorizations/${e}`,{headers:this.headers,jwt:n.access_token,xform:e=>({data:e,error:null})}):this._returnResult({data:null,error:new R})})}catch(e){if(F(e))return this._returnResult({data:null,error:e});throw e}}async _approveAuthorization(e,t){try{return await this._useSession(async n=>{let{data:{session:r},error:i}=n;if(i)return this._returnResult({data:null,error:i});if(!r)return this._returnResult({data:null,error:new R});let a=await J(this.fetch,`POST`,`${this.url}/oauth/authorizations/${e}/consent`,{headers:this.headers,jwt:r.access_token,body:{action:`approve`},xform:e=>({data:e,error:null})});return a.data&&a.data.redirect_url&&H()&&!t?.skipBrowserRedirect&&window.location.assign(a.data.redirect_url),a})}catch(e){if(F(e))return this._returnResult({data:null,error:e});throw e}}async _denyAuthorization(e,t){try{return await this._useSession(async n=>{let{data:{session:r},error:i}=n;if(i)return this._returnResult({data:null,error:i});if(!r)return this._returnResult({data:null,error:new R});let a=await J(this.fetch,`POST`,`${this.url}/oauth/authorizations/${e}/consent`,{headers:this.headers,jwt:r.access_token,body:{action:`deny`},xform:e=>({data:e,error:null})});return a.data&&a.data.redirect_url&&H()&&!t?.skipBrowserRedirect&&window.location.assign(a.data.redirect_url),a})}catch(e){if(F(e))return this._returnResult({data:null,error:e});throw e}}async _listOAuthGrants(){try{return await this._useSession(async e=>{let{data:{session:t},error:n}=e;return n?this._returnResult({data:null,error:n}):t?await J(this.fetch,`GET`,`${this.url}/user/oauth/grants`,{headers:this.headers,jwt:t.access_token,xform:e=>({data:e,error:null})}):this._returnResult({data:null,error:new R})})}catch(e){if(F(e))return this._returnResult({data:null,error:e});throw e}}async _revokeOAuthGrant(e){try{return await this._useSession(async t=>{let{data:{session:n},error:r}=t;return r?this._returnResult({data:null,error:r}):n?(await J(this.fetch,`DELETE`,`${this.url}/user/oauth/grants`,{headers:this.headers,jwt:n.access_token,query:{client_id:e.clientId},noResolveJson:!0}),{data:{},error:null}):this._returnResult({data:null,error:new R})})}catch(e){if(F(e))return this._returnResult({data:null,error:e});throw e}}async fetchJwk(e,t={keys:[]}){let n=t.keys.find(t=>t.kid===e);if(n)return n;let r=Date.now();if(n=this.jwks.keys.find(t=>t.kid===e),n&&this.jwks_cached_at+6e5>r)return n;let{data:i,error:a}=await J(this.fetch,`GET`,`${this.url}/.well-known/jwks.json`,{headers:this.headers});if(a)throw a;return!i.keys||i.keys.length===0||(this.jwks=i,this.jwks_cached_at=r,n=i.keys.find(t=>t.kid===e),!n)?null:n}async getClaims(e,t={}){try{let n=e;if(!n){let{data:e,error:t}=await this.getSession();if(t||!e.session)return this._returnResult({data:null,error:t});n=e.session.access_token}let{header:r,payload:i,signature:a,raw:{header:o,payload:s}}=Gn(n);t?.allowExpired||tr(i.exp);let c=!r.alg||r.alg.startsWith(`HS`)||!r.kid||!(`crypto`in globalThis&&`subtle`in globalThis.crypto)?null:await this.fetchJwk(r.kid,t?.keys?{keys:t.keys}:t?.jwks);if(!c){let{error:e}=await this.getUser(n);if(e)throw e;return{data:{claims:i,header:r,signature:a},error:null}}let l=nr(r.alg),u=await crypto.subtle.importKey(`jwk`,c,l,!0,[`verify`]);if(!await crypto.subtle.verify(l,u,a,Ln(`${o}.${s}`)))throw new Dn(`Invalid JWT signature`);return{data:{claims:i,header:r,signature:a},error:null}}catch(e){if(F(e))return this._returnResult({data:null,error:e});throw e}}};Zr.nextInstanceID={};var Qr=Zr,$r=vr,ei=Qr,ti=class extends ei{constructor(e){super(e)}},ni=class{constructor(e,t,n){this.supabaseUrl=e,this.supabaseKey=t;let r=sn(e);if(!t)throw Error(`supabaseKey is required.`);this.realtimeUrl=new URL(`realtime/v1`,r),this.realtimeUrl.protocol=this.realtimeUrl.protocol.replace(`http`,`ws`),this.authUrl=new URL(`auth/v1`,r),this.storageUrl=new URL(`storage/v1`,r),this.functionsUrl=new URL(`functions/v1`,r);let i=`sb-${r.hostname.split(`.`)[0]}-auth-token`,a={db:Qt,realtime:en,auth:{...$t,storageKey:i},global:Zt},o=on(n??{},a);this.storageKey=o.auth.storageKey??``,this.headers=o.global.headers??{},o.accessToken?(this.accessToken=o.accessToken,this.auth=new Proxy({},{get:(e,t)=>{throw Error(`@supabase/supabase-js: Supabase Client is configured with the accessToken option, accessing supabase.auth.${String(t)} is not possible`)}})):this.auth=this._initSupabaseAuthClient(o.auth??{},this.headers,o.global.fetch),this.fetch=rn(t,this._getAccessToken.bind(this),o.global.fetch),this.realtime=this._initRealtimeClient({headers:this.headers,accessToken:this._getAccessToken.bind(this),...o.realtime}),this.accessToken&&Promise.resolve(this.accessToken()).then(e=>this.realtime.setAuth(e)).catch(e=>console.warn(`Failed to set initial Realtime auth token:`,e)),this.rest=new le(new URL(`rest/v1`,r).href,{headers:this.headers,schema:o.db.schema,fetch:this.fetch,timeout:o.db.timeout,urlLengthLimit:o.db.urlLengthLimit}),this.storage=new Yt(this.storageUrl.href,this.headers,this.fetch,n?.storage),o.accessToken||this._listenForAuthEvents()}get functions(){return new l(this.functionsUrl.href,{headers:this.headers,customFetch:this.fetch})}from(e){return this.rest.from(e)}schema(e){return this.rest.schema(e)}rpc(e,t={},n={head:!1,get:!1,count:void 0}){return this.rest.rpc(e,t,n)}channel(e,t={config:{}}){return this.realtime.channel(e,t)}getChannels(){return this.realtime.getChannels()}removeChannel(e){return this.realtime.removeChannel(e)}removeAllChannels(){return this.realtime.removeAllChannels()}async _getAccessToken(){if(this.accessToken)return await this.accessToken();let{data:e}=await this.auth.getSession();return e.session?.access_token??this.supabaseKey}_initSupabaseAuthClient({autoRefreshToken:e,persistSession:t,detectSessionInUrl:n,storage:r,userStorage:i,storageKey:a,flowType:o,lock:s,debug:c,throwOnError:l},u,d){let f={Authorization:`Bearer ${this.supabaseKey}`,apikey:`${this.supabaseKey}`};return new ti({url:this.authUrl.href,headers:{...f,...u},storageKey:a,autoRefreshToken:e,persistSession:t,detectSessionInUrl:n,storage:r,userStorage:i,flowType:o,lock:s,debug:c,throwOnError:l,fetch:d,hasCustomAuthorizationHeader:Object.keys(this.headers).some(e=>e.toLowerCase()===`authorization`)})}_initRealtimeClient(e){return new tt(this.realtimeUrl.href,{...e,params:{apikey:this.supabaseKey,...e?.params}})}_listenForAuthEvents(){return this.auth.onAuthStateChange((e,t)=>{this._handleTokenChanged(e,`CLIENT`,t?.access_token)})}_handleTokenChanged(e,t,n){(e===`TOKEN_REFRESHED`||e===`SIGNED_IN`)&&this.changedAccessToken!==n?(this.changedAccessToken=n,this.realtime.setAuth(n)):e===`SIGNED_OUT`&&(this.realtime.setAuth(),t==`STORAGE`&&this.auth.signOut(),this.changedAccessToken=void 0)}};let ri=(e,t,n)=>new ni(e,t,n);function ii(){if(typeof window<`u`)return!1;let e=globalThis.process;if(!e)return!1;let t=e.version;if(t==null)return!1;let n=t.match(/^v(\d+)\./);return n?parseInt(n[1],10)<=18:!1}return ii()&&console.warn(`?좑툘  Node.js 18 and below are deprecated and will no longer be supported in future versions of @supabase/supabase-js. Please upgrade to Node.js 20 or later. For more information, visit: https://github.com/orgs/supabase/discussions/37217`),e.AuthAdminApi=$r,e.AuthApiError=mn,e.AuthClient=ei,e.AuthError=P,e.AuthImplicitGrantRedirectError=vn,e.AuthInvalidCredentialsError=_n,e.AuthInvalidJwtError=Dn,e.AuthInvalidTokenResponseError=z,e.AuthPKCECodeVerifierMissingError=xn,e.AuthPKCEGrantCodeExchangeError=bn,e.AuthRetryableFetchError=Cn,e.AuthSessionMissingError=R,e.AuthUnknownError=I,e.AuthWeakPasswordError=Tn,e.CustomAuthError=L,Object.defineProperty(e,`FunctionRegion`,{enumerable:!0,get:function(){return c}}),e.FunctionsError=i,e.FunctionsFetchError=a,e.FunctionsHttpError=s,e.FunctionsRelayError=o,e.GoTrueAdminApi=vr,e.GoTrueClient=Qr,e.NavigatorLockAcquireTimeoutError=xr,e.PostgrestError=p,e.REALTIME_CHANNEL_STATES=Xe,Object.defineProperty(e,`REALTIME_LISTEN_TYPES`,{enumerable:!0,get:function(){return E}}),Object.defineProperty(e,`REALTIME_POSTGRES_CHANGES_LISTEN_EVENT`,{enumerable:!0,get:function(){return Ye}}),Object.defineProperty(e,`REALTIME_PRESENCE_LISTEN_EVENTS`,{enumerable:!0,get:function(){return Ge}}),Object.defineProperty(e,`REALTIME_SUBSCRIBE_STATES`,{enumerable:!0,get:function(){return D}}),e.RealtimeChannel=Ze,e.RealtimeClient=tt,e.RealtimePresence=Ke,e.SIGN_OUT_SCOPES=_r,e.StorageApiError=_t,e.SupabaseClient=ni,e.WebSocketFactory=ue,e.createClient=ri,e.isAuthApiError=hn,e.isAuthError=F,e.isAuthImplicitGrantRedirectError=yn,e.isAuthPKCECodeVerifierMissingError=Sn,e.isAuthRetryableFetchError=wn,e.isAuthSessionMissingError=gn,e.isAuthWeakPasswordError=En,e.lockInternals=Z,e.navigatorLock=Cr,e.processLock=Tr,e})({});
node_modules/@supabase/supabase-js\src\SupabaseClient.ts:551:      flowType,
node_modules/@supabase/supabase-js\src\SupabaseClient.ts:572:      flowType,
node_modules/@supabase/supabase-js\src\lib\constants.ts:32:  flowType: 'implicit',
node_modules/@supabase/supabase-js\src\lib\types.ts:111:    flowType?: SupabaseAuthClientOptions['flowType']
rg: node_modules/@supabase/auth-js: 吏?뺣맂 ?뚯씪??李얠쓣 ???놁뒿?덈떎. (os error 2)

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-ChildItem -Directory -Recurse -LiteralPath 'node_modules/.pnpm' -Filter 'auth-js*' | Select-Object -First 10 -ExpandProperty FullName" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-ChildItem -LiteralPath 'node_modules/.pnpm' -Directory | Where-Object { "'$_.Name -like '"'@supabase+auth-js*' } | Select-Object -ExpandProperty FullName" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'node_modules/@supabase/ssr/src/cookies.ts' | ForEach-Object { "'$i++; if (($i -ge 216 -and $i -le 268) -or ($i -ge 318 -and $i -le 380) -or ($i -ge 472 -and $i -le 505)) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'node_modules/@supabase/ssr/src/utils/constants.ts' | ForEach-Object { "'$i++; '"'{0,4}: {1}' -f "'$i, $_ }' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 390ms:
   1: import { CookieOptions } from "../types";
   2: 
   3: export const DEFAULT_COOKIE_OPTIONS: CookieOptions = {
   4:   path: "/",
   5:   sameSite: "lax",
   6:   httpOnly: false,
   7:   // https://developer.chrome.com/blog/cookie-max-age-expires
   8:   // https://httpwg.org/http-extensions/draft-ietf-httpbis-rfc6265bis.html#name-cookie-lifetime-limits
   9:   maxAge: 400 * 24 * 60 * 60,
  10: };

 succeeded in 406ms:
 216:         setItem: async (key: string, value: string) => {
 217:           const allCookies = await getAll([key]);
 218:           const cookieNames = allCookies?.map(({ name }) => name) || [];
 219: 
 220:           const removeCookies = new Set(
 221:             cookieNames.filter((name) => isChunkLike(name, key)),
 222:           );
 223: 
 224:           let encoded = value;
 225: 
 226:           if (cookieEncoding === "base64url") {
 227:             encoded = BASE64_PREFIX + stringToBase64URL(value);
 228:           }
 229: 
 230:           const setCookies = createChunks(key, encoded);
 231: 
 232:           setCookies.forEach(({ name }) => {
 233:             removeCookies.delete(name);
 234:           });
 235: 
 236:           const removeCookieOptions = {
 237:             ...DEFAULT_COOKIE_OPTIONS,
 238:             ...options?.cookieOptions,
 239:             maxAge: 0,
 240:           };
 241:           const setCookieOptions = {
 242:             ...DEFAULT_COOKIE_OPTIONS,
 243:             ...options?.cookieOptions,
 244:             maxAge: DEFAULT_COOKIE_OPTIONS.maxAge,
 245:           };
 246: 
 247:           // the NextJS cookieStore API can get confused if the `name` from
 248:           // options.cookieOptions leaks
 249:           delete removeCookieOptions.name;
 250:           delete setCookieOptions.name;
 251: 
 252:           const allToSet = [
 253:             ...[...removeCookies].map((name) => ({
 254:               name,
 255:               value: "",
 256:               options: removeCookieOptions,
 257:             })),
 258:             ...setCookies.map(({ name, value }) => ({
 259:               name,
 260:               value,
 261:               options: setCookieOptions,
 262:             })),
 263:           ];
 264: 
 265:           if (allToSet.length > 0) {
 266:             await setAll(allToSet, {});
 267:           }
 268:         },
 318:       getItem: async (key: string) => {
 319:         if (typeof setItems[key] === "string") {
 320:           return setItems[key];
 321:         }
 322: 
 323:         if (removedItems[key]) {
 324:           return null;
 325:         }
 326: 
 327:         const allCookies = await getAll([key]);
 328:         const chunkedCookie = await combineChunks(
 329:           key,
 330:           async (chunkName: string) => {
 331:             const cookie =
 332:               allCookies?.find(({ name }) => name === chunkName) || null;
 333: 
 334:             if (!cookie) {
 335:               return null;
 336:             }
 337: 
 338:             return cookie.value;
 339:           },
 340:         );
 341: 
 342:         if (!chunkedCookie) {
 343:           return null;
 344:         }
 345: 
 346:         let decoded = chunkedCookie;
 347: 
 348:         if (
 349:           typeof chunkedCookie === "string" &&
 350:           chunkedCookie.startsWith(BASE64_PREFIX)
 351:         ) {
 352:           decoded = stringFromBase64URL(
 353:             chunkedCookie.substring(BASE64_PREFIX.length),
 354:           );
 355:         }
 356: 
 357:         return decoded;
 358:       },
 359:       setItem: async (key: string, value: string) => {
 360:         // We don't have an `onAuthStateChange` event that can let us know that
 361:         // the PKCE code verifier is being set. Therefore, if we see it being
 362:         // set, we need to apply the storage (call `setAll` so the cookie is
 363:         // set properly).
 364:         if (key.endsWith("-code-verifier")) {
 365:           await applyServerStorage(
 366:             {
 367:               getAll,
 368:               setAll,
 369:               // pretend only that the code verifier was set
 370:               setItems: { [key]: value },
 371:               // pretend that nothing was removed
 372:               removedItems: {},
 373:             },
 374:             {
 375:               cookieOptions: options?.cookieOptions ?? null,
 376:               cookieEncoding,
 377:             },
 378:           );
 379:         }
 380: 
 472:   await setAll(
 473:     [
 474:       ...removeCookies.map((name) => ({
 475:         name,
 476:         value: "",
 477:         options: removeCookieOptions,
 478:       })),
 479:       ...setCookies.map(({ name, value }) => ({
 480:         name,
 481:         value,
 482:         options: setCookieOptions,
 483:       })),
 484:     ],
 485:     {
 486:       "Cache-Control":
 487:         "private, no-cache, no-store, must-revalidate, max-age=0",
 488:       Expires: "0",
 489:       Pragma: "no-cache",
 490:     },
 491:   );
 492: }

 succeeded in 480ms:
C:\Users\yout4\yagi-studio\yagi-workshop\node_modules\.pnpm\@supabase+auth-js@2.104.0

 succeeded in 2469ms:
C:\Users\yout4\yagi-studio\yagi-workshop\node_modules\.pnpm\@supabase+auth-js@2.104.0\node_modules\@supabase\auth-js
C:\Users\yout4\yagi-studio\yagi-workshop\node_modules\.pnpm\@supabase+supabase-js@2.104.0\node_modules\@supabase\auth-js
C:\Users\yout4\yagi-studio\yagi-workshop\node_modules\.pnpm\node_modules\@supabase\auth-js

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$path='"'node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js'; rg -n \"code-verifier|code_verifier|verifyOtp|exchangeCodeForSession|flowType|TokenHash|token_hash\" "'$path -S' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'node_modules/@supabase/ssr/src/cookies.ts' | ForEach-Object { "'$i++; if ($i -ge 359 -and $i -le 420) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'node_modules/@supabase/ssr/src/types.ts' | ForEach-Object { "'$i++; if ($i -ge 1 -and $i -le 45) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 564ms:
   1: import type { SerializeOptions } from "cookie";
   2: 
   3: export type CookieOptions = Partial<SerializeOptions>;
   4: export type CookieOptionsWithName = { name?: string } & CookieOptions;
   5: 
   6: export type GetCookie = (
   7:   name: string,
   8: ) => Promise<string | null | undefined> | string | null | undefined;
   9: 
  10: export type SetCookie = (
  11:   name: string,
  12:   value: string,
  13:   options: CookieOptions,
  14: ) => Promise<void> | void;
  15: export type RemoveCookie = (
  16:   name: string,
  17:   options: CookieOptions,
  18: ) => Promise<void> | void;
  19: 
  20: export type GetAllCookies = () =>
  21:   | Promise<{ name: string; value: string }[] | null>
  22:   | { name: string; value: string }[]
  23:   | null;
  24: 
  25: export type SetAllCookies = (
  26:   cookies: { name: string; value: string; options: CookieOptions }[],
  27:   /**
  28:    * Headers that must be set on the HTTP response alongside the cookies.
  29:    * Responses that set auth cookies must not be cached by CDNs or
  30:    * reverse proxies, otherwise one user's session token can be served
  31:    * to a different user.
  32:    *
  33:    * The library passes the following headers when auth cookies are set:
  34:    * - `Cache-Control: private, no-cache, no-store, must-revalidate, max-age=0`
  35:    * - `Expires: 0`
  36:    * - `Pragma: no-cache`
  37:    *
  38:    * @example
  39:    * ```ts
  40:    * // Next.js middleware
  41:    * setAll(cookiesToSet, headers) {
  42:    *   cookiesToSet.forEach(({ name, value, options }) =>
  43:    *     response.cookies.set(name, value, options)
  44:    *   )
  45:    *   Object.entries(headers).forEach(([key, value]) =>

 succeeded in 582ms:
 359:       setItem: async (key: string, value: string) => {
 360:         // We don't have an `onAuthStateChange` event that can let us know that
 361:         // the PKCE code verifier is being set. Therefore, if we see it being
 362:         // set, we need to apply the storage (call `setAll` so the cookie is
 363:         // set properly).
 364:         if (key.endsWith("-code-verifier")) {
 365:           await applyServerStorage(
 366:             {
 367:               getAll,
 368:               setAll,
 369:               // pretend only that the code verifier was set
 370:               setItems: { [key]: value },
 371:               // pretend that nothing was removed
 372:               removedItems: {},
 373:             },
 374:             {
 375:               cookieOptions: options?.cookieOptions ?? null,
 376:               cookieEncoding,
 377:             },
 378:           );
 379:         }
 380: 
 381:         setItems[key] = value;
 382:         delete removedItems[key];
 383:       },
 384:       removeItem: async (key: string) => {
 385:         // Intentionally not applying the storage when the key is the PKCE code
 386:         // verifier, as usually right after it's removed other items are set,
 387:         // so application of the storage will be handled by the
 388:         // `onAuthStateChange` callback that follows removal -- usually as part
 389:         // of the `exchangeCodeForSession` call.
 390:         delete setItems[key];
 391:         removedItems[key] = true;
 392:       },
 393:     },
 394:   };
 395: }
 396: 
 397: /**
 398:  * When createServerClient needs to apply the created storage to cookies, it
 399:  * should call this function which handles correcly setting cookies for stored
 400:  * and removed items in the storage.
 401:  */
 402: export async function applyServerStorage(
 403:   {
 404:     getAll,
 405:     setAll,
 406:     setItems,
 407:     removedItems,
 408:   }: {
 409:     getAll: (keyHints: string[]) => ReturnType<GetAllCookies>;
 410:     setAll: SetAllCookies;
 411:     setItems: { [name: string]: string };
 412:     removedItems: { [name: string]: boolean };
 413:   },
 414:   options: {
 415:     cookieEncoding: "raw" | "base64url";
 416:     cookieOptions?: CookieOptions | null;
 417:   },
 418: ) {
 419:   const cookieEncoding = options.cookieEncoding;
 420:   const cookieOptions = options.cookieOptions ?? null;

 succeeded in 731ms:
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\module\GoTrueClient.d.ts:28:    protected flowType: AuthFlowType;
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\module\GoTrueClient.d.ts:589:     * - Used when `flowType` is set to `pkce` in client options.
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\module\GoTrueClient.d.ts:593:     * supabase.auth.exchangeCodeForSession('34e770dd-9ff9-416c-87fa-43b31d7ef225')
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\module\GoTrueClient.d.ts:753:    exchangeCodeForSession(authCode: string): Promise<AuthTokenResponse>;
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\module\GoTrueClient.d.ts:857:    private _exchangeCodeForSession;
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\module\GoTrueClient.d.ts:1013:     * Log in a user given a User supplied OTP or TokenHash received through mobile or email.
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\module\GoTrueClient.d.ts:1018:     * - The `verifyOtp` method takes in different verification types.
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\module\GoTrueClient.d.ts:1027:     * - The verification type used should be determined based on the corresponding auth method called before `verifyOtp` to sign up / sign-in a user.
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\module\GoTrueClient.d.ts:1028:     * - The `TokenHash` is contained in the [email templates](/docs/guides/auth/auth-email-templates) and can be used to sign in.  You may wish to use the hash for the PKCE flow for Server Side Auth. Read [the Password-based Auth guide](/docs/guides/auth/passwords) for more details.
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\module\GoTrueClient.d.ts:1032:     * const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email'})
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\module\GoTrueClient.d.ts:1141:     * const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms'})
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\module\GoTrueClient.d.ts:1146:     * const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'email'})
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\module\GoTrueClient.d.ts:1149:    verifyOtp(params: VerifyOtpParams): Promise<AuthResponse>;
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\main\GoTrueClient.d.ts:28:    protected flowType: AuthFlowType;
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\main\GoTrueClient.d.ts:589:     * - Used when `flowType` is set to `pkce` in client options.
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\main\GoTrueClient.d.ts:593:     * supabase.auth.exchangeCodeForSession('34e770dd-9ff9-416c-87fa-43b31d7ef225')
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\main\GoTrueClient.d.ts:753:    exchangeCodeForSession(authCode: string): Promise<AuthTokenResponse>;
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\main\GoTrueClient.d.ts:857:    private _exchangeCodeForSession;
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\main\GoTrueClient.d.ts:1013:     * Log in a user given a User supplied OTP or TokenHash received through mobile or email.
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\main\GoTrueClient.d.ts:1018:     * - The `verifyOtp` method takes in different verification types.
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\main\GoTrueClient.d.ts:1027:     * - The verification type used should be determined based on the corresponding auth method called before `verifyOtp` to sign up / sign-in a user.
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\main\GoTrueClient.d.ts:1028:     * - The `TokenHash` is contained in the [email templates](/docs/guides/auth/auth-email-templates) and can be used to sign in.  You may wish to use the hash for the PKCE flow for Server Side Auth. Read [the Password-based Auth guide](/docs/guides/auth/passwords) for more details.
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\main\GoTrueClient.d.ts:1032:     * const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email'})
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\main\GoTrueClient.d.ts:1141:     * const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms'})
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\main\GoTrueClient.d.ts:1146:     * const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'email'})
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\main\GoTrueClient.d.ts:1149:    verifyOtp(params: VerifyOtpParams): Promise<AuthResponse>;
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\module\GoTrueClient.js:21:    flowType: 'implicit',
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\module\GoTrueClient.js:136:        this.flowType = settings.flowType;
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\module\GoTrueClient.js:622:                if (this.flowType === 'pkce') {
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\module\GoTrueClient.js:659:                await removeItemAsync(this.storage, `${this.storageKey}-code-verifier`);
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\module\GoTrueClient.js:671:            await removeItemAsync(this.storage, `${this.storageKey}-code-verifier`);
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\module\GoTrueClient.js:943:     * - Used when `flowType` is set to `pkce` in client options.
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\module\GoTrueClient.js:947:     * supabase.auth.exchangeCodeForSession('34e770dd-9ff9-416c-87fa-43b31d7ef225')
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\module\GoTrueClient.js:1107:    async exchangeCodeForSession(authCode) {
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\module\GoTrueClient.js:1110:            return this._exchangeCodeForSession(authCode);
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\module\GoTrueClient.js:1453:    async _exchangeCodeForSession(authCode) {
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\module\GoTrueClient.js:1454:        const storageItem = await getItemAsync(this.storage, `${this.storageKey}-code-verifier`);
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\module\GoTrueClient.js:1457:            if (!codeVerifier && this.flowType === 'pkce') {
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\module\GoTrueClient.js:1464:                    code_verifier: codeVerifier,
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\module\GoTrueClient.js:1468:            await removeItemAsync(this.storage, `${this.storageKey}-code-verifier`);
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\module\GoTrueClient.js:1486:            await removeItemAsync(this.storage, `${this.storageKey}-code-verifier`);
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\module\GoTrueClient.js:1690:                if (this.flowType === 'pkce') {
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\module\GoTrueClient.js:1728:            await removeItemAsync(this.storage, `${this.storageKey}-code-verifier`);
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\module\GoTrueClient.js:1736:     * Log in a user given a User supplied OTP or TokenHash received through mobile or email.
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\module\GoTrueClient.js:1741:     * - The `verifyOtp` method takes in different verification types.
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\module\GoTrueClient.js:1750:     * - The verification type used should be determined based on the corresponding auth method called before `verifyOtp` to sign up / sign-in a user.
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\module\GoTrueClient.js:1751:     * - The `TokenHash` is contained in the [email templates](/docs/guides/auth/auth-email-templates) and can be used to sign in.  You may wish to use the hash for the PKCE flow for Server Side Auth. Read [the Password-based Auth guide](/docs/guides/auth/passwords) for more details.
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\module\GoTrueClient.js:1755:     * const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email'})
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\module\GoTrueClient.js:1864:     * const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms'})
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\module\GoTrueClient.js:1869:     * const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'email'})
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\module\GoTrueClient.js:1872:    async verifyOtp(params) {
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\module\GoTrueClient.js:1967:            if (this.flowType === 'pkce') {
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\module\GoTrueClient.js:1985:            await removeItemAsync(this.storage, `${this.storageKey}-code-verifier`);
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\module\GoTrueClient.js:2497:                    await removeItemAsync(this.storage, `${this.storageKey}-code-verifier`);
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\module\GoTrueClient.js:2637:                if (this.flowType === 'pkce' && attributes.email != null) {
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\module\GoTrueClient.js:2658:            await removeItemAsync(this.storage, `${this.storageKey}-code-verifier`);
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\module\GoTrueClient.js:3022:            // Checks for mismatches between the flowType initialised in the client and the URL parameters
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\module\GoTrueClient.js:3025:                    if (this.flowType === 'pkce') {
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\module\GoTrueClient.js:3030:                    if (this.flowType === 'implicit') {
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\module\GoTrueClient.js:3042:                const { data, error } = await this._exchangeCodeForSession(params.code);
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\module\GoTrueClient.js:3113:        const currentStorageContent = await getItemAsync(this.storage, `${this.storageKey}-code-verifier`);
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\module\GoTrueClient.js:3174:                await removeItemAsync(this.storage, `${this.storageKey}-code-verifier`);
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\module\GoTrueClient.js:3478:        if (this.flowType === 'pkce') {
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\module\GoTrueClient.js:3496:            await removeItemAsync(this.storage, `${this.storageKey}-code-verifier`);
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\module\GoTrueClient.js:3665:                await removeItemAsync(this.storage, `${this.storageKey}-code-verifier`);
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\module\GoTrueClient.js:3953:        await removeItemAsync(this.storage, `${this.storageKey}-code-verifier`);
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\module\GoTrueClient.js:3989:        await removeItemAsync(this.storage, this.storageKey + '-code-verifier');
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\module\GoTrueClient.js:4279:        if (this.flowType === 'pkce') {
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\src\GoTrueClient.ts:173:  flowType: 'implicit',
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\src\GoTrueClient.ts:220:  protected flowType: AuthFlowType
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\src\GoTrueClient.ts:340:    this.flowType = settings.flowType
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\src\GoTrueClient.ts:860:        if (this.flowType === 'pkce') {
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\src\GoTrueClient.ts:901:        await removeItemAsync(this.storage, `${this.storageKey}-code-verifier`)
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\src\GoTrueClient.ts:915:      await removeItemAsync(this.storage, `${this.storageKey}-code-verifier`)
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\src\GoTrueClient.ts:1195:   * - Used when `flowType` is set to `pkce` in client options.
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\src\GoTrueClient.ts:1199:   * supabase.auth.exchangeCodeForSession('34e770dd-9ff9-416c-87fa-43b31d7ef225')
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\src\GoTrueClient.ts:1359:  async exchangeCodeForSession(authCode: string): Promise<AuthTokenResponse> {
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\src\GoTrueClient.ts:1363:      return this._exchangeCodeForSession(authCode)
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\src\GoTrueClient.ts:1797:  private async _exchangeCodeForSession(authCode: string): Promise<
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\src\GoTrueClient.ts:1804:    const storageItem = await getItemAsync(this.storage, `${this.storageKey}-code-verifier`)
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\src\GoTrueClient.ts:1808:      if (!codeVerifier && this.flowType === 'pkce') {
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\src\GoTrueClient.ts:1820:            code_verifier: codeVerifier,
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\src\GoTrueClient.ts:1825:      await removeItemAsync(this.storage, `${this.storageKey}-code-verifier`)
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\src\GoTrueClient.ts:1842:      await removeItemAsync(this.storage, `${this.storageKey}-code-verifier`)
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\src\GoTrueClient.ts:2047:        if (this.flowType === 'pkce') {
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\src\GoTrueClient.ts:2086:      await removeItemAsync(this.storage, `${this.storageKey}-code-verifier`)
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\src\GoTrueClient.ts:2096:   * Log in a user given a User supplied OTP or TokenHash received through mobile or email.
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\src\GoTrueClient.ts:2101:   * - The `verifyOtp` method takes in different verification types.
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\src\GoTrueClient.ts:2110:   * - The verification type used should be determined based on the corresponding auth method called before `verifyOtp` to sign up / sign-in a user.
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\src\GoTrueClient.ts:2111:   * - The `TokenHash` is contained in the [email templates](/docs/guides/auth/auth-email-templates) and can be used to sign in.  You may wish to use the hash for the PKCE flow for Server Side Auth. Read [the Password-based Auth guide](/docs/guides/auth/passwords) for more details.
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\src\GoTrueClient.ts:2115:   * const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email'})
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\src\GoTrueClient.ts:2224:   * const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms'})
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\src\GoTrueClient.ts:2229:   * const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'email'})
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\src\GoTrueClient.ts:2232:  async verifyOtp(params: VerifyOtpParams): Promise<AuthResponse> {
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\src\GoTrueClient.ts:2336:      if (this.flowType === 'pkce') {
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\src\GoTrueClient.ts:2366:      await removeItemAsync(this.storage, `${this.storageKey}-code-verifier`)
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\src\GoTrueClient.ts:2975:          await removeItemAsync(this.storage, `${this.storageKey}-code-verifier`)
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\src\GoTrueClient.ts:3130:        if (this.flowType === 'pkce' && attributes.email != null) {
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\src\GoTrueClient.ts:3157:      await removeItemAsync(this.storage, `${this.storageKey}-code-verifier`)
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\src\GoTrueClient.ts:3559:      // Checks for mismatches between the flowType initialised in the client and the URL parameters
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\src\GoTrueClient.ts:3562:          if (this.flowType === 'pkce') {
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\src\GoTrueClient.ts:3567:          if (this.flowType === 'implicit') {
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\src\GoTrueClient.ts:3579:        const { data, error } = await this._exchangeCodeForSession(params.code)
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\src\GoTrueClient.ts:3684:      `${this.storageKey}-code-verifier`
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\src\GoTrueClient.ts:3755:        await removeItemAsync(this.storage, `${this.storageKey}-code-verifier`)
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\src\GoTrueClient.ts:4110:    if (this.flowType === 'pkce') {
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\src\GoTrueClient.ts:4129:      await removeItemAsync(this.storage, `${this.storageKey}-code-verifier`)
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\src\GoTrueClient.ts:4323:        await removeItemAsync(this.storage, `${this.storageKey}-code-verifier`)
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\src\GoTrueClient.ts:4694:    await removeItemAsync(this.storage, `${this.storageKey}-code-verifier`)
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\src\GoTrueClient.ts:4735:    await removeItemAsync(this.storage, this.storageKey + '-code-verifier')
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\src\GoTrueClient.ts:5075:    if (this.flowType === 'pkce') {
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\src\lib\error-codes.ts:74:  | 'bad_code_verifier'
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\src\lib\errors.ts:269:      'pkce_code_verifier_not_found'
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\src\lib\helpers.ts:255:// Functions below taken from: https://stackoverflow.com/questions/63309409/creating-a-code-verifier-and-challenge-for-pkce-auth-on-spotify-api-in-reactjs
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\src\lib\helpers.ts:309:  await setItemAsync(storage, `${storageKey}-code-verifier`, storedCodeVerifier)
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\main\GoTrueClient.js:24:    flowType: 'implicit',
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\main\GoTrueClient.js:139:        this.flowType = settings.flowType;
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\main\GoTrueClient.js:625:                if (this.flowType === 'pkce') {
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\main\GoTrueClient.js:662:                await (0, helpers_1.removeItemAsync)(this.storage, `${this.storageKey}-code-verifier`);
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\main\GoTrueClient.js:674:            await (0, helpers_1.removeItemAsync)(this.storage, `${this.storageKey}-code-verifier`);
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\main\GoTrueClient.js:946:     * - Used when `flowType` is set to `pkce` in client options.
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\main\GoTrueClient.js:950:     * supabase.auth.exchangeCodeForSession('34e770dd-9ff9-416c-87fa-43b31d7ef225')
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\main\GoTrueClient.js:1110:    async exchangeCodeForSession(authCode) {
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\main\GoTrueClient.js:1113:            return this._exchangeCodeForSession(authCode);
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\main\GoTrueClient.js:1456:    async _exchangeCodeForSession(authCode) {
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\main\GoTrueClient.js:1457:        const storageItem = await (0, helpers_1.getItemAsync)(this.storage, `${this.storageKey}-code-verifier`);
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\main\GoTrueClient.js:1460:            if (!codeVerifier && this.flowType === 'pkce') {
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\main\GoTrueClient.js:1467:                    code_verifier: codeVerifier,
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\main\GoTrueClient.js:1471:            await (0, helpers_1.removeItemAsync)(this.storage, `${this.storageKey}-code-verifier`);
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\main\GoTrueClient.js:1489:            await (0, helpers_1.removeItemAsync)(this.storage, `${this.storageKey}-code-verifier`);
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\main\GoTrueClient.js:1693:                if (this.flowType === 'pkce') {
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\main\GoTrueClient.js:1731:            await (0, helpers_1.removeItemAsync)(this.storage, `${this.storageKey}-code-verifier`);
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\main\GoTrueClient.js:1739:     * Log in a user given a User supplied OTP or TokenHash received through mobile or email.
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\main\GoTrueClient.js:1744:     * - The `verifyOtp` method takes in different verification types.
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\main\GoTrueClient.js:1753:     * - The verification type used should be determined based on the corresponding auth method called before `verifyOtp` to sign up / sign-in a user.
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\main\GoTrueClient.js:1754:     * - The `TokenHash` is contained in the [email templates](/docs/guides/auth/auth-email-templates) and can be used to sign in.  You may wish to use the hash for the PKCE flow for Server Side Auth. Read [the Password-based Auth guide](/docs/guides/auth/passwords) for more details.
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\main\GoTrueClient.js:1758:     * const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email'})
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\main\GoTrueClient.js:1867:     * const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms'})
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\main\GoTrueClient.js:1872:     * const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'email'})
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\main\GoTrueClient.js:1875:    async verifyOtp(params) {
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\main\GoTrueClient.js:1970:            if (this.flowType === 'pkce') {
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\main\GoTrueClient.js:1988:            await (0, helpers_1.removeItemAsync)(this.storage, `${this.storageKey}-code-verifier`);
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\main\GoTrueClient.js:2500:                    await (0, helpers_1.removeItemAsync)(this.storage, `${this.storageKey}-code-verifier`);
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\main\GoTrueClient.js:2640:                if (this.flowType === 'pkce' && attributes.email != null) {
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\main\GoTrueClient.js:2661:            await (0, helpers_1.removeItemAsync)(this.storage, `${this.storageKey}-code-verifier`);
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\main\GoTrueClient.js:3025:            // Checks for mismatches between the flowType initialised in the client and the URL parameters
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\main\GoTrueClient.js:3028:                    if (this.flowType === 'pkce') {
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\main\GoTrueClient.js:3033:                    if (this.flowType === 'implicit') {
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\main\GoTrueClient.js:3045:                const { data, error } = await this._exchangeCodeForSession(params.code);
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\main\GoTrueClient.js:3116:        const currentStorageContent = await (0, helpers_1.getItemAsync)(this.storage, `${this.storageKey}-code-verifier`);
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\main\GoTrueClient.js:3177:                await (0, helpers_1.removeItemAsync)(this.storage, `${this.storageKey}-code-verifier`);
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\main\GoTrueClient.js:3481:        if (this.flowType === 'pkce') {
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\main\GoTrueClient.js:3499:            await (0, helpers_1.removeItemAsync)(this.storage, `${this.storageKey}-code-verifier`);
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\main\GoTrueClient.js:3668:                await (0, helpers_1.removeItemAsync)(this.storage, `${this.storageKey}-code-verifier`);
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\main\GoTrueClient.js:3956:        await (0, helpers_1.removeItemAsync)(this.storage, `${this.storageKey}-code-verifier`);
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\main\GoTrueClient.js:3992:        await (0, helpers_1.removeItemAsync)(this.storage, this.storageKey + '-code-verifier');
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\main\GoTrueClient.js:4282:        if (this.flowType === 'pkce') {
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\src\lib\types.ts:119:  flowType?: AuthFlowType
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\src\lib\types.ts:787:export type VerifyOtpParams = VerifyMobileOtpParams | VerifyEmailOtpParams | VerifyTokenHashParams
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\src\lib\types.ts:826:export interface VerifyTokenHashParams {
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\src\lib\types.ts:828:  token_hash: string
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\module\lib\error-codes.d.ts:6:export type ErrorCode = 'unexpected_failure' | 'validation_failed' | 'bad_json' | 'email_exists' | 'phone_exists' | 'bad_jwt' | 'not_admin' | 'no_authorization' | 'user_not_found' | 'session_not_found' | 'session_expired' | 'refresh_token_not_found' | 'refresh_token_already_used' | 'flow_state_not_found' | 'flow_state_expired' | 'signup_disabled' | 'user_banned' | 'provider_email_needs_verification' | 'invite_not_found' | 'bad_oauth_state' | 'bad_oauth_callback' | 'oauth_provider_not_supported' | 'unexpected_audience' | 'single_identity_not_deletable' | 'email_conflict_identity_not_deletable' | 'identity_already_exists' | 'email_provider_disabled' | 'phone_provider_disabled' | 'too_many_enrolled_mfa_factors' | 'mfa_factor_name_conflict' | 'mfa_factor_not_found' | 'mfa_ip_address_mismatch' | 'mfa_challenge_expired' | 'mfa_verification_failed' | 'mfa_verification_rejected' | 'insufficient_aal' | 'captcha_failed' | 'saml_provider_disabled' | 'manual_linking_disabled' | 'sms_send_failed' | 'email_not_confirmed' | 'phone_not_confirmed' | 'reauth_nonce_missing' | 'saml_relay_state_not_found' | 'saml_relay_state_expired' | 'saml_idp_not_found' | 'saml_assertion_no_user_id' | 'saml_assertion_no_email' | 'user_already_exists' | 'sso_provider_not_found' | 'saml_metadata_fetch_failed' | 'saml_idp_already_exists' | 'sso_domain_already_exists' | 'saml_entity_id_mismatch' | 'conflict' | 'provider_disabled' | 'user_sso_managed' | 'reauthentication_needed' | 'same_password' | 'reauthentication_not_valid' | 'otp_expired' | 'otp_disabled' | 'identity_not_found' | 'weak_password' | 'over_request_rate_limit' | 'over_email_send_rate_limit' | 'over_sms_send_rate_limit' | 'bad_code_verifier' | 'anonymous_provider_disabled' | 'hook_timeout' | 'hook_timeout_after_retry' | 'hook_payload_over_size_limit' | 'hook_payload_invalid_content_type' | 'request_timeout' | 'mfa_phone_enroll_not_enabled' | 'mfa_phone_verify_not_enabled' | 'mfa_totp_enroll_not_enabled' | 'mfa_totp_verify_not_enabled' | 'mfa_webauthn_enroll_not_enabled' | 'mfa_webauthn_verify_not_enabled' | 'mfa_verified_factor_exists' | 'invalid_credentials' | 'email_address_not_authorized' | 'email_address_invalid';
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\module\lib\errors.js:201:            'use @supabase/ssr on both the server and client to store the code verifier in cookies.', 'AuthPKCECodeVerifierMissingError', 400, 'pkce_code_verifier_not_found');
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\module\lib\helpers.js:200:// Functions below taken from: https://stackoverflow.com/questions/63309409/creating-a-code-verifier-and-challenge-for-pkce-auth-on-spotify-api-in-reactjs
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\module\lib\helpers.js:242:    await setItemAsync(storage, `${storageKey}-code-verifier`, storedCodeVerifier);
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\main\lib\error-codes.d.ts:6:export type ErrorCode = 'unexpected_failure' | 'validation_failed' | 'bad_json' | 'email_exists' | 'phone_exists' | 'bad_jwt' | 'not_admin' | 'no_authorization' | 'user_not_found' | 'session_not_found' | 'session_expired' | 'refresh_token_not_found' | 'refresh_token_already_used' | 'flow_state_not_found' | 'flow_state_expired' | 'signup_disabled' | 'user_banned' | 'provider_email_needs_verification' | 'invite_not_found' | 'bad_oauth_state' | 'bad_oauth_callback' | 'oauth_provider_not_supported' | 'unexpected_audience' | 'single_identity_not_deletable' | 'email_conflict_identity_not_deletable' | 'identity_already_exists' | 'email_provider_disabled' | 'phone_provider_disabled' | 'too_many_enrolled_mfa_factors' | 'mfa_factor_name_conflict' | 'mfa_factor_not_found' | 'mfa_ip_address_mismatch' | 'mfa_challenge_expired' | 'mfa_verification_failed' | 'mfa_verification_rejected' | 'insufficient_aal' | 'captcha_failed' | 'saml_provider_disabled' | 'manual_linking_disabled' | 'sms_send_failed' | 'email_not_confirmed' | 'phone_not_confirmed' | 'reauth_nonce_missing' | 'saml_relay_state_not_found' | 'saml_relay_state_expired' | 'saml_idp_not_found' | 'saml_assertion_no_user_id' | 'saml_assertion_no_email' | 'user_already_exists' | 'sso_provider_not_found' | 'saml_metadata_fetch_failed' | 'saml_idp_already_exists' | 'sso_domain_already_exists' | 'saml_entity_id_mismatch' | 'conflict' | 'provider_disabled' | 'user_sso_managed' | 'reauthentication_needed' | 'same_password' | 'reauthentication_not_valid' | 'otp_expired' | 'otp_disabled' | 'identity_not_found' | 'weak_password' | 'over_request_rate_limit' | 'over_email_send_rate_limit' | 'over_sms_send_rate_limit' | 'bad_code_verifier' | 'anonymous_provider_disabled' | 'hook_timeout' | 'hook_timeout_after_retry' | 'hook_payload_over_size_limit' | 'hook_payload_invalid_content_type' | 'request_timeout' | 'mfa_phone_enroll_not_enabled' | 'mfa_phone_verify_not_enabled' | 'mfa_totp_enroll_not_enabled' | 'mfa_totp_verify_not_enabled' | 'mfa_webauthn_enroll_not_enabled' | 'mfa_webauthn_verify_not_enabled' | 'mfa_verified_factor_exists' | 'invalid_credentials' | 'email_address_not_authorized' | 'email_address_invalid';
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\module\lib\types.d.ts:72:    flowType?: AuthFlowType;
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\module\lib\types.d.ts:641:export type VerifyOtpParams = VerifyMobileOtpParams | VerifyEmailOtpParams | VerifyTokenHashParams;
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\module\lib\types.d.ts:677:export interface VerifyTokenHashParams {
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\module\lib\types.d.ts:679:    token_hash: string;
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\main\lib\errors.js:220:            'use @supabase/ssr on both the server and client to store the code verifier in cookies.', 'AuthPKCECodeVerifierMissingError', 400, 'pkce_code_verifier_not_found');
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\main\lib\helpers.js:227:// Functions below taken from: https://stackoverflow.com/questions/63309409/creating-a-code-verifier-and-challenge-for-pkce-auth-on-spotify-api-in-reactjs
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\main\lib\helpers.js:269:    await (0, exports.setItemAsync)(storage, `${storageKey}-code-verifier`, storedCodeVerifier);
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\main\lib\types.d.ts:72:    flowType?: AuthFlowType;
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\main\lib\types.d.ts:641:export type VerifyOtpParams = VerifyMobileOtpParams | VerifyEmailOtpParams | VerifyTokenHashParams;
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\main\lib\types.d.ts:677:export interface VerifyTokenHashParams {
node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js\dist\main\lib\types.d.ts:679:    token_hash: string;

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$p='"'node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js/src/GoTrueClient.ts'; "'$i=0; Get-Content -LiteralPath $p | ForEach-Object { $i++; if (($i -ge 840 -and $i -le 920) -or ($i -ge 1797 -and $i -le 1845) -or ($i -ge 2040 -and $i -le 2090) -or ($i -ge 2096 -and $i -le 2370) -or ($i -ge 3678 -and $i -le 3695)) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$p='"'node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js/src/lib/types.ts'; "'$i=0; Get-Content -LiteralPath $p | ForEach-Object { $i++; if ($i -ge 760 -and $i -le 840) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$p='"'node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js/src/lib/helpers.ts'; "'$i=0; Get-Content -LiteralPath $p | ForEach-Object { $i++; if ($i -ge 288 -and $i -le 315) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 419ms:
 288: 
 289:   if (!hasCryptoSupport) {
 290:     console.warn(
 291:       'WebCrypto API is not supported. Code challenge method will default to use plain instead of sha256.'
 292:     )
 293:     return verifier
 294:   }
 295:   const hashed = await sha256(verifier)
 296:   return btoa(hashed).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
 297: }
 298: 
 299: export async function getCodeChallengeAndMethod(
 300:   storage: SupportedStorage,
 301:   storageKey: string,
 302:   isPasswordRecovery = false
 303: ) {
 304:   const codeVerifier = generatePKCEVerifier()
 305:   let storedCodeVerifier = codeVerifier
 306:   if (isPasswordRecovery) {
 307:     storedCodeVerifier += '/PASSWORD_RECOVERY'
 308:   }
 309:   await setItemAsync(storage, `${storageKey}-code-verifier`, storedCodeVerifier)
 310:   const codeChallenge = await generatePKCEChallenge(codeVerifier)
 311:   const codeChallengeMethod = codeVerifier === codeChallenge ? 'plain' : 's256'
 312:   return [codeChallenge, codeChallengeMethod]
 313: }
 314: 
 315: /** Parses the API version which is 2YYY-MM-DD. */

 succeeded in 423ms:
 760:         url?: string
 761: 
 762:         /** Verification token received when the user completes the captcha on the site. */
 763:         captchaToken?: string
 764: 
 765:         signInWithEthereum?: Partial<
 766:           Omit<EthereumSignInInput, 'version' | 'domain' | 'uri' | 'statement'>
 767:         >
 768:       }
 769:     }
 770:   | {
 771:       chain: 'ethereum'
 772: 
 773:       /** Sign in with Ethereum compatible message. Must include `Issued At`, `URI` and `Version`. */
 774:       message: string
 775: 
 776:       /** Ethereum curve (secp256k1) signature of the message. */
 777:       signature: Hex
 778: 
 779:       options?: {
 780:         /** Verification token received when the user completes the captcha on the site. */
 781:         captchaToken?: string
 782:       }
 783:     }
 784: 
 785: export type Web3Credentials = SolanaWeb3Credentials | EthereumWeb3Credentials
 786: 
 787: export type VerifyOtpParams = VerifyMobileOtpParams | VerifyEmailOtpParams | VerifyTokenHashParams
 788: export interface VerifyMobileOtpParams {
 789:   /** The user's phone number. */
 790:   phone: string
 791:   /** The otp sent to the user's phone number. */
 792:   token: string
 793:   /** The user's verification type. */
 794:   type: MobileOtpType
 795:   options?: {
 796:     /** A URL to send the user to after they are confirmed. */
 797:     redirectTo?: string
 798: 
 799:     /**
 800:      * Verification token received when the user completes the captcha on the site.
 801:      *
 802:      * @deprecated
 803:      */
 804:     captchaToken?: string
 805:   }
 806: }
 807: export interface VerifyEmailOtpParams {
 808:   /** The user's email address. */
 809:   email: string
 810:   /** The otp sent to the user's email address. */
 811:   token: string
 812:   /** The user's verification type. */
 813:   type: EmailOtpType
 814:   options?: {
 815:     /** A URL to send the user to after they are confirmed. */
 816:     redirectTo?: string
 817: 
 818:     /** Verification token received when the user completes the captcha on the site.
 819:      *
 820:      * @deprecated
 821:      */
 822:     captchaToken?: string
 823:   }
 824: }
 825: 
 826: export interface VerifyTokenHashParams {
 827:   /** The token hash used in an email link */
 828:   token_hash: string
 829: 
 830:   /** The user's verification type. */
 831:   type: EmailOtpType
 832: }
 833: 
 834: export type MobileOtpType = 'sms' | 'phone_change'
 835: export type EmailOtpType = 'signup' | 'invite' | 'magiclink' | 'recovery' | 'email_change' | 'email'
 836: 
 837: export type ResendParams =
 838:   | {
 839:       type: Extract<EmailOtpType, 'signup' | 'email_change'>
 840:       email: string

 succeeded in 457ms:
 840:    * @example Sign up with a redirect URL
 841:    * ```js
 842:    * const { data, error } = await supabase.auth.signUp(
 843:    *   {
 844:    *     email: 'example@email.com',
 845:    *     password: 'example-password',
 846:    *     options: {
 847:    *       emailRedirectTo: 'https://example.com/welcome'
 848:    *     }
 849:    *   }
 850:    * )
 851:    * ```
 852:    */
 853:   async signUp(credentials: SignUpWithPasswordCredentials): Promise<AuthResponse> {
 854:     try {
 855:       let res: AuthResponse
 856:       if ('email' in credentials) {
 857:         const { email, password, options } = credentials
 858:         let codeChallenge: string | null = null
 859:         let codeChallengeMethod: string | null = null
 860:         if (this.flowType === 'pkce') {
 861:           ;[codeChallenge, codeChallengeMethod] = await getCodeChallengeAndMethod(
 862:             this.storage,
 863:             this.storageKey
 864:           )
 865:         }
 866:         res = await _request(this.fetch, 'POST', `${this.url}/signup`, {
 867:           headers: this.headers,
 868:           redirectTo: options?.emailRedirectTo,
 869:           body: {
 870:             email,
 871:             password,
 872:             data: options?.data ?? {},
 873:             gotrue_meta_security: { captcha_token: options?.captchaToken },
 874:             code_challenge: codeChallenge,
 875:             code_challenge_method: codeChallengeMethod,
 876:           },
 877:           xform: _sessionResponse,
 878:         })
 879:       } else if ('phone' in credentials) {
 880:         const { phone, password, options } = credentials
 881:         res = await _request(this.fetch, 'POST', `${this.url}/signup`, {
 882:           headers: this.headers,
 883:           body: {
 884:             phone,
 885:             password,
 886:             data: options?.data ?? {},
 887:             channel: options?.channel ?? 'sms',
 888:             gotrue_meta_security: { captcha_token: options?.captchaToken },
 889:           },
 890:           xform: _sessionResponse,
 891:         })
 892:       } else {
 893:         throw new AuthInvalidCredentialsError(
 894:           'You must provide either an email or phone number and a password'
 895:         )
 896:       }
 897: 
 898:       const { data, error } = res
 899: 
 900:       if (error || !data) {
 901:         await removeItemAsync(this.storage, `${this.storageKey}-code-verifier`)
 902:         return this._returnResult({ data: { user: null, session: null }, error: error })
 903:       }
 904: 
 905:       const session: Session | null = data.session
 906:       const user: User | null = data.user
 907: 
 908:       if (data.session) {
 909:         await this._saveSession(data.session)
 910:         await this._notifyAllSubscribers('SIGNED_IN', session)
 911:       }
 912: 
 913:       return this._returnResult({ data: { user, session }, error: null })
 914:     } catch (error) {
 915:       await removeItemAsync(this.storage, `${this.storageKey}-code-verifier`)
 916:       if (isAuthError(error)) {
 917:         return this._returnResult({ data: { user: null, session: null }, error })
 918:       }
 919: 
 920:       throw error
1797:   private async _exchangeCodeForSession(authCode: string): Promise<
1798:     | {
1799:         data: { session: Session; user: User; redirectType: string | null }
1800:         error: null
1801:       }
1802:     | { data: { session: null; user: null; redirectType: null }; error: AuthError }
1803:   > {
1804:     const storageItem = await getItemAsync(this.storage, `${this.storageKey}-code-verifier`)
1805:     const [codeVerifier, redirectType] = ((storageItem ?? '') as string).split('/')
1806: 
1807:     try {
1808:       if (!codeVerifier && this.flowType === 'pkce') {
1809:         throw new AuthPKCECodeVerifierMissingError()
1810:       }
1811: 
1812:       const { data, error } = await _request(
1813:         this.fetch,
1814:         'POST',
1815:         `${this.url}/token?grant_type=pkce`,
1816:         {
1817:           headers: this.headers,
1818:           body: {
1819:             auth_code: authCode,
1820:             code_verifier: codeVerifier,
1821:           },
1822:           xform: _sessionResponse,
1823:         }
1824:       )
1825:       await removeItemAsync(this.storage, `${this.storageKey}-code-verifier`)
1826:       if (error) {
1827:         throw error
1828:       }
1829:       if (!data || !data.session || !data.user) {
1830:         const invalidTokenError = new AuthInvalidTokenResponseError()
1831:         return this._returnResult({
1832:           data: { user: null, session: null, redirectType: null },
1833:           error: invalidTokenError,
1834:         })
1835:       }
1836:       if (data.session) {
1837:         await this._saveSession(data.session)
1838:         await this._notifyAllSubscribers('SIGNED_IN', data.session)
1839:       }
1840:       return this._returnResult({ data: { ...data, redirectType: redirectType ?? null }, error })
1841:     } catch (error) {
1842:       await removeItemAsync(this.storage, `${this.storageKey}-code-verifier`)
1843:       if (isAuthError(error)) {
1844:         return this._returnResult({
1845:           data: { user: null, session: null, redirectType: null },
2040:    */
2041:   async signInWithOtp(credentials: SignInWithPasswordlessCredentials): Promise<AuthOtpResponse> {
2042:     try {
2043:       if ('email' in credentials) {
2044:         const { email, options } = credentials
2045:         let codeChallenge: string | null = null
2046:         let codeChallengeMethod: string | null = null
2047:         if (this.flowType === 'pkce') {
2048:           ;[codeChallenge, codeChallengeMethod] = await getCodeChallengeAndMethod(
2049:             this.storage,
2050:             this.storageKey
2051:           )
2052:         }
2053:         const { error } = await _request(this.fetch, 'POST', `${this.url}/otp`, {
2054:           headers: this.headers,
2055:           body: {
2056:             email,
2057:             data: options?.data ?? {},
2058:             create_user: options?.shouldCreateUser ?? true,
2059:             gotrue_meta_security: { captcha_token: options?.captchaToken },
2060:             code_challenge: codeChallenge,
2061:             code_challenge_method: codeChallengeMethod,
2062:           },
2063:           redirectTo: options?.emailRedirectTo,
2064:         })
2065:         return this._returnResult({ data: { user: null, session: null }, error })
2066:       }
2067:       if ('phone' in credentials) {
2068:         const { phone, options } = credentials
2069:         const { data, error } = await _request(this.fetch, 'POST', `${this.url}/otp`, {
2070:           headers: this.headers,
2071:           body: {
2072:             phone,
2073:             data: options?.data ?? {},
2074:             create_user: options?.shouldCreateUser ?? true,
2075:             gotrue_meta_security: { captcha_token: options?.captchaToken },
2076:             channel: options?.channel ?? 'sms',
2077:           },
2078:         })
2079:         return this._returnResult({
2080:           data: { user: null, session: null, messageId: data?.message_id },
2081:           error,
2082:         })
2083:       }
2084:       throw new AuthInvalidCredentialsError('You must provide either an email or phone number.')
2085:     } catch (error) {
2086:       await removeItemAsync(this.storage, `${this.storageKey}-code-verifier`)
2087:       if (isAuthError(error)) {
2088:         return this._returnResult({ data: { user: null, session: null }, error })
2089:       }
2090: 
2096:    * Log in a user given a User supplied OTP or TokenHash received through mobile or email.
2097:    *
2098:    * @category Auth
2099:    *
2100:    * @remarks
2101:    * - The `verifyOtp` method takes in different verification types.
2102:    * - If a phone number is used, the type can either be:
2103:    *   1. `sms` ??Used when verifying a one-time password (OTP) sent via SMS during sign-up or sign-in.
2104:    *   2. `phone_change` ??Used when verifying an OTP sent to a new phone number during a phone number update process.
2105:    * - If an email address is used, the type can be one of the following (note: `signup` and `magiclink` types are deprecated):
2106:    *   1. `email` ??Used when verifying an OTP sent to the user's email during sign-up or sign-in.
2107:    *   2. `recovery` ??Used when verifying an OTP sent for account recovery, typically after a password reset request.
2108:    *   3. `invite` ??Used when verifying an OTP sent as part of an invitation to join a project or organization.
2109:    *   4. `email_change` ??Used when verifying an OTP sent to a new email address during an email update process.
2110:    * - The verification type used should be determined based on the corresponding auth method called before `verifyOtp` to sign up / sign-in a user.
2111:    * - The `TokenHash` is contained in the [email templates](/docs/guides/auth/auth-email-templates) and can be used to sign in.  You may wish to use the hash for the PKCE flow for Server Side Auth. Read [the Password-based Auth guide](/docs/guides/auth/passwords) for more details.
2112:    *
2113:    * @example Verify Signup One-Time Password (OTP)
2114:    * ```js
2115:    * const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email'})
2116:    * ```
2117:    *
2118:    * @exampleResponse Verify Signup One-Time Password (OTP)
2119:    * ```json
2120:    * {
2121:    *   "data": {
2122:    *     "user": {
2123:    *       "id": "11111111-1111-1111-1111-111111111111",
2124:    *       "aud": "authenticated",
2125:    *       "role": "authenticated",
2126:    *       "email": "example@email.com",
2127:    *       "email_confirmed_at": "2024-01-01T00:00:00Z",
2128:    *       "phone": "",
2129:    *       "confirmed_at": "2024-01-01T00:00:00Z",
2130:    *       "recovery_sent_at": "2024-01-01T00:00:00Z",
2131:    *       "last_sign_in_at": "2024-01-01T00:00:00Z",
2132:    *       "app_metadata": {
2133:    *         "provider": "email",
2134:    *         "providers": [
2135:    *           "email"
2136:    *         ]
2137:    *       },
2138:    *       "user_metadata": {
2139:    *         "email": "example@email.com",
2140:    *         "email_verified": false,
2141:    *         "phone_verified": false,
2142:    *         "sub": "11111111-1111-1111-1111-111111111111"
2143:    *       },
2144:    *       "identities": [
2145:    *         {
2146:    *           "identity_id": "22222222-2222-2222-2222-222222222222",
2147:    *           "id": "11111111-1111-1111-1111-111111111111",
2148:    *           "user_id": "11111111-1111-1111-1111-111111111111",
2149:    *           "identity_data": {
2150:    *             "email": "example@email.com",
2151:    *             "email_verified": false,
2152:    *             "phone_verified": false,
2153:    *             "sub": "11111111-1111-1111-1111-111111111111"
2154:    *           },
2155:    *           "provider": "email",
2156:    *           "last_sign_in_at": "2024-01-01T00:00:00Z",
2157:    *           "created_at": "2024-01-01T00:00:00Z",
2158:    *           "updated_at": "2024-01-01T00:00:00Z",
2159:    *           "email": "example@email.com"
2160:    *         }
2161:    *       ],
2162:    *       "created_at": "2024-01-01T00:00:00Z",
2163:    *       "updated_at": "2024-01-01T00:00:00Z",
2164:    *       "is_anonymous": false
2165:    *     },
2166:    *     "session": {
2167:    *       "access_token": "<ACCESS_TOKEN>",
2168:    *       "token_type": "bearer",
2169:    *       "expires_in": 3600,
2170:    *       "expires_at": 1700000000,
2171:    *       "refresh_token": "<REFRESH_TOKEN>",
2172:    *       "user": {
2173:    *         "id": "11111111-1111-1111-1111-111111111111",
2174:    *         "aud": "authenticated",
2175:    *         "role": "authenticated",
2176:    *         "email": "example@email.com",
2177:    *         "email_confirmed_at": "2024-01-01T00:00:00Z",
2178:    *         "phone": "",
2179:    *         "confirmed_at": "2024-01-01T00:00:00Z",
2180:    *         "recovery_sent_at": "2024-01-01T00:00:00Z",
2181:    *         "last_sign_in_at": "2024-01-01T00:00:00Z",
2182:    *         "app_metadata": {
2183:    *           "provider": "email",
2184:    *           "providers": [
2185:    *             "email"
2186:    *           ]
2187:    *         },
2188:    *         "user_metadata": {
2189:    *           "email": "example@email.com",
2190:    *           "email_verified": false,
2191:    *           "phone_verified": false,
2192:    *           "sub": "11111111-1111-1111-1111-111111111111"
2193:    *         },
2194:    *         "identities": [
2195:    *           {
2196:    *             "identity_id": "22222222-2222-2222-2222-222222222222",
2197:    *             "id": "11111111-1111-1111-1111-111111111111",
2198:    *             "user_id": "11111111-1111-1111-1111-111111111111",
2199:    *             "identity_data": {
2200:    *               "email": "example@email.com",
2201:    *               "email_verified": false,
2202:    *               "phone_verified": false,
2203:    *               "sub": "11111111-1111-1111-1111-111111111111"
2204:    *             },
2205:    *             "provider": "email",
2206:    *             "last_sign_in_at": "2024-01-01T00:00:00Z",
2207:    *             "created_at": "2024-01-01T00:00:00Z",
2208:    *             "updated_at": "2024-01-01T00:00:00Z",
2209:    *             "email": "example@email.com"
2210:    *           }
2211:    *         ],
2212:    *         "created_at": "2024-01-01T00:00:00Z",
2213:    *         "updated_at": "2024-01-01T00:00:00Z",
2214:    *         "is_anonymous": false
2215:    *       }
2216:    *     }
2217:    *   },
2218:    *   "error": null
2219:    * }
2220:    * ```
2221:    *
2222:    * @example Verify SMS One-Time Password (OTP)
2223:    * ```js
2224:    * const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms'})
2225:    * ```
2226:    *
2227:    * @example Verify Email Auth (Token Hash)
2228:    * ```js
2229:    * const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'email'})
2230:    * ```
2231:    */
2232:   async verifyOtp(params: VerifyOtpParams): Promise<AuthResponse> {
2233:     try {
2234:       let redirectTo: string | undefined = undefined
2235:       let captchaToken: string | undefined = undefined
2236:       if ('options' in params) {
2237:         redirectTo = params.options?.redirectTo
2238:         captchaToken = params.options?.captchaToken
2239:       }
2240:       const { data, error } = await _request(this.fetch, 'POST', `${this.url}/verify`, {
2241:         headers: this.headers,
2242:         body: {
2243:           ...params,
2244:           gotrue_meta_security: { captcha_token: captchaToken },
2245:         },
2246:         redirectTo,
2247:         xform: _sessionResponse,
2248:       })
2249: 
2250:       if (error) {
2251:         throw error
2252:       }
2253:       if (!data) {
2254:         const tokenVerificationError = new Error('An error occurred on token verification.')
2255:         throw tokenVerificationError
2256:       }
2257: 
2258:       const session: Session | null = data.session
2259:       const user: User = data.user
2260: 
2261:       if (session?.access_token) {
2262:         await this._saveSession(session as Session)
2263:         await this._notifyAllSubscribers(
2264:           params.type == 'recovery' ? 'PASSWORD_RECOVERY' : 'SIGNED_IN',
2265:           session
2266:         )
2267:       }
2268: 
2269:       return this._returnResult({ data: { user, session }, error: null })
2270:     } catch (error) {
2271:       if (isAuthError(error)) {
2272:         return this._returnResult({ data: { user: null, session: null }, error })
2273:       }
2274: 
2275:       throw error
2276:     }
2277:   }
2278: 
2279:   /**
2280:    * Attempts a single-sign on using an enterprise Identity Provider. A
2281:    * successful SSO attempt will redirect the current page to the identity
2282:    * provider authorization page. The redirect URL is implementation and SSO
2283:    * protocol specific.
2284:    *
2285:    * You can use it by providing a SSO domain. Typically you can extract this
2286:    * domain by asking users for their email address. If this domain is
2287:    * registered on the Auth instance the redirect will use that organization's
2288:    * currently active SSO Identity Provider for the login.
2289:    *
2290:    * If you have built an organization-specific login page, you can use the
2291:    * organization's SSO Identity Provider UUID directly instead.
2292:    *
2293:    * @category Auth
2294:    *
2295:    * @remarks
2296:    * - Before you can call this method you need to [establish a connection](/docs/guides/auth/sso/auth-sso-saml#managing-saml-20-connections) to an identity provider. Use the [CLI commands](/docs/reference/cli/supabase-sso) to do this.
2297:    * - If you've associated an email domain to the identity provider, you can use the `domain` property to start a sign-in flow.
2298:    * - In case you need to use a different way to start the authentication flow with an identity provider, you can use the `providerId` property. For example:
2299:    *     - Mapping specific user email addresses with an identity provider.
2300:    *     - Using different hints to identity the identity provider to be used by the user, like a company-specific page, IP address or other tracking information.
2301:    *
2302:    * @example Sign in with email domain
2303:    * ```js
2304:    *   // You can extract the user's email domain and use it to trigger the
2305:    *   // authentication flow with the correct identity provider.
2306:    *
2307:    *   const { data, error } = await supabase.auth.signInWithSSO({
2308:    *     domain: 'company.com'
2309:    *   })
2310:    *
2311:    *   if (data?.url) {
2312:    *     // redirect the user to the identity provider's authentication flow
2313:    *     window.location.href = data.url
2314:    *   }
2315:    * ```
2316:    *
2317:    * @example Sign in with provider UUID
2318:    * ```js
2319:    *   // Useful when you need to map a user's sign in request according
2320:    *   // to different rules that can't use email domains.
2321:    *
2322:    *   const { data, error } = await supabase.auth.signInWithSSO({
2323:    *     providerId: '21648a9d-8d5a-4555-a9d1-d6375dc14e92'
2324:    *   })
2325:    *
2326:    *   if (data?.url) {
2327:    *     // redirect the user to the identity provider's authentication flow
2328:    *     window.location.href = data.url
2329:    *   }
2330:    * ```
2331:    */
2332:   async signInWithSSO(params: SignInWithSSO): Promise<SSOResponse> {
2333:     try {
2334:       let codeChallenge: string | null = null
2335:       let codeChallengeMethod: string | null = null
2336:       if (this.flowType === 'pkce') {
2337:         ;[codeChallenge, codeChallengeMethod] = await getCodeChallengeAndMethod(
2338:           this.storage,
2339:           this.storageKey
2340:         )
2341:       }
2342: 
2343:       const result = await _request(this.fetch, 'POST', `${this.url}/sso`, {
2344:         body: {
2345:           ...('providerId' in params ? { provider_id: params.providerId } : null),
2346:           ...('domain' in params ? { domain: params.domain } : null),
2347:           redirect_to: params.options?.redirectTo ?? undefined,
2348:           ...(params?.options?.captchaToken
2349:             ? { gotrue_meta_security: { captcha_token: params.options.captchaToken } }
2350:             : null),
2351:           skip_http_redirect: true, // fetch does not handle redirects
2352:           code_challenge: codeChallenge,
2353:           code_challenge_method: codeChallengeMethod,
2354:         },
2355:         headers: this.headers,
2356:         xform: _ssoResponse,
2357:       })
2358: 
2359:       // Automatically redirect in browser unless skipBrowserRedirect is true
2360:       if (result.data?.url && isBrowser() && !params.options?.skipBrowserRedirect) {
2361:         window.location.assign(result.data.url)
2362:       }
2363: 
2364:       return this._returnResult(result)
2365:     } catch (error) {
2366:       await removeItemAsync(this.storage, `${this.storageKey}-code-verifier`)
2367:       if (isAuthError(error)) {
2368:         return this._returnResult({ data: null, error })
2369:       }
2370:       throw error
3678:   /**
3679:    * Checks if the current URL and backing storage contain parameters given by a PKCE flow
3680:    */
3681:   private async _isPKCECallback(params: { [parameter: string]: string }): Promise<boolean> {
3682:     const currentStorageContent = await getItemAsync(
3683:       this.storage,
3684:       `${this.storageKey}-code-verifier`
3685:     )
3686: 
3687:     return !!(params.code && currentStorageContent)
3688:   }
3689: 
3690:   /**
3691:    * Inside a browser context, `signOut()` will remove the logged in user from the browser session and log them out - removing all items from localstorage and then trigger a `"SIGNED_OUT"` event.
3692:    *
3693:    * For server-side management, you can revoke all refresh tokens for a user by passing a user's JWT through to `auth.api.signOut(JWT: string)`.
3694:    * There is no way to revoke a user's access token jwt until it expires. It is recommended to set a shorter expiry on the jwt for this reason.
3695:    *

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$p='"'node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js/src/GoTrueClient.ts'; "'$i=0; Get-Content -LiteralPath $p | ForEach-Object { $i++; if (($i -ge 4095 -and $i -le 4145) -or ($i -ge 5000 -and $i -le 5095)) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"resetPasswordForEmail|PASSWORD_RECOVERY|getCodeChallengeAndMethod\\(\" 'node_modules/.pnpm/@supabase+auth-js@2.104.0/node_modules/@supabase/auth-js/src/GoTrueClient.ts' -S" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"signInWithOtp|resetPasswordForEmail|signUp|emailRedirectTo|redirectTo\" 'src' -S" in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 377ms:
545:            await this._notifyAllSubscribers('PASSWORD_RECOVERY', session)
861:          ;[codeChallenge, codeChallengeMethod] = await getCodeChallengeAndMethod(
2048:          ;[codeChallenge, codeChallengeMethod] = await getCodeChallengeAndMethod(
2264:          params.type == 'recovery' ? 'PASSWORD_RECOVERY' : 'SIGNED_IN',
2337:        ;[codeChallenge, codeChallengeMethod] = await getCodeChallengeAndMethod(
2435:   * - Password recovery emails can be resent by calling the `resetPasswordForEmail()` method again.
3131:          ;[codeChallenge, codeChallengeMethod] = await getCodeChallengeAndMethod(
3830:   *   - `PASSWORD_RECOVERY`
3845:   *   } else if (event === 'PASSWORD_RECOVERY') {
3945:   *   if (event === 'PASSWORD_RECOVERY') {
3946:   *     console.log('PASSWORD_RECOVERY', session)
4038:   * - The `resetPasswordForEmail()` only sends a password reset link to the user's email.
4040:   * - A `PASSWORD_RECOVERY` event will be emitted when the password recovery link is clicked.
4054:   * const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
4074:   *   .resetPasswordForEmail('user@email.com')
4082:   *      if (event == "PASSWORD_RECOVERY") {
4094:  async resetPasswordForEmail(
4111:      ;[codeChallenge, codeChallengeMethod] = await getCodeChallengeAndMethod(
5076:      const [codeChallenge, codeChallengeMethod] = await getCodeChallengeAndMethod(

 succeeded in 446ms:
4095:     email: string,
4096:     options: {
4097:       redirectTo?: string
4098:       captchaToken?: string
4099:     } = {}
4100:   ): Promise<
4101:     | {
4102:         data: {}
4103:         error: null
4104:       }
4105:     | { data: null; error: AuthError }
4106:   > {
4107:     let codeChallenge: string | null = null
4108:     let codeChallengeMethod: string | null = null
4109: 
4110:     if (this.flowType === 'pkce') {
4111:       ;[codeChallenge, codeChallengeMethod] = await getCodeChallengeAndMethod(
4112:         this.storage,
4113:         this.storageKey,
4114:         true // isPasswordRecovery
4115:       )
4116:     }
4117:     try {
4118:       return await _request(this.fetch, 'POST', `${this.url}/recover`, {
4119:         body: {
4120:           email,
4121:           code_challenge: codeChallenge,
4122:           code_challenge_method: codeChallengeMethod,
4123:           gotrue_meta_security: { captcha_token: options.captchaToken },
4124:         },
4125:         headers: this.headers,
4126:         redirectTo: options.redirectTo,
4127:       })
4128:     } catch (error) {
4129:       await removeItemAsync(this.storage, `${this.storageKey}-code-verifier`)
4130:       if (isAuthError(error)) {
4131:         return this._returnResult({ data: null, error })
4132:       }
4133: 
4134:       throw error
4135:     }
4136:   }
4137: 
4138:   /**
4139:    * Gets all the identities linked to a user.
4140:    *
4141:    * @category Auth
4142:    *
4143:    * @remarks
4144:    * - The user needs to be signed in to call `getUserIdentities()`.
4145:    *
5000: 
5001:       // now immediately call the visbility changed callback to setup with the
5002:       // current visbility state
5003:       await this._onVisibilityChanged(true) // initial call
5004:     } catch (error) {
5005:       console.error('_handleVisibilityChange', error)
5006:     }
5007:   }
5008: 
5009:   /**
5010:    * Callback registered with `window.addEventListener('visibilitychange')`.
5011:    */
5012:   private async _onVisibilityChanged(calledFromInitialize: boolean) {
5013:     const methodName = `#_onVisibilityChanged(${calledFromInitialize})`
5014:     this._debug(methodName, 'visibilityState', document.visibilityState)
5015: 
5016:     if (document.visibilityState === 'visible') {
5017:       if (this.autoRefreshToken) {
5018:         // in browser environments the refresh token ticker runs only on focused tabs
5019:         // which prevents race conditions
5020:         this._startAutoRefresh()
5021:       }
5022: 
5023:       if (!calledFromInitialize) {
5024:         // called when the visibility has changed, i.e. the browser
5025:         // transitioned from hidden -> visible so we need to see if the session
5026:         // should be recovered immediately... but to do that we need to acquire
5027:         // the lock first asynchronously
5028:         await this.initializePromise
5029: 
5030:         await this._acquireLock(this.lockAcquireTimeout, async () => {
5031:           if (document.visibilityState !== 'visible') {
5032:             this._debug(
5033:               methodName,
5034:               'acquired the lock to recover the session, but the browser visibilityState is no longer visible, aborting'
5035:             )
5036: 
5037:             // visibility has changed while waiting for the lock, abort
5038:             return
5039:           }
5040: 
5041:           // recover the session
5042:           await this._recoverAndRefresh()
5043:         })
5044:       }
5045:     } else if (document.visibilityState === 'hidden') {
5046:       if (this.autoRefreshToken) {
5047:         this._stopAutoRefresh()
5048:       }
5049:     }
5050:   }
5051: 
5052:   /**
5053:    * Generates the relevant login URL for a third-party provider.
5054:    * @param options.redirectTo A URL or mobile address to send the user to after they are confirmed.
5055:    * @param options.scopes A space-separated list of scopes granted to the OAuth application.
5056:    * @param options.queryParams An object of key-value pairs containing query parameters granted to the OAuth application.
5057:    */
5058:   private async _getUrlForProvider(
5059:     url: string,
5060:     provider: Provider,
5061:     options: {
5062:       redirectTo?: string
5063:       scopes?: string
5064:       queryParams?: { [key: string]: string }
5065:       skipBrowserRedirect?: boolean
5066:     }
5067:   ) {
5068:     const urlParams: string[] = [`provider=${encodeURIComponent(provider)}`]
5069:     if (options?.redirectTo) {
5070:       urlParams.push(`redirect_to=${encodeURIComponent(options.redirectTo)}`)
5071:     }
5072:     if (options?.scopes) {
5073:       urlParams.push(`scopes=${encodeURIComponent(options.scopes)}`)
5074:     }
5075:     if (this.flowType === 'pkce') {
5076:       const [codeChallenge, codeChallengeMethod] = await getCodeChallengeAndMethod(
5077:         this.storage,
5078:         this.storageKey
5079:       )
5080: 
5081:       const flowParams = new URLSearchParams({
5082:         code_challenge: `${encodeURIComponent(codeChallenge)}`,
5083:         code_challenge_method: `${encodeURIComponent(codeChallengeMethod)}`,
5084:       })
5085:       urlParams.push(flowParams.toString())
5086:     }
5087:     if (options?.queryParams) {
5088:       const query = new URLSearchParams(options.queryParams)
5089:       urlParams.push(query.toString())
5090:     }
5091:     if (options?.skipBrowserRedirect) {
5092:       urlParams.push(`skip_http_redirect=${options.skipBrowserRedirect}`)
5093:     }
5094: 
5095:     return `${url}?${urlParams.join('&')}`

 succeeded in 455ms:
src\app\auth\confirm\route.ts:17://   without the `code_verifier` cookie that signUp() stored on the
src\app\challenges\[slug]\submit\actions.ts:141:  | { ok: true; submissionId: string; redirectTo: string }
src\app\challenges\[slug]\submit\actions.ts:309:    redirectTo: `/challenges/${slug}/gallery#submission-${submissionId}`,
src\lib\supabase\server.ts:13:      // cookie set by signUp() at signup time. See client.ts for the
src\lib\supabase\client.ts:11:// flowType = 'pkce' on the BROWSER client is what makes signUp() /
src\lib\supabase\client.ts:12:// resetPasswordForEmail() store a code_verifier locally that the
src\app\[locale]\auth\verify\page.tsx:13:// inside (auth)/signup/page.tsx (after a successful signUp() that
src\app\[locale]\auth\verify\page.tsx:37:      // Phase 4.x Wave C.5c sub_01 ??PKCE: emailRedirectTo is the FINAL
src\app\[locale]\auth\verify\page.tsx:40:      options: { emailRedirectTo: `${siteUrl}/onboarding/workspace` },
src\components\challenges\submission-form.tsx:258:      router.push(submitResult.redirectTo);
src\components\challenges\submission-form.tsx:283:    router.push(submitResult.redirectTo);
src\app\[locale]\auth\expired\page.tsx:51:      // Phase 4.x Wave C.5c sub_01 ??PKCE: emailRedirectTo is the FINAL
src\app\[locale]\auth\expired\page.tsx:54:      options: { emailRedirectTo: `${siteUrl}/onboarding/workspace` },
src\app\[locale]\(auth)\signup\page.tsx:63:  // `emailRedirectTo` becomes the FINAL destination after verifyOtp
src\app\[locale]\(auth)\signup\page.tsx:76:    const { error, data } = await supabase.auth.signUp({
src\app\[locale]\(auth)\signup\page.tsx:79:      options: { emailRedirectTo: buildEmailRedirect(siteUrl) },
src\app\[locale]\(auth)\signup\page.tsx:107:      options: { emailRedirectTo: buildEmailRedirect(siteUrl) },
src\app\[locale]\(auth)\signup\page.tsx:117:  // ---- Sent state ??shown after successful signUp() when email confirmation
src\app\[locale]\(auth)\forgot-password\page.tsx:35:    // Phase 4.x Wave C.5c sub_01 ??PKCE: redirectTo is the FINAL
src\app\[locale]\(auth)\forgot-password\page.tsx:39:    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
src\app\[locale]\(auth)\forgot-password\page.tsx:40:      redirectTo: `${siteUrl}/reset-password`,

codex
One significant issue is emerging: in the installed `@supabase/auth-js` code, `verifyOtp({ token_hash, type })` posts only those parameters to `/verify`; it does not read or submit the PKCE code verifier. I?셫 checking the downstream reset page and route surfaces now so the recovery-specific verdict is precise.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"reset-password|updateUser|PASSWORD_RECOVERY|getSession|getUser\" 'src/app' 'src/components' 'src/lib' -S" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-ChildItem -Recurse -LiteralPath 'src/app/[locale]' -Filter '*reset*' -Force | Select-Object -ExpandProperty FullName" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-ChildItem -Recurse -LiteralPath 'src/app/[locale]' -Directory | Where-Object { "'$_.FullName -like '"'*reset-password*' } | Select-Object -ExpandProperty FullName" in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 430ms:
src/lib\app\scopes.ts:14:export function getUserScopes(ctx: AppContext, currentPath?: string): Scope[] {
src/app\auth\confirm\route.ts:40:  "/reset-password",
src/app\auth\confirm\route.ts:99:  } = await supabase.auth.getUser();
src/app\auth\confirm\route.ts:113:    return NextResponse.redirect(`${origin}/${locale}/reset-password`);
src/lib\app\context.ts:52:  } = await supabase.auth.getUser();
src/components\challenges\header-cta-resolver.tsx:14:  } = await supabase.auth.getUser();
src/app\api\unfurl\route.ts:10:  const { data: { user } } = await supabase.auth.getUser();
src/app\auth\callback\route.ts:61:  } = await supabase.auth.getUser();
src/app\auth\callback\route.ts:81:  // Password recovery flow: send to reset-password regardless of state.
src/app\auth\callback\route.ts:83:    return NextResponse.redirect(`${origin}/${locale}/reset-password`);
src/components\app\notification-bell.tsx:38:      .getUser()
src/components\app\notification-bell.tsx:43:        console.error("[notif/bell] getUser failed:", err);
src/lib\onboarding\state.ts:15:  } = await supabase.auth.getUser();
src/lib\email\new-message.ts:113:    // 5. Resolve emails via auth admin API ??one call per user (Supabase has no bulk getUserById)
src/lib\email\new-message.ts:116:        const { data } = await admin.auth.admin.getUserById(uid);
src/lib\commission\queries.ts:9:  } = await supabase.auth.getUser();
src/lib\commission\queries.ts:29:  } = await supabase.auth.getUser();
src/lib\onboarding\actions.ts:18:  } = await supabase.auth.getUser();
src/lib\onboarding\actions.ts:47:  } = await supabase.auth.getUser();
src/lib\onboarding\actions.ts:95:  } = await supabase.auth.getUser();
src/lib\commission\actions.ts:32:  } = await supabase.auth.getUser();
src/lib\commission\actions.ts:93:  } = await supabase.auth.getUser();
src/lib\commission\actions.ts:142:  } = await supabase.auth.getUser();
src/lib\workspace\actions.ts:37:  } = await supabase.auth.getUser();
src/app\api\health\google\route.ts:9:  } = await supabase.auth.getUser()
src/components\challenges\primary-cta-button.tsx:41:    } = await supabase.auth.getUser();
src/lib\supabase\middleware.ts:31:  await supabase.auth.getUser();
src/lib\handles\reserved.ts:15:  "onboarding", "forgot-password", "reset-password",
src/lib\team-channels\attachments.ts:104:  } = await supabase.auth.getUser();
src/components\project\thread-panel-server.tsx:20:  } = await supabase.auth.getUser();
src/app\[locale]\onboarding\layout.tsx:17:  } = await supabase.auth.getUser();
src/app\[locale]\app\dashboard\page.tsx:67:  } = await supabase.auth.getUser();
src/app\challenges\[slug]\gallery\page.tsx:44:  } = await supabase.auth.getUser();
src/app\challenges\[slug]\submit\page.tsx:73:  } = await supabase.auth.getUser();
src/app\challenges\[slug]\gallery\actions.ts:15:  } = await supabase.auth.getUser();
src/app\[locale]\app\commission\page.tsx:18:  } = await supabase.auth.getUser();
src/app\challenges\[slug]\submit\actions.ts:41:  } = await supabase.auth.getUser();
src/app\[locale]\app\notifications\actions.ts:27:  } = await supabase.auth.getUser();
src/app\[locale]\app\notifications\actions.ts:61:  } = await supabase.auth.getUser();
src/app\[locale]\app\notifications\actions.ts:84:  } = await supabase.auth.getUser();
src/app\unsubscribe\[token]\page.tsx:85:    const { data: userRes, error: userErr } = await admin.auth.admin.getUserById(
src/app\unsubscribe\[token]\page.tsx:89:      console.error("[unsubscribe/page] admin.getUserById failed:", userErr);
src/app\unsubscribe\[token]\page.tsx:93:    console.error("[unsubscribe/page] admin.getUserById threw:", err);
src/app\[locale]\(auth)\reset-password\page.tsx:41:    const { error } = await supabase.auth.updateUser({ password: values.password });
src/app\[locale]\(auth)\forgot-password\page.tsx:40:      redirectTo: `${siteUrl}/reset-password`,
src/app\[locale]\app\commission\[id]\page.tsx:21:  } = await supabase.auth.getUser();
src/app\[locale]\app\admin\trash\page.tsx:31:  } = await supabase.auth.getUser();
src/app\[locale]\app\layout.tsx:12:import { getUserScopes } from "@/lib/app/scopes";
src/app\[locale]\app\layout.tsx:28:  } = await supabase.auth.getUser();
src/app\[locale]\app\layout.tsx:57:  const scopes = getUserScopes(ctx);
src/app\[locale]\app\admin\page.tsx:43:  } = await supabase.auth.getUser();
src/app\[locale]\app\meetings\actions.ts:116:  } = await supabase.auth.getUser();
src/app\[locale]\app\meetings\actions.ts:332:  } = await supabase.auth.getUser();
src/app\[locale]\app\meetings\actions.ts:386:  } = await supabase.auth.getUser();
src/app\[locale]\app\meetings\actions.ts:607:  } = await supabase.auth.getUser();
src/app\[locale]\app\meetings\actions.ts:715:  } = await supabase.auth.getUser();
src/app\[locale]\app\meetings\actions.ts:772:  } = await supabase.auth.getUser();
src/app\[locale]\app\team\[slug]\page.tsx:23:  } = await supabase.auth.getUser();
src/app\[locale]\app\admin\support\page.tsx:30:  } = await supabase.auth.getUser();
src/app\[locale]\app\admin\invoices\page.tsx:104:  } = await supabase.auth.getUser();
src/app\[locale]\app\team\[slug]\actions.ts:87:    } = await supabase.auth.getUser();
src/app\[locale]\app\team\[slug]\actions.ts:286:  } = await supabase.auth.getUser();
src/app\[locale]\app\team\[slug]\actions.ts:329:    } = await supabase.auth.getUser();
src/app\[locale]\app\team\[slug]\actions.ts:548:    } = await supabase.auth.getUser();
src/app\[locale]\app\team\[slug]\actions.ts:609:    } = await supabase.auth.getUser();
src/app\[locale]\app\meetings\request-actions.ts:94:  } = await supabase.auth.getUser();
src/app\[locale]\app\meetings\request-actions.ts:119:  const { data } = await svc.auth.admin.getUserById(userId);
src/app\[locale]\app\meetings\request-actions.ts:133:    const { data } = await svc.auth.admin.getUserById(r.user_id);
src/app\[locale]\app\meetings\page.tsx:69:  } = await supabase.auth.getUser();
src/app\[locale]\app\meetings\new\page.tsx:31:  } = await supabase.auth.getUser();
src/app\[locale]\app\preprod\actions.ts:22:  } = await supabase.auth.getUser();
src/app\[locale]\app\preprod\page.tsx:49:  } = await supabase.auth.getUser();
src/app\[locale]\app\meetings\[id]\page.tsx:56:  } = await supabase.auth.getUser();
src/app\[locale]\app\admin\challenges\actions.ts:66:  const { data: { user } } = await supabase.auth.getUser();
src/app\[locale]\app\admin\projects\[id]\page.tsx:27:  } = await supabase.auth.getUser();
src/app\[locale]\app\admin\commissions\[id]\actions.ts:51:  } = await supabase.auth.getUser();
src/app\[locale]\app\admin\commissions\[id]\page.tsx:24:  } = await supabase.auth.getUser();
src/app\[locale]\app\admin\commissions\page.tsx:34:  } = await supabase.auth.getUser();
src/app\[locale]\app\invoices\page.tsx:61:  } = await supabase.auth.getUser();
src/app\[locale]\app\support\actions.ts:44:  } = await supabase.auth.getUser();
src/app\[locale]\app\support\actions.ts:95:  } = await supabase.auth.getUser();
src/app\[locale]\app\support\actions.ts:137:  } = await supabase.auth.getUser();
src/app\[locale]\app\preprod\new\page.tsx:18:  } = await supabase.auth.getUser();
src/app\[locale]\app\settings\actions.ts:52:  } = await supabase.auth.getUser();
src/app\[locale]\app\settings\actions.ts:107:  } = await supabase.auth.getUser();
src/app\[locale]\app\settings\actions.ts:134:  } = await supabase.auth.getUser();
src/app\[locale]\app\settings\actions.ts:179:  } = await supabase.auth.getUser();
src/app\[locale]\app\invoices\actions.ts:27:  } = await supabase.auth.getUser();
src/app\[locale]\app\invoices\[id]\actions.ts:39:  } = await supabase.auth.getUser();
src/app\[locale]\app\invoices\[id]\actions.ts:210:  } = await supabase.auth.getUser();
src/app\[locale]\app\invoices\[id]\actions.ts:251:  } = await supabase.auth.getUser();
src/app\[locale]\app\invoices\[id]\line-item-actions.ts:43:  } = await supabase.auth.getUser();
src/app\[locale]\app\showcases\actions.ts:64:  } = await supabase.auth.getUser();
src/app\[locale]\app\invoices\[id]\page.tsx:51:  } = await supabase.auth.getUser();
src/app\[locale]\app\showcases\page.tsx:57:  } = await supabase.auth.getUser();
src/app\[locale]\app\preprod\[id]\actions.ts:58:  } = await supabase.auth.getUser();
src/app\[locale]\app\preprod\[id]\actions.ts:138:  } = await supabase.auth.getUser();
src/app\[locale]\app\preprod\[id]\actions.ts:215:  } = await supabase.auth.getUser();
src/app\[locale]\app\preprod\[id]\actions.ts:295:  } = await supabase.auth.getUser();
src/app\[locale]\app\preprod\[id]\actions.ts:338:  } = await supabase.auth.getUser();
src/app\[locale]\app\preprod\[id]\actions.ts:398:  } = await supabase.auth.getUser();
src/app\[locale]\app\preprod\[id]\actions.ts:614:  } = await supabase.auth.getUser();
src/app\[locale]\app\preprod\[id]\actions.ts:702:  } = await supabase.auth.getUser();
src/app\[locale]\app\preprod\[id]\actions.ts:730:  } = await supabase.auth.getUser();
src/app\[locale]\app\invoices\new\page.tsx:17:  } = await supabase.auth.getUser();
src/app\[locale]\app\preprod\[id]\page.tsx:19:  } = await supabase.auth.getUser();
src/app\[locale]\app\preprod\[id]\share-actions.ts:46:  const { data: { user } } = await supabase.auth.getUser()
src/app\[locale]\app\preprod\[id]\share-actions.ts:115:  const { data: { user } } = await supabase.auth.getUser()
src/app\[locale]\app\preprod\[id]\share-actions.ts:139:  const { data: { user } } = await supabase.auth.getUser()
src/app\[locale]\app\preprod\[id]\share-actions.ts:165:  const { data: { user } } = await supabase.auth.getUser()
src/app\[locale]\app\preprod\[id]\share-actions.ts:211:  const { data: { user } } = await supabase.auth.getUser()
src/app\[locale]\app\preprod\[id]\share-actions.ts:331:  const { data: { user } } = await supabase.auth.getUser()
src/app\[locale]\app\showcases\[id]\page.tsx:17:  } = await supabase.auth.getUser();
src/app\[locale]\app\settings\notifications\page.tsx:41:  } = await supabase.auth.getUser();
src/app\[locale]\app\invoices\[id]\print\page.tsx:54:  } = await supabase.auth.getUser();
src/app\[locale]\app\admin\challenges\[slug]\judge\actions.ts:43:  } = await supabase.auth.getUser();
src/app\[locale]\app\admin\challenges\[slug]\judge\page.tsx:20:  } = await supabase.auth.getUser();
src/app\[locale]\app\projects\page.tsx:72:  } = await supabase.auth.getUser();
src/app\[locale]\app\settings\notifications\actions.ts:33:  } = await supabase.auth.getUser();
src/app\[locale]\app\admin\challenges\[slug]\announce\actions.ts:27:  } = await supabase.auth.getUser();
src/app\[locale]\app\projects\new\page.tsx:20:  } = await supabase.auth.getUser();
src/app\[locale]\app\projects\new\actions.ts:78:  } = await supabase.auth.getUser();
src/app\[locale]\app\projects\new\actions.ts:275:  } = await supabase.auth.getUser();
src/app\[locale]\app\projects\new\actions.ts:401:  } = await supabase.auth.getUser();
src/app\[locale]\app\projects\new\actions.ts:545:  } = await supabase.auth.getUser();
src/app\[locale]\app\projects\new\actions.ts:600:  } = await supabase.auth.getUser();
src/app\[locale]\app\projects\new\actions.ts:799:  } = await supabase.auth.getUser();
src/app\[locale]\app\projects\new\actions.ts:973:      service.auth.admin.getUserById(user.id),
src/app\[locale]\app\projects\[id]\thread-actions.ts:23:  } = await supabase.auth.getUser();
src/app\[locale]\app\projects\[id]\thread-actions.ts:177:  } = await supabase.auth.getUser();
src/app\[locale]\app\projects\[id]\ref-actions.ts:93:  } = await supabase.auth.getUser();
src/app\[locale]\app\projects\[id]\ref-actions.ts:142:  } = await supabase.auth.getUser();
src/app\[locale]\app\projects\[id]\ref-actions.ts:192:  } = await supabase.auth.getUser();
src/app\[locale]\app\projects\[id]\board-actions.ts:91:  } = await supabase.auth.getUser();
src/app\[locale]\app\projects\[id]\board-actions.ts:205:  } = await supabase.auth.getUser();
src/app\[locale]\app\projects\[id]\board-actions.ts:248:  } = await supabase.auth.getUser();
src/app\[locale]\app\projects\[id]\board-actions.ts:322:  } = await supabase.auth.getUser();
src/app\[locale]\app\projects\[id]\board-actions.ts:474:  } = await supabase.auth.getUser();
src/app\[locale]\app\projects\[id]\board-actions.ts:536:  } = await supabase.auth.getUser();
src/app\[locale]\app\projects\[id]\board-actions.ts:583:  } = await supabase.auth.getUser();
src/app\[locale]\app\projects\[id]\board-actions.ts:652:  } = await supabase.auth.getUser();
src/app\[locale]\app\projects\[id]\board-actions.ts:690:  } = await supabase.auth.getUser();
src/app\[locale]\app\projects\[id]\actions.ts:52:  } = await supabase.auth.getUser();
src/app\[locale]\app\projects\[id]\actions.ts:125:  } = await supabase.auth.getUser();
src/app\[locale]\app\projects\[id]\page.tsx:93:  } = await supabase.auth.getUser();
src/app\[locale]\app\projects\[id]\brief\actions.ts:106:  } = await supabase.auth.getUser();

 succeeded in 468ms:
C:\Users\yout4\yagi-studio\yagi-workshop\src\app\[locale]\(auth)\reset-password

 succeeded in 495ms:
C:\Users\yout4\yagi-studio\yagi-workshop\src\app\[locale]\(auth)\reset-password

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src/app/[locale]/(auth)/reset-password/page.tsx' | ForEach-Object { "'$i++; '"'{0,4}: {1}' -f "'$i, $_ }' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 348ms:
   1: "use client";
   2: 
   3: import { useState } from "react";
   4: import { useTranslations } from "next-intl";
   5: import { useForm } from "react-hook-form";
   6: import { zodResolver } from "@hookform/resolvers/zod";
   7: import { z } from "zod";
   8: import { toast } from "sonner";
   9: import { Button } from "@/components/ui/button";
  10: import { Input } from "@/components/ui/input";
  11: import { Label } from "@/components/ui/label";
  12: import { useRouter } from "@/i18n/routing";
  13: import { createSupabaseBrowser } from "@/lib/supabase/client";
  14: 
  15: const schema = z
  16:   .object({
  17:     password: z.string().min(8),
  18:     passwordConfirm: z.string(),
  19:   })
  20:   .refine((data) => data.password === data.passwordConfirm, {
  21:     path: ["passwordConfirm"],
  22:     message: "password_mismatch",
  23:   });
  24: 
  25: type FormValues = z.infer<typeof schema>;
  26: 
  27: export default function ResetPasswordPage() {
  28:   const t = useTranslations("auth");
  29:   const c = useTranslations("common");
  30:   const router = useRouter();
  31:   const [submitting, setSubmitting] = useState(false);
  32:   const {
  33:     register,
  34:     handleSubmit,
  35:     formState: { errors },
  36:   } = useForm<FormValues>({ resolver: zodResolver(schema) });
  37: 
  38:   async function onSubmit(values: FormValues) {
  39:     setSubmitting(true);
  40:     const supabase = createSupabaseBrowser();
  41:     const { error } = await supabase.auth.updateUser({ password: values.password });
  42:     setSubmitting(false);
  43:     if (error) {
  44:       toast.error(error.message);
  45:       return;
  46:     }
  47:     await supabase.auth.signOut();
  48:     router.push("/signin");
  49:   }
  50: 
  51:   return (
  52:     <div className="space-y-8">
  53:       <div className="space-y-2 text-center">
  54:         <h1 className="font-display text-3xl tracking-tight">
  55:           {t("new_password_title")}
  56:         </h1>
  57:       </div>
  58: 
  59:       <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
  60:         <div className="space-y-2">
  61:           <Label htmlFor="password">{t("password_label")}</Label>
  62:           <Input
  63:             id="password"
  64:             type="password"
  65:             placeholder={t("password_ph")}
  66:             autoComplete="new-password"
  67:             {...register("password")}
  68:           />
  69:           {errors.password && (
  70:             <p className="text-xs text-destructive">{errors.password.message}</p>
  71:           )}
  72:         </div>
  73:         <div className="space-y-2">
  74:           <Label htmlFor="passwordConfirm">{t("password_confirm_label")}</Label>
  75:           <Input
  76:             id="passwordConfirm"
  77:             type="password"
  78:             autoComplete="new-password"
  79:             {...register("passwordConfirm")}
  80:           />
  81:           {errors.passwordConfirm && (
  82:             <p className="text-xs text-destructive">
  83:               {errors.passwordConfirm.message === "password_mismatch"
  84:                 ? t("password_mismatch")
  85:                 : errors.passwordConfirm.message}
  86:             </p>
  87:           )}
  88:         </div>
  89:         <Button type="submit" className="w-full" size="lg" disabled={submitting}>
  90:           {submitting ? t("sending") : c("save")}
  91:         </Button>
  92:       </form>
  93:     </div>
  94:   );
  95: }

codex
## Finding F1 ??PKCE verifier is not enforced
- Severity: HIGH-B
- Surface: [route.ts](C:/Users/yout4/yagi-studio/yagi-workshop/src/app/auth/confirm/route.ts:85), `node_modules/@supabase/auth-js/src/GoTrueClient.ts:2232`
- Verdict: FAIL.
- Reasoning: `verifyOtp({ type, token_hash })` is a valid Supabase signature, and Supabase documents this server-side token-hash pattern. But the installed `verifyOtp` implementation posts only `params` to `/verify`; it does not read or send `${storageKey}-code-verifier`. The only auth-js path that consumes `code_verifier` is `exchangeCodeForSession`, not `verifyOtp`.
- Proposed fix: Before calling `verifyOtp`, explicitly require the expected `*-auth-token-code-verifier` cookie, or change `/auth/confirm` to a user-initiated POST/interstitial so passive GETs never call `verifyOtp`.

## Finding F2 ??Absolute RedirectTo is dropped
- Severity: MED-A
- Surface: [page.tsx](C:/Users/yout4/yagi-studio/yagi-workshop/src/app/[locale]/(auth)/signup/page.tsx:67), [route.ts](C:/Users/yout4/yagi-studio/yagi-workshop/src/app/auth/confirm/route.ts:44)
- Verdict: FAIL.
- Reasoning: `emailRedirectTo` is built as an absolute URL like `https://site/app/...`, and Supabase exposes that as `{{ .RedirectTo }}`. `sanitizeNext()` only accepts strings starting with `/`, so the template?셲 `next={{ .RedirectTo }}` will be rejected and replaced with `/onboarding/workspace`.
- Proposed fix: Parse `next` with `new URL(raw, origin)`, require same-origin, then allowlist by `url.pathname` and return `pathname + search`.

## Finding F3 ??Open redirect through next
- Severity: LOW
- Surface: [route.ts](C:/Users/yout4/yagi-studio/yagi-workshop/src/app/auth/confirm/route.ts:44)
- Verdict: PASS.
- Reasoning: Protocol-relative `//evil.com`, absolute foreign URLs, `/api/...`, and non-allowlisted paths fall back. Locale stripping only normalizes `/ko/...` or `/en/...` before re-prefixing with the resolved profile locale.
- Proposed fix: No fix needed for open-redirect defense; apply F2 so same-origin absolute `RedirectTo` works.

## Finding F4 ??SSR code_verifier cookie persistence
- Severity: LOW
- Surface: [client.ts](C:/Users/yout4/yagi-studio/yagi-workshop/src/lib/supabase/client.ts:14), [server.ts](C:/Users/yout4/yagi-studio/yagi-workshop/src/lib/supabase/server.ts:16)
- Verdict: PASS for persistence, FAIL for enforcement covered by F1.
- Reasoning: `@supabase/ssr` browser storage writes cookies via `document.cookie`; defaults are `path: "/"`, `sameSite: "lax"`, and non-HttpOnly, so the route handler can read them. Server `getAll()` reads request cookies and `setAll()` can write auth cookies in a route handler.
- Proposed fix: No persistence fix needed; add verifier presence/enforcement before `verifyOtp`.

## Finding F5 ??Callback coexistence
- Severity: LOW
- Surface: [callback route](C:/Users/yout4/yagi-studio/yagi-workshop/src/app/auth/callback/route.ts:14), [confirm route](C:/Users/yout4/yagi-studio/yagi-workshop/src/app/auth/confirm/route.ts:73)
- Verdict: PASS.
- Reasoning: `/auth/callback` handles `code` and legacy error params; `/auth/confirm` handles `token_hash` and `type`. The routes are disjoint, and keeping OAuth/code-flow callback alive does not interfere with PKCE email-link routing.
- Proposed fix: No fix needed.

## Finding F6 ??verifyOtp error redirects
- Severity: LOW
- Surface: [route.ts](C:/Users/yout4/yagi-studio/yagi-workshop/src/app/auth/confirm/route.ts:79)
- Verdict: PASS.
- Reasoning: Missing or invalid route payload goes to signin with a fixed error code. Supabase `verifyOtp` errors all redirect to `/ko/auth/expired` without leaking `error.message` into the URL.
- Proposed fix: No fix needed for leakage; optionally log server-side error codes for observability.

## Finding F7 ??Gmail crawler invariant is broken
- Severity: HIGH-B
- Surface: [route.ts](C:/Users/yout4/yagi-studio/yagi-workshop/src/app/auth/confirm/route.ts:85)
- Verdict: FAIL.
- Reasoning: A crawler GET with `token_hash` and `type` reaches `verifyOtp()` immediately. Because this route does not check the browser?셲 verifier cookie before verification, the crawler can still consume the single-use email token.
- Proposed fix: Gate `verifyOtp` on verifier-cookie presence or require a user-initiated POST from an intermediate page.

## Finding F8 ??Supabase Redirect URLs surface
- Severity: MED-A
- Surface: [signup page](C:/Users/yout4/yagi-studio/yagi-workshop/src/app/[locale]/(auth)/signup/page.tsx:22), [forgot page](C:/Users/yout4/yagi-studio/yagi-workshop/src/app/[locale]/(auth)/forgot-password/page.tsx:39)
- Verdict: PARTIAL.
- Reasoning: Supabase requires every `redirectTo` / `emailRedirectTo` value to match the Dashboard Redirect URLs allowlist. Current signup accepts almost any same-origin path, which either forces a broad Dashboard wildcard or causes signup failures for unlisted paths.
- Proposed fix: Align signup `sanitizeNext()` with `/auth/confirm`?셲 allowlist. Dashboard should include `SITE_URL`, plus final destinations such as `/onboarding/workspace`, `/onboarding/brand`, `/onboarding/invite`, `/app/**`, and `/reset-password` for each deployed origin.

## Finding F9 ??Recovery flow precedence
- Severity: MED-A
- Surface: [route.ts](C:/Users/yout4/yagi-studio/yagi-workshop/src/app/auth/confirm/route.ts:40), [route.ts](C:/Users/yout4/yagi-studio/yagi-workshop/src/app/auth/confirm/route.ts:111)
- Verdict: PARTIAL.
- Reasoning: `type === "recovery"` correctly overrides `next` and always lands on reset password. But `/reset-password` is also allowlisted as a generic `next`, so a non-recovery confirmation can land an authenticated user on the password reset form.
- Proposed fix: Remove `/reset-password` from the generic `NEXT_ALLOWLIST_PREFIXES`, or allow it only when `type === "recovery"`.

## Finding F10 ??Forgot-password redirectTo flip
- Severity: LOW
- Surface: [forgot page](C:/Users/yout4/yagi-studio/yagi-workshop/src/app/[locale]/(auth)/forgot-password/page.tsx:39), [route.ts](C:/Users/yout4/yagi-studio/yagi-workshop/src/app/auth/confirm/route.ts:111)
- Verdict: PASS, conditional on F1.
- Reasoning: `${siteUrl}/reset-password` is the right final destination for Supabase `{{ .RedirectTo }}` and must be allowlisted. The confirm route ignores `next` for recovery, so the final landing is stable, but crawler consumption remains broken until F1/F7 are fixed.
- Proposed fix: No recovery redirect fix needed beyond F1/F7 and Dashboard allowlist.

## Finding F11 ??Middleware PKCE flowType
- Severity: LOW
- Surface: [middleware client](C:/Users/yout4/yagi-studio/yagi-workshop/src/lib/supabase/middleware.ts:9)
- Verdict: PASS.
- Reasoning: `@supabase/ssr` already defaults both browser and server clients to PKCE, so explicitly setting `flowType: "pkce"` in middleware is parity, not a behavior change. `getUser()` refresh behavior remains cookie-backed through `setAll()`.
- Proposed fix: No fix needed for this wave.

## Finding F12 ??Set-Cookie redirect race
- Severity: LOW
- Surface: [server.ts](C:/Users/yout4/yagi-studio/yagi-workshop/src/lib/supabase/server.ts:20), [route.ts](C:/Users/yout4/yagi-studio/yagi-workshop/src/app/auth/confirm/route.ts:116)
- Verdict: PASS.
- Reasoning: In a Route Handler, `cookies()` is mutable, so Supabase auth state changes can emit `Set-Cookie` before the `NextResponse.redirect`. The browser processes those cookies before requesting the redirected locale URL.
- Proposed fix: No fix needed.

## Finding F13 ??Locale resolution
- Severity: LOW
- Surface: [route.ts](C:/Users/yout4/yagi-studio/yagi-workshop/src/app/auth/confirm/route.ts:95)
- Verdict: PASS.
- Reasoning: Locale is resolved after successful auth via `profiles.locale`, with a safe default to `ko` and only `en` accepted as an alternate. Recovery uses the same resolved locale and bypasses `next`, which is correct.
- Proposed fix: No fix needed.

References used: Supabase Email Templates docs for `TokenHash` / `RedirectTo` and server-side `verifyOtp` pattern: https://supabase.com/docs/guides/auth/auth-email-templates. Supabase Redirect URLs docs for `redirectTo` allowlist requirements: https://supabase.com/docs/guides/auth/redirect-urls.

Verdict: HIGH-A 0 / HIGH-B 2 / MED-A 3. Recommend FIX.
2026-05-03T11:35:30.703921Z ERROR codex_core::session: failed to record rollout items: thread 019ded9b-095b-7a70-b337-7fed37dd106d not found
tokens used
135,692
## Finding F1 ??PKCE verifier is not enforced
- Severity: HIGH-B
- Surface: [route.ts](C:/Users/yout4/yagi-studio/yagi-workshop/src/app/auth/confirm/route.ts:85), `node_modules/@supabase/auth-js/src/GoTrueClient.ts:2232`
- Verdict: FAIL.
- Reasoning: `verifyOtp({ type, token_hash })` is a valid Supabase signature, and Supabase documents this server-side token-hash pattern. But the installed `verifyOtp` implementation posts only `params` to `/verify`; it does not read or send `${storageKey}-code-verifier`. The only auth-js path that consumes `code_verifier` is `exchangeCodeForSession`, not `verifyOtp`.
- Proposed fix: Before calling `verifyOtp`, explicitly require the expected `*-auth-token-code-verifier` cookie, or change `/auth/confirm` to a user-initiated POST/interstitial so passive GETs never call `verifyOtp`.

## Finding F2 ??Absolute RedirectTo is dropped
- Severity: MED-A
- Surface: [page.tsx](C:/Users/yout4/yagi-studio/yagi-workshop/src/app/[locale]/(auth)/signup/page.tsx:67), [route.ts](C:/Users/yout4/yagi-studio/yagi-workshop/src/app/auth/confirm/route.ts:44)
- Verdict: FAIL.
- Reasoning: `emailRedirectTo` is built as an absolute URL like `https://site/app/...`, and Supabase exposes that as `{{ .RedirectTo }}`. `sanitizeNext()` only accepts strings starting with `/`, so the template?셲 `next={{ .RedirectTo }}` will be rejected and replaced with `/onboarding/workspace`.
- Proposed fix: Parse `next` with `new URL(raw, origin)`, require same-origin, then allowlist by `url.pathname` and return `pathname + search`.

## Finding F3 ??Open redirect through next
- Severity: LOW
- Surface: [route.ts](C:/Users/yout4/yagi-studio/yagi-workshop/src/app/auth/confirm/route.ts:44)
- Verdict: PASS.
- Reasoning: Protocol-relative `//evil.com`, absolute foreign URLs, `/api/...`, and non-allowlisted paths fall back. Locale stripping only normalizes `/ko/...` or `/en/...` before re-prefixing with the resolved profile locale.
- Proposed fix: No fix needed for open-redirect defense; apply F2 so same-origin absolute `RedirectTo` works.

## Finding F4 ??SSR code_verifier cookie persistence
- Severity: LOW
- Surface: [client.ts](C:/Users/yout4/yagi-studio/yagi-workshop/src/lib/supabase/client.ts:14), [server.ts](C:/Users/yout4/yagi-studio/yagi-workshop/src/lib/supabase/server.ts:16)
- Verdict: PASS for persistence, FAIL for enforcement covered by F1.
- Reasoning: `@supabase/ssr` browser storage writes cookies via `document.cookie`; defaults are `path: "/"`, `sameSite: "lax"`, and non-HttpOnly, so the route handler can read them. Server `getAll()` reads request cookies and `setAll()` can write auth cookies in a route handler.
- Proposed fix: No persistence fix needed; add verifier presence/enforcement before `verifyOtp`.

## Finding F5 ??Callback coexistence
- Severity: LOW
- Surface: [callback route](C:/Users/yout4/yagi-studio/yagi-workshop/src/app/auth/callback/route.ts:14), [confirm route](C:/Users/yout4/yagi-studio/yagi-workshop/src/app/auth/confirm/route.ts:73)
- Verdict: PASS.
- Reasoning: `/auth/callback` handles `code` and legacy error params; `/auth/confirm` handles `token_hash` and `type`. The routes are disjoint, and keeping OAuth/code-flow callback alive does not interfere with PKCE email-link routing.
- Proposed fix: No fix needed.

## Finding F6 ??verifyOtp error redirects
- Severity: LOW
- Surface: [route.ts](C:/Users/yout4/yagi-studio/yagi-workshop/src/app/auth/confirm/route.ts:79)
- Verdict: PASS.
- Reasoning: Missing or invalid route payload goes to signin with a fixed error code. Supabase `verifyOtp` errors all redirect to `/ko/auth/expired` without leaking `error.message` into the URL.
- Proposed fix: No fix needed for leakage; optionally log server-side error codes for observability.

## Finding F7 ??Gmail crawler invariant is broken
- Severity: HIGH-B
- Surface: [route.ts](C:/Users/yout4/yagi-studio/yagi-workshop/src/app/auth/confirm/route.ts:85)
- Verdict: FAIL.
- Reasoning: A crawler GET with `token_hash` and `type` reaches `verifyOtp()` immediately. Because this route does not check the browser?셲 verifier cookie before verification, the crawler can still consume the single-use email token.
- Proposed fix: Gate `verifyOtp` on verifier-cookie presence or require a user-initiated POST from an intermediate page.

## Finding F8 ??Supabase Redirect URLs surface
- Severity: MED-A
- Surface: [signup page](C:/Users/yout4/yagi-studio/yagi-workshop/src/app/[locale]/(auth)/signup/page.tsx:22), [forgot page](C:/Users/yout4/yagi-studio/yagi-workshop/src/app/[locale]/(auth)/forgot-password/page.tsx:39)
- Verdict: PARTIAL.
- Reasoning: Supabase requires every `redirectTo` / `emailRedirectTo` value to match the Dashboard Redirect URLs allowlist. Current signup accepts almost any same-origin path, which either forces a broad Dashboard wildcard or causes signup failures for unlisted paths.
- Proposed fix: Align signup `sanitizeNext()` with `/auth/confirm`?셲 allowlist. Dashboard should include `SITE_URL`, plus final destinations such as `/onboarding/workspace`, `/onboarding/brand`, `/onboarding/invite`, `/app/**`, and `/reset-password` for each deployed origin.

## Finding F9 ??Recovery flow precedence
- Severity: MED-A
- Surface: [route.ts](C:/Users/yout4/yagi-studio/yagi-workshop/src/app/auth/confirm/route.ts:40), [route.ts](C:/Users/yout4/yagi-studio/yagi-workshop/src/app/auth/confirm/route.ts:111)
- Verdict: PARTIAL.
- Reasoning: `type === "recovery"` correctly overrides `next` and always lands on reset password. But `/reset-password` is also allowlisted as a generic `next`, so a non-recovery confirmation can land an authenticated user on the password reset form.
- Proposed fix: Remove `/reset-password` from the generic `NEXT_ALLOWLIST_PREFIXES`, or allow it only when `type === "recovery"`.

## Finding F10 ??Forgot-password redirectTo flip
- Severity: LOW
- Surface: [forgot page](C:/Users/yout4/yagi-studio/yagi-workshop/src/app/[locale]/(auth)/forgot-password/page.tsx:39), [route.ts](C:/Users/yout4/yagi-studio/yagi-workshop/src/app/auth/confirm/route.ts:111)
- Verdict: PASS, conditional on F1.
- Reasoning: `${siteUrl}/reset-password` is the right final destination for Supabase `{{ .RedirectTo }}` and must be allowlisted. The confirm route ignores `next` for recovery, so the final landing is stable, but crawler consumption remains broken until F1/F7 are fixed.
- Proposed fix: No recovery redirect fix needed beyond F1/F7 and Dashboard allowlist.

## Finding F11 ??Middleware PKCE flowType
- Severity: LOW
- Surface: [middleware client](C:/Users/yout4/yagi-studio/yagi-workshop/src/lib/supabase/middleware.ts:9)
- Verdict: PASS.
- Reasoning: `@supabase/ssr` already defaults both browser and server clients to PKCE, so explicitly setting `flowType: "pkce"` in middleware is parity, not a behavior change. `getUser()` refresh behavior remains cookie-backed through `setAll()`.
- Proposed fix: No fix needed for this wave.

## Finding F12 ??Set-Cookie redirect race
- Severity: LOW
- Surface: [server.ts](C:/Users/yout4/yagi-studio/yagi-workshop/src/lib/supabase/server.ts:20), [route.ts](C:/Users/yout4/yagi-studio/yagi-workshop/src/app/auth/confirm/route.ts:116)
- Verdict: PASS.
- Reasoning: In a Route Handler, `cookies()` is mutable, so Supabase auth state changes can emit `Set-Cookie` before the `NextResponse.redirect`. The browser processes those cookies before requesting the redirected locale URL.
- Proposed fix: No fix needed.

## Finding F13 ??Locale resolution
- Severity: LOW
- Surface: [route.ts](C:/Users/yout4/yagi-studio/yagi-workshop/src/app/auth/confirm/route.ts:95)
- Verdict: PASS.
- Reasoning: Locale is resolved after successful auth via `profiles.locale`, with a safe default to `ko` and only `en` accepted as an alternate. Recovery uses the same resolved locale and bypasses `next`, which is correct.
- Proposed fix: No fix needed.

References used: Supabase Email Templates docs for `TokenHash` / `RedirectTo` and server-side `verifyOtp` pattern: https://supabase.com/docs/guides/auth/auth-email-templates. Supabase Redirect URLs docs for `redirectTo` allowlist requirements: https://supabase.com/docs/guides/auth/redirect-urls.

Verdict: HIGH-A 0 / HIGH-B 2 / MED-A 3. Recommend FIX.


2026-05-03T11:38:58.425721Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.4 seconds
Output:
Get-Content : 지정한 경로 src/app/[locale]/(auth)/signup/page.tsx에 개체가 없거나 -Include 또는 -Exclude 매개 변수로 필터링되었습니다.
위치 줄:2 문자:1
+ Get-Content -Raw 'src/app/[locale]/(auth)/signup/page.tsx'
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : ObjectNotFound: (System.String[]:String[]) [Get-Content], Exception
    + FullyQualifiedErrorId : ItemNotFound,Microsoft.PowerShell.Commands.GetContentCommand
 

 exited 1 in 437ms:
Get-Content : 지정한 경로 src/app/[locale]/(auth)/signup/page.tsx에 개체가 없거나 -Include 또는 -Exclude 매개 변수로 필터링되었습니다.
위치 줄:2 문자:1
+ Get-Content -Raw 'src/app/[locale]/(auth)/signup/page.tsx'
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : ObjectNotFound: (System.String[]:String[]) [Get-Content], Exception
    + FullyQualifiedErrorId : ItemNotFound,Microsoft.PowerShell.Commands.GetContentCommand
 

 succeeded in 737ms:
import { type EmailOtpType } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

// Phase 4.x Wave C.5c sub_01 ??PKCE intermediate confirm endpoint
// (Codex K-05 LOOP 1 fix for F1 + F7).
//
// Why an intermediate route ??and why GET renders HTML instead of
// verifying immediately:
// - Gmail / Outlook / corporate-mail link-preview crawlers GET email
//   links before users can click. If GET verified directly,
//   `verifyOtp({ token_hash, type })` would single-use-consume the
//   OTP and the user's real click would land on /auth/expired.
// - Supabase's `verifyOtp` does NOT enforce the PKCE code_verifier
//   cookie (only `exchangeCodeForSession` does). The only reliable
//   way to keep crawlers from draining the token is to require a
//   user-initiated POST: GET renders an HTML "Continue" button, the
//   button POSTs the same payload, and only then do we call
//   `verifyOtp`. Crawler GETs see HTML, no token consumption.
//
// Email-template change is a yagi MANUAL action (FU-C5c-01):
//   <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next={{ .RedirectTo }}">
// Same change for Magic Link + Reset Password templates.

// ---------- next param sanitisation (Codex F2 + F3 + F8 + F9 fix) ----------

const NEXT_ALLOWLIST_PREFIXES: readonly string[] = [
  "/onboarding/workspace",
  "/onboarding/brand",
  "/onboarding/invite",
  "/app",
];
const RECOVERY_NEXT = "/reset-password";
const DEFAULT_NEXT = "/onboarding/workspace";

function sanitizeNext(raw: string | null, origin: string, type: EmailOtpType): string {
  if (!raw) return type === "recovery" ? RECOVERY_NEXT : DEFAULT_NEXT;
  if (raw.length > 500) return DEFAULT_NEXT;

  // Accept either a relative path or a same-origin absolute URL ??Supabase
  // emits `{{ .RedirectTo }}` as an absolute URL when `emailRedirectTo` is
  // absolute (Codex F2: the prior version dropped these silently).
  let candidate: string;
  try {
    if (raw.startsWith("/") && !raw.startsWith("//")) {
      candidate = raw;
    } else {
      const parsed = new URL(raw, origin);
      if (parsed.origin !== origin) return DEFAULT_NEXT;
      candidate = parsed.pathname + parsed.search;
    }
  } catch {
    return DEFAULT_NEXT;
  }

  // Strip leading locale so the post-confirm redirect re-prefixes with the
  // verified user's profile.locale.
  const stripped = candidate.replace(/^\/(ko|en)(?=\/|$)/, "");
  const path = stripped.length === 0 ? DEFAULT_NEXT : stripped;
  const pathOnly = path.split("?")[0];

  // Recovery flow has its own allowlist (Codex F9: don't let a forged
  // signup link land an authenticated user on the password-reset form).
  if (type === "recovery") {
    return pathOnly === RECOVERY_NEXT || pathOnly.startsWith(`${RECOVERY_NEXT}/`)
      ? path
      : RECOVERY_NEXT;
  }

  for (const prefix of NEXT_ALLOWLIST_PREFIXES) {
    if (pathOnly === prefix || pathOnly.startsWith(`${prefix}/`)) {
      return path;
    }
  }
  return DEFAULT_NEXT;
}

const SUPPORTED_OTP_TYPES: readonly EmailOtpType[] = [
  "signup",
  "email",
  "recovery",
  "magiclink",
  "invite",
  "email_change",
];
function asOtpType(value: string | null): EmailOtpType | null {
  if (value === null) return null;
  return (SUPPORTED_OTP_TYPES as readonly string[]).includes(value)
    ? (value as EmailOtpType)
    : null;
}

// ---------- GET ??render intermediate HTML (no OTP consume) ----------

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = asOtpType(searchParams.get("type"));
  const rawNext = searchParams.get("next");

  if (!tokenHash || !type) {
    return NextResponse.redirect(`${origin}/ko/signin?error=missing_token_hash`);
  }

  // Pre-sanitise so the form can carry a clean value forward.
  const next = sanitizeNext(rawNext, origin, type);

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex,nofollow" />
<title>YAGI 쨌 ?대찓???몄쬆</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.css" />
<style>
  :root { color-scheme: light; }
  body { margin: 0; min-height: 100dvh; display: flex; align-items: center; justify-content: center; background: #FAFAFA; color: #0A0A0A; font-family: 'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif; }
  main { width: 100%; max-width: 420px; padding: 32px 24px; text-align: center; }
  h1 { margin: 0 0 12px; font-size: 28px; font-weight: 600; line-height: 1.2; letter-spacing: -0.02em; }
  p { margin: 0 0 28px; font-size: 14px; line-height: 1.5; color: #5C5C5C; }
  button { width: 100%; padding: 14px 24px; border: 0; border-radius: 12px; background: #71D083; color: #0A0A0A; font-size: 15px; font-weight: 600; cursor: pointer; font-family: inherit; }
  button:hover { filter: brightness(1.05); }
  noscript p { color: #B45309; }
</style>
</head>
<body>
<main>
  <h1>?대찓???몄쬆???꾨즺??二쇱꽭??/h1>
  <p>?꾨옒 踰꾪듉???꾨Ⅴ硫?媛?낆씠 ?꾨즺?섍퀬 ?뚰겕?ㅽ럹?댁뒪 留뚮뱾湲곕줈 ?대룞?⑸땲??</p>
  <form method="POST" action="/auth/confirm">
    <input type="hidden" name="token_hash" value="${escapeHtml(tokenHash)}" />
    <input type="hidden" name="type" value="${escapeHtml(type)}" />
    <input type="hidden" name="next" value="${escapeHtml(next)}" />
    <button type="submit">怨꾩냽?섍린 / Continue</button>
  </form>
</main>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // Defense vs accidental cache by intermediate proxies.
      "Cache-Control": "no-store",
      // Email-link surface; deny indexing.
      "X-Robots-Tag": "noindex,nofollow",
    },
  });
}

// ---------- POST ??actual verifyOtp consume ----------

export async function POST(request: NextRequest) {
  const { origin } = new URL(request.url);
  const form = await request.formData();
  const tokenHash = form.get("token_hash");
  const typeRaw = form.get("type");
  const nextRaw = form.get("next");

  if (typeof tokenHash !== "string" || typeof typeRaw !== "string") {
    return NextResponse.redirect(`${origin}/ko/signin?error=missing_token_hash`);
  }
  const type = asOtpType(typeRaw);
  if (!type) {
    return NextResponse.redirect(`${origin}/ko/signin?error=invalid_otp_type`);
  }
  const next = sanitizeNext(typeof nextRaw === "string" ? nextRaw : null, origin, type);

  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

  if (error) {
    // verifyOtp failure modes: expired / invalid / consumed. All map to
    // the user-facing "link expired, request a new one" surface.
    return NextResponse.redirect(`${origin}/ko/auth/expired`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/ko/signin?error=no_user`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("locale")
    .eq("id", user.id)
    .maybeSingle();
  const locale = profile?.locale === "en" ? "en" : "ko";

  if (type === "recovery") {
    return NextResponse.redirect(`${origin}/${locale}${RECOVERY_NEXT}`);
  }

  return NextResponse.redirect(`${origin}/${locale}${next}`);
}


codex
The confirm route is now the rewritten GET/POST version, and the old high issue is no longer the same shape: GET does not call `verifyOtp`. I need to re-read signup with `-LiteralPath` because PowerShell treated `[locale]` as a wildcard pattern, then I’ll check reset-password and line-number the relevant code.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -Raw -LiteralPath 'src/app/[locale]/(auth)/signup/page.tsx'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -Raw -LiteralPath 'src/app/[locale]/(auth)/reset-password/page.tsx'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src/app/auth/confirm/route.ts' | ForEach-Object { "'$i++; '"'{0,4}: {1}' -f "'$i, $_ }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src/app/[locale]/(auth)/signup/page.tsx' | ForEach-Object { "'$i++; '"'{0,4}: {1}' -f "'$i, $_ }' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 355ms:
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useRouter } from "@/i18n/routing";
import { createSupabaseBrowser } from "@/lib/supabase/client";

// Phase 2.8.1 G_B1-H (F-PUX-003): commission flow uses `?next=` to bring
// the user back to /app/commission/new after the email-confirm round-trip.
// Phase 4.x Wave C.5c sub_01 (Codex F8 fix): bound the accepted paths to
// the same allowlist used by /auth/confirm so the Supabase Dashboard
// "Redirect URLs" allowlist scope stays small + auditable.
const SIGNUP_NEXT_ALLOWLIST: readonly string[] = [
  "/onboarding/workspace",
  "/onboarding/brand",
  "/onboarding/invite",
  "/app",
];
function sanitizeNext(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/")) return null;
  if (raw.startsWith("//")) return null; // protocol-relative
  if (raw.startsWith("/auth/")) return null;
  if (raw.length > 500) return null;
  const pathOnly = raw.split("?")[0];
  for (const prefix of SIGNUP_NEXT_ALLOWLIST) {
    if (pathOnly === prefix || pathOnly.startsWith(`${prefix}/`)) return raw;
  }
  return null;
}

const schema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8),
    passwordConfirm: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    path: ["passwordConfirm"],
    message: "password_mismatch",
  });

type FormValues = z.infer<typeof schema>;

export default function SignUpPage() {
  const t = useTranslations("auth");
  const c = useTranslations("common");
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = sanitizeNext(searchParams.get("next"));
  const [submitting, setSubmitting] = useState(false);
  const [sentToEmail, setSentToEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  // Phase 4.x Wave C.5c sub_01 ??Under PKCE, the actual email-link path
  // is hard-coded in the Supabase Dashboard email template
  // (`{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&...`).
  // `emailRedirectTo` becomes the FINAL destination after verifyOtp
  // succeeds, embedded as `?next=` inside that template URL via the
  // `{{ .RedirectTo }}` template variable. So this URL is the
  // post-confirm landing, NOT the click target.
  function buildEmailRedirect(siteUrl: string): string {
    const base = `${siteUrl}/onboarding/workspace`;
    return next ? `${siteUrl}${next}` : base;
  }

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    const supabase = createSupabaseBrowser();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    const { error, data } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: { emailRedirectTo: buildEmailRedirect(siteUrl) },
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data.session) {
      // Email confirmation disabled in Supabase auth settings ??auto-login path.
      // Honor `next` here too so the in-product redirect mirrors the
      // email-confirm path.
      // Phase 4.x Wave C.5b sub_01: persona A ??direct to workspace creation.
      router.push((next ?? "/onboarding/workspace") as "/onboarding/workspace");
    } else {
      // Email confirmation enabled ??switch the page over to the sent-state view
      // instead of leaving the user on the form with only a toast.
      setSentToEmail(values.email);
    }
  }

  async function onResend() {
    if (!sentToEmail) return;
    setResending(true);
    const supabase = createSupabaseBrowser();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: sentToEmail,
      options: { emailRedirectTo: buildEmailRedirect(siteUrl) },
    });
    setResending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("signup_email_sent"));
  }

  // ---- Sent state ??shown after successful signUp() when email confirmation
  // is required by the project. The user stays on this view and follows the
  // mailbox link. This replaces the "toast-only and the form stays put"
  // behavior that read as a dead-end.
  // Phase 4.x Wave C.5b sub_07 ??verify-email screen on the v1.0 dark
  // editorial foundation. Headline + subtitle land on the editorial type
  // scale; the recipient block is a card-deep / border-subtle surface;
  // primary CTA is the sage "resend" beat, secondary is a calm ghost
  // button to switch addresses.
  if (sentToEmail) {
    return (
      <div className="space-y-8">
        <div className="space-y-3 text-center">
          <h1 className="font-display text-3xl tracking-tight keep-all">
            {t("check_your_email_title")}
          </h1>
          <p className="text-base ink-secondary leading-body keep-all">
            {t("check_your_email_sub")}
          </p>
        </div>

        <div className="rounded-card bg-card-deep border-subtle border p-6 text-sm space-y-4">
          <p className="ink-primary">
            <span className="ink-tertiary">{t("sent_to_label")}: </span>
            <span className="font-medium break-all">{sentToEmail}</span>
          </p>
          <ul className="text-sm ink-secondary space-y-2 leading-body">
            <li className="flex gap-2 keep-all">
              <span className="ink-tertiary">쨌</span>
              <span>{t("check_email_hint_inbox")}</span>
            </li>
            <li className="flex gap-2 keep-all">
              <span className="ink-tertiary">쨌</span>
              <span>{t("check_email_hint_spam")}</span>
            </li>
            <li className="flex gap-2 keep-all">
              <span className="ink-tertiary">쨌</span>
              <span>{t("check_email_hint_link")}</span>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <Button
            type="button"
            className="w-full bg-sage hover:brightness-105"
            size="lg"
            onClick={onResend}
            disabled={resending}
          >
            {resending ? t("sending") : t("resend_email")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            size="lg"
            onClick={() => setSentToEmail(null)}
          >
            {t("use_different_email")}
          </Button>
        </div>

        <p className="text-center text-sm ink-tertiary">
          {t("have_account")}{" "}
          <Link href="/signin" className="ink-primary hover:accent-sage transition-colors">
            {c("signin")}
          </Link>
        </p>
      </div>
    );
  }

  // ---- Default state ??signup form.
  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="font-display text-3xl tracking-tight">
          {t("signup_title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("signup_sub")}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">{t("email")}</Label>
          <Input
            id="email"
            type="email"
            placeholder={t("email_placeholder")}
            autoComplete="email"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">{t("password_label")}</Label>
          <Input
            id="password"
            type="password"
            placeholder={t("password_ph")}
            autoComplete="new-password"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="passwordConfirm">{t("password_confirm_label")}</Label>
          <Input
            id="passwordConfirm"
            type="password"
            autoComplete="new-password"
            {...register("passwordConfirm")}
          />
          {errors.passwordConfirm && (
            <p className="text-xs text-destructive">
              {errors.passwordConfirm.message === "password_mismatch"
                ? t("password_mismatch")
                : errors.passwordConfirm.message}
            </p>
          )}
        </div>
        <Button type="submit" className="w-full" size="lg" disabled={submitting}>
          {submitting ? t("sending") : c("signup")}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {t("have_account")}{" "}
        <Link href="/signin" className="text-foreground hover:underline">
          {c("signin")}
        </Link>
      </p>
    </div>
  );
}


 succeeded in 354ms:
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "@/i18n/routing";
import { createSupabaseBrowser } from "@/lib/supabase/client";

const schema = z
  .object({
    password: z.string().min(8),
    passwordConfirm: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    path: ["passwordConfirm"],
    message: "password_mismatch",
  });

type FormValues = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const t = useTranslations("auth");
  const c = useTranslations("common");
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    const supabase = createSupabaseBrowser();
    const { error } = await supabase.auth.updateUser({ password: values.password });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase.auth.signOut();
    router.push("/signin");
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="font-display text-3xl tracking-tight">
          {t("new_password_title")}
        </h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">{t("password_label")}</Label>
          <Input
            id="password"
            type="password"
            placeholder={t("password_ph")}
            autoComplete="new-password"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="passwordConfirm">{t("password_confirm_label")}</Label>
          <Input
            id="passwordConfirm"
            type="password"
            autoComplete="new-password"
            {...register("passwordConfirm")}
          />
          {errors.passwordConfirm && (
            <p className="text-xs text-destructive">
              {errors.passwordConfirm.message === "password_mismatch"
                ? t("password_mismatch")
                : errors.passwordConfirm.message}
            </p>
          )}
        </div>
        <Button type="submit" className="w-full" size="lg" disabled={submitting}>
          {submitting ? t("sending") : c("save")}
        </Button>
      </form>
    </div>
  );
}


 succeeded in 740ms:
   1: "use client";
   2: 
   3: import { useState } from "react";
   4: import { useTranslations } from "next-intl";
   5: import { useForm } from "react-hook-form";
   6: import { zodResolver } from "@hookform/resolvers/zod";
   7: import { z } from "zod";
   8: import { toast } from "sonner";
   9: import { useSearchParams } from "next/navigation";
  10: import { Button } from "@/components/ui/button";
  11: import { Input } from "@/components/ui/input";
  12: import { Label } from "@/components/ui/label";
  13: import { Link, useRouter } from "@/i18n/routing";
  14: import { createSupabaseBrowser } from "@/lib/supabase/client";
  15: 
  16: // Phase 2.8.1 G_B1-H (F-PUX-003): commission flow uses `?next=` to bring
  17: // the user back to /app/commission/new after the email-confirm round-trip.
  18: // Phase 4.x Wave C.5c sub_01 (Codex F8 fix): bound the accepted paths to
  19: // the same allowlist used by /auth/confirm so the Supabase Dashboard
  20: // "Redirect URLs" allowlist scope stays small + auditable.
  21: const SIGNUP_NEXT_ALLOWLIST: readonly string[] = [
  22:   "/onboarding/workspace",
  23:   "/onboarding/brand",
  24:   "/onboarding/invite",
  25:   "/app",
  26: ];
  27: function sanitizeNext(raw: string | null): string | null {
  28:   if (!raw) return null;
  29:   if (!raw.startsWith("/")) return null;
  30:   if (raw.startsWith("//")) return null; // protocol-relative
  31:   if (raw.startsWith("/auth/")) return null;
  32:   if (raw.length > 500) return null;
  33:   const pathOnly = raw.split("?")[0];
  34:   for (const prefix of SIGNUP_NEXT_ALLOWLIST) {
  35:     if (pathOnly === prefix || pathOnly.startsWith(`${prefix}/`)) return raw;
  36:   }
  37:   return null;
  38: }
  39: 
  40: const schema = z
  41:   .object({
  42:     email: z.string().email(),
  43:     password: z.string().min(8),
  44:     passwordConfirm: z.string(),
  45:   })
  46:   .refine((data) => data.password === data.passwordConfirm, {
  47:     path: ["passwordConfirm"],
  48:     message: "password_mismatch",
  49:   });
  50: 
  51: type FormValues = z.infer<typeof schema>;
  52: 
  53: export default function SignUpPage() {
  54:   const t = useTranslations("auth");
  55:   const c = useTranslations("common");
  56:   const router = useRouter();
  57:   const searchParams = useSearchParams();
  58:   const next = sanitizeNext(searchParams.get("next"));
  59:   const [submitting, setSubmitting] = useState(false);
  60:   const [sentToEmail, setSentToEmail] = useState<string | null>(null);
  61:   const [resending, setResending] = useState(false);
  62:   const {
  63:     register,
  64:     handleSubmit,
  65:     formState: { errors },
  66:   } = useForm<FormValues>({ resolver: zodResolver(schema) });
  67: 
  68:   // Phase 4.x Wave C.5c sub_01 ??Under PKCE, the actual email-link path
  69:   // is hard-coded in the Supabase Dashboard email template
  70:   // (`{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&...`).
  71:   // `emailRedirectTo` becomes the FINAL destination after verifyOtp
  72:   // succeeds, embedded as `?next=` inside that template URL via the
  73:   // `{{ .RedirectTo }}` template variable. So this URL is the
  74:   // post-confirm landing, NOT the click target.
  75:   function buildEmailRedirect(siteUrl: string): string {
  76:     const base = `${siteUrl}/onboarding/workspace`;
  77:     return next ? `${siteUrl}${next}` : base;
  78:   }
  79: 
  80:   async function onSubmit(values: FormValues) {
  81:     setSubmitting(true);
  82:     const supabase = createSupabaseBrowser();
  83:     const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
  84:     const { error, data } = await supabase.auth.signUp({
  85:       email: values.email,
  86:       password: values.password,
  87:       options: { emailRedirectTo: buildEmailRedirect(siteUrl) },
  88:     });
  89:     setSubmitting(false);
  90:     if (error) {
  91:       toast.error(error.message);
  92:       return;
  93:     }
  94:     if (data.session) {
  95:       // Email confirmation disabled in Supabase auth settings ??auto-login path.
  96:       // Honor `next` here too so the in-product redirect mirrors the
  97:       // email-confirm path.
  98:       // Phase 4.x Wave C.5b sub_01: persona A ??direct to workspace creation.
  99:       router.push((next ?? "/onboarding/workspace") as "/onboarding/workspace");
 100:     } else {
 101:       // Email confirmation enabled ??switch the page over to the sent-state view
 102:       // instead of leaving the user on the form with only a toast.
 103:       setSentToEmail(values.email);
 104:     }
 105:   }
 106: 
 107:   async function onResend() {
 108:     if (!sentToEmail) return;
 109:     setResending(true);
 110:     const supabase = createSupabaseBrowser();
 111:     const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
 112:     const { error } = await supabase.auth.resend({
 113:       type: "signup",
 114:       email: sentToEmail,
 115:       options: { emailRedirectTo: buildEmailRedirect(siteUrl) },
 116:     });
 117:     setResending(false);
 118:     if (error) {
 119:       toast.error(error.message);
 120:       return;
 121:     }
 122:     toast.success(t("signup_email_sent"));
 123:   }
 124: 
 125:   // ---- Sent state ??shown after successful signUp() when email confirmation
 126:   // is required by the project. The user stays on this view and follows the
 127:   // mailbox link. This replaces the "toast-only and the form stays put"
 128:   // behavior that read as a dead-end.
 129:   // Phase 4.x Wave C.5b sub_07 ??verify-email screen on the v1.0 dark
 130:   // editorial foundation. Headline + subtitle land on the editorial type
 131:   // scale; the recipient block is a card-deep / border-subtle surface;
 132:   // primary CTA is the sage "resend" beat, secondary is a calm ghost
 133:   // button to switch addresses.
 134:   if (sentToEmail) {
 135:     return (
 136:       <div className="space-y-8">
 137:         <div className="space-y-3 text-center">
 138:           <h1 className="font-display text-3xl tracking-tight keep-all">
 139:             {t("check_your_email_title")}
 140:           </h1>
 141:           <p className="text-base ink-secondary leading-body keep-all">
 142:             {t("check_your_email_sub")}
 143:           </p>
 144:         </div>
 145: 
 146:         <div className="rounded-card bg-card-deep border-subtle border p-6 text-sm space-y-4">
 147:           <p className="ink-primary">
 148:             <span className="ink-tertiary">{t("sent_to_label")}: </span>
 149:             <span className="font-medium break-all">{sentToEmail}</span>
 150:           </p>
 151:           <ul className="text-sm ink-secondary space-y-2 leading-body">
 152:             <li className="flex gap-2 keep-all">
 153:               <span className="ink-tertiary">쨌</span>
 154:               <span>{t("check_email_hint_inbox")}</span>
 155:             </li>
 156:             <li className="flex gap-2 keep-all">
 157:               <span className="ink-tertiary">쨌</span>
 158:               <span>{t("check_email_hint_spam")}</span>
 159:             </li>
 160:             <li className="flex gap-2 keep-all">
 161:               <span className="ink-tertiary">쨌</span>
 162:               <span>{t("check_email_hint_link")}</span>
 163:             </li>
 164:           </ul>
 165:         </div>
 166: 
 167:         <div className="space-y-3">
 168:           <Button
 169:             type="button"
 170:             className="w-full bg-sage hover:brightness-105"
 171:             size="lg"
 172:             onClick={onResend}
 173:             disabled={resending}
 174:           >
 175:             {resending ? t("sending") : t("resend_email")}
 176:           </Button>
 177:           <Button
 178:             type="button"
 179:             variant="ghost"
 180:             className="w-full"
 181:             size="lg"
 182:             onClick={() => setSentToEmail(null)}
 183:           >
 184:             {t("use_different_email")}
 185:           </Button>
 186:         </div>
 187: 
 188:         <p className="text-center text-sm ink-tertiary">
 189:           {t("have_account")}{" "}
 190:           <Link href="/signin" className="ink-primary hover:accent-sage transition-colors">
 191:             {c("signin")}
 192:           </Link>
 193:         </p>
 194:       </div>
 195:     );
 196:   }
 197: 
 198:   // ---- Default state ??signup form.
 199:   return (
 200:     <div className="space-y-8">
 201:       <div className="space-y-2 text-center">
 202:         <h1 className="font-display text-3xl tracking-tight">
 203:           {t("signup_title")}
 204:         </h1>
 205:         <p className="text-sm text-muted-foreground">{t("signup_sub")}</p>
 206:       </div>
 207: 
 208:       <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
 209:         <div className="space-y-2">
 210:           <Label htmlFor="email">{t("email")}</Label>
 211:           <Input
 212:             id="email"
 213:             type="email"
 214:             placeholder={t("email_placeholder")}
 215:             autoComplete="email"
 216:             {...register("email")}
 217:           />
 218:           {errors.email && (
 219:             <p className="text-xs text-destructive">{errors.email.message}</p>
 220:           )}
 221:         </div>
 222:         <div className="space-y-2">
 223:           <Label htmlFor="password">{t("password_label")}</Label>
 224:           <Input
 225:             id="password"
 226:             type="password"
 227:             placeholder={t("password_ph")}
 228:             autoComplete="new-password"
 229:             {...register("password")}
 230:           />
 231:           {errors.password && (
 232:             <p className="text-xs text-destructive">{errors.password.message}</p>
 233:           )}
 234:         </div>
 235:         <div className="space-y-2">
 236:           <Label htmlFor="passwordConfirm">{t("password_confirm_label")}</Label>
 237:           <Input
 238:             id="passwordConfirm"
 239:             type="password"
 240:             autoComplete="new-password"
 241:             {...register("passwordConfirm")}
 242:           />
 243:           {errors.passwordConfirm && (
 244:             <p className="text-xs text-destructive">
 245:               {errors.passwordConfirm.message === "password_mismatch"
 246:                 ? t("password_mismatch")
 247:                 : errors.passwordConfirm.message}
 248:             </p>
 249:           )}
 250:         </div>
 251:         <Button type="submit" className="w-full" size="lg" disabled={submitting}>
 252:           {submitting ? t("sending") : c("signup")}
 253:         </Button>
 254:       </form>
 255: 
 256:       <p className="text-center text-sm text-muted-foreground">
 257:         {t("have_account")}{" "}
 258:         <Link href="/signin" className="text-foreground hover:underline">
 259:           {c("signin")}
 260:         </Link>
 261:       </p>
 262:     </div>
 263:   );
 264: }

 succeeded in 766ms:
   1: import { type EmailOtpType } from "@supabase/supabase-js";
   2: import { NextRequest, NextResponse } from "next/server";
   3: import { createSupabaseServer } from "@/lib/supabase/server";
   4: 
   5: // Phase 4.x Wave C.5c sub_01 ??PKCE intermediate confirm endpoint
   6: // (Codex K-05 LOOP 1 fix for F1 + F7).
   7: //
   8: // Why an intermediate route ??and why GET renders HTML instead of
   9: // verifying immediately:
  10: // - Gmail / Outlook / corporate-mail link-preview crawlers GET email
  11: //   links before users can click. If GET verified directly,
  12: //   `verifyOtp({ token_hash, type })` would single-use-consume the
  13: //   OTP and the user's real click would land on /auth/expired.
  14: // - Supabase's `verifyOtp` does NOT enforce the PKCE code_verifier
  15: //   cookie (only `exchangeCodeForSession` does). The only reliable
  16: //   way to keep crawlers from draining the token is to require a
  17: //   user-initiated POST: GET renders an HTML "Continue" button, the
  18: //   button POSTs the same payload, and only then do we call
  19: //   `verifyOtp`. Crawler GETs see HTML, no token consumption.
  20: //
  21: // Email-template change is a yagi MANUAL action (FU-C5c-01):
  22: //   <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next={{ .RedirectTo }}">
  23: // Same change for Magic Link + Reset Password templates.
  24: 
  25: // ---------- next param sanitisation (Codex F2 + F3 + F8 + F9 fix) ----------
  26: 
  27: const NEXT_ALLOWLIST_PREFIXES: readonly string[] = [
  28:   "/onboarding/workspace",
  29:   "/onboarding/brand",
  30:   "/onboarding/invite",
  31:   "/app",
  32: ];
  33: const RECOVERY_NEXT = "/reset-password";
  34: const DEFAULT_NEXT = "/onboarding/workspace";
  35: 
  36: function sanitizeNext(raw: string | null, origin: string, type: EmailOtpType): string {
  37:   if (!raw) return type === "recovery" ? RECOVERY_NEXT : DEFAULT_NEXT;
  38:   if (raw.length > 500) return DEFAULT_NEXT;
  39: 
  40:   // Accept either a relative path or a same-origin absolute URL ??Supabase
  41:   // emits `{{ .RedirectTo }}` as an absolute URL when `emailRedirectTo` is
  42:   // absolute (Codex F2: the prior version dropped these silently).
  43:   let candidate: string;
  44:   try {
  45:     if (raw.startsWith("/") && !raw.startsWith("//")) {
  46:       candidate = raw;
  47:     } else {
  48:       const parsed = new URL(raw, origin);
  49:       if (parsed.origin !== origin) return DEFAULT_NEXT;
  50:       candidate = parsed.pathname + parsed.search;
  51:     }
  52:   } catch {
  53:     return DEFAULT_NEXT;
  54:   }
  55: 
  56:   // Strip leading locale so the post-confirm redirect re-prefixes with the
  57:   // verified user's profile.locale.
  58:   const stripped = candidate.replace(/^\/(ko|en)(?=\/|$)/, "");
  59:   const path = stripped.length === 0 ? DEFAULT_NEXT : stripped;
  60:   const pathOnly = path.split("?")[0];
  61: 
  62:   // Recovery flow has its own allowlist (Codex F9: don't let a forged
  63:   // signup link land an authenticated user on the password-reset form).
  64:   if (type === "recovery") {
  65:     return pathOnly === RECOVERY_NEXT || pathOnly.startsWith(`${RECOVERY_NEXT}/`)
  66:       ? path
  67:       : RECOVERY_NEXT;
  68:   }
  69: 
  70:   for (const prefix of NEXT_ALLOWLIST_PREFIXES) {
  71:     if (pathOnly === prefix || pathOnly.startsWith(`${prefix}/`)) {
  72:       return path;
  73:     }
  74:   }
  75:   return DEFAULT_NEXT;
  76: }
  77: 
  78: const SUPPORTED_OTP_TYPES: readonly EmailOtpType[] = [
  79:   "signup",
  80:   "email",
  81:   "recovery",
  82:   "magiclink",
  83:   "invite",
  84:   "email_change",
  85: ];
  86: function asOtpType(value: string | null): EmailOtpType | null {
  87:   if (value === null) return null;
  88:   return (SUPPORTED_OTP_TYPES as readonly string[]).includes(value)
  89:     ? (value as EmailOtpType)
  90:     : null;
  91: }
  92: 
  93: // ---------- GET ??render intermediate HTML (no OTP consume) ----------
  94: 
  95: function escapeHtml(s: string): string {
  96:   return s
  97:     .replace(/&/g, "&amp;")
  98:     .replace(/</g, "&lt;")
  99:     .replace(/>/g, "&gt;")
 100:     .replace(/"/g, "&quot;")
 101:     .replace(/'/g, "&#39;");
 102: }
 103: 
 104: export async function GET(request: NextRequest) {
 105:   const { searchParams, origin } = new URL(request.url);
 106:   const tokenHash = searchParams.get("token_hash");
 107:   const type = asOtpType(searchParams.get("type"));
 108:   const rawNext = searchParams.get("next");
 109: 
 110:   if (!tokenHash || !type) {
 111:     return NextResponse.redirect(`${origin}/ko/signin?error=missing_token_hash`);
 112:   }
 113: 
 114:   // Pre-sanitise so the form can carry a clean value forward.
 115:   const next = sanitizeNext(rawNext, origin, type);
 116: 
 117:   const html = `<!DOCTYPE html>
 118: <html lang="ko">
 119: <head>
 120: <meta charset="utf-8" />
 121: <meta name="viewport" content="width=device-width, initial-scale=1" />
 122: <meta name="robots" content="noindex,nofollow" />
 123: <title>YAGI 쨌 ?대찓???몄쬆</title>
 124: <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.css" />
 125: <style>
 126:   :root { color-scheme: light; }
 127:   body { margin: 0; min-height: 100dvh; display: flex; align-items: center; justify-content: center; background: #FAFAFA; color: #0A0A0A; font-family: 'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif; }
 128:   main { width: 100%; max-width: 420px; padding: 32px 24px; text-align: center; }
 129:   h1 { margin: 0 0 12px; font-size: 28px; font-weight: 600; line-height: 1.2; letter-spacing: -0.02em; }
 130:   p { margin: 0 0 28px; font-size: 14px; line-height: 1.5; color: #5C5C5C; }
 131:   button { width: 100%; padding: 14px 24px; border: 0; border-radius: 12px; background: #71D083; color: #0A0A0A; font-size: 15px; font-weight: 600; cursor: pointer; font-family: inherit; }
 132:   button:hover { filter: brightness(1.05); }
 133:   noscript p { color: #B45309; }
 134: </style>
 135: </head>
 136: <body>
 137: <main>
 138:   <h1>?대찓???몄쬆???꾨즺??二쇱꽭??/h1>
 139:   <p>?꾨옒 踰꾪듉???꾨Ⅴ硫?媛?낆씠 ?꾨즺?섍퀬 ?뚰겕?ㅽ럹?댁뒪 留뚮뱾湲곕줈 ?대룞?⑸땲??</p>
 140:   <form method="POST" action="/auth/confirm">
 141:     <input type="hidden" name="token_hash" value="${escapeHtml(tokenHash)}" />
 142:     <input type="hidden" name="type" value="${escapeHtml(type)}" />
 143:     <input type="hidden" name="next" value="${escapeHtml(next)}" />
 144:     <button type="submit">怨꾩냽?섍린 / Continue</button>
 145:   </form>
 146: </main>
 147: </body>
 148: </html>`;
 149: 
 150:   return new NextResponse(html, {
 151:     status: 200,
 152:     headers: {
 153:       "Content-Type": "text/html; charset=utf-8",
 154:       // Defense vs accidental cache by intermediate proxies.
 155:       "Cache-Control": "no-store",
 156:       // Email-link surface; deny indexing.
 157:       "X-Robots-Tag": "noindex,nofollow",
 158:     },
 159:   });
 160: }
 161: 
 162: // ---------- POST ??actual verifyOtp consume ----------
 163: 
 164: export async function POST(request: NextRequest) {
 165:   const { origin } = new URL(request.url);
 166:   const form = await request.formData();
 167:   const tokenHash = form.get("token_hash");
 168:   const typeRaw = form.get("type");
 169:   const nextRaw = form.get("next");
 170: 
 171:   if (typeof tokenHash !== "string" || typeof typeRaw !== "string") {
 172:     return NextResponse.redirect(`${origin}/ko/signin?error=missing_token_hash`);
 173:   }
 174:   const type = asOtpType(typeRaw);
 175:   if (!type) {
 176:     return NextResponse.redirect(`${origin}/ko/signin?error=invalid_otp_type`);
 177:   }
 178:   const next = sanitizeNext(typeof nextRaw === "string" ? nextRaw : null, origin, type);
 179: 
 180:   const supabase = await createSupabaseServer();
 181:   const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
 182: 
 183:   if (error) {
 184:     // verifyOtp failure modes: expired / invalid / consumed. All map to
 185:     // the user-facing "link expired, request a new one" surface.
 186:     return NextResponse.redirect(`${origin}/ko/auth/expired`);
 187:   }
 188: 
 189:   const {
 190:     data: { user },
 191:   } = await supabase.auth.getUser();
 192:   if (!user) {
 193:     return NextResponse.redirect(`${origin}/ko/signin?error=no_user`);
 194:   }
 195: 
 196:   const { data: profile } = await supabase
 197:     .from("profiles")
 198:     .select("locale")
 199:     .eq("id", user.id)
 200:     .maybeSingle();
 201:   const locale = profile?.locale === "en" ? "en" : "ko";
 202: 
 203:   if (type === "recovery") {
 204:     return NextResponse.redirect(`${origin}/${locale}${RECOVERY_NEXT}`);
 205:   }
 206: 
 207:   return NextResponse.redirect(`${origin}/${locale}${next}`);
 208: }

codex
The updated signup page is narrowed to the same non-recovery allowlist. One thing that stands out in the confirm HTML is not security-critical but worth checking: the rendered Korean copy appears mojibaked in shell output, and I’m going to verify whether that is only console encoding or actually malformed source.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src/app/[locale]/(auth)/reset-password/page.tsx' | ForEach-Object { "'$i++; '"'{0,4}: {1}' -f "'$i, $_ }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"h1|POST|X-Frame|Content-Security|verifyOtp|flowType|code-verifier|code_verifier|sanitizeNext|reset-password|NEXT_ALLOWLIST|RECOVERY_NEXT\" src/app/auth/confirm/route.ts src/app/[locale]/\\(auth\\)/signup/page.tsx src/app/[locale]/\\(auth\\)/reset-password/page.tsx src/lib/supabase/client.ts src/lib/supabase/server.ts src/lib/supabase/middleware.ts node_modules/@supabase -g \"*.ts\" -g \"*.js\"" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Format-Hex -Path 'src/app/auth/confirm/route.ts' -Count 4096 | Out-String" in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 311ms:
   1: "use client";
   2: 
   3: import { useState } from "react";
   4: import { useTranslations } from "next-intl";
   5: import { useForm } from "react-hook-form";
   6: import { zodResolver } from "@hookform/resolvers/zod";
   7: import { z } from "zod";
   8: import { toast } from "sonner";
   9: import { Button } from "@/components/ui/button";
  10: import { Input } from "@/components/ui/input";
  11: import { Label } from "@/components/ui/label";
  12: import { useRouter } from "@/i18n/routing";
  13: import { createSupabaseBrowser } from "@/lib/supabase/client";
  14: 
  15: const schema = z
  16:   .object({
  17:     password: z.string().min(8),
  18:     passwordConfirm: z.string(),
  19:   })
  20:   .refine((data) => data.password === data.passwordConfirm, {
  21:     path: ["passwordConfirm"],
  22:     message: "password_mismatch",
  23:   });
  24: 
  25: type FormValues = z.infer<typeof schema>;
  26: 
  27: export default function ResetPasswordPage() {
  28:   const t = useTranslations("auth");
  29:   const c = useTranslations("common");
  30:   const router = useRouter();
  31:   const [submitting, setSubmitting] = useState(false);
  32:   const {
  33:     register,
  34:     handleSubmit,
  35:     formState: { errors },
  36:   } = useForm<FormValues>({ resolver: zodResolver(schema) });
  37: 
  38:   async function onSubmit(values: FormValues) {
  39:     setSubmitting(true);
  40:     const supabase = createSupabaseBrowser();
  41:     const { error } = await supabase.auth.updateUser({ password: values.password });
  42:     setSubmitting(false);
  43:     if (error) {
  44:       toast.error(error.message);
  45:       return;
  46:     }
  47:     await supabase.auth.signOut();
  48:     router.push("/signin");
  49:   }
  50: 
  51:   return (
  52:     <div className="space-y-8">
  53:       <div className="space-y-2 text-center">
  54:         <h1 className="font-display text-3xl tracking-tight">
  55:           {t("new_password_title")}
  56:         </h1>
  57:       </div>
  58: 
  59:       <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
  60:         <div className="space-y-2">
  61:           <Label htmlFor="password">{t("password_label")}</Label>
  62:           <Input
  63:             id="password"
  64:             type="password"
  65:             placeholder={t("password_ph")}
  66:             autoComplete="new-password"
  67:             {...register("password")}
  68:           />
  69:           {errors.password && (
  70:             <p className="text-xs text-destructive">{errors.password.message}</p>
  71:           )}
  72:         </div>
  73:         <div className="space-y-2">
  74:           <Label htmlFor="passwordConfirm">{t("password_confirm_label")}</Label>
  75:           <Input
  76:             id="passwordConfirm"
  77:             type="password"
  78:             autoComplete="new-password"
  79:             {...register("passwordConfirm")}
  80:           />
  81:           {errors.passwordConfirm && (
  82:             <p className="text-xs text-destructive">
  83:               {errors.passwordConfirm.message === "password_mismatch"
  84:                 ? t("password_mismatch")
  85:                 : errors.passwordConfirm.message}
  86:             </p>
  87:           )}
  88:         </div>
  89:         <Button type="submit" className="w-full" size="lg" disabled={submitting}>
  90:           {submitting ? t("sending") : c("save")}
  91:         </Button>
  92:       </form>
  93:     </div>
  94:   );
  95: }

2026-05-03T11:40:05.971311Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.5 seconds
Output:
auth\ : The term 'auth\' is not recognized as the name of a cmdlet, function, script file, or operable program. Check t
he spelling of the name, or if a path was included, verify that the path is correct and try again.
At line:2 char:195
+ ... _NEXT" src/app/auth/confirm/route.ts src/app/[locale]/\(auth\)/signup ...
+                                                             ~~~~~
    + CategoryInfo          : ObjectNotFound: (auth\:String) [], CommandNotFoundException
    + FullyQualifiedErrorId : CommandNotFoundException
 

 exited 1 in 539ms:
auth\ : The term 'auth\' is not recognized as the name of a cmdlet, function, script file, or operable program. Check t
he spelling of the name, or if a path was included, verify that the path is correct and try again.
At line:2 char:195
+ ... _NEXT" src/app/auth/confirm/route.ts src/app/[locale]/\(auth\)/signup ...
+                                                             ~~~~~
    + CategoryInfo          : ObjectNotFound: (auth\:String) [], CommandNotFoundException
    + FullyQualifiedErrorId : CommandNotFoundException
 

2026-05-03T11:40:06.328973Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.9 seconds
Output:
Format-Hex : A parameter cannot be found that matches parameter name 'Count'.
At line:2 char:50
+ Format-Hex -Path 'src/app/auth/confirm/route.ts' -Count 4096 | Out-St ...
+                                                  ~~~~~~
    + CategoryInfo          : InvalidArgument: (:) [Format-Hex], ParameterBindingException
    + FullyQualifiedErrorId : NamedParameterNotFound,Format-Hex
 

 exited 1 in 886ms:
Format-Hex : A parameter cannot be found that matches parameter name 'Count'.
At line:2 char:50
+ Format-Hex -Path 'src/app/auth/confirm/route.ts' -Count 4096 | Out-St ...
+                                                  ~~~~~~
    + CategoryInfo          : InvalidArgument: (:) [Format-Hex], ParameterBindingException
    + FullyQualifiedErrorId : NamedParameterNotFound,Format-Hex
 

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'rg -n "verifyOtp|code[_-]verifier|flowType|exchangeCodeForSession" node_modules/@supabase -g "*.ts" -g "*.js"' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Select-String -LiteralPath 'src/app/auth/confirm/route.ts' -Pattern '<h1>|</h1>|<p>|</p>|X-Frame|Content-Security|form method|verifyOtp|sanitizeNext|RECOVERY_NEXT|robots' -Context 0,0 | ForEach-Object { '{0}: {1}' -f "'$_.LineNumber, $_.Line }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; $text = [System.IO.File]::ReadAllText('"'src/app/auth/confirm/route.ts',[System.Text.Encoding]::UTF8); ("'$text -split "`n") | Select-Object -Index 117,122,137,138,139,143 | ForEach-Object { $_ }' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 595ms:
12: //   `verifyOtp({ token_hash, type })` would single-use-consume the
14: // - Supabase's `verifyOtp` does NOT enforce the PKCE code_verifier
19: //   `verifyOtp`. Crawler GETs see HTML, no token consumption.
33: const RECOVERY_NEXT = "/reset-password";
36: function sanitizeNext(raw: string | null, origin: string, type: EmailOtpType): string {
37:   if (!raw) return type === "recovery" ? RECOVERY_NEXT : DEFAULT_NEXT;
65:     return pathOnly === RECOVERY_NEXT || pathOnly.startsWith(`${RECOVERY_NEXT}/`)
67:       : RECOVERY_NEXT;
115:   const next = sanitizeNext(rawNext, origin, type);
122: <meta name="robots" content="noindex,nofollow" />
138:   <h1>이메일 인증을 완료해 주세요</h1>
139:   <p>아래 버튼을 누르면 가입이 완료되고 워크스페이스 만들기로 이동합니다.</p>
140:   <form method="POST" action="/auth/confirm">
157:       "X-Robots-Tag": "noindex,nofollow",
162: // ---------- POST — actual verifyOtp consume ----------
178:   const next = sanitizeNext(typeof nextRaw === "string" ? nextRaw : null, origin, type);
181:   const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
184:     // verifyOtp failure modes: expired / invalid / consumed. All map to
204:     return NextResponse.redirect(`${origin}/${locale}${RECOVERY_NEXT}`);

 succeeded in 830ms:
<html lang="ko">
<title>YAGI · 이메일 인증</title>
  <h1>이메일 인증을 완료해 주세요</h1>
  <p>아래 버튼을 누르면 가입이 완료되고 워크스페이스 만들기로 이동합니다.</p>
  <form method="POST" action="/auth/confirm">
    <button type="submit">계속하기 / Continue</button>

2026-05-03T11:40:19.157931Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.9 seconds
Output:

 exited 1 in 867ms:
codex
The apparent malformed Korean was only console encoding; the UTF-8 source has valid headings and tags. I’m also checking the installed Supabase package shape now so the PKCE/`verifyOtp` assertion is grounded in local dependency code.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'rg --files node_modules/@supabase | Select-Object -First 80' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -Raw -LiteralPath 'package.json'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'rg -n "verifyOtp|code-verifier|code_verifier|flowType|exchangeCodeForSession" node_modules -g "*.js" -g "*.mjs" -g "*.cjs" -g "*.d.ts"' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 547ms:
{
  "name": "yagi-workshop",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3003",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "lint:rsc-form-action": "node scripts/test-rsc-form-action-rule.mjs",
    "check:rsc-form-action": "bash scripts/check-rsc-form-action.sh",
    "verify:rsc-form-action": "pnpm check:rsc-form-action && pnpm lint:rsc-form-action",
    "test:ssrf-defense": "node scripts/test-ssrf-defense.mjs",
    "test:saveversion-race": "node scripts/test-saveversion-race.mjs",
    "test:r2-brief-asset": "node scripts/test-r2-brief-asset.mjs",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "prepare": "husky"
  },
  "dependencies": {
    "@aws-sdk/client-s3": "^3.1035.0",
    "@aws-sdk/s3-request-presigner": "^3.1035.0",
    "@base-ui/react": "^1.4.1",
    "@dnd-kit/core": "^6.3.1",
    "@dnd-kit/sortable": "^10.0.0",
    "@hookform/resolvers": "^5.2.2",
    "@radix-ui/react-alert-dialog": "^1.1.15",
    "@radix-ui/react-avatar": "^1.1.11",
    "@radix-ui/react-checkbox": "^1.3.3",
    "@radix-ui/react-dialog": "^1.1.15",
    "@radix-ui/react-dropdown-menu": "^2.1.16",
    "@radix-ui/react-label": "^2.1.8",
    "@radix-ui/react-popover": "^1.1.15",
    "@radix-ui/react-radio-group": "^1.3.8",
    "@radix-ui/react-scroll-area": "^1.2.10",
    "@radix-ui/react-select": "^2.2.6",
    "@radix-ui/react-separator": "^1.1.8",
    "@radix-ui/react-slot": "^1.2.4",
    "@radix-ui/react-switch": "^1.2.6",
    "@radix-ui/react-tabs": "^1.1.13",
    "@radix-ui/react-tooltip": "^1.2.8",
    "@react-email/components": "^1.0.12",
    "@react-email/render": "^2.0.7",
    "@supabase/ssr": "^0.10.2",
    "@supabase/supabase-js": "^2.104.0",
    "@tanstack/react-query": "^5.99.2",
    "@tanstack/react-query-devtools": "^5.99.2",
    "@tiptap/core": "3.22.4",
    "@tiptap/pm": "3.22.4",
    "@tiptap/react": "3.22.4",
    "@tiptap/starter-kit": "3.22.4",
    "@tiptap/suggestion": "3.22.4",
    "@tldraw/tldraw": "^4.5.10",
    "@vercel/og": "^0.11.1",
    "bcryptjs": "^3.0.3",
    "cheerio": "1.2.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "cmdk": "^1.1.1",
    "date-fns": "^4.1.0",
    "framer-motion": "^12.38.0",
    "google-auth-library": "^10.6.2",
    "lucide-react": "^1.8.0",
    "next": "15.5.0",
    "next-intl": "^4.9.1",
    "next-themes": "^0.4.6",
    "pdfjs-dist": "^5.6.205",
    "react": "19.1.0",
    "react-day-picker": "^9.14.0",
    "react-dom": "19.1.0",
    "react-dropzone": "^15.0.0",
    "react-hook-form": "^7.73.1",
    "react-image-crop": "^11.0.10",
    "react-markdown": "^10.1.0",
    "rehype-sanitize": "^6.0.0",
    "resend": "^6.12.2",
    "shadcn": "^4.3.1",
    "slugify": "^1.6.9",
    "sonner": "^2.0.7",
    "tailwind-merge": "^3.5.0",
    "tailwindcss-animate": "^1.0.7",
    "tippy.js": "6.3.7",
    "tw-animate-css": "^1.4.0",
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "@content-collections/core": "^0.15.0",
    "@content-collections/mdx": "^0.2.2",
    "@content-collections/next": "^0.2.11",
    "@eslint/eslintrc": "^3",
    "@playwright/test": "1.55.0",
    "@types/bcryptjs": "^3.0.0",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@types/react-dropzone": "^5.1.0",
    "autoprefixer": "^10.5.0",
    "eslint": "^9",
    "eslint-config-next": "15.5.0",
    "husky": "^9.1.7",
    "postcss": "^8.4.31",
    "sharp": "^0.34.5",
    "tailwindcss": "^3.4.19",
    "typescript": "^5"
  }
}


2026-05-03T11:40:27.250875Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.6 seconds
Output:

 exited 1 in 551ms:
2026-05-03T11:40:27.288467Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.6 seconds
Output:

 exited 1 in 622ms:
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src/lib/supabase/server.ts' | ForEach-Object { "'$i++; '"'{0,4}: {1}' -f "'$i, $_ }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src/lib/supabase/client.ts' | ForEach-Object { "'$i++; '"'{0,4}: {1}' -f "'$i, $_ }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src/lib/supabase/middleware.ts' | ForEach-Object { "'$i++; '"'{0,4}: {1}' -f "'$i, $_ }' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 403ms:
   1: import { createServerClient } from "@supabase/ssr";
   2: import { cookies } from "next/headers";
   3: import type { Database } from "@/lib/supabase/database.types";
   4: 
   5: export async function createSupabaseServer() {
   6:   const cookieStore = await cookies();
   7:   return createServerClient<Database>(
   8:     process.env.NEXT_PUBLIC_SUPABASE_URL!,
   9:     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  10:     {
  11:       // Phase 4.x Wave C.5c sub_01 ??PKCE flow. Mirrors client.ts so
  12:       // /auth/confirm's verifyOtp call finds the matching code_verifier
  13:       // cookie set by signUp() at signup time. See client.ts for the
  14:       // Gmail-crawler rationale.
  15:       auth: { flowType: "pkce" },
  16:       cookies: {
  17:         getAll() {
  18:           return cookieStore.getAll();
  19:         },
  20:         setAll(cookiesToSet) {
  21:           try {
  22:             cookiesToSet.forEach(({ name, value, options }) =>
  23:               cookieStore.set(name, value, options)
  24:             );
  25:           } catch {
  26:             // Called from a Server Component (read-only cookies) ??ignore.
  27:           }
  28:         },
  29:       },
  30:     }
  31:   );
  32: }

 succeeded in 407ms:
   1: import { createBrowserClient } from "@supabase/ssr";
   2: import type { Database } from "@/lib/supabase/database.types";
   3: 
   4: // Phase 4.x Wave C.5c sub_01 ??PKCE flow.
   5: // Why: Gmail / Outlook link-preview crawlers GET the email confirm URL
   6: // before the user can click it, single-use-consuming the OTP and
   7: // landing the real click on /auth/expired. PKCE moves the consume to
   8: // an explicit verifyOtp() call inside our /auth/confirm route handler,
   9: // so a passive crawler GET no longer drains the token.
  10: //
  11: // flowType = 'pkce' on the BROWSER client is what makes signUp() /
  12: // resetPasswordForEmail() store a code_verifier locally that the
  13: // matching /auth/confirm verify call needs.
  14: export function createSupabaseBrowser() {
  15:   return createBrowserClient<Database>(
  16:     process.env.NEXT_PUBLIC_SUPABASE_URL!,
  17:     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  18:     {
  19:       auth: { flowType: "pkce" },
  20:     },
  21:   );
  22: }

 succeeded in 407ms:
   1: import { createServerClient } from "@supabase/ssr";
   2: import type { NextRequest, NextResponse } from "next/server";
   3: import type { Database } from "@/lib/supabase/database.types";
   4: 
   5: export async function updateSupabaseSession(
   6:   request: NextRequest,
   7:   response: NextResponse
   8: ): Promise<NextResponse> {
   9:   const supabase = createServerClient<Database>(
  10:     process.env.NEXT_PUBLIC_SUPABASE_URL!,
  11:     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  12:     {
  13:       // Phase 4.x Wave C.5c sub_01 ??PKCE flow parity with server.ts /
  14:       // client.ts. Middleware reads/writes the same auth cookies; if the
  15:       // flowType differs across clients, code_verifier handling drifts.
  16:       auth: { flowType: "pkce" },
  17:       cookies: {
  18:         getAll() {
  19:           return request.cookies.getAll();
  20:         },
  21:         setAll(cookiesToSet) {
  22:           cookiesToSet.forEach(({ name, value, options }) => {
  23:             request.cookies.set(name, value);
  24:             response.cookies.set(name, value, options);
  25:           });
  26:         },
  27:       },
  28:     }
  29:   );
  30: 
  31:   await supabase.auth.getUser();
  32:   return response;
  33: }

codex
## Finding F1 — PKCE verifier not enforced on verifyOtp
- Severity: HIGH-B
- Surface: [route.ts](C:/Users/yout4/yagi-studio/yagi-workshop/src/app/auth/confirm/route.ts:104), [route.ts](C:/Users/yout4/yagi-studio/yagi-workshop/src/app/auth/confirm/route.ts:164)
- Verdict: FIXED for passive GET crawler consumption; residual design note.
- Reasoning: `GET` now only validates params, sanitizes `next`, and renders HTML. It does not call `verifyOtp`; the only OTP consumption is in `POST`. A passive Gmail-style crawler GET sees a 200 HTML page with hidden fields and cannot consume the token by fetching the link. The residual is that `POST` still does not manually require a code-verifier cookie, so this is now user-interaction-gated rather than truly verifier-bound.
- Proposed fix: No HIGH-B fix needed for the passive crawler issue. Consider adding explicit verifier-cookie or nonce checks as part of the new CSRF finding below.

## Finding F2 — Absolute RedirectTo rejected by sanitizeNext
- Severity: MED-A
- Surface: [route.ts](C:/Users/yout4/yagi-studio/yagi-workshop/src/app/auth/confirm/route.ts:36)
- Verdict: FIXED.
- Reasoning: `sanitizeNext(raw, origin, type)` now parses non-relative input with `new URL(raw, origin)` and requires `parsed.origin === origin`. `https://site/onboarding/workspace` becomes `/onboarding/workspace`, then passes the allowlist match. Cross-origin absolute URLs fall back to `/onboarding/workspace`.
- Proposed fix: No fix needed.

## Finding F7 — Gmail crawler invariant broken
- Severity: HIGH-B
- Surface: [route.ts](C:/Users/yout4/yagi-studio/yagi-workshop/src/app/auth/confirm/route.ts:117), [route.ts](C:/Users/yout4/yagi-studio/yagi-workshop/src/app/auth/confirm/route.ts:181)
- Verdict: FIXED for the stated Gmail passive-GET invariant.
- Reasoning: Crawler path: `GET /auth/confirm?...` returns static HTML and headers, with no Supabase client and no `verifyOtp`. User path: click email link, see Continue form, submit `POST /auth/confirm`, then `verifyOtp` consumes the OTP and sets the session before redirect. An active scanner that submits forms could still consume the token, but that is outside the passive Gmail GET failure mode.
- Proposed fix: No HIGH-B fix needed; see CSRF/clickjacking hardening below.

## Finding F8 — Signup next allowlist too broad
- Severity: MED-A
- Surface: [page.tsx](C:/Users/yout4/yagi-studio/yagi-workshop/src/app/[locale]/(auth)/signup/page.tsx:21), [page.tsx](C:/Users/yout4/yagi-studio/yagi-workshop/src/app/[locale]/(auth)/signup/page.tsx:27)
- Verdict: FIXED.
- Reasoning: Signup now only accepts `/onboarding/workspace`, `/onboarding/brand`, `/onboarding/invite`, and `/app...`, matching the non-recovery confirm allowlist. It also rejects protocol-relative values and all `/auth/*` next values.
- Proposed fix: No fix needed.

## Finding F9 — /reset-password reachable as generic next
- Severity: MED-A
- Surface: [route.ts](C:/Users/yout4/yagi-studio/yagi-workshop/src/app/auth/confirm/route.ts:27), [route.ts](C:/Users/yout4/yagi-studio/yagi-workshop/src/app/auth/confirm/route.ts:64), [route.ts](C:/Users/yout4/yagi-studio/yagi-workshop/src/app/auth/confirm/route.ts:203)
- Verdict: FIXED.
- Reasoning: `/reset-password` was removed from the generic `NEXT_ALLOWLIST_PREFIXES`. Recovery now has its own branch via `RECOVERY_NEXT`, and non-recovery confirms cannot use `next=/reset-password` to land there. The reset page itself prompts for a new password and relies on the Supabase recovery session for `updateUser`.
- Proposed fix: No fix needed.

## New Finding N1 — Confirm POST is vulnerable to login CSRF and clickjacking
- Severity: MED-A
- Surface: [route.ts](C:/Users/yout4/yagi-studio/yagi-workshop/src/app/auth/confirm/route.ts:140), [route.ts](C:/Users/yout4/yagi-studio/yagi-workshop/src/app/auth/confirm/route.ts:164)
- Verdict: NEW.
- Reasoning: `POST` accepts a bearer `token_hash` without checking `Origin`/`Referer`, a CSRF nonce, or a verifier cookie. A stolen victim token is already an auth credential, so CSRF is not the main incremental risk there. The real added risk is login CSRF/session fixation: an attacker can submit their own valid token to log a victim browser into an attacker-controlled account; without `frame-ancestors`/`X-Frame-Options`, the intermediate page can also be clickjacked.
- Proposed fix: Reject unsafe `Origin`/`Referer` on POST, add `Content-Security-Policy: frame-ancestors 'none'; form-action 'self'; base-uri 'none'`, and preferably set a short-lived nonce cookie on GET that must match a hidden POST field.

## New Finding N2 — Tokenized confirm URL can be sent as a Referer to the external stylesheet
- Severity: MED-A
- Surface: [route.ts](C:/Users/yout4/yagi-studio/yagi-workshop/src/app/auth/confirm/route.ts:124), [route.ts](C:/Users/yout4/yagi-studio/yagi-workshop/src/app/auth/confirm/route.ts:150)
- Verdict: NEW.
- Reasoning: The confirm page URL contains `token_hash`, then loads CSS from `cdn.jsdelivr.net`. Modern browsers usually default to `strict-origin-when-cross-origin`, but this route does not set `Referrer-Policy`; older or unusual clients could send the full tokenized URL to a third party.
- Proposed fix: Remove the external stylesheet or add `Referrer-Policy: no-referrer` on this response.

## New Finding N3 — Intermediate page is Korean-only
- Severity: LOW
- Surface: [route.ts](C:/Users/yout4/yagi-studio/yagi-workshop/src/app/auth/confirm/route.ts:118), [route.ts](C:/Users/yout4/yagi-studio/yagi-workshop/src/app/auth/confirm/route.ts:138)
- Verdict: NEW.
- Reasoning: The page uses `lang="ko"` and Korean copy before the profile locale is known. The button includes “Continue”, so this is acceptable for a short interstitial, but English users get a mixed-language auth step.
- Proposed fix: Accept as LOW, or choose copy based on a safe `locale` param/default.

Verdict: HIGH-A 0 / HIGH-B 0 / MED-A 2. Recommend FIX.
2026-05-03T11:42:08.153617Z ERROR codex_core::session: failed to record rollout items: thread 019deda1-d0f3-7fc1-817b-9e35af14bdc4 not found
tokens used
46,943
## Finding F1 — PKCE verifier not enforced on verifyOtp
- Severity: HIGH-B
- Surface: [route.ts](C:/Users/yout4/yagi-studio/yagi-workshop/src/app/auth/confirm/route.ts:104), [route.ts](C:/Users/yout4/yagi-studio/yagi-workshop/src/app/auth/confirm/route.ts:164)
- Verdict: FIXED for passive GET crawler consumption; residual design note.
- Reasoning: `GET` now only validates params, sanitizes `next`, and renders HTML. It does not call `verifyOtp`; the only OTP consumption is in `POST`. A passive Gmail-style crawler GET sees a 200 HTML page with hidden fields and cannot consume the token by fetching the link. The residual is that `POST` still does not manually require a code-verifier cookie, so this is now user-interaction-gated rather than truly verifier-bound.
- Proposed fix: No HIGH-B fix needed for the passive crawler issue. Consider adding explicit verifier-cookie or nonce checks as part of the new CSRF finding below.

## Finding F2 — Absolute RedirectTo rejected by sanitizeNext
- Severity: MED-A
- Surface: [route.ts](C:/Users/yout4/yagi-studio/yagi-workshop/src/app/auth/confirm/route.ts:36)
- Verdict: FIXED.
- Reasoning: `sanitizeNext(raw, origin, type)` now parses non-relative input with `new URL(raw, origin)` and requires `parsed.origin === origin`. `https://site/onboarding/workspace` becomes `/onboarding/workspace`, then passes the allowlist match. Cross-origin absolute URLs fall back to `/onboarding/workspace`.
- Proposed fix: No fix needed.

## Finding F7 — Gmail crawler invariant broken
- Severity: HIGH-B
- Surface: [route.ts](C:/Users/yout4/yagi-studio/yagi-workshop/src/app/auth/confirm/route.ts:117), [route.ts](C:/Users/yout4/yagi-studio/yagi-workshop/src/app/auth/confirm/route.ts:181)
- Verdict: FIXED for the stated Gmail passive-GET invariant.
- Reasoning: Crawler path: `GET /auth/confirm?...` returns static HTML and headers, with no Supabase client and no `verifyOtp`. User path: click email link, see Continue form, submit `POST /auth/confirm`, then `verifyOtp` consumes the OTP and sets the session before redirect. An active scanner that submits forms could still consume the token, but that is outside the passive Gmail GET failure mode.
- Proposed fix: No HIGH-B fix needed; see CSRF/clickjacking hardening below.

## Finding F8 — Signup next allowlist too broad
- Severity: MED-A
- Surface: [page.tsx](C:/Users/yout4/yagi-studio/yagi-workshop/src/app/[locale]/(auth)/signup/page.tsx:21), [page.tsx](C:/Users/yout4/yagi-studio/yagi-workshop/src/app/[locale]/(auth)/signup/page.tsx:27)
- Verdict: FIXED.
- Reasoning: Signup now only accepts `/onboarding/workspace`, `/onboarding/brand`, `/onboarding/invite`, and `/app...`, matching the non-recovery confirm allowlist. It also rejects protocol-relative values and all `/auth/*` next values.
- Proposed fix: No fix needed.

## Finding F9 — /reset-password reachable as generic next
- Severity: MED-A
- Surface: [route.ts](C:/Users/yout4/yagi-studio/yagi-workshop/src/app/auth/confirm/route.ts:27), [route.ts](C:/Users/yout4/yagi-studio/yagi-workshop/src/app/auth/confirm/route.ts:64), [route.ts](C:/Users/yout4/yagi-studio/yagi-workshop/src/app/auth/confirm/route.ts:203)
- Verdict: FIXED.
- Reasoning: `/reset-password` was removed from the generic `NEXT_ALLOWLIST_PREFIXES`. Recovery now has its own branch via `RECOVERY_NEXT`, and non-recovery confirms cannot use `next=/reset-password` to land there. The reset page itself prompts for a new password and relies on the Supabase recovery session for `updateUser`.
- Proposed fix: No fix needed.

## New Finding N1 — Confirm POST is vulnerable to login CSRF and clickjacking
- Severity: MED-A
- Surface: [route.ts](C:/Users/yout4/yagi-studio/yagi-workshop/src/app/auth/confirm/route.ts:140), [route.ts](C:/Users/yout4/yagi-studio/yagi-workshop/src/app/auth/confirm/route.ts:164)
- Verdict: NEW.
- Reasoning: `POST` accepts a bearer `token_hash` without checking `Origin`/`Referer`, a CSRF nonce, or a verifier cookie. A stolen victim token is already an auth credential, so CSRF is not the main incremental risk there. The real added risk is login CSRF/session fixation: an attacker can submit their own valid token to log a victim browser into an attacker-controlled account; without `frame-ancestors`/`X-Frame-Options`, the intermediate page can also be clickjacked.
- Proposed fix: Reject unsafe `Origin`/`Referer` on POST, add `Content-Security-Policy: frame-ancestors 'none'; form-action 'self'; base-uri 'none'`, and preferably set a short-lived nonce cookie on GET that must match a hidden POST field.

## New Finding N2 — Tokenized confirm URL can be sent as a Referer to the external stylesheet
- Severity: MED-A
- Surface: [route.ts](C:/Users/yout4/yagi-studio/yagi-workshop/src/app/auth/confirm/route.ts:124), [route.ts](C:/Users/yout4/yagi-studio/yagi-workshop/src/app/auth/confirm/route.ts:150)
- Verdict: NEW.
- Reasoning: The confirm page URL contains `token_hash`, then loads CSS from `cdn.jsdelivr.net`. Modern browsers usually default to `strict-origin-when-cross-origin`, but this route does not set `Referrer-Policy`; older or unusual clients could send the full tokenized URL to a third party.
- Proposed fix: Remove the external stylesheet or add `Referrer-Policy: no-referrer` on this response.

## New Finding N3 — Intermediate page is Korean-only
- Severity: LOW
- Surface: [route.ts](C:/Users/yout4/yagi-studio/yagi-workshop/src/app/auth/confirm/route.ts:118), [route.ts](C:/Users/yout4/yagi-studio/yagi-workshop/src/app/auth/confirm/route.ts:138)
- Verdict: NEW.
- Reasoning: The page uses `lang="ko"` and Korean copy before the profile locale is known. The button includes “Continue”, so this is acceptable for a short interstitial, but English users get a mixed-language auth step.
- Proposed fix: Accept as LOW, or choose copy based on a safe `locale` param/default.

Verdict: HIGH-A 0 / HIGH-B 0 / MED-A 2. Recommend FIX.
