---
id: 07
name: Auth routes (signin, signup, callback)
status: pending
assigned_to: executor
---

# Subtask 07 — Auth Routes

## Goal
Build the magic-link authentication flow: `signin` + `signup` pages (inside `[locale]/(auth)/` route group) and the `/auth/callback` route handler (outside `[locale]` — it lives at `src/app/auth/callback/route.ts`).

## File layout (create these 4 files)

```
src/app/[locale]/(auth)/layout.tsx            — shared centered layout
src/app/[locale]/(auth)/signin/page.tsx       — signin form
src/app/[locale]/(auth)/signup/page.tsx       — signup form (same form, different heading)
src/app/auth/callback/route.ts                — OAuth/magic-link code exchange
```

## Pre-existing helpers you will use

- `createSupabaseBrowser()` from `@/lib/supabase/client`
- `createSupabaseServer()` from `@/lib/supabase/server`
- `Link`, `redirect` from `@/i18n/routing` (next-intl-aware)
- shadcn components: `Button`, `Input`, `Label`, `Form` etc. from `@/components/ui/*`
- `toast` from `sonner`
- RHF + zod via `react-hook-form` + `zod` + `@hookform/resolvers/zod`

Button already has pill styling (rounded-full, uppercase, tracked) by default — no extra classes needed.

## File 1: `src/app/[locale]/(auth)/layout.tsx`

Server component. Simple centered container with a small YAGI wordmark at top.

```tsx
import { Link } from "@/i18n/routing";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col px-6 md:px-12">
      <header className="py-6">
        <Link href="/" className="inline-flex items-center">
          <span className="font-display text-lg tracking-tight">
            <em>YAGI</em> Workshop
          </span>
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
```

## File 2: `src/app/[locale]/(auth)/signin/page.tsx`

Client component (needs form state). Magic-link form.

```tsx
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

export default function SignInPage() {
  const t = useTranslations("auth");
  const c = useTranslations("common");
  const [sending, setSending] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setSending(true);
    const supabase = createSupabaseBrowser();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    const { error } = await supabase.auth.signInWithOtp({
      email: values.email,
      options: { emailRedirectTo: `${siteUrl}/auth/callback` },
    });
    setSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("link_sent"));
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="font-display text-3xl tracking-tight">
          <em>{t("signin_title")}</em>
        </h1>
        <p className="text-sm text-muted-foreground">{t("signin_sub")}</p>
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
        <Button type="submit" className="w-full" size="lg" disabled={sending}>
          {sending ? t("sending") : t("send_link")}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {t("no_account")}{" "}
        <Link href="/signup" className="text-foreground hover:underline">
          {c("signup")}
        </Link>
      </p>
    </div>
  );
}
```

## File 3: `src/app/[locale]/(auth)/signup/page.tsx`

Identical mechanics — only the heading text + the footer link flip. Reads the role query param but doesn't act on it beyond passing through (actual role gets picked in onboarding).

```tsx
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

export default function SignUpPage() {
  const t = useTranslations("auth");
  const c = useTranslations("common");
  const [sending, setSending] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setSending(true);
    const supabase = createSupabaseBrowser();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    const { error } = await supabase.auth.signInWithOtp({
      email: values.email,
      options: { emailRedirectTo: `${siteUrl}/auth/callback` },
    });
    setSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("link_sent"));
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="font-display text-3xl tracking-tight">
          <em>{t("signup_title")}</em>
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
        <Button type="submit" className="w-full" size="lg" disabled={sending}>
          {sending ? t("sending") : t("send_link")}
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
```

## File 4: `src/app/auth/callback/route.ts`

OAuth/magic-link code exchange. After successful exchange:
- Look up `profiles` row for this user.
- If no row → redirect to `/ko/onboarding`.
- If row exists → redirect to `/ko/app`.

```ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (!code) {
    return NextResponse.redirect(`${origin}/ko/signin?error=missing_code`);
  }

  const supabase = await createSupabaseServer();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, locale")
    .eq("id", user.id)
    .maybeSingle();

  const locale = profile?.locale ?? "ko";

  if (!profile) {
    return NextResponse.redirect(`${origin}/${locale}/onboarding`);
  }

  // Optional `next` param support (e.g., /app/projects/abc)
  if (next && next.startsWith("/")) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/${locale}/app`);
}
```

## Acceptance criteria

- [ ] All 4 files created at the specified paths
- [ ] Parenthesized `(auth)` folder is an App Router route group (not in URL)
- [ ] `npx tsc --noEmit` passes
- [ ] `/ko/signin` route is reachable (`pnpm dev` — optional check; at minimum, tsc passes)
- [ ] Callback route imports `createSupabaseServer` from `@/lib/supabase/server`
- [ ] Callback redirects to `/{locale}/onboarding` if no profile, else `/{locale}/app`
- [ ] No other files touched

## Write result to `.yagi-autobuild/results/07_auth_routes.md`

Standard format. Include output of `npx tsc --noEmit`.

## Notes for executor

- Verify App Router route-group syntax: `(auth)` wraps `layout.tsx` + child pages, but doesn't affect the URL path. `/ko/(auth)/signin/page.tsx` is reachable at `/ko/signin`.
- The callback route `src/app/auth/callback/route.ts` is intentionally OUTSIDE `[locale]` — middleware excludes it.
- Don't add `use client` to `src/app/[locale]/(auth)/layout.tsx` (server component).
- Use Write tool for all 4 new files (mkdir -p parents as needed via Bash if Write doesn't auto-create).
