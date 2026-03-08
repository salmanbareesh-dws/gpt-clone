import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getProviderStatuses } from "@/lib/provider-connections";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const providers = await getProviderStatuses();
  return NextResponse.json({ providers });
}
