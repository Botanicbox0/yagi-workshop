import { redirect } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  restoreProjectFormAction,
  hardDeleteProjectFormAction,
} from "../../projects/[id]/actions";

type Props = {
  params: Promise<{ locale: string }>;
};

type DeletedProject = {
  id: string;
  title: string;
  status: string;
  workspace_id: string;
  deleted_at: string;
  brand: { id: string; name: string } | null;
};

const HARD_DELETE_AFTER_DAYS = 3;

export default async function AdminTrashPage({ params }: Props) {
  const { locale } = await params;

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect({ href: "/signin", locale });
    return null;
  }
  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
    uid: user.id,
  });
  if (!isAdmin) {
    redirect({ href: "/app", locale });
    return null;
  }

  const t = await getTranslations({ locale, namespace: "admin_trash" });

  const { data, error } = await supabase
    .from("projects")
    .select("id, title, status, workspace_id, deleted_at, brand:brands(id, name)")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });

  if (error) {
    console.error("[AdminTrashPage] Supabase error:", error);
  }

  const rows = (data ?? []) as DeletedProject[];

  const dateFmt = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  function daysRemaining(deletedAt: string): number {
    const purgeAt =
      new Date(deletedAt).getTime() + HARD_DELETE_AFTER_DAYS * 86400000;
    return Math.max(
      0,
      Math.ceil((purgeAt - Date.now()) / 86400000),
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 md:px-8 py-12">
      <header className="space-y-2 mb-8">
        <h1 className="font-display text-3xl tracking-tight">
          <em>{t("title")}</em>
        </h1>
        <p className="text-sm text-muted-foreground keep-all">{t("sub")}</p>
      </header>

      {rows.length === 0 && (
        <div className="border border-dashed border-border rounded-lg py-16 text-center">
          <p className="text-sm text-muted-foreground keep-all">{t("empty")}</p>
        </div>
      )}

      {rows.length > 0 && (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-left">
              <tr>
                <th className="px-4 py-3 font-medium text-xs uppercase tracking-[0.1em] text-muted-foreground">
                  {t("col_title")}
                </th>
                <th className="px-4 py-3 font-medium text-xs uppercase tracking-[0.1em] text-muted-foreground">
                  {t("col_deleted_at")}
                </th>
                <th className="px-4 py-3 font-medium text-xs uppercase tracking-[0.1em] text-muted-foreground tabular-nums">
                  {t("col_remaining")}
                </th>
                <th className="px-4 py-3 font-medium text-xs uppercase tracking-[0.1em] text-muted-foreground text-right">
                  {t("col_actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const remaining = daysRemaining(row.deleted_at);
                return (
                  <tr
                    key={row.id}
                    className="border-t border-border align-middle"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium leading-snug keep-all">
                        {row.title}
                      </p>
                      {row.brand && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {row.brand.name}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground tabular-nums">
                      {dateFmt.format(new Date(row.deleted_at))}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground tabular-nums">
                      {t("remaining_days", { n: remaining })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <form action={restoreProjectFormAction}>
                          <input
                            type="hidden"
                            name="projectId"
                            value={row.id}
                          />
                          <Button
                            type="submit"
                            variant="outline"
                            size="sm"
                            className="rounded-full text-xs uppercase tracking-[0.1em]"
                          >
                            {t("restore")}
                          </Button>
                        </form>
                        <form action={hardDeleteProjectFormAction}>
                          <input
                            type="hidden"
                            name="projectId"
                            value={row.id}
                          />
                          <Button
                            type="submit"
                            variant="ghost"
                            size="sm"
                            className="rounded-full text-xs uppercase tracking-[0.1em] text-destructive hover:text-destructive"
                          >
                            {t("permanent_delete")}
                          </Button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
