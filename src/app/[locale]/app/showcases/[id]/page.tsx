import { notFound } from "next/navigation";
import { redirect } from "@/i18n/routing";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseService } from "@/lib/supabase/service";
import { ShowcaseEditor } from "@/components/showcases/showcase-editor";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function ShowcaseEditorPage({ params }: Props) {
  const { locale, id } = await params;

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: "/signin", locale });
    return null;
  }

  const svc = createSupabaseService();

  const { data: showcase, error } = await svc
    .from("showcases")
    .select(
      "id, title, subtitle, slug, status, client_name_public, narrative_md, credits_md, cover_media_type, cover_media_storage_path, cover_media_external_url, made_with_yagi, badge_removal_requested, badge_removal_approved_at, is_password_protected, published_at, view_count, project_id, project:projects(id, title, workspace_id)",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[showcase-editor] load error:", error.message);
  }
  if (!showcase) notFound();

  const projectRel = showcase.project as unknown as {
    id: string;
    title: string | null;
    workspace_id: string;
  } | null;

  // Access: yagi_admin OR workspace_admin of the showcase's workspace.
  const { data: yagiAdmin } = await supabase.rpc("is_yagi_admin", {
    uid: user.id,
  });
  let isWsAdmin = false;
  if (!yagiAdmin && projectRel) {
    const { data: wsAdmin } = await supabase.rpc("is_ws_admin", {
      uid: user.id,
      wsid: projectRel.workspace_id,
    });
    isWsAdmin = Boolean(wsAdmin);
  }
  if (!yagiAdmin && !isWsAdmin) notFound();

  const canPublish = Boolean(yagiAdmin);
  const canManageBadge = Boolean(yagiAdmin);
  const canManagePassword = Boolean(yagiAdmin);

  // Load media (with caption + sort_order).
  const { data: mediaRows } = await svc
    .from("showcase_media")
    .select(
      "id, sort_order, media_type, storage_path, external_url, embed_provider, caption",
    )
    .eq("showcase_id", id)
    .order("sort_order", { ascending: true });

  const media = mediaRows ?? [];

  // Sign storage-backed media URLs (and cover).
  const pathsToSign: string[] = [];
  for (const m of media) {
    if (m.storage_path) pathsToSign.push(m.storage_path);
  }
  if (showcase.cover_media_storage_path) {
    pathsToSign.push(showcase.cover_media_storage_path);
  }
  const mediaUrlMap: Record<string, string> = {};
  if (pathsToSign.length > 0) {
    const { data: signed } = await svc.storage
      .from("showcase-media")
      .createSignedUrls(pathsToSign, 3600);
    for (const row of signed ?? []) {
      if (row.path && row.signedUrl) {
        mediaUrlMap[row.path] = row.signedUrl;
      }
    }
  }

  return (
    <ShowcaseEditor
      showcase={{
        id: showcase.id,
        title: showcase.title,
        subtitle: showcase.subtitle,
        slug: showcase.slug,
        status: showcase.status,
        client_name_public: showcase.client_name_public,
        narrative_md: showcase.narrative_md,
        credits_md: showcase.credits_md,
        cover_media_type: showcase.cover_media_type,
        cover_media_storage_path: showcase.cover_media_storage_path,
        cover_media_external_url: showcase.cover_media_external_url,
        made_with_yagi: showcase.made_with_yagi,
        badge_removal_requested: showcase.badge_removal_requested,
        badge_removal_approved_at: showcase.badge_removal_approved_at,
        is_password_protected: showcase.is_password_protected,
        published_at: showcase.published_at,
        view_count: showcase.view_count,
        project_id: showcase.project_id,
        project_title: projectRel?.title ?? null,
      }}
      media={media.map((m) => ({
        id: m.id,
        sort_order: m.sort_order,
        media_type: m.media_type,
        storage_path: m.storage_path,
        external_url: m.external_url,
        embed_provider: m.embed_provider,
        caption: m.caption,
      }))}
      mediaUrlMap={mediaUrlMap}
      canPublish={canPublish}
      canManageBadge={canManageBadge}
      canManagePassword={canManagePassword}
    />
  );
}
