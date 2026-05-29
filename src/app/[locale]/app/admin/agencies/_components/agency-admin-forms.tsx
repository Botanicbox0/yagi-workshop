"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Link2, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  inviteAgencyAction,
  linkAgencyArtistAction,
  unlinkAgencyArtistAction,
} from "../_actions/invite-agency";

type Labels = {
  inviteCta: string;
  inviteTitle: string;
  inviteHelper: string;
  email: string;
  agencyName: string;
  agencyNamePlaceholder: string;
  note: string;
  optional: string;
  send: string;
  sending: string;
  linkTitle: string;
  linkHelper: string;
  agency: string;
  artist: string;
  selectAgency: string;
  selectArtist: string;
  linkCta: string;
  linking: string;
  unlink: string;
  successInvite: string;
  successLink: string;
  successUnlink: string;
  errorValidation: string;
  errorForbidden: string;
  errorInvite: string;
  errorDb: string;
};

export type AgencyOption = {
  id: string;
  name: string;
};

export type ArtistOption = {
  id: string;
  name: string;
};

export function InviteAgencySection({ labels }: { labels: Labels }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result = await inviteAgencyAction({ email, agencyName, note });
      if (!result.ok) {
        toast.error(errorLabel(labels, result.error));
        return;
      }

      toast.success(labels.successInvite);
      setEmail("");
      setAgencyName("");
      setNote("");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <section className="space-y-4">
      <Button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="gap-2 rounded-full bg-brand px-6 text-brand-on hover:bg-brand/90"
      >
        <Building2 className="h-4 w-4" aria-hidden="true" />
        {labels.inviteCta}
      </Button>

      {open && (
        <div className="max-w-xl rounded-lg border border-border/70 bg-surface-raised p-5 sm:p-6">
          <h2 className="text-base font-semibold text-foreground keep-all">
            {labels.inviteTitle}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground keep-all">
            {labels.inviteHelper}
          </p>

          <div className="mt-5 space-y-4">
            <Field label={labels.email}>
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="agency@example.com"
                className="bg-surface-card"
              />
            </Field>
            <Field label={labels.agencyName}>
              <Input
                value={agencyName}
                onChange={(event) => setAgencyName(event.target.value)}
                placeholder={labels.agencyNamePlaceholder}
                className="bg-surface-card"
              />
            </Field>
            <Field label={`${labels.note} (${labels.optional})`}>
              <Textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                className="min-h-24 bg-surface-card"
              />
            </Field>
            <Button
              type="button"
              onClick={submit}
              disabled={isPending}
              className="gap-2 rounded-full bg-brand px-6 text-brand-on hover:bg-brand/90"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {isPending ? labels.sending : labels.send}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

export function RosterLinkForm({
  labels,
  agencies,
  artists,
}: {
  labels: Labels;
  agencies: AgencyOption[];
  artists: ArtistOption[];
}) {
  const router = useRouter();
  const [agencyWorkspaceId, setAgencyWorkspaceId] = useState("");
  const [artistWorkspaceId, setArtistWorkspaceId] = useState("");
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result = await linkAgencyArtistAction({
        agencyWorkspaceId,
        artistWorkspaceId,
        note,
      });
      if (!result.ok) {
        toast.error(errorLabel(labels, result.error));
        return;
      }

      toast.success(labels.successLink);
      setArtistWorkspaceId("");
      setNote("");
      router.refresh();
    });
  }

  return (
    <section className="rounded-lg border border-border/70 bg-surface-raised p-5 sm:p-6">
      <div className="mb-5 flex items-start gap-3">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-brand-soft text-brand">
          <Link2 className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground keep-all">
            {labels.linkTitle}
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground keep-all">
            {labels.linkHelper}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr_minmax(180px,0.7fr)]">
        <Field label={labels.agency}>
          <select
            value={agencyWorkspaceId}
            onChange={(event) => setAgencyWorkspaceId(event.target.value)}
            className="h-10 w-full rounded-md border border-input bg-surface-card px-3 text-sm text-foreground"
          >
            <option value="">{labels.selectAgency}</option>
            {agencies.map((agency) => (
              <option key={agency.id} value={agency.id}>
                {agency.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label={labels.artist}>
          <select
            value={artistWorkspaceId}
            onChange={(event) => setArtistWorkspaceId(event.target.value)}
            className="h-10 w-full rounded-md border border-input bg-surface-card px-3 text-sm text-foreground"
          >
            <option value="">{labels.selectArtist}</option>
            {artists.map((artist) => (
              <option key={artist.id} value={artist.id}>
                {artist.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label={`${labels.note} (${labels.optional})`}>
          <Input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="bg-surface-card"
          />
        </Field>
      </div>

      <Button
        type="button"
        onClick={submit}
        disabled={isPending || !agencyWorkspaceId || !artistWorkspaceId}
        className="mt-5 gap-2 rounded-full bg-brand px-6 text-brand-on hover:bg-brand/90"
      >
        {isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {isPending ? labels.linking : labels.linkCta}
      </Button>
    </section>
  );
}

export function UnlinkRosterButton({
  rosterId,
  labels,
}: {
  rosterId: string;
  labels: Labels;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result = await unlinkAgencyArtistAction({ rosterId });
      if (!result.ok) {
        toast.error(errorLabel(labels, result.error));
        return;
      }

      toast.success(labels.successUnlink);
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={submit}
      disabled={isPending}
      className="h-8 gap-1.5 rounded-full text-muted-foreground hover:text-foreground"
    >
      {isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
      ) : (
        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      {labels.unlink}
    </Button>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-label text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function errorLabel(labels: Labels, error: string) {
  if (error === "validation") return labels.errorValidation;
  if (error === "forbidden") return labels.errorForbidden;
  if (error === "invite_failed") return labels.errorInvite;
  return labels.errorDb;
}
