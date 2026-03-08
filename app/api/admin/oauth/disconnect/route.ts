import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { disconnectOAuth } from "@/lib/oauth";

/** POST /api/admin/oauth/disconnect – remove stored tokens */
export async function POST() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await disconnectOAuth();
  return NextResponse.json({ ok: true });
}
