import { defineCollection, defineConfig } from "@content-collections/core";
import { compileMDX } from "@content-collections/mdx";
import { z } from "zod";

const posts = defineCollection({
  name: "posts",
  directory: "content/journal",
  include: "**/*.mdx",
  schema: z.object({
    title: z.string().min(1).max(120),
    subtitle: z.string().max(200).optional(),
    publishedAt: z.string().datetime(),
    updatedAt: z.string().datetime().optional(),
    locale: z.enum(["ko", "en"]).default("ko"),
    translation_slug: z.string().optional(),
    tags: z.array(z.string()).default([]),
    author: z.string().default("야기"),
    cover_image: z.string().optional(),
    draft: z.boolean().default(false),
    og_theme: z.enum(["default", "accent", "quote"]).default("default"),
  }),
  transform: async (document, context) => {
    const mdx_body = await compileMDX(context, document);

    // Strip `.mdx` + any `.en`/`.ko` suffix from the filename.
    const fileName = document._meta.fileName; // e.g. "welcome-to-yagi-workshop.en.mdx"
    const slug = fileName
      .replace(/\.mdx$/u, "")
      .replace(/\.(en|ko)$/u, "");

    const rawContent = document.content ?? "";
    const word_count = rawContent.split(/\s+/u).filter(Boolean).length;
    const read_minutes = Math.max(1, Math.round(word_count / 250));

    return {
      ...document,
      slug,
      mdx_body,
      word_count,
      read_minutes,
    };
  },
});

export default defineConfig({
  collections: [posts],
});
