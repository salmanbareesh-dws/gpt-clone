import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAvailableModels, getDefaultModel } from "@/lib/workspace-models";

/** GET /api/models – get available models for chat (any authenticated user) */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [models, defaultModel] = await Promise.all([
    getAvailableModels(),
    getDefaultModel(),
  ]);

  return NextResponse.json({ models, defaultModel });
}
