import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { unfurl } from "@/lib/og-unfurl";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // 1. Auth check
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 2. Parse body
  let body: { url?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (typeof body.url !== "string" || body.url.length === 0) {
    return NextResponse.json({ error: "missing_url" }, { status: 400 });
  }

  // 3. Unfurl (never throws)
  const data = await unfurl(body.url);
  return NextResponse.json(data);
}
