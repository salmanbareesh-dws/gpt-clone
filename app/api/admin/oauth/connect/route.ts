import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { importFromCodexCli, saveTokens } from "@/lib/oauth";
import type { OAuthTokens } from "@/lib/oauth";

/**
 * POST /api/admin/oauth/connect
 * Body options:
 *   { method: "import" }   – Import tokens from Codex CLI (~/.codex/auth.json)
 *   { method: "tokens", tokens: {...} } – Save tokens from browser-side device code flow
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const method = body.method || "import";

    if (method === "import") {
      // Import from Codex CLI
      const result = await importFromCodexCli();
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ ok: true, method: "import" });
    }

    if (method === "tokens") {
      // Save tokens from browser-side device code flow
      const tokens = body.tokens as OAuthTokens;
      if (!tokens?.access_token || !tokens?.refresh_token) {
        return NextResponse.json({ error: "Invalid tokens" }, { status: 400 });
      }
      await saveTokens(tokens);
      return NextResponse.json({ ok: true, method: "tokens" });
    }

    return NextResponse.json({ error: "Invalid method" }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to connect";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
