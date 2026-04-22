# Subtask 04 — OG unfurl utility (`src/lib/og-unfurl.ts`) + `/api/unfurl` route

**status:** pending
**assigned_to:** executor_haiku_45
**created:** 2026-04-21
**parallel_group:** B (parallel with 02 + 03)
**spec source:** `.yagi-autobuild/phase-1-2-spec.md` §"Subtask Breakdown / 04"

---

## Executor preamble (READ FIRST, then execute)

You are an Executor for ONE task. Constraints:

1. Read ONLY this file. Do NOT read `task_plan.md`, `phase-1-2-spec.md`, or any other subtask file.
2. You MAY read these files for project conventions:
   - `/CLAUDE.md`
   - `.claude/skills/yagi-nextjs-conventions/SKILL.md`
   - `src/lib/supabase/server.ts` (to learn the exact import shape — your route will use it)
3. Use only Read, Write, Edit, Glob, Bash (only `ls`/`mkdir` if needed). Do not install packages — you have NO new deps available.
4. Working directory: `C:\Users\yout4\yagi-studio\yagi-workshop`.
5. **No third-party HTML parsers.** Use native `fetch` + regex only. Do NOT add `cheerio`, `node-html-parser`, etc.
6. If anything blocks you, write `BLOCKED: <reason>` in `results/04_og_unfurl.md` and stop.

## Task — File 1: `src/lib/og-unfurl.ts`

Pure server-side utility (Node runtime). Export:

```ts
export type OgData = {
  og_title?: string;
  og_description?: string;
  og_image_url?: string;
};

export async function unfurl(url: string): Promise<OgData>;
```

### Implementation requirements

1. **URL validation (reject early, return `{}` on bad input — never throw):**
   - Must parse via `new URL(url)` (catch error → return `{}`).
   - Protocol must be `http:` or `https:`.
   - Hostname must NOT match localhost/private-network patterns:
     - `localhost`, `127.*`, `::1`
     - `10.*`
     - `172.16.*` through `172.31.*`
     - `192.168.*`
     - `0.0.0.0`
   - Reject if hostname is an IP literal in those ranges. (For IPv4, parse the four octets and check.)

2. **Fetch:**
   ```ts
   const res = await fetch(url, {
     signal: AbortSignal.timeout(5000),
     headers: { "User-Agent": "YagiWorkshop/1.0" },
     redirect: "follow",
   });
   ```
   - Wrap in try/catch — any error returns `{}`.
   - If `!res.ok`, return `{}`.

3. **Read body with size cap (~500 KB):**
   - Read as text, then truncate the string to first 500_000 characters before regex (cheap protection against giant pages).
   - Or use `res.body` ReadableStream and stop reading after 500KB; either is acceptable.

4. **Extract via regex (case-insensitive, allow extra attributes between, allow `property` OR `name`):**
   - `og:title`, `og:description`, `og:image`. Examples (use `i` flag and tolerate attribute order):
     ```ts
     /<meta\s+(?:[^>]*?\s+)?(?:property|name)=["']og:title["']\s+(?:[^>]*?\s+)?content=["']([^"']+)["']/i
     /<meta\s+(?:[^>]*?\s+)?content=["']([^"']+)["']\s+(?:[^>]*?\s+)?(?:property|name)=["']og:title["']/i
     ```
     Try both orderings (content-before-property and property-before-content). Use the first match.
   - Decode minimal HTML entities in extracted strings: `&amp;` → `&`, `&lt;` → `<`, `&gt;` → `>`, `&quot;` → `"`, `&#39;` → `'`, numeric `&#NN;` decimal entities. A small helper inline is fine.

5. **Fallbacks:**
   - If no `og:title`, try `<title>...</title>` (case-insensitive, dotall — strip surrounding whitespace).
   - If no `og:image`, try first `<img\s+[^>]*src=["']([^"']+)["']` and resolve against `res.url` using `new URL(src, res.url).href` to absolutize.

6. **Return shape:** include only fields that found a value. `unfurl("garbage")` returns `{}`. `unfurl("https://example.com")` returns whatever it parsed (possibly `{}`).

7. **Never throw.** Wrap the entire body in try/catch and return `{}` on any uncaught error.

## Task — File 2: `src/app/api/unfurl/route.ts`

Next.js App Router POST handler.

### Requirements

```ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { unfurl } from "@/lib/og-unfurl";

export const runtime = "nodejs"; // required: AbortSignal.timeout / fetch outbound

export async function POST(req: NextRequest) {
  // 1. Auth check
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 2. Parse body
  let body: { url?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (typeof body.url !== "string" || body.url.length === 0) {
    return NextResponse.json({ error: "missing_url" }, { status: 400 });
  }

  // 3. Unfurl (never throws)
  const data = await unfurl(body.url);
  return NextResponse.json(data);
}
```

**Important:** import `createSupabaseServer` exactly as shown — verify by reading `src/lib/supabase/server.ts` first to confirm the export name. If the project exports a different name (e.g., `createClient`), use the actual name and note it in the result file.

The route must:
- Be `POST` only (do not export `GET`).
- Return 401 for unauthenticated requests.
- Return 400 for missing/invalid `url`.
- Return 200 with the `OgData` object (possibly empty) for valid auth + valid url string. Even if the URL is malformed or unreachable, return 200 with `{}` — the parsing logic in `unfurl` handles that.

## Anti-patterns — do NOT do these

- Do NOT instantiate `createClient(...)` from `@supabase/ssr` or `@supabase/supabase-js` inline. Always go through `@/lib/supabase/server`.
- Do NOT add a Zod schema dependency for the body — a single string check is cleaner here.
- Do NOT log the URL or response body to console (privacy + log noise).
- Do NOT add a GET handler.
- Do NOT add edge runtime (`export const runtime = "edge"`).

## Self-check before writing result

After writing both files, mentally trace these three cases:

1. `unfurl("not a url")` → URL parse throws → return `{}`. ✓
2. `unfurl("http://192.168.1.1/x")` → private IP rejected → return `{}`. ✓
3. POST `/api/unfurl` with no auth cookie → 401. ✓

## Acceptance criteria

1. `src/lib/og-unfurl.ts` exists, exports `OgData` type and `unfurl(url)` async function.
2. `unfurl` validates protocol + private-IP rejection, has 5s timeout, has 500KB body cap, extracts og:title/description/image with both attribute orders, falls back to `<title>` and first `<img>`, decodes basic HTML entities, never throws.
3. `src/app/api/unfurl/route.ts` exists, exports POST only, runs on `nodejs` runtime, requires auth, parses `{ url: string }` body, calls `unfurl`, returns JSON.
4. Imports use `@/lib/supabase/server` (or the actual export from that file — note in result if differs).
5. No new dependencies added. No `console.log` left behind. No third-party HTML parsers.

## Result file format (`results/04_og_unfurl.md`)

```markdown
# Subtask 04 result
status: complete
files_created:
  - src/lib/og-unfurl.ts (NN bytes)
  - src/app/api/unfurl/route.ts (NN bytes)
supabase_server_export_name: createSupabaseServer  # or whatever you found
trace_check:
  - unfurl("not a url") → {} ✓
  - unfurl("http://192.168.1.1/x") → {} ✓
  - POST /api/unfurl unauth → 401 ✓
acceptance: PASS — utility never throws, route requires auth, no new deps.
```

If blocked: `status: blocked` + `reason: <one line>`.
