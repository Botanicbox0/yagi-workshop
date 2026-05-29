"use client";

import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import {
  ImageIcon,
  Loader2,
  PauseCircle,
  PlayCircle,
  Plus,
  Save,
  Trash2,
  Upload,
  UserRound,
} from "lucide-react";
import { useRouter } from "@/i18n/routing";
import { toast } from "sonner";
import {
  createTwinPersonaAssetAction,
  createPersona,
  deleteTwinPersonaAssetAction,
  getTwinPersonaAssetUploadPutUrlAction,
  updatePersona,
  updatePersonaFee,
  updatePersonaStatus,
  type TwinPersonaAsset,
  type TwinPersona,
} from "@/app/[locale]/app/twins/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Labels = {
  emptyTitle: string;
  emptyDescription: string;
  createTitle: string;
  nameLabel: string;
  namePlaceholder: string;
  typeLabel: string;
  typePlaceholder: string;
  descriptionLabel: string;
  descriptionPlaceholder: string;
  create: string;
  creating: string;
  save: string;
  saving: string;
  selfTwin: string;
  statusActive: string;
  statusPaused: string;
  toggleToActive: string;
  toggleToPaused: string;
  pausedHelp: string;
  feeTitle: string;
  feeLabel: string;
  feePlaceholder: string;
  feePublic: string;
  feePrivate: string;
  feeUnset: string;
  visualEmpty: string;
  assetsTitle: string;
  assetsDescription: string;
  assetsEmpty: string;
  assetsUpload: string;
  assetsUploading: string;
  assetsDelete: string;
  assetsNote: string;
  assetsNotePlaceholder: string;
  assetsUnsupported: string;
  successCreate: string;
  successUpdate: string;
  successStatus: string;
  successFee: string;
  successAsset: string;
  successAssetDelete: string;
  errorValidation: string;
  errorGeneric: string;
};

export function TwinPersonaManager({
  artistWorkspaceId,
  fallbackName,
  personas,
  assets,
  labels,
  locale,
}: {
  artistWorkspaceId: string;
  fallbackName: string;
  personas: TwinPersona[];
  assets: TwinPersonaAsset[];
  labels: Labels;
  locale: string;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(personas);
  const [name, setName] = useState("");
  const [personaType, setPersonaType] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, startCreateTransition] = useTransition();

  useEffect(() => setRows(personas), [personas]);

  function submitCreate() {
    startCreateTransition(async () => {
      const result = await createPersona({
        artistWorkspaceId,
        name,
        personaType,
        description,
      });

      if (!result.ok) {
        toast.error(
          result.error === "validation"
            ? labels.errorValidation
            : labels.errorGeneric,
        );
        return;
      }

      setName("");
      setPersonaType("");
      setDescription("");
      toast.success(labels.successCreate);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="space-y-4">
        {rows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/70 bg-surface-card-deep p-6">
            <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-md bg-brand-soft text-brand">
              <UserRound className="h-5 w-5" aria-hidden="true" />
            </div>
            <h2 className="text-xl font-semibold text-foreground keep-all">
              {labels.emptyTitle}
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground keep-all">
              {labels.emptyDescription}
            </p>
          </div>
        ) : (
          rows.map((persona) => (
            <TwinPersonaCard
              key={persona.id}
              artistWorkspaceId={artistWorkspaceId}
              persona={persona}
              assets={assets.filter((asset) => asset.persona_id === persona.id)}
              fallbackName={fallbackName}
              labels={labels}
              locale={locale}
              onRefresh={() => router.refresh()}
            />
          ))
        )}
      </section>

      <aside className="rounded-lg border border-border/70 bg-surface-raised p-5">
        <div className="mb-5 flex items-center gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-brand-soft text-brand">
            <Plus className="h-5 w-5" aria-hidden="true" />
          </div>
          <h2 className="text-base font-semibold text-foreground keep-all">
            {labels.createTitle}
          </h2>
        </div>

        <div className="space-y-4">
          <Field label={labels.nameLabel}>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={labels.namePlaceholder}
              maxLength={120}
            />
          </Field>
          <Field label={labels.typeLabel}>
            <Input
              value={personaType}
              onChange={(event) => setPersonaType(event.target.value)}
              placeholder={labels.typePlaceholder}
              maxLength={100}
            />
          </Field>
          <Field label={labels.descriptionLabel}>
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={labels.descriptionPlaceholder}
              maxLength={1000}
              className="min-h-28"
            />
          </Field>
          <Button
            type="button"
            onClick={submitCreate}
            disabled={isCreating}
            className="w-full gap-2 rounded-full bg-brand text-brand-on hover:bg-brand/90"
          >
            {isCreating ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Plus className="h-4 w-4" aria-hidden="true" />
            )}
            {isCreating ? labels.creating : labels.create}
          </Button>
        </div>
      </aside>
    </div>
  );
}

function TwinPersonaCard({
  artistWorkspaceId,
  persona,
  assets,
  fallbackName,
  labels,
  locale,
  onRefresh,
}: {
  artistWorkspaceId: string;
  persona: TwinPersona;
  assets: TwinPersonaAsset[];
  fallbackName: string;
  labels: Labels;
  locale: string;
  onRefresh: () => void;
}) {
  const [name, setName] = useState(persona.name ?? "");
  const [personaType, setPersonaType] = useState(persona.persona_type ?? "");
  const [description, setDescription] = useState(persona.description ?? "");
  const [fee, setFee] = useState(
    persona.min_fee === null || persona.min_fee === undefined
      ? ""
      : String(persona.min_fee),
  );
  const [feePublic, setFeePublic] = useState(persona.min_fee_public);
  const [isSavingProfile, startProfileTransition] = useTransition();
  const [isSavingFee, startFeeTransition] = useTransition();
  const [isToggling, startStatusTransition] = useTransition();
  const [isUploading, startUploadTransition] = useTransition();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [assetNote, setAssetNote] = useState("");

  useEffect(() => {
    setName(persona.name ?? "");
    setPersonaType(persona.persona_type ?? "");
    setDescription(persona.description ?? "");
    setFee(
      persona.min_fee === null || persona.min_fee === undefined
        ? ""
        : String(persona.min_fee),
    );
    setFeePublic(persona.min_fee_public);
  }, [persona]);

  const displayName = name.trim() || fallbackName;
  const feeLabel = useMemo(() => {
    if (persona.min_fee === null || persona.min_fee === undefined) {
      return labels.feeUnset;
    }
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "KRW",
      maximumFractionDigits: 0,
    }).format(persona.min_fee);
  }, [labels.feeUnset, locale, persona.min_fee]);

  function saveProfile() {
    startProfileTransition(async () => {
      const result = await updatePersona({
        artistWorkspaceId,
        personaId: persona.id,
        name,
        personaType,
        description,
      });

      if (!result.ok) {
        toast.error(labels.errorGeneric);
        return;
      }

      toast.success(labels.successUpdate);
      onRefresh();
    });
  }

  function saveFee() {
    startFeeTransition(async () => {
      const result = await updatePersonaFee({
        artistWorkspaceId,
        personaId: persona.id,
        minFee: fee.trim() === "" ? null : Number(fee),
        minFeePublic: feePublic,
      });

      if (!result.ok) {
        toast.error(
          result.error === "validation"
            ? labels.errorValidation
            : labels.errorGeneric,
        );
        return;
      }

      toast.success(labels.successFee);
      onRefresh();
    });
  }

  function toggleStatus() {
    const nextStatus = persona.status === "active" ? "paused" : "active";
    startStatusTransition(async () => {
      const result = await updatePersonaStatus({
        artistWorkspaceId,
        personaId: persona.id,
        status: nextStatus,
      });

      if (!result.ok) {
        toast.error(labels.errorGeneric);
        return;
      }

      toast.success(labels.successStatus);
      onRefresh();
    });
  }

  function uploadAsset() {
    if (!selectedFile) return;
    const file = selectedFile;

    startUploadTransition(async () => {
      const uploadResult = await getTwinPersonaAssetUploadPutUrlAction({
        artistWorkspaceId,
        personaId: persona.id,
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
        sizeBytes: file.size,
      });

      if (!uploadResult.ok) {
        toast.error(
          uploadResult.error === "unsupported_file"
            ? labels.assetsUnsupported
            : labels.errorGeneric,
        );
        return;
      }
      if (!uploadResult.upload) {
        toast.error(labels.errorGeneric);
        return;
      }

      const putResponse = await fetch(uploadResult.upload.putUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
        body: file,
      });

      if (!putResponse.ok) {
        toast.error(labels.errorGeneric);
        return;
      }

      const createResult = await createTwinPersonaAssetAction({
        artistWorkspaceId,
        personaId: persona.id,
        storagePath: uploadResult.upload.storagePath,
        fileName: file.name,
        note: assetNote,
      });

      if (!createResult.ok) {
        toast.error(labels.errorGeneric);
        return;
      }

      setSelectedFile(null);
      setAssetNote("");
      toast.success(labels.successAsset);
      onRefresh();
    });
  }

  function deleteAsset(asset: TwinPersonaAsset) {
    startUploadTransition(async () => {
      const result = await deleteTwinPersonaAssetAction({
        artistWorkspaceId,
        personaId: persona.id,
        assetId: asset.id,
      });

      if (!result.ok) {
        toast.error(labels.errorGeneric);
        return;
      }

      toast.success(labels.successAssetDelete);
      onRefresh();
    });
  }

  return (
    <article className="overflow-hidden rounded-lg border border-border/70 bg-surface-raised">
      <div className="grid gap-0 md:grid-cols-[220px_minmax(0,1fr)]">
        <div className="flex min-h-[220px] items-center justify-center border-b border-border/70 bg-surface-card-deep md:border-b-0 md:border-r">
          {persona.cover_asset_path ? (
            <span className="px-5 text-center text-xs text-muted-foreground break-all">
              {persona.cover_asset_path}
            </span>
          ) : (
            <div className="text-center">
              <ImageIcon className="mx-auto h-9 w-9 text-muted-foreground" />
              <p className="mt-3 text-xs text-muted-foreground keep-all">
                {labels.visualEmpty}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-5 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-xl font-semibold text-foreground keep-all">
                  {displayName}
                </h2>
                <span
                  className={cn(
                    "inline-flex h-7 items-center rounded-full border px-2.5 text-xs font-semibold",
                    persona.status === "active"
                      ? "border-brand/50 bg-brand-soft text-brand"
                      : "border-border/70 bg-surface-card text-muted-foreground",
                  )}
                >
                  {persona.status === "active"
                    ? labels.statusActive
                    : labels.statusPaused}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground keep-all">
                {persona.persona_type || labels.selfTwin}
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={toggleStatus}
              disabled={isToggling}
              className="gap-2 rounded-full border-border/70 bg-surface-card"
            >
              {isToggling ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : persona.status === "active" ? (
                <PauseCircle className="h-4 w-4" aria-hidden="true" />
              ) : (
                <PlayCircle className="h-4 w-4" aria-hidden="true" />
              )}
              {persona.status === "active"
                ? labels.toggleToPaused
                : labels.toggleToActive}
            </Button>
          </div>

          <p className="rounded-md border border-border/70 bg-surface-card-deep px-3 py-2 text-xs leading-5 text-muted-foreground keep-all">
            {labels.pausedHelp}
          </p>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <Field label={labels.nameLabel}>
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={fallbackName}
                  maxLength={120}
                />
              </Field>
              <Field label={labels.typeLabel}>
                <Input
                  value={personaType}
                  onChange={(event) => setPersonaType(event.target.value)}
                  placeholder={labels.typePlaceholder}
                  maxLength={100}
                />
              </Field>
              <Field label={labels.descriptionLabel}>
                <Textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder={labels.descriptionPlaceholder}
                  maxLength={1000}
                  className="min-h-24"
                />
              </Field>
              <Button
                type="button"
                variant="outline"
                onClick={saveProfile}
                disabled={isSavingProfile}
                className="w-full gap-2 rounded-full border-border/70 bg-surface-card"
              >
                {isSavingProfile ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Save className="h-4 w-4" aria-hidden="true" />
                )}
                {isSavingProfile ? labels.saving : labels.save}
              </Button>
            </div>

            <div className="space-y-4 rounded-lg border border-border/70 bg-surface-card-deep p-4">
              <div>
                <p className="text-sm font-semibold text-foreground keep-all">
                  {labels.feeTitle}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{feeLabel}</p>
              </div>
              <Field label={labels.feeLabel}>
                <Input
                  type="number"
                  min="0"
                  step="10000"
                  value={fee}
                  onChange={(event) => setFee(event.target.value)}
                  placeholder={labels.feePlaceholder}
                  inputMode="numeric"
                />
              </Field>
              <div className="flex items-center justify-between gap-3 rounded-md border border-border/70 bg-surface-card px-3 py-3">
                <Label className="text-sm text-foreground keep-all">
                  {feePublic ? labels.feePublic : labels.feePrivate}
                </Label>
                <Switch
                  checked={feePublic}
                  onCheckedChange={setFeePublic}
                  className="data-[state=checked]:bg-brand"
                />
              </div>
              <Button
                type="button"
                onClick={saveFee}
                disabled={isSavingFee}
                className="w-full gap-2 rounded-full bg-brand text-brand-on hover:bg-brand/90"
              >
                {isSavingFee ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Save className="h-4 w-4" aria-hidden="true" />
                )}
                {isSavingFee ? labels.saving : labels.save}
              </Button>
            </div>
          </div>

          <div className="space-y-4 rounded-lg border border-border/70 bg-surface-card-deep p-4">
            <div>
              <p className="text-sm font-semibold text-foreground keep-all">
                {labels.assetsTitle}
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground keep-all">
                {labels.assetsDescription}
              </p>
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
              <Input
                type="file"
                accept="image/*,video/*,audio/*,.pdf,.zip"
                onChange={(event) =>
                  setSelectedFile(event.target.files?.[0] ?? null)
                }
                className="bg-surface-card"
              />
              <Input
                value={assetNote}
                onChange={(event) => setAssetNote(event.target.value)}
                placeholder={labels.assetsNotePlaceholder}
                maxLength={500}
                aria-label={labels.assetsNote}
                className="bg-surface-card"
              />
              <Button
                type="button"
                onClick={uploadAsset}
                disabled={!selectedFile || isUploading}
                className="gap-2 rounded-full bg-brand px-5 text-brand-on hover:bg-brand/90"
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Upload className="h-4 w-4" aria-hidden="true" />
                )}
                {isUploading ? labels.assetsUploading : labels.assetsUpload}
              </Button>
            </div>

            {assets.length === 0 ? (
              <p className="rounded-md border border-dashed border-border/70 bg-surface-card px-3 py-3 text-xs text-muted-foreground keep-all">
                {labels.assetsEmpty}
              </p>
            ) : (
              <div className="divide-y divide-border/70 overflow-hidden rounded-md border border-border/70 bg-surface-card">
                {assets.map((asset) => (
                  <div
                    key={asset.id}
                    className="grid gap-3 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium text-foreground">
                          {asset.file_name ?? asset.storage_path}
                        </p>
                        {asset.asset_type && (
                          <span className="rounded-full border border-border/70 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-label text-muted-foreground">
                            {asset.asset_type}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {asset.note || asset.storage_path}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteAsset(asset)}
                      disabled={isUploading}
                      className="h-8 gap-1.5 rounded-full text-muted-foreground hover:text-foreground"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      {labels.assetsDelete}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
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
