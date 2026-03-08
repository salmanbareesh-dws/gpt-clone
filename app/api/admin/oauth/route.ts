import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getOAuthStatus } from "@/lib/oauth";
import { getProviderStatuses } from "@/lib/provider-connections";
import { getAvailableModels, getDefaultModel } from "@/lib/workspace-models";

/** GET /api/admin/oauth – connection status + model settings */
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [status, models, defaultModel, providers] = await Promise.all([
    getOAuthStatus(),
    getAvailableModels(),
    getDefaultModel(),
    getProviderStatuses(),
  ]);

  return NextResponse.json({ ...status, models, defaultModel, providers });
}
