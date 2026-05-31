type YagiAdminRpcClient = {
  rpc: (
    fn: "is_yagi_admin",
    args: { uid: string },
  ) => PromiseLike<{ data: boolean | null; error: unknown }>;
};

export async function getIsYagiAdmin(
  supabase: YagiAdminRpcClient,
  uid: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_yagi_admin", { uid });
  if (error) {
    console.error("[app/admin] is_yagi_admin check failed:", error);
  }
  return data === true;
}
