# Subtask 04 evaluation
verdict: pass
checks:
  - 1 (exports): pass — `OgData` type with all three optional string fields exported; `unfurl(url: string): Promise<OgData>` exported.
  - 2 (URL validation): pass — `new URL(url)` in inner try/catch; protocol restricted to `http:`/`https:`; `isPrivateIp()` uses four-octet regex split with exact numeric comparisons (not startsWith): `a===127`, `a===10`, `a===172 && b>=16 && b<=31`, `a===192 && b===168`; also covers `localhost`, `::1`, `0.0.0.0`, and bracket-form IPv6.
  - 3 (fetch safety): pass — `AbortSignal.timeout(5000)` present; `User-Agent: "YagiWorkshop/1.0"` set; body capped via `text.slice(0, 500_000)`; `!res.ok` returns `{}`.
  - 4 (regex both orderings): pass — both orderings present for all three OG fields. Representative pair for og:title:
      property-before-content: `/<meta\s+(?:[^>]*?\s+)?(?:property|name)=["']og:title["']\s+(?:[^>]*?\s+)?content=["']([^"']+)["']/i`
      content-before-property: `/<meta\s+(?:[^>]*?\s+)?content=["']([^"']+)["']\s+(?:[^>]*?\s+)?(?:property|name)=["']og:title["']/i`
      Mental trace for `<meta content="Hello" property="og:title">`: content-before-property regex matches and captures "Hello". Accepts `property` OR `name`. Case-insensitive.
  - 5 (fallbacks): pass — `<title[^>]*>([^<]*)<\/title>` fallback with `.trim()` and entity decode; first `<img\s+[^>]*src=["']([^"']+)["']` fallback with `new URL(src, res.url).href` absolutization.
  - 6 (entity decode): pass — handles `&amp;`, `&lt;`, `&gt;`, `&quot;`, `&#39;`, and numeric decimal `&#NN;` via `String.fromCharCode(parseInt(dec, 10))`.
  - 7 (never throws): pass — entire function body wrapped in outer `try { ... } catch { return {}; }`; no rethrow anywhere.
  - 8 (route shape + auth + status codes): pass — POST only (no GET export); `export const runtime = "nodejs"`; `createSupabaseServer()` matches exact export name from `src/lib/supabase/server.ts`; 401 on null user; 400 on invalid JSON and on `url` not being a non-empty string; 200 with OgData otherwise.
  - 9 (no forbidden imports): pass — no inline `createClient`; no cheerio/node-html-parser/puppeteer; no console.log/warn/error; no edge runtime.
  - 10 (type safety): pass — no `any` in signatures; `body` typed as `{ url?: unknown }` (correct for untrusted JSON); all helper functions explicitly typed.
traces:
  - A: pass — `new URL("")` throws → inner catch → `return {}`.
  - B: pass — `new URL("ftp://example.com")` succeeds → protocol `"ftp:"` fails http/https check → `return {}`.
  - C: pass — `isPrivateIp("10.0.0.5")` → IPv4 match, `a === 10` → `true` → `return {}`.
  - D: pass — `getUser()` returns `user: null` → `!user` branch → 401.
  - E: pass — `typeof body.url !== "string"` (number 123) → 400.
  - F: pass — all checks pass → `unfurl("https://example.com")` called → 200 with OgData (possibly `{}`).
notes: No issues worth flagging. Implementation is clean, the `0.0.0.0` check is explicit (not via IPv4 regex, handled in the string equality block), and the numeric entity decoder is a bonus over the minimum requirement.
