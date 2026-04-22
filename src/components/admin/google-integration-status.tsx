"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type HealthResponse = {
  auth_configured: boolean;
  token_refresh_ok: boolean;
  last_checked_at: string;
};

type State =
  | { status: "loading" }
  | { status: "hidden" }
  | { status: "error"; message: string }
  | { status: "synced"; last_checked_at: string }
  | { status: "not_configured" }
  | { status: "attention_required"; last_checked_at: string };

export function GoogleIntegrationStatus() {
  const t = useTranslations("admin");
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/health/google")
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 403 || res.status === 401) {
          setState({ status: "hidden" });
          return;
        }
        if (!res.ok) {
          setState({ status: "error", message: `HTTP ${res.status}` });
          return;
        }
        const data: HealthResponse = await res.json();
        if (!data.auth_configured) {
          setState({ status: "not_configured" });
        } else if (data.token_refresh_ok) {
          setState({ status: "synced", last_checked_at: data.last_checked_at });
        } else {
          setState({ status: "attention_required", last_checked_at: data.last_checked_at });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setState({ status: "error", message: err?.message ?? "Network error" });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "loading") {
    return <Skeleton className="h-7 w-48 rounded-full" />;
  }

  if (state.status === "hidden") {
    return null;
  }

  if (state.status === "error") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs text-red-700">
        <span className="h-2 w-2 rounded-full bg-red-500" />
        {state.message}
      </span>
    );
  }

  if (state.status === "not_configured") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs text-amber-700">
        <span className="h-2 w-2 rounded-full bg-amber-400" />
        {t("google.not_configured")}
        <a
          href="/docs/google-oauth-setup.md"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-1 underline underline-offset-2 hover:text-amber-900"
        >
          Setup →
        </a>
      </span>
    );
  }

  if (state.status === "attention_required") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs text-red-700">
        <span className="h-2 w-2 rounded-full bg-red-500" />
        {t("google.attention_required")}
        {state.last_checked_at && (
          <span
            className={cn("ml-1 text-red-500")}
            title={new Date(state.last_checked_at).toISOString()}
          >
            · {t("google.last_checked")}{" "}
            {new Intl.DateTimeFormat(undefined, {
              hour: "2-digit",
              minute: "2-digit",
            }).format(new Date(state.last_checked_at))}
          </span>
        )}
      </span>
    );
  }

  // synced
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs text-green-700">
      <span className="h-2 w-2 rounded-full bg-green-500" />
      {t("google.synced")}
      {state.last_checked_at && (
        <span className="ml-1 text-green-600">
          · {t("google.last_checked")}{" "}
          {new Intl.DateTimeFormat(undefined, {
            hour: "2-digit",
            minute: "2-digit",
          }).format(new Date(state.last_checked_at))}
        </span>
      )}
    </span>
  );
}
