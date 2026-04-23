// 90-day handle change lock — Phase 2.5 G2.
// Source: G2 Entry Decision Package §E (2026-04-23).
// Server-enforced rule; UI surfaces `daysRemaining` + `unlockAt` for
// "다음 변경 가능" messaging per §E State 2.

export const HANDLE_CHANGE_LOCK_DAYS = 90;

export function canChangeHandle(handle_changed_at: Date | null): {
  allowed: boolean;
  daysRemaining: number;
  unlockAt: Date | null;
} {
  if (handle_changed_at === null) {
    return { allowed: true, daysRemaining: 0, unlockAt: null };
  }
  const lockEnd = new Date(handle_changed_at);
  lockEnd.setDate(lockEnd.getDate() + HANDLE_CHANGE_LOCK_DAYS);
  const now = new Date();
  if (now >= lockEnd) {
    return { allowed: true, daysRemaining: 0, unlockAt: null };
  }
  const msRemaining = lockEnd.getTime() - now.getTime();
  const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));
  return { allowed: false, daysRemaining, unlockAt: lockEnd };
}
