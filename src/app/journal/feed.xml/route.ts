import { allPosts } from "content-collections";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001";

/**
 * Escape the five reserved XML characters so user-supplied strings
 * (title, subtitle, summary, author, tags) cannot break the feed.
 */
function escapeXml(value: string): string {
  return value
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;")
    .replace(/'/gu, "&apos;");
}

function buildSummary(
  raw: string | undefined,
  fallback: string,
): string {
  const source = (raw ?? "").trim();
  if (source.length === 0) {
    return fallback;
  }
  const truncated = source.slice(0, 200);
  return truncated.length < source.length ? `${truncated}…` : truncated;
}

export async function GET(): Promise<Response> {
  const published = allPosts
    .filter((post) => !post.draft)
    .filter((post) => !post.tags.includes("guide"))
    .slice()
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() -
        new Date(a.publishedAt).getTime(),
    )
    .slice(0, 20);

  const feedUpdated =
    published.length > 0
      ? new Date(published[0].publishedAt).toISOString()
      : new Date().toISOString();

  const entries = published
    .map((post) => {
      const url = `${SITE_URL}/${post.locale}/journal/${post.slug}`;
      const updated = new Date(
        post.updatedAt ?? post.publishedAt,
      ).toISOString();
      const published = new Date(post.publishedAt).toISOString();
      const fallbackSummary = post.subtitle ?? post.title;
      const summary = buildSummary(post.content, fallbackSummary);
      const categories = post.tags
        .map((tag) => `    <category term="${escapeXml(tag)}"/>`)
        .join("\n");

      return [
        `  <entry>`,
        `    <title>${escapeXml(post.title)}</title>`,
        `    <link href="${escapeXml(url)}"/>`,
        `    <id>${escapeXml(url)}</id>`,
        `    <updated>${updated}</updated>`,
        `    <published>${published}</published>`,
        `    <author><name>${escapeXml(post.author)}</name></author>`,
        `    <summary>${escapeXml(summary)}</summary>`,
        categories,
        `  </entry>`,
      ]
        .filter((line) => line.length > 0)
        .join("\n");
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>YAGI Workshop Journal</title>
  <subtitle>Notes and fragments from YAGI Workshop</subtitle>
  <link href="${escapeXml(`${SITE_URL}/`)}" rel="alternate"/>
  <link href="${escapeXml(`${SITE_URL}/journal/feed.xml`)}" rel="self"/>
  <id>${escapeXml(`${SITE_URL}/`)}</id>
  <updated>${feedUpdated}</updated>
  <author><name>YAGI Workshop</name></author>
${entries}
</feed>
`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/atom+xml; charset=utf-8",
    },
  });
}
