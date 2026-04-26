// Phase 2.8.1 G_B1-A — ESLint config used only by the rule self-test.
// Re-exports the project config but strips the `scripts/_fixtures/**`
// ignore entry so the deliberately-bad fixture can be linted.
import baseConfig from "../../eslint.config.mjs";

const filtered = baseConfig.map((entry) => {
  if (Array.isArray(entry.ignores)) {
    return {
      ...entry,
      ignores: entry.ignores.filter(
        (p) => !p.startsWith("scripts/_fixtures"),
      ),
    };
  }
  return entry;
});

export default filtered;
