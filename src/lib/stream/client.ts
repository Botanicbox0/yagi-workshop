import "server-only";

type CloudflareStreamCopyResponse = {
  success?: boolean;
  result?: {
    uid?: string;
  };
  errors?: unknown[];
};

type CloudflareStreamVideoResponse = {
  success?: boolean;
  result?: {
    readyToStream?: boolean;
    status?: {
      state?: string;
    };
  };
  errors?: unknown[];
};

const STREAM_FETCH_TIMEOUT_MS = 10_000;

function streamAccountId() {
  return process.env.CLOUDFLARE_ACCOUNT_ID ?? "";
}

function streamApiToken() {
  return process.env.CLOUDFLARE_STREAM_API_TOKEN ?? "";
}

export function streamConfigured(): boolean {
  return Boolean(streamAccountId() && streamApiToken());
}

function streamApiUrl(path: string) {
  return `https://api.cloudflare.com/client/v4/accounts/${streamAccountId()}/stream${path}`;
}

function timeoutSignal() {
  return AbortSignal.timeout(STREAM_FETCH_TIMEOUT_MS);
}

export async function copyFromUrl(
  sourceUrl: string,
  name?: string,
): Promise<{ uid: string } | null> {
  if (!streamConfigured()) return null;

  try {
    const response = await fetch(streamApiUrl("/copy"), {
      method: "POST",
      signal: timeoutSignal(),
      headers: {
        Authorization: `Bearer ${streamApiToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: sourceUrl,
        meta: name ? { name } : undefined,
      }),
    });
    if (!response.ok) {
      console.error("[stream.copyFromUrl] request failed:", response.status);
      return null;
    }

    const payload = (await response.json()) as CloudflareStreamCopyResponse;
    const uid = payload.result?.uid;
    if (payload.success !== true || !uid) {
      console.error("[stream.copyFromUrl] invalid response:", payload.errors ?? null);
      return null;
    }

    return { uid };
  } catch (error) {
    console.error("[stream.copyFromUrl] unexpected error:", error);
    return null;
  }
}

export async function getVideo(
  uid: string,
): Promise<{ readyToStream: boolean; status?: string } | null> {
  if (!streamConfigured()) return null;

  try {
    const response = await fetch(streamApiUrl(`/${encodeURIComponent(uid)}`), {
      signal: timeoutSignal(),
      headers: {
        Authorization: `Bearer ${streamApiToken()}`,
      },
    });
    if (!response.ok) {
      console.error("[stream.getVideo] request failed:", response.status);
      return null;
    }

    const payload = (await response.json()) as CloudflareStreamVideoResponse;
    if (payload.success !== true || !payload.result) {
      console.error("[stream.getVideo] invalid response:", payload.errors ?? null);
      return null;
    }

    return {
      readyToStream: payload.result.readyToStream === true,
      status: payload.result.status?.state,
    };
  } catch (error) {
    console.error("[stream.getVideo] unexpected error:", error);
    return null;
  }
}
