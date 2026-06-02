"use client";

import {
  useMemo,
  useId,
  useState,
  useTransition,
  type ChangeEvent,
  type ReactNode,
} from "react";
import {
  ArrowLeft,
  Check,
  Clapperboard,
  Link as LinkIcon,
  Loader2,
  Megaphone,
  Music,
  RadioTower,
  UploadCloud,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { validateAudioFile } from "@/lib/references/audio";
import { validateVideoFile } from "@/lib/references/video";
import {
  createProject,
  getBoardAssetPutUrlAction,
} from "../../projects/new/actions";

type RequestType = "music_video" | "live_visual" | "ad_visual";
type Step = 1 | 2 | 3 | 4;
type BudgetBand = "under_1m" | "1m_to_5m" | "5m_to_10m" | "negotiable";
type TwinIntent = "undecided" | "specific_in_mind" | "no_twin";

type UploadedAsset = {
  id: string;
  name: string;
  url: string;
  storageKey: string;
  type: string;
  size: number;
};

type Props = {
  backHref: string;
};

const REQUEST_TYPES: {
  key: RequestType;
  Icon: typeof Music;
}[] = [
  { key: "music_video", Icon: Clapperboard },
  { key: "live_visual", Icon: RadioTower },
  { key: "ad_visual", Icon: Megaphone },
];

const STEPS: Step[] = [1, 2, 3, 4];
const BUDGET_BANDS: BudgetBand[] = [
  "under_1m",
  "1m_to_5m",
  "5m_to_10m",
  "negotiable",
];
const TWIN_INTENTS: TwinIntent[] = [
  "undecided",
  "specific_in_mind",
  "no_twin",
];

export function ArtistRequestWizard({ backHref }: Props) {
  const t = useTranslations("studio_request");
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [requestType, setRequestType] = useState<RequestType | null>(null);
  const [audioAsset, setAudioAsset] = useState<UploadedAsset | null>(null);
  const [guideAssets, setGuideAssets] = useState<UploadedAsset[]>([]);
  const [referenceAssets, setReferenceAssets] = useState<UploadedAsset[]>([]);
  const [referenceUrl, setReferenceUrl] = useState("");
  const [referenceUrls, setReferenceUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    songTitle: "",
    mood: "",
    liveEnvironment: "",
    adBrand: "",
    adProduct: "",
    adConcept: "",
    budgetBand: "" as BudgetBand | "",
    deliveryDate: "",
    meetingPreferredAt: "",
    twinIntent: "undecided" as TwinIntent,
  });

  const isAudioType =
    requestType === "music_video" || requestType === "live_visual";

  const canSubmit = Boolean(requestType && form.budgetBand);

  const summaryTitle = useMemo(() => {
    if (isAudioType) return form.songTitle.trim();
    return [form.adBrand.trim(), form.adProduct.trim()].filter(Boolean).join(" ");
  }, [form.adBrand, form.adProduct, form.songTitle, isAudioType]);

  function updateField<K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validateCurrentStep() {
    if (step === 1 && !requestType) {
      toast.error(t("errors.type_required"));
      return false;
    }
    if (step === 2) {
      if (isAudioType) {
        if (!form.songTitle.trim()) {
          toast.error(t("errors.song_title_required"));
          return false;
        }
        if (!form.mood.trim()) {
          toast.error(t("errors.mood_required"));
          return false;
        }
        if (!audioAsset) {
          toast.error(t("errors.audio_required"));
          return false;
        }
      }
      if (requestType === "ad_visual") {
        if (!form.adBrand.trim() || !form.adProduct.trim() || !form.adConcept.trim()) {
          toast.error(t("errors.ad_required"));
          return false;
        }
      }
    }
    if (step === 4 && !form.budgetBand) {
      toast.error(t("errors.budget_required"));
      return false;
    }
    return true;
  }

  function goNext() {
    if (!validateCurrentStep()) return;
    setStep((prev) => Math.min(prev + 1, 4) as Step);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goBack() {
    setStep((prev) => Math.max(prev - 1, 1) as Step);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function uploadAsset(file: File, target: "audio" | "guide" | "reference") {
    if (target === "audio") {
      const audioCheck = validateAudioFile(file);
      if (!audioCheck.ok) {
        toast.error(t(`errors.audio_${audioCheck.reason}`));
        return;
      }
    }
    if (file.type.startsWith("video/")) {
      const videoCheck = validateVideoFile(file);
      if (!videoCheck.ok) {
        toast.error(t(`errors.video_${videoCheck.reason}`));
        return;
      }
    }

    setUploading(target);
    try {
      const result = await getBoardAssetPutUrlAction(file.type);
      if (!result.ok) {
        toast.error(t("errors.upload_failed"));
        return;
      }
      const put = await fetch(result.putUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!put.ok) {
        toast.error(t("errors.upload_failed"));
        return;
      }
      const asset: UploadedAsset = {
        id: crypto.randomUUID(),
        name: file.name,
        url: result.publicUrl,
        storageKey: storageKeyFromPublicUrl(result.publicUrl),
        type: file.type,
        size: file.size,
      };
      if (target === "audio") setAudioAsset(asset);
      if (target === "guide") setGuideAssets((prev) => [...prev, asset]);
      if (target === "reference") setReferenceAssets((prev) => [...prev, asset]);
      toast.success(t("upload.success"));
    } finally {
      setUploading(null);
    }
  }

  function onFileChange(
    event: ChangeEvent<HTMLInputElement>,
    target: "audio" | "guide" | "reference",
  ) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    void uploadAsset(file, target);
  }

  function addReferenceUrl() {
    const value = referenceUrl.trim();
    if (!value) return;
    try {
      const parsed = new URL(value);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        toast.error(t("errors.url_invalid"));
        return;
      }
    } catch {
      toast.error(t("errors.url_invalid"));
      return;
    }
    setReferenceUrls((prev) => [...prev, value]);
    setReferenceUrl("");
  }

  function submit() {
    if (!validateCurrentStep() || !requestType || !canSubmit) return;
    startTransition(async () => {
      const title = summaryTitle || t(`types.${requestType}.title`);
      const description = buildDescription({
        t,
        requestType,
        form,
        audioAsset,
        guideAssets,
        referenceAssets,
        referenceUrls,
      });
      const meetingPreferredAt =
        form.meetingPreferredAt !== ""
          ? new Date(form.meetingPreferredAt).toISOString()
          : null;
      const result = await createProject({
        intake_mode: "brief",
        intent: "submit",
        title,
        description,
        brand_id: null,
        deliverable_types: [requestType],
        estimated_budget_range: form.budgetBand,
        budget_band: form.budgetBand,
        target_delivery_at: form.deliveryDate || null,
        meeting_preferred_at: meetingPreferredAt,
        twin_intent: form.twinIntent,
        interested_in_twin: form.twinIntent === "specific_in_mind",
        brief_content_json: buildBriefDoc(description),
      });
      if ("ok" in result && result.ok) {
        toast.success(t("submit.success"));
        router.push(`/app/projects/${result.id}`);
        return;
      }
      toast.error(t("submit.error"));
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-content flex-col gap-6 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <Link
        href={backHref}
        className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t("back")}
      </Link>

      <section className="rounded-lg border border-border/70 bg-surface-raised p-5 sm:p-6 lg:p-8">
        <p className="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-label text-brand">
          <Music className="h-4 w-4" aria-hidden="true" />
          {t("eyebrow")}
        </p>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <h1 className="font-sans text-3xl font-bold leading-tight tracking-normal text-foreground sm:text-4xl lg:text-5xl keep-all">
              {t("title")}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base keep-all">
              {t("description")}
            </p>
          </div>
          <StepIndicator current={step} />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.32fr_0.68fr]">
        <aside className="rounded-lg border border-border/70 bg-surface-card p-4">
          <div className="space-y-3">
            {STEPS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  if (item <= step) setStep(item);
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-3 py-3 text-left text-sm transition-colors",
                  item === step
                    ? "bg-surface-raised text-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                    item === step
                      ? "border-brand bg-brand text-brand-on"
                      : "border-border text-muted-foreground",
                  )}
                >
                  {item < step ? <Check className="h-3.5 w-3.5" /> : item}
                </span>
                <span className="keep-all">{t(`steps_nav.${item}`)}</span>
              </button>
            ))}
          </div>
        </aside>

        <div className="rounded-lg border border-border/70 bg-surface-card p-5 sm:p-6">
          {step === 1 && (
            <StepPanel
              eyebrow={t("step1.eyebrow")}
              title={t("step1.title")}
              description={t("step1.description")}
            >
              <div className="grid gap-3 md:grid-cols-3">
                {REQUEST_TYPES.map(({ key, Icon }) => {
                  const selected = requestType === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setRequestType(key)}
                      className={cn(
                        "min-h-48 rounded-lg border p-4 text-left transition-colors",
                        selected
                          ? "border-brand bg-brand-soft text-foreground"
                          : "border-border/70 bg-surface-raised hover:border-foreground/40",
                      )}
                    >
                      <Icon
                        className={cn(
                          "mb-6 h-6 w-6",
                          selected ? "text-brand" : "text-muted-foreground",
                        )}
                        aria-hidden="true"
                      />
                      <h3 className="text-base font-semibold text-foreground keep-all">
                        {t(`types.${key}.title`)}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground keep-all">
                        {t(`types.${key}.description`)}
                      </p>
                    </button>
                  );
                })}
              </div>
            </StepPanel>
          )}

          {step === 2 && (
            <StepPanel
              eyebrow={t("step2.eyebrow")}
              title={
                requestType ? t(`step2.${requestType}.title`) : t("step2.title")
              }
              description={
                requestType
                  ? t(`step2.${requestType}.description`)
                  : t("step2.description")
              }
            >
              {isAudioType ? (
                <div className="grid gap-5">
                  <FieldBlock
                    label={t("fields.song_title")}
                    input={
                      <Input
                        value={form.songTitle}
                        onChange={(event) =>
                          updateField("songTitle", event.target.value)
                        }
                        placeholder={t("placeholders.song_title")}
                      />
                    }
                  />
                  <FieldBlock
                    label={t("fields.mood")}
                    input={
                      <Textarea
                        value={form.mood}
                        onChange={(event) => updateField("mood", event.target.value)}
                        placeholder={t("placeholders.mood")}
                        rows={4}
                      />
                    }
                  />
                  {requestType === "live_visual" && (
                    <FieldBlock
                      label={t("fields.live_environment")}
                      input={
                        <Input
                          value={form.liveEnvironment}
                          onChange={(event) =>
                            updateField("liveEnvironment", event.target.value)
                          }
                          placeholder={t("placeholders.live_environment")}
                        />
                      }
                    />
                  )}
                  <UploadField
                    label={t("fields.audio")}
                    helper={t("helpers.audio")}
                    accept="audio/mpeg,audio/wav,audio/x-wav,audio/mp4,audio/aac,audio/flac"
                    isUploading={uploading === "audio"}
                    chooseLabel={t("actions.choose_file")}
                    uploadingLabel={t("upload.uploading")}
                    onChange={(event) => onFileChange(event, "audio")}
                  />
                  {audioAsset && (
                    <AssetList
                      items={[audioAsset]}
                      removeLabel={t("actions.remove")}
                      onRemove={() => setAudioAsset(null)}
                    />
                  )}
                </div>
              ) : (
                <div className="grid gap-5">
                  <FieldBlock
                    label={t("fields.ad_brand")}
                    input={
                      <Input
                        value={form.adBrand}
                        onChange={(event) =>
                          updateField("adBrand", event.target.value)
                        }
                        placeholder={t("placeholders.ad_brand")}
                      />
                    }
                  />
                  <FieldBlock
                    label={t("fields.ad_product")}
                    input={
                      <Input
                        value={form.adProduct}
                        onChange={(event) =>
                          updateField("adProduct", event.target.value)
                        }
                        placeholder={t("placeholders.ad_product")}
                      />
                    }
                  />
                  <FieldBlock
                    label={t("fields.ad_concept")}
                    input={
                      <Textarea
                        value={form.adConcept}
                        onChange={(event) =>
                          updateField("adConcept", event.target.value)
                        }
                        placeholder={t("placeholders.ad_concept")}
                        rows={5}
                      />
                    }
                  />
                  <UploadField
                    label={t("fields.guide")}
                    helper={t("helpers.guide")}
                    accept="image/*,application/pdf,video/mp4,video/quicktime,video/webm"
                    isUploading={uploading === "guide"}
                    chooseLabel={t("actions.choose_file")}
                    uploadingLabel={t("upload.uploading")}
                    onChange={(event) => onFileChange(event, "guide")}
                  />
                  <AssetList
                    items={guideAssets}
                    removeLabel={t("actions.remove")}
                    onRemove={(id) =>
                      setGuideAssets((prev) => prev.filter((asset) => asset.id !== id))
                    }
                  />
                </div>
              )}
            </StepPanel>
          )}

          {step === 3 && (
            <StepPanel
              eyebrow={t("step3.eyebrow")}
              title={t("step3.title")}
              description={t("step3.description")}
            >
              <div className="grid gap-5">
                <UploadField
                  label={t("fields.references")}
                  helper={t("helpers.references")}
                  accept="image/*,application/pdf,video/mp4,video/quicktime,video/webm"
                  isUploading={uploading === "reference"}
                  chooseLabel={t("actions.choose_file")}
                  uploadingLabel={t("upload.uploading")}
                  onChange={(event) => onFileChange(event, "reference")}
                />
                <AssetList
                  items={referenceAssets}
                  removeLabel={t("actions.remove")}
                  onRemove={(id) =>
                    setReferenceAssets((prev) =>
                      prev.filter((asset) => asset.id !== id),
                    )
                  }
                />
                <div className="rounded-lg border border-border/70 bg-surface-raised p-4">
                  <Label htmlFor="reference-url">{t("fields.reference_url")}</Label>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <Input
                      id="reference-url"
                      value={referenceUrl}
                      onChange={(event) => setReferenceUrl(event.target.value)}
                      placeholder={t("placeholders.reference_url")}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full"
                      onClick={addReferenceUrl}
                    >
                      <LinkIcon className="h-4 w-4" aria-hidden="true" />
                      {t("actions.add_url")}
                    </Button>
                  </div>
                  {referenceUrls.length > 0 && (
                    <ul className="mt-3 space-y-2">
                      {referenceUrls.map((url) => (
                        <li
                          key={url}
                          className="flex items-center justify-between gap-3 rounded-md bg-surface-card px-3 py-2 text-sm"
                        >
                          <span className="min-w-0 truncate text-muted-foreground">
                            {url}
                          </span>
                          <button
                            type="button"
                            className="text-xs font-semibold text-muted-foreground hover:text-foreground"
                            onClick={() =>
                              setReferenceUrls((prev) =>
                                prev.filter((item) => item !== url),
                              )
                            }
                          >
                            {t("actions.remove")}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </StepPanel>
          )}

          {step === 4 && (
            <StepPanel
              eyebrow={t("step4.eyebrow")}
              title={t("step4.title")}
              description={t("step4.description")}
            >
              <div className="grid gap-6">
                <div>
                  <Label>{t("fields.budget")}</Label>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {BUDGET_BANDS.map((band) => (
                      <ChoiceButton
                        key={band}
                        selected={form.budgetBand === band}
                        onClick={() => updateField("budgetBand", band)}
                      >
                        {t(`budget.${band}`)}
                      </ChoiceButton>
                    ))}
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldBlock
                    label={t("fields.delivery_date")}
                    input={
                      <Input
                        type="date"
                        value={form.deliveryDate}
                        onChange={(event) =>
                          updateField("deliveryDate", event.target.value)
                        }
                      />
                    }
                  />
                  <FieldBlock
                    label={t("fields.meeting")}
                    input={
                      <Input
                        type="datetime-local"
                        value={form.meetingPreferredAt}
                        onChange={(event) =>
                          updateField("meetingPreferredAt", event.target.value)
                        }
                      />
                    }
                  />
                </div>
                <div>
                  <Label>{t("fields.twin_intent")}</Label>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    {TWIN_INTENTS.map((intent) => (
                      <ChoiceButton
                        key={intent}
                        selected={form.twinIntent === intent}
                        onClick={() => updateField("twinIntent", intent)}
                      >
                        {t(`twin_intent.${intent}`)}
                      </ChoiceButton>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border border-border/70 bg-surface-raised p-4">
                  <p className="text-xs font-semibold uppercase tracking-label text-muted-foreground">
                    {t("review.eyebrow")}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-foreground keep-all">
                    {summaryTitle || t("review.untitled")}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground keep-all">
                    {requestType ? t(`types.${requestType}.title`) : t("review.no_type")}
                    {" · "}
                    {form.budgetBand ? t(`budget.${form.budgetBand}`) : t("review.no_budget")}
                  </p>
                </div>
              </div>
            </StepPanel>
          )}

          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-border/70 pt-5 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              className="rounded-full"
              disabled={step === 1 || isPending}
              onClick={goBack}
            >
              {t("actions.back")}
            </Button>
            {step < 4 ? (
              <Button
                type="button"
                className="rounded-full bg-brand text-brand-on hover:bg-brand/90"
                onClick={goNext}
              >
                {t("actions.next")}
              </Button>
            ) : (
              <Button
                type="button"
                className="rounded-full bg-brand text-brand-on hover:bg-brand/90"
                disabled={!canSubmit || isPending}
                onClick={submit}
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("actions.submit")}
              </Button>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function StepIndicator({ current }: { current: Step }) {
  return (
    <ol className="flex items-center gap-2" aria-label="wizard progress">
      {STEPS.map((item) => (
        <li
          key={item}
          className={cn(
            "h-2 w-10 rounded-full transition-colors",
            item <= current ? "bg-brand" : "bg-border",
          )}
        />
      ))}
    </ol>
  );
}

function StepPanel({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-label text-brand">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-semibold leading-tight text-foreground keep-all">
        {title}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground keep-all">
        {description}
      </p>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function FieldBlock({ label, input }: { label: string; input: ReactNode }) {
  return (
    <div>
      <Label className="keep-all">{label}</Label>
      <div className="mt-2">{input}</div>
    </div>
  );
}

function ChoiceButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "rounded-lg border px-3 py-3 text-left text-sm font-semibold transition-colors keep-all",
        selected
          ? "border-brand bg-brand-soft text-foreground"
          : "border-border/70 bg-surface-raised text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function UploadField({
  label,
  helper,
  accept,
  isUploading,
  chooseLabel,
  uploadingLabel,
  onChange,
}: {
  label: string;
  helper: string;
  accept: string;
  isUploading: boolean;
  chooseLabel: string;
  uploadingLabel: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  const inputId = useId();
  return (
    <div className="rounded-lg border border-dashed border-border bg-surface-raised p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-surface-card text-foreground">
          {isUploading ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          ) : (
            <UploadCloud className="h-5 w-5" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <Label className="keep-all">{label}</Label>
          <p className="mt-1 text-sm leading-6 text-muted-foreground keep-all">
            {helper}
          </p>
          <label
            htmlFor={inputId}
            className={cn(
              "mt-3 inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-full border border-border/70 bg-surface-card px-4 text-sm font-semibold text-foreground transition-colors hover:bg-accent/60",
              isUploading && "pointer-events-none opacity-60",
            )}
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <UploadCloud className="h-4 w-4" aria-hidden="true" />
            )}
            {isUploading ? uploadingLabel : chooseLabel}
          </label>
          <Input
            id={inputId}
            type="file"
            accept={accept}
            disabled={isUploading}
            onChange={onChange}
            className="sr-only"
          />
        </div>
      </div>
    </div>
  );
}

function AssetList({
  items,
  removeLabel,
  onRemove,
}: {
  items: UploadedAsset[];
  removeLabel: string;
  onRemove: (id: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <ul className="space-y-2">
      {items.map((asset) => (
        <li
          key={asset.id}
          className="flex items-center justify-between gap-3 rounded-md border border-border/70 bg-surface-raised px-3 py-2 text-sm"
        >
          <span className="min-w-0 truncate text-foreground">{asset.name}</span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatBytes(asset.size)}
          </span>
          <button
            type="button"
            className="shrink-0 text-xs font-semibold text-muted-foreground hover:text-foreground"
            onClick={() => onRemove(asset.id)}
          >
            {removeLabel}
          </button>
        </li>
      ))}
    </ul>
  );
}

function storageKeyFromPublicUrl(publicUrl: string) {
  try {
    return new URL(publicUrl).pathname.replace(/^\//, "");
  } catch {
    return publicUrl;
  }
}

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function buildDescription({
  t,
  requestType,
  form,
  audioAsset,
  guideAssets,
  referenceAssets,
  referenceUrls,
}: {
  t: ReturnType<typeof useTranslations>;
  requestType: RequestType;
  form: {
    songTitle: string;
    mood: string;
    liveEnvironment: string;
    adBrand: string;
    adProduct: string;
    adConcept: string;
    budgetBand: BudgetBand | "";
    deliveryDate: string;
    meetingPreferredAt: string;
    twinIntent: TwinIntent;
  };
  audioAsset: UploadedAsset | null;
  guideAssets: UploadedAsset[];
  referenceAssets: UploadedAsset[];
  referenceUrls: string[];
}) {
  const lines = [
    `${t("review.type")}: ${t(`types.${requestType}.title`)}`,
  ];
  if (requestType === "music_video" || requestType === "live_visual") {
    lines.push(`${t("fields.song_title")}: ${form.songTitle.trim()}`);
    lines.push(`${t("fields.mood")}: ${form.mood.trim()}`);
    if (form.liveEnvironment.trim()) {
      lines.push(`${t("fields.live_environment")}: ${form.liveEnvironment.trim()}`);
    }
    if (audioAsset) {
      lines.push(`${t("fields.audio")}: ${audioAsset.name} (${audioAsset.url})`);
    }
  } else {
    lines.push(`${t("fields.ad_brand")}: ${form.adBrand.trim()}`);
    lines.push(`${t("fields.ad_product")}: ${form.adProduct.trim()}`);
    lines.push(`${t("fields.ad_concept")}: ${form.adConcept.trim()}`);
    if (guideAssets.length > 0) {
      lines.push(
        `${t("fields.guide")}: ${guideAssets
          .map((asset) => `${asset.name} (${asset.url})`)
          .join(", ")}`,
      );
    }
  }
  if (referenceAssets.length > 0) {
    lines.push(
      `${t("fields.references")}: ${referenceAssets
        .map((asset) => `${asset.name} (${asset.url})`)
        .join(", ")}`,
    );
  }
  if (referenceUrls.length > 0) {
    lines.push(`${t("fields.reference_url")}: ${referenceUrls.join(", ")}`);
  }
  lines.push(`${t("fields.budget")}: ${form.budgetBand ? t(`budget.${form.budgetBand}`) : ""}`);
  if (form.deliveryDate) lines.push(`${t("fields.delivery_date")}: ${form.deliveryDate}`);
  if (form.meetingPreferredAt) {
    lines.push(`${t("fields.meeting")}: ${form.meetingPreferredAt}`);
  }
  lines.push(`${t("fields.twin_intent")}: ${t(`twin_intent.${form.twinIntent}`)}`);
  return lines.join("\n").slice(0, 3900);
}

function buildBriefDoc(description: string) {
  return {
    type: "doc",
    content: description.split("\n").map((line) => ({
      type: "paragraph",
      content: line ? [{ type: "text", text: line }] : [],
    })),
  };
}
