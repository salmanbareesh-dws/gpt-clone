import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { disableProvider } from "@/lib/provider-connections";

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
    await disableProvider(body.providerId);
    return NextResponse.json({ ok: true, provider: body.providerId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to disconnect provider";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
