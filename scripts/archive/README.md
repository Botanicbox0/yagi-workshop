# `scripts/archive/` — One-shot scripts kept for reference

Scripts here ran exactly once during a specific phase to fix or migrate
something. They are not meant to be run again, but the record helps if a
similar situation comes up later.

## `repair-supabase-history.ps1`

Phase 2.8.1 SHIPPED setup — supabase migration history table on prod had 34
row entries that didn't exist locally (timestamps from before the repo's
naming convention stabilized). This script marks them all as `reverted` so
`supabase db push` stops complaining about history drift.

Cosmetic operation only — does NOT touch schema. The actual production
schema was correctly built up through those 34 migrations even though the
local repo couldn't reproduce that history.

If supabase migration history drift recurs in the future, this script is a
template, not a copy-paste solution: the timestamp list will be different.

Ran once on 2026-04-27. Should never need to run again.
