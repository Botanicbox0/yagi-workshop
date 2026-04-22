import { Fragment, type ReactNode } from "react";

/**
 * Render a section title with a single Fraunces-italic emphasis word.
 * Splits the title on the first occurrence of `emphasis` and wraps
 * that occurrence in <em>. If the emphasis string is not found,
 * the raw title is returned as-is.
 */
export function renderTitleWithEmphasis(
  title: string,
  emphasis: string,
): ReactNode {
  if (!emphasis) return title;
  const idx = title.indexOf(emphasis);
  if (idx === -1) return title;

  const before = title.slice(0, idx);
  const after = title.slice(idx + emphasis.length);

  return (
    <Fragment>
      {before}
      <em>{emphasis}</em>
      {after}
    </Fragment>
  );
}
