export function streamCustomer(): string | null {
  return process.env.NEXT_PUBLIC_STREAM_CUSTOMER_CODE ?? null;
}

export function streamHlsUrl(uid: string): string | null {
  const customer = streamCustomer();
  if (!customer) return null;
  return `https://customer-${customer}.cloudflarestream.com/${uid}/manifest/video.m3u8`;
}

export function streamThumbnailUrl(uid: string, timeSec = 0): string | null {
  const customer = streamCustomer();
  if (!customer) return null;
  const time = Math.max(0, Math.floor(timeSec));
  return `https://customer-${customer}.cloudflarestream.com/${uid}/thumbnails/thumbnail.jpg?time=${time}s`;
}

export function streamStoryboardUrl(uid: string): string | null {
  const customer = streamCustomer();
  if (!customer) return null;
  return `https://customer-${customer}.cloudflarestream.com/${uid}/storyboard.vtt`;
}
