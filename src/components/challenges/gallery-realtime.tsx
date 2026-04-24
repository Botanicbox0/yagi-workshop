"use client";

// First realtime subscriber in the YAGI codebase.
// Pattern: postgres_changes channel scoped to a single challenge, triggers
// router.refresh() on new submission INSERT so the RSC re-fetches gallery data.
// Copy this pattern for future realtime surfaces — keep the cleanup (removeChannel)
// to avoid channel leaks on navigation.

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase/client";

type Props = { challengeId: string };

export function GalleryRealtime({ challengeId }: Props) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createSupabaseBrowser();

    const channel = supabase
      .channel(`gallery:${challengeId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "challenge_submissions",
          filter: `challenge_id=eq.${challengeId}`,
        },
        () => {
          // Triggers RSC re-fetch — new submission will appear within SLA
          router.refresh();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [challengeId, router]);

  return null;
}
