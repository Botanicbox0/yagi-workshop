"use client";

// =============================================================================
// Phase 2.8.2 G_B2_D — Brief board side panel
// =============================================================================
// Right-column collapsible panel with two tabs:
//   - 메시지 (default, primary)  = BriefCommentPanel (project_threads RT)
//   - 버전 기록 (secondary)       = VersionHistorySidebar
//
// Realtime: dedicated unread-counter channel subscribes to thread_messages
// INSERTs filtered by thread_id and bumps the unread badge while the tab
// is NOT active. Defense-in-depth (kickoff §2 G_B2_D loop 2 + Q-085 spirit):
// the channel filter is layered on top of RLS so cross-project leak would
// require both RLS and the explicit thread_id to be wrong.
//
// Draft preservation (kickoff §2 G_B2_D FAIL on draft message lost):
// TabsContent uses Radix's `forceMount` so both panes stay mounted; the
// inactive pane is visually hidden via `data-[state=inactive]:hidden`.
// This avoids unmounting ThreadPanel and losing its uncontrolled <input>
// state — cheaper than lifting state up per ON_FAIL_LOOP loop 1.
// =============================================================================

import { useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function BriefSidePanel({
  projectId,
  threadId,
  messagesTab,
  versionsTab,
  className,
}: {
  projectId: string;
  threadId: string | null;
  messagesTab: ReactNode;
  versionsTab: ReactNode;
  className?: string;
}) {
  const t = useTranslations("brief_board");
  const [active, setActive] = useState<"messages" | "versions">("messages");
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!threadId) return;
    const supabase = createSupabaseBrowser();
    const channel = supabase
      .channel(`brief-side:${projectId}:unread`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "thread_messages",
          filter: `thread_id=eq.${threadId}`,
        },
        () => {
          setUnread((prev) => {
            if (active !== "messages") {
              toast.message(t("new_message_toast"));
              return prev + 1;
            }
            return prev;
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // `active` is intentionally read inside the callback at-fire-time via
    // the closure created here; we re-bind on its change so the toast/
    // count branch picks up tab-state correctly.
  }, [projectId, threadId, active, t]);

  useEffect(() => {
    if (active === "messages") setUnread(0);
  }, [active]);

  return (
    <div className={cn("space-y-3", className)}>
      <Tabs
        value={active}
        onValueChange={(v) => setActive(v as "messages" | "versions")}
      >
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="messages" className="gap-1.5">
            <span>{t("sidepanel_tab_messages")}</span>
            {unread > 0 && (
              <span
                aria-label={t("sidepanel_unread_aria", { n: unread })}
                className="inline-flex items-center justify-center min-w-[1rem] h-4 rounded-full bg-foreground text-background px-1 text-[10px] font-semibold tabular-nums"
              >
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="versions">
            {t("sidepanel_tab_versions")}
          </TabsTrigger>
        </TabsList>
        <TabsContent
          value="messages"
          forceMount
          className="data-[state=inactive]:hidden"
        >
          {messagesTab}
        </TabsContent>
        <TabsContent
          value="versions"
          forceMount
          className="data-[state=inactive]:hidden"
        >
          {versionsTab}
        </TabsContent>
      </Tabs>
    </div>
  );
}
