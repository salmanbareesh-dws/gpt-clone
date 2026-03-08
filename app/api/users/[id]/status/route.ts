import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const statusSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = statusSchema.parse(await request.json());

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prevent changing admin's own status
    if (target.role === "ADMIN") {
      return NextResponse.json({ error: "Cannot change admin status" }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { status: body.status },
      select: { id: true, email: true, role: true, status: true },
    });

    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
