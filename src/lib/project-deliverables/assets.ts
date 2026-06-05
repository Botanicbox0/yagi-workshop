export type StorageAssetKind = "image" | "video" | "file";
export type ExternalAssetProvider = "youtube" | "vimeo" | "generic";

export function detectStorageKind(key: string): StorageAssetKind {
  const ext = key.split(".").pop()?.toLowerCase();
  if (ext && ["jpg", "jpeg", "png", "webp", "gif", "avif"].includes(ext)) {
    return "image";
  }
  if (ext && ["mp4", "mov", "webm"].includes(ext)) {
    return "video";
  }
  return "file";
}

export function detectExternalProvider(url: string): ExternalAssetProvider {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (host === "youtube.com" || host === "m.youtube.com" || host === "youtu.be") {
      return "youtube";
    }
    if (host === "vimeo.com" || host.endsWith(".vimeo.com")) {
      return "vimeo";
    }
  } catch {
    // Fall through to generic.
  }
  return "generic";
}
