import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { error, count } = await supabase
    .from("rate_limits")
    .delete({ count: "exact" })
    .lt("created_at", cutoff);

  if (error) {
    console.error("[CRON cleanup] Error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }

  return NextResponse.json({ deleted: count ?? 0 });
}
