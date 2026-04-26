import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

// Phase 2.8.1 G_B1-A — block <form action={async (...) => ...}> in RSC files.
// Inline async arrows on a form `action` prop break Next.js 15 RSC
// serialization at runtime, but pass tsc. Hot patch landed in commit 1273356;
// this rule is the permanent guard.
const rscFormActionPlugin = {
  rules: {
    "no-async-form-action": {
      meta: {
        type: "problem",
        docs: {
          description:
            "Forbid inline async arrow function on a form action prop in Server Component files (breaks RSC serialization).",
        },
        schema: [],
        messages: {
          forbidden:
            "<form action={async (...) => ...}> breaks RSC serialization in Next.js 15. Define the function with 'use server' at module top-level (or in actions.ts) and pass it by reference.",
        },
      },
      create(context) {
        let isClientFile = false;
        return {
          Program(node) {
            const body = node.body || [];
            for (const stmt of body) {
              if (
                stmt.type === "ExpressionStatement" &&
                stmt.expression &&
                stmt.expression.type === "Literal" &&
                (stmt.expression.value === "use client" ||
                  stmt.expression.value === "use server")
              ) {
                if (stmt.expression.value === "use client") {
                  isClientFile = true;
                }
              } else {
                break;
              }
            }
          },
          JSXAttribute(node) {
            if (isClientFile) return;
            if (!node.name || node.name.name !== "action") return;
            const val = node.value;
            if (!val || val.type !== "JSXExpressionContainer") return;
            const expr = val.expression;
            if (!expr) return;
            if (
              (expr.type === "ArrowFunctionExpression" ||
                expr.type === "FunctionExpression") &&
              expr.async === true
            ) {
              context.report({ node, messageId: "forbidden" });
            }
          },
        };
      },
    },
  },
};

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "scripts/_fixtures/**",
    ],
  },
  {
    files: ["**/*.{ts,tsx,jsx,js,mjs}"],
    plugins: { "yagi-rsc": rscFormActionPlugin },
    rules: {
      "yagi-rsc/no-async-form-action": "error",
    },
  },
];

export default eslintConfig;
