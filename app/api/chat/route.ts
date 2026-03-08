import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getAccessToken, getChatGptAccountId } from "@/lib/oauth";
import { prisma } from "@/lib/prisma";
import { streamCliProviderResponse } from "@/lib/provider-connections";
import { getProviderForModel, getProviderModelName } from "@/lib/provider-models";
import { userLimiter, globalLimiter } from "@/lib/rate-limit";
import { getDefaultModel } from "@/lib/workspace-models";

const CHATGPT_BACKEND_URL = "https://chatgpt.com/backend-api/codex";
const CHATGPT_OAUTH_SUPPORTED_MODELS = new Set(["gpt-5-codex", "gpt-5"]);

export const runtime = "nodejs";

type AuthMode =
  | { mode: "oauth"; client: OpenAI }
  | { mode: "apikey"; client: OpenAI }
  | { mode: "none" };

type HistoryMessage = {
  role: "USER" | "ASSISTANT";
  content: string;
};

type ChatRequestState = {
  chat: { id: string };
  history: HistoryMessage[];
};

async function resolveAuth(): Promise<AuthMode> {
  const oauthToken = await getAccessToken();
  if (oauthToken) {
    const accountId = await getChatGptAccountId();
    if (!accountId) {
      return { mode: "none" };
    }

    return {
      mode: "oauth",
      client: new OpenAI({
        apiKey: oauthToken,
        baseURL: CHATGPT_BACKEND_URL,
        defaultHeaders: {
          "ChatGPT-Account-ID": accountId,
          originator: "codex_cli_rs",
          version: "0.110.0",
        },
      }),
    };
  }

  if (process.env.OPENAI_API_KEY) {
    return {
      mode: "apikey",
      client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
    };
  }

  return { mode: "none" };
}

const sendSchema = z.object({
  chatId: z.string().optional(),
  message: z.string().min(1).max(10_000),
  model: z.string().optional(),
});

const renameSchema = z.object({
  chatId: z.string().min(1),
  title: z.string().min(1).max(120),
});

const deleteSchema = z.object({
  chatId: z.string().min(1),
});

const listSchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(100),
  before: z.string().optional(),
});

export async function GET(request: Request) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { status: true },
  });
  if (!dbUser || dbUser.status !== "APPROVED") {
    return NextResponse.json({ error: "Account not approved" }, { status: 403 });
  }

  const url = new URL(request.url);
  const chatId = url.searchParams.get("chatId");

  if (!chatId) {
    const chats = await prisma.chat.findMany({
      where: { userId: session.userId },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, updatedAt: true },
    });
    return NextResponse.json({ chats });
  }

  const query = listSchema.safeParse({
    limit: url.searchParams.get("limit") ?? undefined,
    before: url.searchParams.get("before") ?? undefined,
  });

  const { limit, before } = query.success
    ? query.data
    : { limit: 100, before: undefined as string | undefined };

  const chat = await prisma.chat.findFirst({
    where: { id: chatId, userId: session.userId },
    select: { id: true, title: true, createdAt: true, updatedAt: true },
  });

  if (!chat) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }

  const messagesDesc = await prisma.message.findMany({
    where: {
      chatId: chat.id,
      ...(before ? { createdAt: { lt: new Date(before) } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    select: { id: true, role: true, content: true, createdAt: true },
  });

  const hasMore = messagesDesc.length > limit;
  const page = hasMore ? messagesDesc.slice(0, limit) : messagesDesc;
  const messages = page.reverse();
  const nextCursor = hasMore ? page[page.length - 1]?.createdAt.toISOString() : null;

  return NextResponse.json({
    chat: {
      ...chat,
      messages,
    },
    pagination: {
      hasMore,
      nextCursor,
    },
  });
}

export async function POST(request: Request) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { status: true },
  });
  if (!dbUser || dbUser.status !== "APPROVED") {
    return NextResponse.json({ error: "Account not approved" }, { status: 403 });
  }

  if (!globalLimiter.consume("global")) {
    return NextResponse.json(
      { error: "Service is at capacity. Please try again shortly." },
      { status: 429 },
    );
  }
  if (!userLimiter.consume(session.userId)) {
    return NextResponse.json(
      { error: "Too many messages. Please slow down." },
      { status: 429 },
    );
  }

  let body: z.infer<typeof sendSchema>;
  try {
    body = sendSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  let chatIdForRequest = body.chatId;
  const txResult: ChatRequestState | null = await prisma
    .$transaction(async (tx: Prisma.TransactionClient): Promise<ChatRequestState> => {
      const chat = chatIdForRequest
        ? await tx.chat.findFirst({
            where: { id: chatIdForRequest, userId: session.userId },
            select: { id: true },
          })
        : await tx.chat.create({
            data: {
              title: body.message.slice(0, 60),
              userId: session.userId,
            },
            select: { id: true },
          });

      if (!chat) {
        throw new Error("CHAT_NOT_FOUND");
      }

      chatIdForRequest = chat.id;

      await tx.message.create({
        data: { chatId: chat.id, role: "USER", content: body.message },
      });

      await tx.chat.update({
        where: { id: chat.id },
        data: { updatedAt: new Date() },
      });

      const recentHistoryDesc: HistoryMessage[] = await tx.message.findMany({
        where: { chatId: chat.id },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: { role: true, content: true },
      });

      return {
        chat,
        history: recentHistoryDesc.reverse(),
      };
    })
    .catch((error: unknown): ChatRequestState | null => {
      if (error instanceof Error && error.message === "CHAT_NOT_FOUND") {
        return null;
      }
      throw error;
    });

  if (!txResult) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }

  const chat = txResult.chat;
  const history = txResult.history;

  const openaiMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: "You are a helpful assistant." },
    ...history.map((message) => ({
      role: (message.role === "USER" ? "user" : "assistant") as "user" | "assistant",
      content: message.content,
    })),
  ];

  const encoder = new TextEncoder();
  const chatRef = chat;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      send({ type: "meta", chatId: chatRef.id });

      let fullContent = "";

      try {
        const auth = await resolveAuth();
        const requestedModel = body.model || (await getDefaultModel());
        const providerId = getProviderForModel(requestedModel);
        const providerModel = getProviderModelName(requestedModel);

        if (providerId === "openai") {
          const selectedModel =
            auth.mode === "oauth" && !CHATGPT_OAUTH_SUPPORTED_MODELS.has(providerModel)
              ? "gpt-5-codex"
              : providerModel;

          if (auth.mode === "oauth") {
            const responseStream = await auth.client.responses.create({
              model: selectedModel,
              instructions: "You are a helpful assistant.",
              store: false,
              input: openaiMessages.filter((message) => message.role !== "system").map((message) => ({
                role: message.role as "user" | "assistant",
                content: message.content,
              })),
              stream: true,
            });

            for await (const event of responseStream) {
              if (event.type === "response.output_text.delta" && "delta" in event) {
                const text = (event as { delta: string }).delta;
                if (text) {
                  fullContent += text;
                  send({ type: "chunk", content: text });
                }
              }
            }
          } else if (auth.mode === "apikey") {
            const completion = await auth.client.chat.completions.create({
              model: selectedModel,
              stream: true,
              messages: openaiMessages,
              max_tokens: 4096,
            });

            for await (const chunk of completion) {
              const text = chunk.choices[0]?.delta?.content ?? "";
              if (text) {
                fullContent += text;
                send({ type: "chunk", content: text });
              }
            }
          } else {
            const fallback = `You said: "${body.message}"\n\nNo ChatGPT connection. Ask your admin to connect ChatGPT from the Admin Panel.`;
            for (const word of fallback.split(" ")) {
              const text = `${word} `;
              fullContent += text;
              send({ type: "chunk", content: text });
            }
          }
        } else {
          fullContent = await streamCliProviderResponse({
            providerId,
            model: providerModel,
            prompt: body.message,
            onChunk(text) {
              fullContent += text;
              send({ type: "chunk", content: text });
            },
          });
        }

        const saved = await prisma.message.create({
          data: { chatId: chatRef.id, role: "ASSISTANT", content: fullContent.trim() },
        });
        send({ type: "done", messageId: saved.id });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to generate response";
        send({ type: "error", error: errorMessage });

        if (fullContent.trim()) {
          await prisma.message
            .create({
              data: { chatId: chatRef.id, role: "ASSISTANT", content: fullContent.trim() },
            })
            .catch(() => {});
        }
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

export async function PATCH(request: Request) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { status: true },
  });
  if (!dbUser || dbUser.status !== "APPROVED") {
    return NextResponse.json({ error: "Account not approved" }, { status: 403 });
  }

  let body: z.infer<typeof renameSchema>;
  try {
    body = renameSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const chat = await prisma.chat.findFirst({
    where: { id: body.chatId, userId: session.userId },
    select: { id: true },
  });

  if (!chat) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }

  const updated = await prisma.chat.update({
    where: { id: chat.id },
    data: { title: body.title.trim(), updatedAt: new Date() },
    select: { id: true, title: true, updatedAt: true },
  });

  return NextResponse.json({ chat: updated });
}

export async function DELETE(request: Request) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { status: true },
  });
  if (!dbUser || dbUser.status !== "APPROVED") {
    return NextResponse.json({ error: "Account not approved" }, { status: 403 });
  }

  let body: z.infer<typeof deleteSchema>;
  try {
    body = deleteSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const chat = await prisma.chat.findFirst({
    where: { id: body.chatId, userId: session.userId },
    select: { id: true },
  });

  if (!chat) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }

  await prisma.chat.delete({ where: { id: chat.id } });

  return NextResponse.json({ ok: true });
}
