"use client";

import { Share } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type Props = { slug: string; title: string };

// slug is required by the interface contract (Group C gallery imports this component
// and may use slug for analytics or sharing context in a future iteration).
export function ShareButton({ title }: Props) {
  async function handleShare() {
    const url = window.location.href;
    try {
      await navigator.share({ title, url });
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        toast("링크가 복사되었어요");
      } catch {
        // clipboard also failed — silently ignore
      }
    }
  }

  return (
    <Button size="pill" variant="outline" onClick={handleShare}>
      <Share />
      공유
    </Button>
  );
}
