import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(6),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());

    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    await prisma.user.create({
      data: {
        email: body.email,
        passwordHash,
        role: "USER",
        status: "PENDING",
      },
    });

    // Don't auto-login — user needs admin approval first
    return NextResponse.json({
      status: "pending",
      message: "Registration successful. Your account is pending admin approval.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    console.error("[auth/register]", error);

    const message = error instanceof Error ? error.message : "";
    if (
      message.includes("Authentication failed against database server") ||
      message.includes("Can't reach database server")
    ) {
      return NextResponse.json(
        { error: "Database connection failed. Check DATABASE_URL and PostgreSQL credentials." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { error: "Registration failed due to a server error." },
      { status: 500 },
    );
  }
}
