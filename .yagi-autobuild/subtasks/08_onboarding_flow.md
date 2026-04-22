---
id: 08
name: 5-step onboarding flow
status: pending
assigned_to: executor
---

# Subtask 08 — Onboarding Flow

## Goal
Build the 5-step onboarding flow: role → profile → workspace → brand (optional) → invite (optional).

## Files to create (7 files)

```
src/lib/onboarding/actions.ts                           — Server Actions (all mutations)
src/lib/onboarding/state.ts                             — getOnboardingState() helper
src/app/[locale]/onboarding/layout.tsx                  — auth guard (server component)
src/app/[locale]/onboarding/page.tsx                    — step 1 (role choice)
src/app/[locale]/onboarding/profile/page.tsx            — step 2
src/app/[locale]/onboarding/workspace/page.tsx          — step 3
src/app/[locale]/onboarding/brand/page.tsx              — step 4 (optional)
src/app/[locale]/onboarding/invite/page.tsx             — step 5 (optional)
```

## Design notes

- White/black palette (Phase 1.0.6). Pill CTAs (default `<Button size="lg">`). Fraunces italic for step titles. Max-width centered form layout.
- No file uploads in Phase 1.1 — `avatar_url`, `logo_url` columns stay null. File upload UI lands in Settings in Phase 1.2.
- Server actions use `createSupabaseServer()` which has user session via cookies.
- Transactional insert for workspace → workspace_member → user_roles. If any step fails, the server action returns `{ error }` and client shows toast. Rollback is manual (delete workspace row) — acceptable for Phase 1.1 since errors are rare and retry is simple.

## File 1: `src/lib/onboarding/state.ts`

```ts
import { createSupabaseServer } from "@/lib/supabase/server";

export type OnboardingState = {
  userId: string;
  hasProfile: boolean;
  locale: "ko" | "en";
  role: "creator" | "workspace_admin" | "workspace_member" | null;
  workspaceId: string | null;
};

export async function getOnboardingState(): Promise<OnboardingState | null> {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, locale")
    .eq("id", user.id)
    .maybeSingle();

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role, workspace_id")
    .eq("user_id", user.id);

  const firstRole = roles?.[0];

  return {
    userId: user.id,
    hasProfile: !!profile,
    locale: (profile?.locale ?? "ko") as "ko" | "en",
    role: (firstRole?.role as OnboardingState["role"]) ?? null,
    workspaceId: firstRole?.workspace_id ?? null,
  };
}
```

## File 2: `src/lib/onboarding/actions.ts`

```ts
"use server";

import { createSupabaseServer } from "@/lib/supabase/server";
import { redirect } from "@/i18n/routing";
import crypto from "node:crypto";

type Result = { error?: string };

export async function createProfileAction(formData: {
  handle: string;
  displayName: string;
  bio: string;
  locale: "ko" | "en";
  role: "client" | "creator";
}): Promise<Result> {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not_authenticated" };

  const { error: profileError } = await supabase.from("profiles").insert({
    id: user.id,
    handle: formData.handle,
    display_name: formData.displayName,
    bio: formData.bio || null,
    locale: formData.locale,
  });
  if (profileError) return { error: profileError.message };

  if (formData.role === "creator") {
    const { error: roleError } = await supabase
      .from("user_roles")
      .insert({ user_id: user.id, role: "creator", workspace_id: null });
    if (roleError) return { error: roleError.message };
  }

  return {};
}

export async function createWorkspaceAction(formData: {
  name: string;
  slug: string;
}): Promise<Result & { workspaceId?: string }> {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not_authenticated" };

  const { data: workspace, error: wsError } = await supabase
    .from("workspaces")
    .insert({ name: formData.name, slug: formData.slug })
    .select("id")
    .single();
  if (wsError || !workspace) return { error: wsError?.message ?? "workspace_insert_failed" };

  const { error: memberError } = await supabase.from("workspace_members").insert({
    workspace_id: workspace.id,
    user_id: user.id,
    role: "admin",
    joined_at: new Date().toISOString(),
  });
  if (memberError) return { error: memberError.message };

  const { error: roleError } = await supabase.from("user_roles").insert({
    user_id: user.id,
    role: "workspace_admin",
    workspace_id: workspace.id,
  });
  if (roleError) return { error: roleError.message };

  return { workspaceId: workspace.id };
}

export async function createBrandAction(formData: {
  workspaceId: string;
  name: string;
  slug: string;
}): Promise<Result> {
  const supabase = await createSupabaseServer();
  const { error } = await supabase.from("brands").insert({
    workspace_id: formData.workspaceId,
    name: formData.name,
    slug: formData.slug,
  });
  if (error) return { error: error.message };
  return {};
}

export async function sendInvitationsAction(formData: {
  workspaceId: string;
  emails: string[];
  role: "admin" | "member";
}): Promise<Result> {
  if (formData.emails.length === 0) return {};
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not_authenticated" };

  const rows = formData.emails.map((email) => ({
    workspace_id: formData.workspaceId,
    email,
    role: formData.role,
    token: crypto.randomBytes(24).toString("hex"),
    invited_by: user.id,
  }));

  const { error } = await supabase.from("workspace_invitations").insert(rows);
  if (error) return { error: error.message };

  // TODO Phase 1.2: send actual email via Resend. For now, log to server console.
  console.log("[invitations] staged", rows.map((r) => r.email).join(", "));
  return {};
}
```

## File 3: `src/app/[locale]/onboarding/layout.tsx`

```tsx
import { redirect } from "@/i18n/routing";
import { createSupabaseServer } from "@/lib/supabase/server";
import { Link } from "@/i18n/routing";

export default async function OnboardingLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect({ href: "/signin", locale });

  return (
    <div className="min-h-dvh flex flex-col px-6 md:px-12">
      <header className="py-6">
        <Link href="/" className="inline-flex items-center">
          <span className="font-display text-lg tracking-tight">
            <em>YAGI</em> Workshop
          </span>
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center py-12">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
```

## File 4: `src/app/[locale]/onboarding/page.tsx` — Step 1 role choice

Server component (reads translations + redirects on next-step).

```tsx
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { getOnboardingState } from "@/lib/onboarding/state";
import { redirect } from "@/i18n/routing";

export default async function OnboardingRolePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const state = await getOnboardingState();

  // If user already has profile, skip onboarding
  if (state?.hasProfile) {
    redirect({ href: "/app", locale });
  }

  return <RoleChoice />;
}

function RoleChoice() {
  const t = useTranslations("onboarding");

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="font-display text-3xl tracking-tight keep-all">
          <em>{t("role_title")}</em>
        </h1>
        <p className="text-sm text-muted-foreground keep-all">{t("role_sub")}</p>
      </div>
      <div className="grid gap-3">
        <Link
          href="/onboarding/profile?role=client"
          className="block rounded-lg border border-border p-5 hover:border-foreground transition-colors"
        >
          <p className="font-display text-xl tracking-tight mb-1"><em>{t("role_client_title")}</em></p>
          <p className="text-sm text-muted-foreground keep-all">{t("role_client_desc")}</p>
        </Link>
        <Link
          href="/onboarding/profile?role=creator"
          className="block rounded-lg border border-border p-5 hover:border-foreground transition-colors"
        >
          <p className="font-display text-xl tracking-tight mb-1"><em>{t("role_creator_title")}</em></p>
          <p className="text-sm text-muted-foreground keep-all">{t("role_creator_desc")}</p>
        </Link>
      </div>
    </div>
  );
}
```

## File 5: `src/app/[locale]/onboarding/profile/page.tsx` — Step 2

Client component (form). Reads `role` from searchParams and passes to server action.

```tsx
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createProfileAction } from "@/lib/onboarding/actions";

const schema = z.object({
  handle: z.string().regex(/^[a-z0-9_-]{3,30}$/, "3–30 lowercase letters, numbers, - _"),
  displayName: z.string().min(1).max(80),
  bio: z.string().max(280).optional().default(""),
});

type FormValues = z.infer<typeof schema>;

export default function OnboardingProfilePage() {
  const t = useTranslations("onboarding");
  const c = useTranslations("common");
  const router = useRouter();
  const search = useSearchParams();
  const params = useParams<{ locale: string }>();
  const locale = (params.locale === "en" ? "en" : "ko") as "ko" | "en";
  const rawRole = search.get("role");
  const role: "client" | "creator" = rawRole === "creator" ? "creator" : "client";

  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    const res = await createProfileAction({
      handle: values.handle,
      displayName: values.displayName,
      bio: values.bio ?? "",
      locale,
      role,
    });
    setSubmitting(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    if (role === "creator") {
      router.push(`/${locale}/app`);
    } else {
      router.push(`/${locale}/onboarding/workspace`);
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="font-display text-3xl tracking-tight keep-all"><em>{t("profile_title")}</em></h1>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="handle">{t("handle")}</Label>
          <Input id="handle" {...register("handle")} placeholder="your-handle" autoComplete="username" />
          <p className="text-xs text-muted-foreground">{t("handle_help")}</p>
          {errors.handle && <p className="text-xs text-destructive">{errors.handle.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="displayName">{t("display_name")}</Label>
          <Input id="displayName" {...register("displayName")} />
          {errors.displayName && <p className="text-xs text-destructive">{errors.displayName.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="bio">{t("bio")}</Label>
          <Textarea id="bio" rows={3} placeholder={t("bio_placeholder")} {...register("bio")} />
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? t("done") : c("continue")}
        </Button>
      </form>
    </div>
  );
}
```

## File 6: `src/app/[locale]/onboarding/workspace/page.tsx` — Step 3

Client component. Auto-generates slug from name; editable. On submit → create workspace → redirect to /onboarding/brand.

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createWorkspaceAction } from "@/lib/onboarding/actions";

const slugFromName = (name: string) =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);

const schema = z.object({
  name: z.string().min(1).max(80),
  slug: z.string().regex(/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/, "3–50 lowercase, hyphens"),
});

type FormValues = z.infer<typeof schema>;

export default function OnboardingWorkspacePage() {
  const t = useTranslations("onboarding");
  const c = useTranslations("common");
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = params.locale;

  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { name: "", slug: "" } });

  const nameValue = watch("name");
  const slugValue = watch("slug");
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    if (!slugTouched) {
      setValue("slug", slugFromName(nameValue));
    }
  }, [nameValue, slugTouched, setValue]);

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    const res = await createWorkspaceAction({ name: values.name, slug: values.slug });
    setSubmitting(false);
    if (res.error || !res.workspaceId) {
      toast.error(res.error ?? "workspace_failed");
      return;
    }
    router.push(`/${locale}/onboarding/brand?ws=${res.workspaceId}`);
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="font-display text-3xl tracking-tight keep-all"><em>{t("workspace_title")}</em></h1>
        <p className="text-sm text-muted-foreground keep-all">{t("workspace_sub")}</p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="name">{t("workspace_name")}</Label>
          <Input id="name" {...register("name")} placeholder={t("workspace_name_ph")} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">{t("workspace_slug")}</Label>
          <Input
            id="slug"
            value={slugValue}
            onChange={(e) => {
              setSlugTouched(true);
              setValue("slug", e.target.value);
            }}
          />
          <p className="text-xs text-muted-foreground">{t("workspace_slug_help")}{slugValue}</p>
          {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? "..." : c("continue")}
        </Button>
      </form>
    </div>
  );
}
```

## File 7: `src/app/[locale]/onboarding/brand/page.tsx` — Step 4 (optional)

Client component. Reads `?ws=<id>` from query. Two buttons: Skip → next step. Add brand → form → create brand → next step.

```tsx
"use client";

import { useState } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBrandAction } from "@/lib/onboarding/actions";

const slugFromName = (name: string) =>
  name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50);

const schema = z.object({
  name: z.string().min(1).max(80),
  slug: z.string().regex(/^[a-z0-9][a-z0-9-]{0,48}[a-z0-9]?$/),
});

type FormValues = z.infer<typeof schema>;

export default function OnboardingBrandPage() {
  const t = useTranslations("onboarding");
  const c = useTranslations("common");
  const router = useRouter();
  const search = useSearchParams();
  const params = useParams<{ locale: string }>();
  const locale = params.locale;
  const workspaceId = search.get("ws");

  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { name: "", slug: "" } });

  const nameValue = watch("name");
  const slugValue = watch("slug");

  async function onSubmit(values: FormValues) {
    if (!workspaceId) {
      toast.error("missing_workspace");
      return;
    }
    setSubmitting(true);
    const res = await createBrandAction({ workspaceId, name: values.name, slug: values.slug });
    setSubmitting(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    router.push(`/${locale}/onboarding/invite?ws=${workspaceId}`);
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="font-display text-3xl tracking-tight keep-all"><em>{t("brand_title")}</em></h1>
        <p className="text-sm text-muted-foreground keep-all">{t("brand_sub")}</p>
      </div>
      {!showForm ? (
        <div className="flex flex-col gap-3">
          <Button size="lg" onClick={() => setShowForm(true)}>
            {t("brand_name")}
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => router.push(`/${locale}/onboarding/invite?ws=${workspaceId ?? ""}`)}
          >
            {c("skip")}
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">{t("brand_name")}</Label>
            <Input
              id="name"
              {...register("name")}
              placeholder={t("brand_name_ph")}
              onBlur={() => setValue("slug", slugFromName(nameValue))}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">{t("workspace_slug")}</Label>
            <Input id="slug" value={slugValue} onChange={(e) => setValue("slug", e.target.value)} />
            {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? "..." : c("continue")}
          </Button>
        </form>
      )}
    </div>
  );
}
```

## File 8: `src/app/[locale]/onboarding/invite/page.tsx` — Step 5 (optional)

Client component. Multi-email tag input. Skip → /app. Send → insert invitations → /app.

```tsx
"use client";

import { useState } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendInvitationsAction } from "@/lib/onboarding/actions";

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function OnboardingInvitePage() {
  const t = useTranslations("onboarding");
  const c = useTranslations("common");
  const router = useRouter();
  const search = useSearchParams();
  const params = useParams<{ locale: string }>();
  const locale = params.locale;
  const workspaceId = search.get("ws");

  const [emails, setEmails] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function addEmail() {
    const v = draft.trim();
    if (!v) return;
    if (!emailRe.test(v)) {
      toast.error("invalid_email");
      return;
    }
    if (!emails.includes(v)) setEmails([...emails, v]);
    setDraft("");
  }

  function removeEmail(e: string) {
    setEmails(emails.filter((x) => x !== e));
  }

  async function onSend() {
    if (!workspaceId) {
      toast.error("missing_workspace");
      return;
    }
    setSubmitting(true);
    const res = await sendInvitationsAction({ workspaceId, emails, role: "member" });
    setSubmitting(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    router.push(`/${locale}/app`);
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="font-display text-3xl tracking-tight keep-all"><em>{t("invite_title")}</em></h1>
        <p className="text-sm text-muted-foreground keep-all">{t("invite_sub")}</p>
      </div>
      <div className="space-y-3">
        <Label htmlFor="emailInput">{t("invite_email")}</Label>
        <div className="flex gap-2">
          <Input
            id="emailInput"
            type="email"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addEmail();
              }
            }}
            placeholder="name@company.com"
          />
          <Button type="button" size="lg" variant="outline" onClick={addEmail}>
            {t("invite_add")}
          </Button>
        </div>
        {emails.length > 0 && (
          <ul className="flex flex-wrap gap-2 pt-2">
            {emails.map((e) => (
              <li
                key={e}
                className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs"
              >
                {e}
                <button
                  type="button"
                  onClick={() => removeEmail(e)}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="remove"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex flex-col gap-3">
        <Button size="lg" onClick={onSend} disabled={submitting || emails.length === 0}>
          {submitting ? "..." : t("invite_send")}
        </Button>
        <Button
          size="lg"
          variant="outline"
          onClick={() => router.push(`/${locale}/app`)}
        >
          {t("done")}
        </Button>
      </div>
    </div>
  );
}
```

## Acceptance criteria

- [ ] All 8 files created at the specified paths
- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] Server actions use "use server" directive at top
- [ ] `getOnboardingState` uses `createSupabaseServer()` (SSR-safe cookies)
- [ ] Layout redirects unauthenticated users to `/{locale}/signin`
- [ ] Step 1 (role page) redirects to `/app` if user already has profile
- [ ] Step 2 redirect logic: role=creator → `/app`, role=client → `/onboarding/workspace`
- [ ] Step 3 → Step 4 carries `?ws=<id>` query param
- [ ] Step 5 Skip button → `/app`
- [ ] No file uploads — avatar and logo fields intentionally omitted
- [ ] No other files touched

## Write result to `.yagi-autobuild/results/08_onboarding_flow.md`

Standard format. Note any deviations if you renamed/adjusted imports for TS strictness.

## Notes for executor

- The `@/i18n/routing` `redirect` function signature in next-intl v4: `redirect({ href, locale })` — verify your import matches existing usage in the repo before relying on it (check `src/app/auth/callback/route.ts` for reference).
- Next 15 `useParams<{locale: string}>()` returns a typed params object from Client Components. Use that pattern for locale access in client components.
- Avoid double navigation loops — don't redirect from `/onboarding` to `/onboarding/workspace` then back.
- `useTranslations` only works inside Client Components and Server Components that are rendered in the React tree with NextIntlClientProvider — the existing [locale] layout already provides this, so both server and client pages can use it.
