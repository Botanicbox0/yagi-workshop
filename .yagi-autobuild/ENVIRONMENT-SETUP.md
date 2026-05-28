# Environment Setup Notes

## 2026-05-28 WSL dev server + Playwright

### pnpm PATH + native build approval

Problem:
- `pnpm` was not on PATH even though Corepack was available.
- `corepack enable` tried to write `/usr/bin/pnpm` and failed with `EACCES`.
- `corepack pnpm dev` failed with `ERR_PNPM_IGNORED_BUILDS` for native packages.

Fix:
```bash
corepack enable --install-directory /home/yagi/.local/bin
corepack prepare pnpm@latest --activate
pnpm approve-builds @parcel/watcher @swc/core esbuild msw sharp unrs-resolver
```

Persistent repo state:
- `pnpm-workspace.yaml` records the trusted native build packages under `allowBuilds`.
- `/home/yagi/.local/bin` is already on PATH in this WSL session.

Verify:
```bash
which pnpm
pnpm --version
pnpm dev
ss -ltnp sport = :3003
```

Expected:
- `which pnpm` -> `/home/yagi/.local/bin/pnpm`
- `pnpm --version` -> `11.4.0` or newer
- `pnpm dev` -> `next dev -p 3003`, `Ready`
- `ss -ltnp sport = :3003` -> `next-server` LISTEN on `*:3003`

### Playwright Chromium

Fix:
```bash
npx playwright install chromium
```

If launch fails because Linux system dependencies are missing:
```bash
npx playwright install-deps chromium
```

Smoke target:
```text
http://localhost:3003/auth/confirm?token_hash=dummy&type=email&next=/onboarding/workspace
```

Expected:
- viewport `1280x720`
- HTTP status `200`
- title `YAGI · 이메일 인증`
- console errors `0`
