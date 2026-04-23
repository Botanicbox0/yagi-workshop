# G4 Storage Backend Decision — R2 vs Supabase Storage

> Input for yagi decision at G4 entry. SPEC §3 G1 Task 9 + §6 Q2 defer the bucket pick to G4 time.
> This doc compares both paths with commands, cost, latency, and risk. Recommendation at end.

---

## Context

- Supabase project: `jvamvbpxnztynsccvcmr` (Singapore, ap-southeast-1)
- Cloudflare account (per user ctx): `d1ca941ed081f237dcdfac514dc9a98f`
- Existing R2 bucket familiarity: `yagi-models` (pre-existing, pattern established)
- SPEC §1 video: 500MB cap, mp4 only, up to 60s, **public gallery** (high egress)
- Image: up to 5 × 10MB each = 50MB; PDF: 20MB
- Bucket name: `yagi-challenge-submissions` (both options use the same name)

---

## Option A — Cloudflare R2

### Pros
- **Zero egress fees** — decisive for public gallery (videos streamed many times)
- S3-compatible API (well-trod paths with @aws-sdk/client-s3)
- 500MB cap respected (no platform ceiling)
- Custom domain serving via Cloudflare Workers/routes (future: `cdn.yagiworkshop.xyz/challenge/<id>`)
- Existing yagi R2 account + yagi-models bucket = operational familiarity

### Cons
- Separate auth plane from Supabase — credentials in .env + Vault, no RLS inheritance
- Signed PUT URL must be generated server-side via @aws-sdk/s3-request-presigner (new dep)
- Object ownership / "who uploaded what" must be enforced at application layer (not RLS)
- CORS must be configured explicitly (Supabase handles this transparently)

### Cost (est. for public challenge gallery)
Assumption: 100 submissions, avg 300MB video, 5000 gallery views/submission/month
- Storage: 100 × 0.3GB = 30GB × $0.015/GB = **$0.45/mo**
- Egress: 100 × 0.3GB × 5000 = 150,000 GB... but R2 egress = **$0**
- Operations: ~1M class A (PUT) = $4.50 (bursty, mostly rate-limited by submission count)
- **R2 total: ~$5/mo for 100 active submissions**

### Latency (Korea)
- Cloudflare APAC edge (SEL/NRT/HKG) — excellent for Korean viewers
- Anycast routing — typical <50ms TTFB from Seoul
- Storage itself is globally replicated (Auto tier) — first-byte latency very good

### Provisioning status (updated 2026-04-23 side-session)

**Bucket CREATED via Cloudflare MCP.** Outcome:

```json
{
  "name": "yagi-challenge-submissions",
  "creation_date": "2026-04-23T08:17:22.545Z",
  "location": "ENAM",          ← mismatch: yagi asked for APAC
  "storage_class": "Standard",
  "jurisdiction": "default"
}
```

**⚠ Location mismatch (ENAM vs APAC):**
Cloudflare MCP's `r2_bucket_create` tool schema exposes **only `name`** — no `locationHint` parameter. The bucket landed at `ENAM` (Eastern North America) by account default, not `APAC` as requested.

**Impact analysis (R2 Standard tier):**
- **Reads**: served from nearest Cloudflare edge globally regardless of bucket location → Korean user download latency **unchanged**
- **Writes**: travel to nearest edge, then replicate to authoritative location. APAC location = lower write-confirmation RTT for Korean submitters (~100-150ms saved)
- **Cost**: identical across locations
- **Jurisdiction**: `default` (no data residency constraints — EU/FedRAMP jurisdictions are separate)

**Decision required at G4 entry (yagi):**
- **(a) Accept ENAM** — Reads are edge-served so user-visible latency unaffected. Write confirm ~100ms slower for Korean submitters during upload. Acceptable for MVP.
- **(b) Delete + recreate via dashboard** with APAC hint. Empty bucket, no data loss. 2min manual step.
- **(c) Delete + recreate via wrangler CLI**:
  ```
  wrangler r2 bucket delete yagi-challenge-submissions
  wrangler r2 bucket create yagi-challenge-submissions --location apac
  ```

**This side-session did NOT delete the bucket.** Kept as-is pending yagi decision. MCP has no `r2_bucket_delete` in the loaded tool list either way.

---

### CORS config — step-by-step for G4 entry

Cloudflare MCP does NOT expose CORS set/get. Apply via **Dashboard** or **wrangler** at G4 entry. Both paths below.

#### Recommended JSON policy (yagi-approved spec)

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3003",
      "https://yagiworkshop.xyz"
    ],
    "AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
    "AllowedHeaders": [
      "Content-Type",
      "Authorization",
      "x-amz-content-sha256",
      "x-amz-date"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

**Rationale per directive:**
- Vercel preview `*` wildcard excluded — preview environments should hit `localhost` instead (security: prevents arbitrary preview-deploy origins from uploading)
- `DELETE` method excluded — submission edit = new object PUT + DB row update. Object deletion is admin-only via lifecycle rule (next section)
- `Authorization` + `x-amz-*` headers enable presigned PUT URL signing (AWS SigV4)
- `ETag` exposed for client-side upload verification
- 1-hour preflight cache reduces OPTIONS calls

#### Path A — Dashboard (~1min, recommended)

1. Open `https://dash.cloudflare.com/d1ca941ed081f237dcdfac514dc9a98f/r2/default/buckets/yagi-challenge-submissions`
2. Click **Settings** tab
3. Scroll to **CORS policy** section → click **Add CORS policy** (or **Edit** if one exists)
4. Paste the JSON above
5. Click **Save**
6. Verify: **Overview** tab shows CORS policy present

#### Path B — wrangler CLI (scriptable)

```bash
# Save the JSON policy to a file
cat > /tmp/cors.json <<'EOF'
[
  {
    "AllowedOrigins": ["http://localhost:3003", "https://yagiworkshop.xyz"],
    "AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
    "AllowedHeaders": ["Content-Type", "Authorization", "x-amz-content-sha256", "x-amz-date"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
EOF

# Apply (requires wrangler >=3.78 + CLOUDFLARE_API_TOKEN env scope: R2:Edit)
wrangler r2 bucket cors put yagi-challenge-submissions --file /tmp/cors.json

# Verify
wrangler r2 bucket cors list yagi-challenge-submissions
```

---

### Lifecycle rules — step-by-step for G4 entry

**Goal:** prevent garbage accumulation from failed client uploads after presigned URL issuance. Winners preserved permanently.

**Rule design:**
| Prefix | Action | Retention |
|---|---|---|
| `tmp/` | Delete object | 24 hours after upload |
| `submissions/` | Permanent | No rule (default infinite) |

**Client path convention (G4 implementation):**
- Initial presigned PUT target: `tmp/<challenge_id>/<uuid>/<filename>`
- Server moves (or renames via Copy+Delete) to `submissions/<challenge_id>/<submission_id>/<filename>` upon successful client confirmation
- Failed uploads → stuck at `tmp/` → auto-purged in 24h

#### Path A — Dashboard

1. Open bucket settings (URL above) → **Lifecycle** tab
2. Click **Add rule**
3. Rule config:
   - **Name:** `tmp-expire-24h`
   - **Prefix:** `tmp/`
   - **Action:** Delete objects
   - **Age:** 1 day after object creation
4. Click **Save**
5. (No rule needed for `submissions/` — default infinite retention)

#### Path B — wrangler CLI

```bash
# wrangler r2 bucket lifecycle has two subcommands: set (interactive), add (single rule)
wrangler r2 bucket lifecycle add yagi-challenge-submissions \
  --id tmp-expire-24h \
  --prefix "tmp/" \
  --expire-days 1

# Verify
wrangler r2 bucket lifecycle list yagi-challenge-submissions
```

---

### Cost estimate (post-creation, first month)

Cloudflare R2 Standard tier pricing (2026 rates):
- Storage: **$0.015/GB/month** (first month: ~$0, bucket empty)
- Class A operations (PUT/POST/DELETE/LIST): **free tier 1M/month** → MVP well below
- Class B operations (GET/HEAD): **free tier 10M/month** → MVP well below
- Egress: **$0/GB** (unlimited)

**First-month cost: effectively $0.** Bucket creation itself is free.

### Signed URL pattern (client lib)
```typescript
// src/lib/r2/client.ts (new)
import { S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PutObjectCommand } from "@aws-sdk/client-s3";

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
});

export async function createPresignedPutUrl(key: string, contentType: string) {
  const cmd = new PutObjectCommand({
    Bucket: "yagi-challenge-submissions",
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(r2, cmd, { expiresIn: 3600 });
}
```

### New ENV vars required
- `CLOUDFLARE_R2_ACCOUNT_ID`
- `CLOUDFLARE_R2_ACCESS_KEY_ID`
- `CLOUDFLARE_R2_SECRET_ACCESS_KEY`
- `CLOUDFLARE_R2_BUCKET_NAME` = `yagi-challenge-submissions`
- `CLOUDFLARE_R2_ENDPOINT` (derived; keep explicit for clarity)
- (optional) `CLOUDFLARE_R2_PUBLIC_BASE` for custom-domain serving

---

## Option B — Supabase Storage

### Pros
- **Same auth + RLS plane** as everything else
- Zero new ENV vars; reuse existing Supabase service client
- Signed-URL upload pattern **already in codebase 3×**:
  - `src/lib/team-channels/attachments.ts:70-79` (team-channel-attachments)
  - `src/app/[locale]/app/showcases/actions.ts:200-230+` (showcase-media)
  - `src/lib/thread-attachments.ts:141-208` (older, thread-attachments)
- RLS policies per bucket, per path segment (e.g., first segment = user_id) — storage-layer access control free
- No new deps

### Cons
- **Egress metered** — 250GB/month included in Pro plan, $0.09/GB over
- **50MB per-file cap on Free plan** (default request body limit); Pro plan allows tuning up to 5GB, but default bucket-level max is still effective
- Storage cost: $0.021/GB/month — slightly higher than R2
- Singapore region — fine for Korean users, ~20ms farther than Cloudflare APAC edge
- For videos, egress at scale will dominate cost

### Cost (est. same assumption)
- Storage: 30GB × $0.021 = **$0.63/mo**
- Egress: 100 × 0.3GB × 5000 = 150,000 GB. 250GB free; overage = 149,750 × $0.09 = **$13,477/mo** 🔥
  - (If viral.) Realistic: maybe 100 views/submission/month initial → 3000 GB = still 2750 overage = $247
  - Even optimistic: Supabase egress is **the dominant variable cost** in public-gallery video serving
- **Supabase total (optimistic, 100 views/submission/mo): ~$250/mo**

### Latency (Korea)
- Supabase SG region → Seoul: ~20-40ms TTFB (still fine)
- No edge cache by default (would need external CDN in front)

### Setup commands
```sql
-- Migration for RLS + bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit)
  VALUES ('challenge-submissions', 'challenge-submissions', false, 524288000);  -- 500MB, not 50MB
  
CREATE POLICY "submit_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'challenge-submissions'
    AND (storage.foldername(name))[1] = auth.uid()::text
    -- + challenge state check via JOIN to challenge_submissions
  );

CREATE POLICY "read_public" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'challenge-submissions');  -- public gallery read
```

Note: Free plan `file_size_limit` is capped at 52428800 (50MB). Pro plan can be set higher. If still on Free, must also reduce SPEC §1 video cap to 50MB.

### Signed URL pattern (reuse existing)
Copy `requestUploadUrls` pattern from `src/lib/team-channels/attachments.ts` directly. No new primitive.

---

## Comparison table

| Dimension | R2 | Supabase Storage |
|---|---|---|
| Per-file cap (500MB video) | ✅ no issue | ⚠ Free plan 50MB; Pro needs bucket config |
| Egress cost at scale | ✅ $0 | 🔥 $0.09/GB over 250GB |
| RLS integration | ❌ app-layer only | ✅ native |
| Codebase precedent | ❌ new | ✅ 3 existing patterns |
| New ENV vars | 5+ new | 0 new |
| New deps | `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` | 0 |
| Custom CDN domain | ✅ easy (CF Workers/Routes) | ⚠ requires CF proxy in front |
| Setup complexity | medium (CORS + creds + lib) | low (SQL migration only) |
| Korean latency | ✅ excellent (CF edge) | ✅ good (SG) |
| Operational familiarity | ✅ yagi-models precedent | ✅ 3 existing buckets |
| Failure mode if cost explodes | cost stays flat | 📈 egress blowout |

---

## Recommendation

**R2 for challenge submissions.** Primary driver: public gallery = high egress = R2's zero-egress saves $100s/month vs Supabase at any non-trivial traffic level. SPEC §3 G1 Task 9 lists R2 as default with Supabase as fallback — this audit confirms R2 is the right default.

**Supabase Storage fallback remains valid if:**
- R2 provisioning is blocked at G4 entry (cloudflare outage, creds missing, etc.)
- In which case: reduce SPEC §1 video cap to 50MB (Free plan) or tune bucket limit (Pro)
- SPEC §6 Q3 captures this 500MB↔50MB switch

**Avatars stay on Supabase Storage** (SPEC G6 Task 3) — small files, per-user private, RLS-native. No change.

---

## If yagi approves R2: execution plan (this session)

Cloudflare MCP calls in sequence:

```
1. accounts_list → confirm d1ca941ed081f237dcdfac514dc9a98f active
2. set_active_account(d1ca941ed081f237dcdfac514dc9a98f)
3. r2_bucket_create(name="yagi-challenge-submissions", locationHint="apac")
4. r2_bucket_get(name="yagi-challenge-submissions") → verify
```

**CORS:** Cloudflare MCP does NOT expose a CORS set/get tool directly. CORS must be set via:
- Dashboard (manual), OR
- `wrangler r2 bucket cors put` CLI (requires local wrangler install), OR
- Cloudflare API via HTTP (requires API token)

**Recommendation for CORS:** document the JSON policy in this audit + leave dashboard application for yagi (1min manual step). Alternatively, main session can `wrangler` at G4 entry.

---

## If yagi approves Supabase fallback instead

Write migration stub (not applied yet):

```sql
-- supabase/migrations/TBD_phase_2_5_challenge_submissions_bucket.sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'challenge-submissions',
  'challenge-submissions',
  true,  -- public SELECT for gallery streaming
  52428800,  -- 50MB to match Free plan; raise on Pro
  ARRAY['video/mp4','image/jpeg','image/png','application/pdf']
)
ON CONFLICT (id) DO NOTHING;
-- + policies (see §Option B above)
```

Apply at G4 entry via `supabase db push`. No new ENV vars.

---

## Open sub-questions for yagi

1. **Plan tier**: is Supabase Workshop on Free or Pro? Egress + file-size caps hinge on this.
2. **Cloudflare API token**: is there a scoped token for automated CORS + bucket management, or only dashboard access?
3. **Custom domain** for R2 public serving: defer to Phase 2.6, or provision now?
4. **Backup policy**: R2 has no built-in backup. Acceptable for user-generated challenge content, or mirror to Supabase Storage?
