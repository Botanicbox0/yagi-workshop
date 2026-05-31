export type IncludeTestSearchParams =
  | { includeTest?: string | string[] }
  | undefined;

export function shouldIncludeTestData(
  searchParams: IncludeTestSearchParams,
): boolean {
  const raw = Array.isArray(searchParams?.includeTest)
    ? searchParams?.includeTest[0]
    : searchParams?.includeTest;
  return raw === "1" || raw === "true";
}

export function isRealWorkspace(
  workspace: { is_test?: boolean | null } | null | undefined,
): boolean {
  return workspace?.is_test !== true;
}
