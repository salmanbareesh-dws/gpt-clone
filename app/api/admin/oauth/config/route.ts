import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { CLIENT_ID, DEVICE_CODE_URL, TOKEN_URL, AUDIENCE, SCOPES } from "@/lib/oauth";

/**
 * GET /api/admin/oauth/config
 * Returns OAuth constants needed for browser-side device code flow.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    clientId: CLIENT_ID,
    deviceCodeUrl: DEVICE_CODE_URL,
    tokenUrl: TOKEN_URL,
    audience: AUDIENCE,
    scopes: SCOPES,
  });
}
