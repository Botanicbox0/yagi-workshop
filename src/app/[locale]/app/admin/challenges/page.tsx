import { Link } from "@/i18n/routing";
import { createSupabaseServer } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { statusPillClass } from "@/lib/ui/status-pill";
import { statusLabel } from "@/lib/ui/status-labels";
import type { ChallengeState } from "@/lib/challenges/types";

export const dynamic = "force-dynamic";

const STATE_FILTERS: { value: ChallengeState | "all"; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "draft", label: "준비 중" },
  { value: "open", label: "진행 중" },
  { value: "closed_judging", label: "심사 중" },
  { value: "closed_announced", label: "결과 발표" },
  { value: "archived", label: "지난 챌린지" },
];

type ChallengeRow = {
  id: string;
  slug: string;
  title: string;
  state: ChallengeState;
  open_at: string | null;
  close_at: string | null;
  announce_at: string | null;
  created_at: string;
};

function fmt(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export default async function AdminChallengesListPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const sp = await searchParams;
  const selectedState = sp.state as ChallengeState | "all" | undefined;
  const supabase = await createSupabaseServer();

  let query = supabase
    .from("challenges")
    .select("id, slug, title, state, open_at, close_at, announce_at, created_at")
    .order("created_at", { ascending: false });

  if (selectedState && selectedState !== "all") {
    query = query.eq("state", selectedState);
  }

  const { data, error } = await query;
  const rows = (data ?? []) as ChallengeRow[];

  return (
    <div className="max-w-6xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">챌린지 관리</h1>
        <Button size="pill" asChild>
          <Link href="/app/admin/challenges/new">새 챌린지</Link>
        </Button>
      </div>

      {error ? (
        <div className="rounded-lg border border-border bg-muted p-4 text-sm text-muted-foreground">
          불러오는 중에 문제가 생겼어요. 다시 시도해주세요.
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {STATE_FILTERS.map((f) => {
          const isActive =
            (selectedState ?? "all") === f.value;
          const href =
            f.value === "all"
              ? "/app/admin/challenges"
              : `/app/admin/challenges?state=${f.value}`;
          return (
            <Link key={f.value} href={href}>
              <Button
                size="sm"
                variant={isActive ? "default" : "outline"}
                className="rounded-full"
              >
                {f.label}
              </Button>
            </Link>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          아직 챌린지가 없어요.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>제목</TableHead>
                <TableHead className="hidden sm:table-cell">상태</TableHead>
                <TableHead className="hidden md:table-cell">마감일</TableHead>
                <TableHead className="hidden md:table-cell">발표일</TableHead>
                <TableHead className="text-right">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/app/admin/challenges/${c.slug}/edit`}
                      className="hover:underline underline-offset-2"
                    >
                      {c.title}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <span className={statusPillClass("challenge", c.state)}>
                      {statusLabel("challenge", c.state)}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {fmt(c.close_at)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {fmt(c.announce_at)}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    {(c.state === "draft" || c.state === "open") && (
                      <Link
                        href={`/app/admin/challenges/${c.slug}/edit`}
                        className="text-sm text-foreground hover:underline"
                      >
                        편집
                      </Link>
                    )}
                    {(c.state === "open" || c.state === "closed_judging") && (
                      <Link
                        href={`/app/admin/challenges/${c.slug}/judge`}
                        className="text-sm text-foreground hover:underline"
                      >
                        심사
                      </Link>
                    )}
                    {c.state === "closed_judging" && (
                      <Link
                        href={`/app/admin/challenges/${c.slug}/announce`}
                        className="text-sm text-foreground hover:underline"
                      >
                        발표
                      </Link>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
