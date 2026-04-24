import type { ReactNode } from "react";

export const journalTypographyComponents: Record<
  string,
  (props: { children?: ReactNode }) => ReactNode
> = {
  h2: ({ children }) => (
    <h2 className="text-3xl md:text-4xl font-display mt-16 mb-6 keep-all tracking-tight leading-[1.15]">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-xl md:text-2xl font-display mt-12 mb-4 keep-all tracking-tight leading-[1.2]">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="text-base md:text-lg leading-relaxed text-foreground/85 mb-6 keep-all">
      {children}
    </p>
  ),
  a: ({ children, ...rest }: { children?: ReactNode; href?: string }) => (
    <a
      {...rest}
      className="underline decoration-foreground/30 underline-offset-4 hover:decoration-foreground transition-colors"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-black/30 pl-6 italic font-display text-xl text-foreground/70 my-8 keep-all">
      {children}
    </blockquote>
  ),
  code: ({ children }) => (
    <code className="font-mono text-sm bg-black/[0.03] px-1.5 py-0.5 rounded">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="font-mono text-sm bg-black/[0.03] p-4 rounded overflow-x-auto my-6">
      {children}
    </pre>
  ),
  ul: ({ children }) => (
    <ul className="pl-6 mb-6 space-y-2 list-disc marker:text-foreground/40">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="pl-6 mb-6 space-y-2 list-decimal marker:text-foreground/40">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="text-base md:text-lg leading-relaxed text-foreground/85 keep-all">
      {children}
    </li>
  ),
  hr: () => <hr className="border-t border-black/10 my-12" />,
};
