import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { setSessionCookie, signSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(6),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());

    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Block users who are not yet approved
    if (user.status === "PENDING") {
      return NextResponse.json(
        { error: "Your account is pending admin approval.", status: "pending" },
        { status: 403 },
      );
    }
    if (user.status === "REJECTED") {
      return NextResponse.json(
        { error: "Your account has been rejected by the administrator.", status: "rejected" },
        { status: 403 },
      );
    }

    const token = await signSession({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    await setSessionCookie(token);

    return NextResponse.json({
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    console.error("[auth/login]", error);

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

    return NextResponse.json({ error: "Login failed due to a server error." }, { status: 500 });
  }
}
