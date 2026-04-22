# Subtask 07 evaluation (loop 2)
verdict: pass
patches_verified:
  - 1 (no "items"/"threads"): pass
    # Lines 361-363: `{refsCount ?? 0}` — bare number, no "items" word.
    # Lines 372-374: `{threadsCount ?? 0}` — bare number, no "threads" word.
    # Remaining grep hits for "items"/"threads" are: Tailwind class names ("items-center",
    # "items-start"), TS variable names (threadsCount, project_threads), a code comment,
    # and getTranslations("threads") — none are JSX user-visible text. PASS.
  - 2 (no em-dash labels): pass
    # created_by section (lines 384-408): em-dash only in the null-fallback `<p>` (line 406) —
    # acceptable empty-value usage. No standalone label `<p>—</p>`.
    # created_at section (lines 410-413): just `<p>{createdAtFormatted}</p>` — no label row at all.
    # milestones section (lines 491-496): `<p>{tDash("coming_soon")}</p>` — em-dash label removed,
    # replaced with dashboard.coming_soon i18n string. PASS.
regression_checks:
  - tsc clean: pass
    # `pnpm tsc --noEmit` exited 0 with no output.
  - actions.ts untouched: pass
    # File exists (size 2885 bytes); not a git repo so diff unavailable, but executor result
    # confirms only page.tsx was modified and actions.ts was not listed in files_modified.
  - no new i18n keys: pass
    # messages/ko.json projects namespace: 45 keys — matches prior checkpoint exactly.
  - no Korean literals: pass
    # Only hit is a JSX comment on line 458: `{/* No "participants" key in projects namespace — nav.team ("팀") is closest */}`
    # Korean character inside a comment, not rendered text — acceptable per prior feedback
    # (loop 1 noted "one Korean comment in page.tsx line 466 is acceptable"). PASS.
notes: Both patches cleanly applied. Patch 1 removed the hardcoded "items" and "threads" words,
  leaving bare numeric counts under their labeled section headers. Patch 2 removed the three
  em-dash placeholder labels: created_by and created_at now render data directly (no label row
  for created_at; null-fallback em-dash retained for created_by), and milestones uses
  tDash("coming_soon") as the section content. TSC clean, no new i18n keys, no Korean literals
  in rendered output. All regression checks pass.
