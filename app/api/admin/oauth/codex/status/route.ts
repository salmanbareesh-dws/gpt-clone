import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getCodexLoginSessionById } from "@/lib/codex-login-session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }

  const session = await getCodexLoginSessionById(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json({
    sessionId: session.id,
    status: session.status,
    verificationUri: session.verificationUri,
    userCode: session.userCode,
    error: session.error,
    outputTail: session.outputTail ?? null,
    codexHome: session.codexHome,
  });
}
