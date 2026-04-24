/**
 * Contextual help route map — Phase 2.6 G3.
 *
 * Each entry maps an app route pattern to a published journal guide.
 * The header-rendered help link calls `resolveHelpRoute(pathname)` with the
 * current pathname (locale-stripped) and renders only if the match returns a
 * `published: true` entry.
 *
 * Adding a new help entry: add one line here + one label per locale under
 * `messages.app.help.routes.<i18nKey>`, and ensure the journal guide
 * actually exists at `/journal/guide/<slug>` before flipping `published`.
 */

export type HelpRoute = {
  /** Route pattern with `:param` placeholders for dynamic segments (e.g. `/app/admin/challenges/:id`). */
  pattern: string;
  /** Journal guide slug; URL is `/journal/guide/<slug>`. */
  slug: string;
  /** Key under `messages.app.help.routes.*`. */
  i18nKey: string;
  /** When false, the resolver skips this entry; structural reservation for future content. */
  published: boolean;
};

export const HELP_ROUTES: readonly HelpRoute[] = [
  {
    pattern: "/app/admin/challenges/new",
    slug: "challenge-creation",
    i18nKey: "challengeCreation",
    published: true,
  },
  {
    pattern: "/app/admin/challenges/:id",
    slug: "challenge-management",
    i18nKey: "challengeManagement",
    published: false,
  },
  {
    pattern: "/app/projects/new",
    slug: "project-setup",
    i18nKey: "projectSetup",
    published: false,
  },
  {
    pattern: "/app/showcases/new",
    slug: "showcase-publishing",
    i18nKey: "showcasePublishing",
    published: false,
  },
];

function stripLocale(pathname: string): string {
  // Match a leading /ko or /en segment; preserve the remainder.
  return pathname.replace(/^\/(ko|en)(?=\/|$)/u, "") || "/";
}

function patternToRegex(pattern: string): RegExp {
  // Escape regex special chars in the static parts, then replace :param with [^/]+.
  const escaped = pattern
    .split(/(:[a-zA-Z_][a-zA-Z0-9_]*)/g)
    .map((part) => {
      if (/^:[a-zA-Z_]/.test(part)) return "[^/]+";
      return part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("");
  return new RegExp(`^${escaped}$`);
}

export function resolveHelpRoute(pathname: string): HelpRoute | null {
  const bare = stripLocale(pathname);
  for (const entry of HELP_ROUTES) {
    if (!entry.published) continue;
    if (patternToRegex(entry.pattern).test(bare)) {
      return entry;
    }
  }
  return null;
}
