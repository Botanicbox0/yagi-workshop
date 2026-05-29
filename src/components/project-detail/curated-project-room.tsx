import { CalendarClock, Mail, ShieldCheck, UsersRound } from "lucide-react";
import { GuestInviteForm } from "@/components/project-detail/guest-invite-form";

export type CuratedProjectRoomProject = {
  id: string;
  title: string;
  brief: string | null;
  status: string;
  workspace_id: string;
  workspace_name: string;
  created_at: string;
  target_delivery_at: string | null;
};

export type CuratedProjectGuest = {
  id: string;
  displayName: string | null;
  role: string;
  grantedAt: string;
};

export type CuratedProjectPendingInvite = {
  id: string;
  email: string;
  createdAt: string;
  expiresAt: string;
};

type Labels = {
  eyebrow: string;
  subtitle: string;
  workspace: string;
  status: string;
  created: string;
  targetDelivery: string;
  unset: string;
  briefTitle: string;
  briefEmpty: string;
  collaboratorsTitle: string;
  collaboratorsEmpty: string;
  pendingTitle: string;
  pendingEmpty: string;
  invitedAt: string;
  expiresAt: string;
};

function formatDate(value: string | null, locale: string, fallback: string) {
  if (!value) return fallback;
  return new Intl.DateTimeFormat(locale === "en" ? "en" : "ko", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export function CuratedProjectRoom({
  project,
  guests,
  pendingInvites,
  locale,
  labels,
}: {
  project: CuratedProjectRoomProject;
  guests: CuratedProjectGuest[];
  pendingInvites: CuratedProjectPendingInvite[];
  locale: string;
  labels: Labels;
}) {
  return (
    <main className="mx-auto w-full max-w-content px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <section className="rounded-lg border border-border/70 bg-surface-raised p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-3">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-label text-brand">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              {labels.eyebrow}
            </p>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-foreground keep-all sm:text-3xl">
                {project.title}
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground keep-all">
                {labels.subtitle}
              </p>
            </div>
          </div>

          <dl className="grid min-w-[280px] grid-cols-2 gap-3 text-sm">
            <MetaTile label={labels.workspace} value={project.workspace_name} />
            <MetaTile label={labels.status} value={project.status} />
            <MetaTile
              label={labels.created}
              value={formatDate(project.created_at, locale, labels.unset)}
            />
            <MetaTile
              label={labels.targetDelivery}
              value={formatDate(project.target_delivery_at, locale, labels.unset)}
            />
          </dl>
        </div>
      </section>

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.8fr)]">
        <section className="rounded-lg border border-border/70 bg-surface-card p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-brand" aria-hidden="true" />
            <h2 className="text-base font-semibold text-foreground">
              {labels.briefTitle}
            </h2>
          </div>
          {project.brief ? (
            <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground keep-all">
              {project.brief}
            </p>
          ) : (
            <p className="rounded-lg border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground keep-all">
              {labels.briefEmpty}
            </p>
          )}
        </section>

        <div className="space-y-5">
          <GuestInviteForm
            workspaceId={project.workspace_id}
            projectId={project.id}
          />

          <section className="rounded-lg border border-border/70 bg-surface-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <UsersRound className="h-4 w-4 text-brand" aria-hidden="true" />
              <h2 className="text-base font-semibold text-foreground">
                {labels.collaboratorsTitle}
              </h2>
            </div>
            {guests.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground keep-all">
                {labels.collaboratorsEmpty}
              </p>
            ) : (
              <ul className="space-y-2">
                {guests.map((guest) => (
                  <li
                    key={guest.id}
                    className="rounded-lg border border-border/70 bg-background/40 p-3"
                  >
                    <p className="text-sm font-medium text-foreground">
                      {guest.displayName ?? guest.id}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {labels.invitedAt}:{" "}
                      {formatDate(guest.grantedAt, locale, labels.unset)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-lg border border-border/70 bg-surface-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Mail className="h-4 w-4 text-brand" aria-hidden="true" />
              <h2 className="text-base font-semibold text-foreground">
                {labels.pendingTitle}
              </h2>
            </div>
            {pendingInvites.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground keep-all">
                {labels.pendingEmpty}
              </p>
            ) : (
              <ul className="space-y-2">
                {pendingInvites.map((invite) => (
                  <li
                    key={invite.id}
                    className="rounded-lg border border-border/70 bg-background/40 p-3"
                  >
                    <p className="break-all text-sm font-medium text-foreground">
                      {invite.email}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {labels.expiresAt}:{" "}
                      {formatDate(invite.expiresAt, locale, labels.unset)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function MetaTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/70 bg-background/40 p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 truncate text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}
