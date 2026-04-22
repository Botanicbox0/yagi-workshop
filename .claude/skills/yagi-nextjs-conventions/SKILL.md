---
name: yagi-nextjs-conventions
description: >-
  YAGI Workshop project-specific Next.js conventions. Load for any task
  touching YAGI codebase. Auto-triggers on Next.js file creation,
  Supabase query writing, form building, i18n key addition, RLS policy
  authoring within YAGI Workshop.
---

## 1. Load order

Always load `/CLAUDE.md` first from the project root, then this skill. The CLAUDE.md file contains project-level constraints, stack specifications, and architecture rules. This skill extends those rules with concrete code patterns and best practices specific to YAGI Workshop's Next.js 15 + Supabase + TanStack Query setup.

## 2. Supabase access pattern

Supabase clients must be instantiated through dedicated utility modules, never inline. Two patterns cover all cases:

**Server pattern** (Server Components, Server Actions):
```typescript
import { createSupabaseServer } from '@/lib/supabase/server';

export default async function ProjectsPage() {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('workspace_id', workspaceId);
  
  if (error) throw new Error(error.message);
  return <ProjectsList projects={data} />;
}
```

**Client pattern** (Client Components with `"use client"`):
```typescript
'use client';

import { createSupabaseBrowser } from '@/lib/supabase/client';
import { useQuery } from '@tanstack/react-query';

export function ProjectsClient({ workspaceId }: { workspaceId: string }) {
  const { data: projects } = useQuery({
    queryKey: ['projects', workspaceId],
    queryFn: async () => {
      const supabase = createSupabaseBrowser();
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('workspace_id', workspaceId);
      if (error) throw error;
      return data;
    },
  });

  return <div>{/* render projects */}</div>;
}
```

Critical: Never call `createClient()` or `createBrowserClient()` directly anywhere. All Supabase access flows through these two utility functions.

## 3. Server Action template

Server Actions handle all database mutations. Always parse input with Zod before querying:

```typescript
'use server';

import { createSupabaseServer } from '@/lib/supabase/server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const CreateProjectSchema = z.object({
  name: z.string().min(1, 'Name required').max(100),
  workspaceId: z.string().uuid(),
});

export async function createProject(
  input: unknown,
  locale: string
): Promise<{ error?: string; data?: { id: string } }> {
  const result = CreateProjectSchema.safeParse(input);
  if (!result.success) {
    return { error: result.error.errors[0].message };
  }

  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from('projects')
    .insert({ ...result.data })
    .select('id')
    .single();

  if (error) {
    console.error('[createProject]', error);
    return { error: 'Failed to create project' };
  }

  revalidatePath(`/[locale]/app/projects`, 'page');
  return { data };
}
```

Return errors as `{ error: string }` for client handling. On success, return data payload. Use `revalidatePath` or `redirect` after mutations.

## 4. RHF + Zod + shadcn form template

Client-side forms follow React Hook Form + Zod + shadcn/ui pattern:

```typescript
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createProject } from '@/app/[locale]/app/projects/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const projectSchema = z.object({
  name: z.string().min(1).max(100),
});

type ProjectFormData = z.infer<typeof projectSchema>;

interface ProjectFormProps {
  workspaceId: string;
  locale: string;
}

export function ProjectForm({ workspaceId, locale }: ProjectFormProps) {
  const t = useTranslations('projects');
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
  });

  const onSubmit = async (formData: ProjectFormData) => {
    const res = await createProject(
      { ...formData, workspaceId },
      locale
    );
    if (res.error) {
      toast.error(res.error);
    } else {
      router.push(`/${locale}/app/projects/${res.data?.id}`);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="name">{t('projectName')}</Label>
        <Input
          id="name"
          placeholder={t('enterName')}
          {...register('name')}
        />
        {errors.name && (
          <p className="text-xs text-destructive mt-1">
            {errors.name.message}
          </p>
        )}
      </div>
      <Button
        type="submit"
        disabled={isSubmitting}
        className="rounded-full uppercase tracking-[0.12em]"
      >
        {t('createProject')}
      </Button>
    </form>
  );
}
```

Validation errors display inline. Mutation errors surface via `toast.error()`. Success redirects or revalidates via the returned action response.

## 5. i18n rules

Every user-facing string must be internationalized. Both `src/messages/ko.json` and `src/messages/en.json` must have identical key structures. Use namespaces consistently:

**Namespaces**: home, brand, common, auth, onboarding, nav, dashboard, projects, settings, refs, threads, admin.

**Korean tone** (존댓말, sentence case):
```json
{
  "projects": {
    "projectName": "프로젝트 이름",
    "createProject": "프로젝트 만들기",
    "noProjects": "프로젝트가 없습니다."
  }
}
```

**English tone** (editorial, sentence case; CTAs ALL CAPS with letter spacing):
```json
{
  "projects": {
    "projectName": "Project name",
    "createProject": "CREATE PROJECT",
    "noProjects": "No projects yet."
  }
}
```

In code, always use:
```typescript
const t = useTranslations('projects');
<button>{t('createProject')}</button>  // Will render uppercase + tracking in Tailwind
```

Never hardcode strings. If a key is missing in one language, the build fails—this is intentional.

## 6. Next.js 15 async props

Next.js 15 makes all route params and search params Promise types. Always await before use:

```typescript
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

interface ProjectPageProps {
  params: Promise<{
    locale: string;
    id: string;
  }>;
  searchParams: Promise<{
    tab?: string;
  }>;
}

export default async function ProjectPage({
  params,
  searchParams,
}: ProjectPageProps) {
  const { locale, id } = await params;
  const { tab } = await searchParams;
  const t = getTranslations({ locale, namespace: 'projects' });

  const supabase = await createSupabaseServer();
  const { data: project, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !project) {
    notFound();
  }

  return (
    <div>
      <h1>{project.name}</h1>
      <p>{t('activeTab')}: {tab || 'overview'}</p>
    </div>
  );
}
```

Always `await params` and `await searchParams` at the start of the page component.

## 7. Error handling taxonomy

Three error surfaces in YAGI:

1. **Inline validation errors** (form field): displayed in `<p className="text-xs text-destructive">` below the field immediately after Zod validation fails.

2. **Mutation failures** (Server Action error): caught on the client, shown via `toast.error(message)`.

3. **Page-level errors** (404, 500): use Next.js `notFound()` for missing resources, `throw new Error(...)` for dev/critical issues (logged to console, surfaces as error boundary).

Example flow:
```typescript
// Server Action
export async function deleteProject(id: string) {
  const supabase = await createSupabaseServer();
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('[deleteProject] Supabase error:', error);
    return { error: 'Could not delete project' };
  }
  revalidatePath('/[locale]/app/projects');
  return { success: true };
}

// Client Component
const res = await deleteProject(id);
if (res.error) {
  toast.error(res.error);  // User-facing via Sonner
} else {
  router.refresh();
}
```

Never surface raw Supabase errors to users. Log them server-side for debugging.

## 8. Styling tokens (Phase 1.0.6)

YAGI uses a strict white-on-black design system. All color tokens come from Tailwind:

- `bg-background` = white
- `text-foreground` = black
- `border-border` = thin gray (for dividers)
- Accent gold only for minimal, intentional emphasis (not fills)

**CTAs and buttons**: always use `rounded-full uppercase tracking-[0.12em]` for pill shape + letter spacing.

**Typography emphasis**: use Fraunces italic for callouts: `font-serif italic` (defined in `globals.css`).

**Korean text wrapping**: apply `keep-all` utility class to prevent awkward line breaks in Korean.

Example component:
```typescript
<div className="bg-background text-foreground border border-border p-4">
  <h2 className="font-serif italic text-lg">Important notice</h2>
  <p className="keep-all">한국어 텍스트는 keep-all 클래스를 사용합니다.</p>
  <button className="rounded-full uppercase tracking-[0.12em] bg-foreground text-background px-4 py-2">
    ACTION
  </button>
</div>
```

**Forbidden**: warm tones (cognac, bone, amber backgrounds). Accent gold is permitted as inline emphasis only, never as a surface or fill.

## 9. Anti-patterns to reject

When reviewing YAGI code, reject:

- **Overusing `"use client"`**: default to Server Components; only mark client when state/interactivity required.
- **Inline Supabase clients**: all instantiation flows through `@/lib/supabase/server` or `client`.
- **Hardcoded user-facing strings**: every string must come from `useTranslations()` or `getTranslations()`.
- **Fetching from Client Components**: mutations and data fetching happen in Server Actions or server-side query functions, never via client-side fetch in a Client Component.
- **`any` types**: always use strict typing; leverage Zod for runtime validation.
- **`pnpm dlx shadcn@latest`**: always pin `shadcn@2.1.8`; upgrade breaks the build.
- **Skipping Zod validation in Server Actions**: parse all inputs, even if they look trusted.
- **Mixing locales in one file**: use separate i18n calls for each locale context.

## 10. Self-improving footer

When Yagi says: "update yagi-nextjs-conventions skill — [content]", edit this file directly and report the change in the response.
