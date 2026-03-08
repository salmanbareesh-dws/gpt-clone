import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { assertProviderCanConnect, enableProvider } from "@/lib/provider-connections";
import { ensureProviderModels } from "@/lib/workspace-models";

const schema = z.object({
  providerId: z.enum(["gemini", "claude-code", "qwen-code"]),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = schema.parse(await request.json());
    const status = await assertProviderCanConnect(body.providerId);
    await enableProvider(body.providerId);
    await ensureProviderModels(body.providerId);
    return NextResponse.json({ ok: true, provider: status.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to connect provider";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
