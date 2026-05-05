"use client";

// Phase 6 Wave A.3 — Invite Artist section (toggle + form)
// Renders the [+ 새 Artist 영입] button and the inline form below it.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { InviteArtistForm } from "./invite-artist-form";

interface InviteArtistSectionProps {
  t_invite_cta: string;
}

export function InviteArtistSection({
  t_invite_cta,
}: InviteArtistSectionProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  function handleSuccess() {
    setOpen(false);
    // Revalidate the page to refresh the artist list
    router.refresh();
  }

  return (
    <section className="space-y-4">
      <Button
        variant="outline"
        className="rounded-full px-6 border-border"
        onClick={() => setOpen((v) => !v)}
      >
        {t_invite_cta}
      </Button>

      {open && (
        <div className="border border-border rounded-lg p-6 bg-background">
          <InviteArtistForm onSuccess={handleSuccess} />
        </div>
      )}
    </section>
  );
}
