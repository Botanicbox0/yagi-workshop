// Phase 2.8.1 G_B1-A — fixture for rsc-no-async-form-action rule.
// This file deliberately contains the anti-pattern. It is excluded from
// `pnpm lint` via eslint.config.mjs ignores, but the lint rule must fire
// on it when invoked explicitly via test-rsc-form-action-rule.mjs.

export default function BadServerComponent() {
  return (
    <form
      action={async (formData: FormData) => {
        await Promise.resolve(formData);
      }}
    >
      <button type="submit">Boom</button>
    </form>
  );
}
