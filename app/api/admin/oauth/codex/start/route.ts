import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { startCodexLoginSession } from "@/lib/codex-login-session";

export const runtime = "nodejs";

export async function POST() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const session = await startCodexLoginSession();
    return NextResponse.json({
      sessionId: session.id,
      status: session.status,
      verificationUri: session.verificationUri,
      userCode: session.userCode,
      codexHome: session.codexHome,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to start Codex login";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
