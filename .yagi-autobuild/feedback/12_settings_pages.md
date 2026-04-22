# Subtask 12 feedback — loop 2
verdict: PASS

## Loop 1 issues — resolution
- Issue 1 (avatar upload validation): resolved — `actions.ts` exports `updateAvatarUrl` with dedicated `avatarSchema` (`z.object({ avatar_url: z.string().min(1) })`); callsite in `profile-form.tsx:93` now calls `updateAvatarUrl({ avatar_url: path })`.
- Issue 2 (hardcoded helper text): resolved — the `<p>` element containing `"JPG, PNG, WEBP · max 5 MB"` is absent from `profile-form.tsx`; only a `<p>{t("avatar_upload")}</p>` label remains.

## Regression checks
- tsc clean: pass — `pnpm tsc --noEmit` produces no output
- No other hardcoded English strings: pass — all user-facing strings go through `t()` / `tCommon()` / `tOnboarding()`
- No new i18n keys: pass — no new keys added to either messages file; existing 15 settings keys unchanged
- Never-throw action pattern preserved: pass — both `updateProfile` and `updateAvatarUrl` return `{ error } | { ok: true }`; no throws

## Verdict
PASS — both loop 1 blocking issues resolved; no regressions introduced.
