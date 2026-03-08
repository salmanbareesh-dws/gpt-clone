import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getAvailableModels,
  getDefaultModel,
  setAvailableModels,
  setDefaultModel,
} from "@/lib/workspace-models";

/** GET /api/admin/models – get model settings (admin only) */
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [models, defaultModel] = await Promise.all([
    getAvailableModels(),
    getDefaultModel(),
  ]);

  return NextResponse.json({ models, defaultModel });
}

/** PATCH /api/admin/models – update model settings (admin only) */
export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();

  if (body.defaultModel && typeof body.defaultModel === "string") {
    await setDefaultModel(body.defaultModel);
  }

  if (Array.isArray(body.models)) {
    const models = body.models
      .filter((m: unknown) => typeof m === "string" && m.trim())
      .map((m: string) => m.trim());
    if (models.length > 0) {
      await setAvailableModels(models);
    }
  }

  const [models, defaultModel] = await Promise.all([
    getAvailableModels(),
    getDefaultModel(),
  ]);

  return NextResponse.json({ models, defaultModel });
}
