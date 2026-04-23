// Markdown renderer for admin-authored challenge copy — Phase 2.5 G3.
// Source: G3 Decision Package §C [3] rendering guidance.
//
// Uses react-markdown + rehype-sanitize. Sanitize is enabled by default
// (rehype-sanitize's built-in schema strips scripts/event handlers) so
// admin-authored markdown stored in `challenges.description_md` is safe
// to render without further escaping.
//
// No Tailwind Typography plugin in this repo (checked 2026-04-23). Styling
// is applied via arbitrary child selectors on the wrapper div, using only
// semantic tokens (text-foreground, bg-muted, border) per X1 audit rules.
// No text-gray-*, no rounded-xl/2xl, no fixed px font-size.

import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";

export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="text-sm text-foreground space-y-4 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-6 [&_h2]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_p]:leading-relaxed [&_a]:text-foreground [&_a]:underline [&_ul]:list-disc [&_ul]:ml-5 [&_ol]:list-decimal [&_ol]:ml-5 [&_li]:my-1 [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:rounded [&_pre]:overflow-x-auto [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground">
      <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
