"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { setActiveWorkspaceAction } from "@/lib/workspace/actions";

type InternalWorkspace = {
  id: string;
  name: string;
};

type Props = {
  currentWorkspaceName: string | null;
  internalWorkspace: InternalWorkspace | null;
};

export function AdminWorkspaceSwitchNotice({
  currentWorkspaceName,
  internalWorkspace,
}: Props) {
  const t = useTranslations("admin.context_switch");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSwitch() {
    if (!internalWorkspace) return;

    startTransition(async () => {
      const result = await setActiveWorkspaceAction(internalWorkspace.id);
      if (!result.ok) {
        toast.error(t(`errors.${result.error}`));
        return;
      }
      router.push("/app/admin");
      router.refresh();
    });
  }

  return (
    <section className="mx-auto flex min-h-[60vh] w-full max-w-3xl items-center justify-center py-10">
      <div className="w-full rounded-lg border border-border/70 bg-surface-raised p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-label text-brand">
              {t("eyebrow")}
            </p>
            <h1 className="mt-3 text-2xl font-bold leading-tight text-foreground keep-all sm:text-3xl">
              {t("title")}
            </h1>
            <p className="mt-4 text-sm leading-6 text-muted-foreground keep-all sm:text-base">
              {t("description", {
                current: currentWorkspaceName ?? t("unknown_workspace"),
              })}
            </p>

            <div className="mt-6 rounded-lg border border-border/70 bg-surface-card p-4">
              <p className="text-sm font-semibold text-foreground keep-all">
                {internalWorkspace
                  ? t("target", { workspace: internalWorkspace.name })
                  : t("missing_target")}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground keep-all">
                {internalWorkspace ? t("hint") : t("missing_hint")}
              </p>
            </div>

            <div className="mt-6">
              <Button
                type="button"
                className="h-11 gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-brand-on hover:bg-brand/90"
                disabled={!internalWorkspace || isPending}
                onClick={handleSwitch}
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                )}
                {t("cta")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
