# Wave C.5b amend_05 — wizard.step3.twin_intent.* i18n keys

**Date**: 2026-05-01
**Trigger**: yagi visual review of `/ko/app/projects/new` Step 3 surfaced
raw i18n keys (`projects.wizard.step3.twin_intent.label` etc) instead
of the localised copy.

## Root cause

`new-project-wizard.tsx` calls (line 715 + nearby):

- `t("wizard.step3.twin_intent.label")`
- `t("wizard.step3.twin_intent.tooltip_aria")`
- `t("wizard.step3.twin_intent.tooltip")`
- `t("wizard.step3.twin_intent.option.undecided")`
- `t("wizard.step3.twin_intent.option.specific")`
- `t("wizard.step3.twin_intent.option.no_twin")`

But `messages/{ko,en}.json` only had `projects.wizard.field.twin_intent.*`
(under `field`, not `step3`). next-intl's `t(...)` falls back to the key
literal when the path doesn't resolve, hence the raw-key surface.

This is a Wave A `task_03` spec drift — the keys were authored under
`field.*` but the wizard component path was specced under `step3.*`.

## Fix (option B — duplicate copy under step3)

Add `twin_intent` under `projects.wizard.step3` in both locale files
with values copied verbatim from `wizard.field.twin_intent.*`. The
existing `field.twin_intent.*` block is left in place; a future
`sub_09`-style cleanup audit can prune it once any other consumers
(if any) are confirmed gone.

### KO (messages/ko.json `projects.wizard.step3.twin_intent`)

```json
"twin_intent": {
  "label": "Digital Twin 활용을 원하시나요?",
  "tooltip": "Digital Twin 은 실존 인물(아티스트, 배우, 가수 등) 기반의 AI 자산입니다. YAGI 가 라이선스를 보유한 인물의 Twin 을 광고/콘텐츠 제작에 활용하는 걸 제안드릴 수 있습니다. Digital Twin 없이 가상 인물 / VFX 만으로도 진행 가능합니다.",
  "tooltip_aria": "Digital Twin 정보",
  "option": {
    "undecided": "Twin 활용 의향 있음",
    "specific": "정해진 인물이 있다",
    "no_twin": "Twin 활용 안 함 (가상 인물 / VFX 만)"
  }
}
```

### EN (messages/en.json `projects.wizard.step3.twin_intent`)

```json
"twin_intent": {
  "label": "Would you like to use a Digital Twin?",
  "tooltip": "Digital Twin is an AI asset based on real persons (artists, actors, singers). YAGI can propose Twins of licensed talents for ads or content production. You can also produce without Twins, using only virtual characters or VFX.",
  "tooltip_aria": "Digital Twin info",
  "option": {
    "undecided": "Open to using a Twin",
    "specific": "I have a specific person in mind",
    "no_twin": "No Twin (virtual character / VFX only)"
  }
}
```

The EN copy mirrors the existing `field.twin_intent` text, which the
prompt asked for; if yagi prefers a different phrasing for "Open to
using a Twin" (the spec block in the amendments prompt suggested the
same wording), we can iterate later.

## Verify

- `pnpm exec tsc --noEmit` → exit 0 (i18n is JSON-only; no type
  generation in this repo).
- JSON.parse round-trip on both files succeeds.
- KO + EN remain key-equivalent (added the same path on both sides).

## Codex review

SKIP per the wave prompt — i18n only, no schema or runtime behaviour
change beyond label/copy resolution.

## Open follow-up (informational, not for this commit)

The `projects.wizard.field.twin_intent.*` block is now redundant with
the `step3.twin_intent.*` copy. A `wizard.field.*` audit at the same
shape as Wave C.5b sub_09 would be the right window to prune it; for
now both blocks coexist so any unexpected consumer continues to
resolve.
