import { redirect } from "@/i18n/routing";
import { getLocale } from "next-intl/server";
import { fetchAppContext } from "@/lib/app/context";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const ctx = await fetchAppContext();
  if (!ctx) redirect({ href: "/", locale });
  if (!ctx!.workspaceRoles.includes("yagi_admin")) redirect({ href: "/app", locale });
  return <>{children}</>;
}
