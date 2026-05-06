# R2 lifecycle rules

Reference for the Cloudflare R2 buckets used by yagi-workshop. **All
lifecycle rules are configured manually via the Cloudflare Dashboard** —
they're outside the SDK + are infrastructure-as-config (no IaC pipeline yet,
deferred to Phase 8).

## Buckets

| Bucket env | Default | Purpose | Lifecycle rule(s) |
|---|---|---|---|
| `CLOUDFLARE_R2_BUCKET_NAME` | `yagi-workshop-submissions` | Wave C v2 campaign submissions (Phase 7) | **`tmp/` 24h expire** ⬅ MUST configure |
| `CLOUDFLARE_R2_BRIEF_BUCKET` | `yagi-commission-files` | Phase 2.8 brief board assets, Phase 3.1 project briefs | none required |

## `yagi-workshop-submissions` — `tmp/` 24-hour expire

**Rationale (per SPEC §4 MED-3):**

`presignSubmissionUpload` issues a 1-hour presigned PUT URL for keys under
`tmp/campaigns/<campaign_id>/<nonce>/<filename>`. Successful submissions
through `submitCampaignApplicationAction` reference the `tmp/` key directly
in `campaign_submissions.content_r2_key` — they are NOT moved to a `published/`
prefix in Wave C v2 (HEAD-check + MIME persistence is the trust boundary).

Abandoned uploads (presign called, PUT completed, but submit action never
called or rejected) accumulate forever without cleanup. The lifecycle rule
caps storage growth at ~24 hours of unsubmitted upload traffic.

**Setup steps (manual, yagi Cloudflare Dashboard):**

1. Cloudflare Dashboard → **R2** → bucket `yagi-workshop-submissions`
2. Tab **Settings** → **Object lifecycle rules** → **Add rule**
3. Rule configuration:
   - **Rule name:** `tmp-prefix-24h-expire`
   - **Prefix:** `tmp/`
   - **Action:** Delete uploaded objects
   - **Days after object creation:** `1` (24 hours)
   - **Apply to:** Current and future objects
4. Save

**Verification:**

After ~24 hours, abandoned objects under `tmp/campaigns/...` should be
auto-deleted by Cloudflare. Submitted objects (referenced by
`campaign_submissions.content_r2_key`) are also under `tmp/*` per the
current shape but remain accessible because the metric is lifecycle age
since CREATION; an active submission that lasts >24 hours will also be
deleted.

⚠️ **Known limitation, deferred to Phase 8:** the current shape stores
permanently-referenced submission media under `tmp/*`. Once approved for
distribution, these objects must be **moved to a `published/` prefix BEFORE
the 24-hour mark** to avoid mid-campaign deletion. Implementation options:

- **Phase 8 option (a)**: post-approval R2 CopyObject + DeleteObject in
  `approveSubmissionAction` (admin-side), updates `content_r2_key`.
- **Phase 8 option (b)**: skip lifecycle rule for now, accept storage growth.
  Acceptable while submission volume is low.
- **Phase 8 option (c)**: extend lifecycle rule to `tmp/` only objects whose
  metadata flags them as unsubmitted — requires R2 object tagging API
  (paid feature).

## Other lifecycle considerations (not implemented, FU)

- **`yagi-commission-files`** — Phase 2.8 brief assets accumulate for the
  life of the workspace. No cleanup yet. FU: post-soft-delete workspace
  purge after 90 days.
- **R2 access logs** — not enabled. FU: enable + retention 30 days for
  abuse audit.
