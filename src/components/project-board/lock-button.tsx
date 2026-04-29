"use client";

/**
 * lock-button.tsx
 * Phase 3.1 hotfix-3 task_04 — yagi_admin-only lock/unlock button for brief mode.
 *
 * Design system v0.2.0:
 *   - L-011: achromatic only (no color accents)
 *   - L-013: soft shadow or border-border/40 on button
 *   - L-014: no italic em
 *
 * Confirmation dialog shown on LOCK only (not on unlock — cheaper to undo, Q-AB).
 * Lock button is ONLY rendered in brief mode (wizard never has a lock — no board exists yet).
 */

import { useState } from "react";
import { useTranslations } from "next-intl";

// ============================================================
// Props
// ============================================================

type Props = {
  boardId: string;
  isLocked: boolean;
  /**
   * Callback to toggle lock state. Returns the new isLocked value on success.
   * Caller should update local optimistic state on resolution.
   */
  onToggle: (newState: boolean) => Promise<{ ok: boolean }>;
};

// ============================================================
// Confirmation Dialog (simple native modal-like overlay)
// ============================================================

function ConfirmDialog({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations("board.lock");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lock-confirm-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Dialog box */}
      <div
        className="relative z-10 rounded-lg bg-background border border-border/40 px-6 py-5 w-full max-w-sm mx-4"
        style={{
          boxShadow: "0 4px 24px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06)",
        }}
      >
        <h2
          id="lock-confirm-title"
          className="font-suit text-base font-semibold text-foreground mb-2"
        >
          {t("confirm.title")}
        </h2>
        <p className="font-suit text-sm text-muted-foreground mb-5 keep-all">
          {t("confirm.body")}
        </p>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="font-suit text-sm rounded-md px-4 py-2 border border-border/40 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            {t("confirm.cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="font-suit text-sm rounded-md px-4 py-2 border border-border/60 bg-foreground text-background hover:opacity-90 transition-opacity"
          >
            {t("confirm.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// LockButton component
// ============================================================

export function LockButton({ boardId: _boardId, isLocked, onToggle }: Props) {
  const t = useTranslations("board.lock");
  const [optimisticLocked, setOptimisticLocked] = useState(isLocked);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Sync if server re-renders with new prop (e.g., after page revalidation)
  if (isLocked !== optimisticLocked && !loading) {
    setOptimisticLocked(isLocked);
  }

  const handleClick = () => {
    if (optimisticLocked) {
      // Unlock: no confirmation needed
      void handleToggle(false);
    } else {
      // Lock: show confirmation first
      setShowConfirm(true);
    }
  };

  const handleToggle = async (newState: boolean) => {
    setLoading(true);
    setOptimisticLocked(newState); // optimistic
    const result = await onToggle(newState);
    if (!result.ok) {
      // Roll back optimistic
      setOptimisticLocked(!newState);
      console.error("[LockButton] toggle failed");
    }
    setLoading(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        aria-label={
          optimisticLocked
            ? t("unlock_button")
            : t("lock_button")
        }
        className={[
          "font-suit text-xs rounded-md px-3 py-1.5 transition-colors disabled:opacity-50 flex items-center gap-1.5",
          optimisticLocked
            ? // Filled (locked state) — achromatic, no color
              "border border-border/60 bg-foreground text-background hover:opacity-90"
            : // Outline (unlocked state)
              "border border-border/40 text-muted-foreground hover:text-foreground hover:bg-muted",
        ]
          .filter(Boolean)
          .join(" ")}
        style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}
      >
        {optimisticLocked ? t("unlock_button") : t("lock_button")}
      </button>

      {showConfirm && (
        <ConfirmDialog
          onConfirm={() => {
            setShowConfirm(false);
            void handleToggle(true);
          }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  );
}
