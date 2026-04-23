"use server";

import {
  CopyObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { revalidatePath } from "next/cache";
import path from "path";

import {
  createPresignedPutUrl,
  getR2Client,
  objectPublicUrl,
  BUCKET,
} from "@/lib/r2/client";
import { buildSubmissionSchema } from "@/lib/challenges/content-schema";
import { getExistingSubmission } from "@/lib/challenges/submissions";
import { createSupabaseServer } from "@/lib/supabase/server";

export type UploadSlot = {
  kind: "native_video" | "image" | "pdf";
  filename: string;
  contentType: string;
  size: number;
};

export type IssuedUpload = {
  slotKey: string;
  uploadUrl: string;
  objectKey: string;
};

function sanitizeFilename(name: string): string {
  return name.replace(/[^A-Za-z0-9._-]/g, "_");
}

async function getAuthAndRole(supabase: Awaited<ReturnType<typeof createSupabaseServer>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, role: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  return { user, role: profile?.role ?? null };
}

async function fetchChallenge(
  supabase: Awaited<ReturnType<typeof createSupabaseServer>>,
  challengeId: string
) {
  const { data } = await supabase
    .from("challenges")
    .select("id, slug, title, state, submission_requirements")
    .eq("id", challengeId)
    .maybeSingle();
  return data;
}

export async function requestUploadUrlsAction(
  challengeId: string,
  slots: UploadSlot[]
): Promise<{ ok: true; issued: IssuedUpload[] } | { ok: false; error: string }> {
  const supabase = await createSupabaseServer();

  const { user, role } = await getAuthAndRole(supabase);
  if (!user) return { ok: false, error: "unauthenticated" };
  if (role !== "creator" && role !== "studio") return { ok: false, error: "wrong_role" };

  const challenge = await fetchChallenge(supabase, challengeId);
  if (!challenge) return { ok: false, error: "validation_failed" };
  if (challenge.state !== "open") return { ok: false, error: "not_open" };

  const existing = await getExistingSubmission(challengeId, user.id);
  if (existing) return { ok: false, error: "already_submitted" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const req = challenge.submission_requirements as any;

  // Slot count validation for images
  if (req?.image?.max_count !== undefined) {
    const imageSlots = slots.filter((s) => s.kind === "image");
    if (imageSlots.length > req.image.max_count) {
      return { ok: false, error: "validation_failed" };
    }
  }

  // Per-slot MIME + size validation
  for (const slot of slots) {
    if (slot.kind === "native_video") {
      if (slot.contentType !== "video/mp4") {
        return { ok: false, error: "validation_failed" };
      }
      if (slot.size > 524288000) {
        return { ok: false, error: "validation_failed" };
      }
    } else if (slot.kind === "image") {
      if (slot.contentType !== "image/jpeg" && slot.contentType !== "image/png") {
        return { ok: false, error: "validation_failed" };
      }
      if (slot.size > 10485760) {
        return { ok: false, error: "validation_failed" };
      }
    } else if (slot.kind === "pdf") {
      if (slot.contentType !== "application/pdf") {
        return { ok: false, error: "validation_failed" };
      }
      if (slot.size > 20971520) {
        return { ok: false, error: "validation_failed" };
      }
    }
  }

  const issued: IssuedUpload[] = [];
  for (const slot of slots) {
    const slotKey = crypto.randomUUID();
    const safeFilename = sanitizeFilename(slot.filename);
    const objectKey = `tmp/${challengeId}/${slotKey}/${safeFilename}`;
    const uploadUrl = await createPresignedPutUrl(objectKey, slot.contentType);
    issued.push({ slotKey, uploadUrl, objectKey });
  }

  return { ok: true, issued };
}

export async function submitChallengeAction(
  challengeId: string,
  content: {
    text_description: string;
    native_video?: { objectKey: string; poster_url?: string; duration_sec?: number };
    youtube_url?: string;
    images?: { objectKey: string }[];
    pdf?: { objectKey: string };
  }
): Promise<
  | { ok: true; submissionId: string; redirectTo: string }
  | {
      ok: false;
      error:
        | "unauthenticated"
        | "wrong_role"
        | "not_open"
        | "already_submitted"
        | "validation_failed"
        | "upload_missing";
      detail?: string;
    }
> {
  const supabase = await createSupabaseServer();

  const { user, role } = await getAuthAndRole(supabase);
  if (!user) return { ok: false, error: "unauthenticated" };
  if (role !== "creator" && role !== "studio") return { ok: false, error: "wrong_role" };

  const challenge = await fetchChallenge(supabase, challengeId);
  if (!challenge) return { ok: false, error: "validation_failed" };
  if (challenge.state !== "open") return { ok: false, error: "not_open" };

  const existing = await getExistingSubmission(challengeId, user.id);
  if (existing) return { ok: false, error: "already_submitted" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const requirements = challenge.submission_requirements as any;
  const parseResult = buildSubmissionSchema(requirements).safeParse(content);
  if (!parseResult.success) {
    const detail = parseResult.error.issues.map((i) => i.message).join("; ");
    return { ok: false, error: "validation_failed", detail };
  }

  // Collect all objectKeys referenced in content
  const referencedKeys: string[] = [];
  if (content.native_video?.objectKey) referencedKeys.push(content.native_video.objectKey);
  if (content.images) referencedKeys.push(...content.images.map((img) => img.objectKey));
  if (content.pdf?.objectKey) referencedKeys.push(content.pdf.objectKey);

  // Verify each uploaded object exists in R2
  const r2 = getR2Client();
  for (const key of referencedKeys) {
    try {
      await r2.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    } catch {
      return { ok: false, error: "upload_missing" };
    }
  }

  const submissionId = crypto.randomUUID();
  const slug = challenge.slug;

  // Move each tmp/ object to submissions/<challengeId>/<submissionId>/<basename>
  const keyMap = new Map<string, string>();
  for (const oldKey of referencedKeys) {
    const basename = path.basename(oldKey);
    const newKey = `submissions/${challengeId}/${submissionId}/${basename}`;
    try {
      await r2.send(
        new CopyObjectCommand({
          Bucket: BUCKET,
          CopySource: `${BUCKET}/${oldKey}`,
          Key: newKey,
        })
      );
      await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: oldKey }));
    } catch (err) {
      console.error("[submitChallengeAction] move_failed", oldKey, err);
      return { ok: false, error: "validation_failed", detail: `move_failed:${oldKey}` };
    }
    keyMap.set(oldKey, newKey);
  }

  // Build final content JSONB with moved keys + public URLs
  type FinalContent = {
    text_description: string;
    native_video?: { objectKey: string; url: string; poster_url?: string; duration_sec?: number };
    youtube_url?: string;
    images?: { objectKey: string; url: string }[];
    pdf?: { objectKey: string; url: string };
  };

  const finalContent: FinalContent = { text_description: content.text_description };

  if (content.native_video) {
    const nk = keyMap.get(content.native_video.objectKey)!;
    finalContent.native_video = {
      objectKey: nk,
      url: objectPublicUrl(nk),
      ...(content.native_video.poster_url ? { poster_url: content.native_video.poster_url } : {}),
      ...(content.native_video.duration_sec !== undefined
        ? { duration_sec: content.native_video.duration_sec }
        : {}),
    };
  }

  if (content.youtube_url) {
    finalContent.youtube_url = content.youtube_url;
  }

  if (content.images && content.images.length > 0) {
    finalContent.images = content.images.map((img) => {
      const nk = keyMap.get(img.objectKey)!;
      return { objectKey: nk, url: objectPublicUrl(nk) };
    });
  }

  if (content.pdf) {
    const nk = keyMap.get(content.pdf.objectKey)!;
    finalContent.pdf = { objectKey: nk, url: objectPublicUrl(nk) };
  }

  const { error: insertError } = await supabase.from("challenge_submissions").insert({
    id: submissionId,
    challenge_id: challengeId,
    submitter_id: user.id,
    content: finalContent,
    status: "ready",
  });

  if (insertError) {
    console.error("[submitChallengeAction] insert failed", insertError);
    if (insertError.code === "23505") {
      return { ok: false, error: "already_submitted" };
    }
    return { ok: false, error: "validation_failed", detail: insertError.message };
  }

  // G7 emit: challenge_submission_confirmed (submitter-facing, medium severity).
  // Body/title intentionally blank — notify-dispatch renders localized copy
  // from payload.challenge_title per §D locale-aware dispatch pattern.
  const { error: notifyError } = await supabase
    .from("notification_events")
    .insert({
      user_id: user.id,
      kind: "challenge_submission_confirmed",
      severity: "medium",
      title: "",
      body: "",
      url_path: `/challenges/${slug}/gallery#submission-${submissionId}`,
      payload: {
        challenge_title: challenge.title,
        challenge_slug: slug,
        submission_id: submissionId,
      },
    });
  if (notifyError) {
    // Notification emit failure is NOT fatal — submission already persisted.
    // Log and continue. Phase 2.6 could add retry queue.
    console.error("[submitChallengeAction] notify emit failed (non-fatal)", notifyError);
  }

  revalidatePath(`/challenges/${slug}/gallery`);

  return {
    ok: true,
    submissionId,
    redirectTo: `/challenges/${slug}/gallery#submission-${submissionId}`,
  };
}
