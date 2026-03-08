"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import ChatWindow from "@/components/ChatWindow";
import Sidebar, { type SidebarSection } from "@/components/Sidebar";

type ChatItem = {
  id: string;
  title: string;
  updatedAt?: string;
};

type Message = {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
};

type SavedPrompt = {
  id: string;
  title: string;
  description: string;
  prompt: string;
};

type SessionUser = {
  id?: string;
  userId?: string;
  email: string;
  role: "ADMIN" | "USER";
  status?: "PENDING" | "APPROVED" | "REJECTED";
  createdAt?: string;
};

type AdminConnection = {
  connected: boolean;
  email: string | null;
  plan: string | null;
  expiresAt: string | null;
  models: string[];
  defaultModel: string;
};

const savedPrompts: SavedPrompt[] = [
  {
    id: "synthesize",
    title: "Synthesize Data",
    description: "Turn my meeting notes into 5 key bullet points for the team.",
    prompt:
      "Synthesize these notes into five concise takeaways with clear action items and owners.",
  },
  {
    id: "brainstorm",
    title: "Creative Brainstorm",
    description: "Generate 3 taglines for a new sustainable fashion brand.",
    prompt:
      "Generate three strong premium creative directions for an AI product landing page, with a short rationale for each.",
  },
  {
    id: "facts",
    title: "Check Facts",
    description: "Compare key differences between GDPR and CCPA.",
    prompt:
      "Check the key assumptions in this proposal, flag weak claims, and suggest stronger alternatives.",
  },
];

function toDisplayName(email: string) {
  return email
    .split("@")[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join(" ");
}

export default function ChatPage() {
  const router = useRouter();
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState("guest@assistant.local");
  const [userName, setUserName] = useState("Guest User");
  const [userRole, setUserRole] = useState<"ADMIN" | "USER" | null>(null);
  const [userStatus, setUserStatus] = useState<"PENDING" | "APPROVED" | "REJECTED" | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [defaultModel, setDefaultModel] = useState("gpt-5-codex");
  const [adminConnection, setAdminConnection] = useState<AdminConnection | null>(null);
  const [activeSection, setActiveSection] = useState<SidebarSection>("chat");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const syncChatUrl = useCallback((nextChatId: string | null) => {
    if (typeof window === "undefined") {
      return;
    }

    const url = new URL(window.location.href);

    if (nextChatId) {
      url.searchParams.set("chatId", nextChatId);
    } else {
      url.searchParams.delete("chatId");
    }

    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);

  const loadSession = useCallback(async () => {
    const sessionResponse = await fetch("/api/auth/me");
    if (!sessionResponse.ok) {
      router.push("/login");
      return false;
    }

    const sessionData = await sessionResponse.json();
    const sessionUser = sessionData.user as SessionUser;
    const email = sessionUser.email;
    setUserEmail(email);
    setUserName(toDisplayName(email));
    setUserRole(sessionUser.role);
    setUserStatus(sessionUser.status ?? null);

    const modelsResponse = await fetch("/api/models");
    if (modelsResponse.ok) {
      const modelsData = await modelsResponse.json();
      const nextModels = modelsData.models ?? [];
      setModels(nextModels);
      setDefaultModel(modelsData.defaultModel || nextModels[0] || "gpt-5-codex");
      setSelectedModel(modelsData.defaultModel || nextModels[0] || "gpt-5-codex");
    }

    if (sessionUser.role === "ADMIN") {
      const adminResponse = await fetch("/api/admin/oauth");
      if (adminResponse.ok) {
        const adminData = (await adminResponse.json()) as AdminConnection;
        setAdminConnection(adminData);
        if (adminData.models.length > 0) {
          setModels(adminData.models);
        }
        if (adminData.defaultModel) {
          setDefaultModel(adminData.defaultModel);
          setSelectedModel((current) => current || adminData.defaultModel);
        }
      } else {
        setAdminConnection(null);
      }
    } else {
      setAdminConnection(null);
    }

    return true;
  }, [router]);

  const loadChats = useCallback(async () => {
    const response = await fetch("/api/chat");
    if (!response.ok) {
      return;
    }

    const data = await response.json();
    setChats(data.chats ?? []);
  }, []);

  const loadMessages = useCallback(async (nextChatId: string) => {
    const response = await fetch(`/api/chat?chatId=${nextChatId}`);
    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    setMessages(data.chat.messages ?? []);
    return true;
  }, []);

  useEffect(() => {
    const initialize = async () => {
      const ready = await loadSession();
      if (ready) {
        await loadChats();

        const requestedChatId = new URLSearchParams(window.location.search).get("chatId");
        if (requestedChatId) {
          const opened = await loadMessages(requestedChatId);
          if (opened) {
            setChatId(requestedChatId);
            setActiveSection("history");
          } else {
            syncChatUrl(null);
          }
        }
      }
    };

    void initialize();
  }, [loadChats, loadMessages, loadSession, syncChatUrl]);

  const streamMessage = useCallback(
    async (messageText: string) => {
      if (!messageText.trim() || loading) {
        return;
      }

      setLoading(true);
      setActiveSection("chat");

      const currentPrompt = messageText.trim();
      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "USER",
        content: currentPrompt,
      };
      const assistantMessageId = crypto.randomUUID();

      setMessages((current) => [
        ...current,
        userMessage,
        { id: assistantMessageId, role: "ASSISTANT", content: "" },
      ]);
      setPrompt("");

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatId: chatId ?? undefined,
            message: currentPrompt,
            model: selectedModel || undefined,
          }),
        });

        if (!response.ok) {
          let errorMessage = "Something went wrong.";
          try {
            const data = await response.json();
            errorMessage = data.error || errorMessage;
          } catch {
            /* ignore malformed JSON */
          }

          setMessages((current) =>
            current.map((message) =>
              message.id === assistantMessageId
                ? { ...message, content: `Error: ${errorMessage}` }
                : message,
            ),
          );
          setLoading(false);
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("Missing response stream");
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";

          for (const part of parts) {
            if (!part.startsWith("data: ")) {
              continue;
            }

            try {
              const data = JSON.parse(part.slice(6));

              if (data.type === "meta") {
                setChatId(data.chatId);
                syncChatUrl(data.chatId);
              } else if (data.type === "chunk") {
                setMessages((current) =>
                  current.map((message) =>
                    message.id === assistantMessageId
                      ? { ...message, content: message.content + data.content }
                      : message,
                  ),
                );
              } else if (data.type === "done") {
                setMessages((current) =>
                  current.map((message) =>
                    message.id === assistantMessageId
                      ? { ...message, id: data.messageId }
                      : message,
                  ),
                );
              } else if (data.type === "error") {
                setMessages((current) =>
                  current.map((message) =>
                    message.id === assistantMessageId
                      ? {
                          ...message,
                          content: message.content || `Error: ${data.error}`,
                        }
                      : message,
                  ),
                );
              }
            } catch {
              /* ignore malformed chunks */
            }
          }
        }

        await loadChats();
      } catch {
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantMessageId
              ? { ...message, content: "Network error. Please try again." }
              : message,
          ),
        );
      }

      setLoading(false);
    },
    [chatId, loadChats, loading, selectedModel, syncChatUrl],
  );

  const handleNewChat = useCallback(() => {
    setChatId(null);
    setMessages([]);
    setPrompt("");
    setActiveSection("chat");
    setIsSidebarOpen(false);
    syncChatUrl(null);
  }, [syncChatUrl]);

  const handleUsePrompt = useCallback((nextPrompt: string) => {
    setPrompt(nextPrompt);
    setActiveSection("chat");
    setIsSidebarOpen(false);
  }, []);

  const handleSectionChange = useCallback((section: SidebarSection) => {
    setActiveSection(section);
    if (window.matchMedia("(max-width: 1279px)").matches) {
      setIsSidebarOpen(false);
    }
  }, []);

  const handleOpenSettings = useCallback(() => {
    setActiveSection("settings");
    if (window.matchMedia("(max-width: 1279px)").matches) {
      setIsSidebarOpen(true);
    }
  }, []);

  const handleOpenSavedPrompts = useCallback(() => {
    setActiveSection("saved");
    if (window.matchMedia("(max-width: 1279px)").matches) {
      setIsSidebarOpen(true);
    }
  }, []);

  async function openChat(nextChatId: string) {
    const opened = await loadMessages(nextChatId);
    if (!opened) {
      return;
    }

    setChatId(nextChatId);
    setActiveSection("history");
    setIsSidebarOpen(false);
    syncChatUrl(nextChatId);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  async function renameChat(targetChatId: string, currentTitle: string) {
    const nextTitle = window.prompt("Rename chat", currentTitle)?.trim();
    if (!nextTitle || nextTitle === currentTitle) {
      return;
    }

    const response = await fetch("/api/chat", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId: targetChatId, title: nextTitle }),
    });

    if (response.ok) {
      await loadChats();
    }
  }

  async function deleteChat(targetChatId: string) {
    const confirmed = window.confirm("Delete this chat history permanently?");
    if (!confirmed) {
      return;
    }

    const response = await fetch("/api/chat", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId: targetChatId }),
    });

    if (response.ok) {
      if (chatId === targetChatId) {
        setChatId(null);
        setMessages([]);
        syncChatUrl(null);
      }
      await loadChats();
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#efe9f6]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(203,182,241,0.7),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(182,222,248,0.55),transparent_22%),linear-gradient(180deg,#f3eef8_0%,#f0ebf6_100%)]" />
      <div className="pointer-events-none absolute left-[-10%] top-[6%] h-[24rem] w-[24rem] rounded-full bg-white/70 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-10%] right-[-6%] h-[22rem] w-[22rem] rounded-full bg-[#d9edf9] blur-[120px]" />

      <div className="relative flex min-h-screen w-full items-center justify-center px-1.5 py-1.5 sm:px-2 sm:py-2">
        <div
          className="relative flex h-full w-full overflow-hidden rounded-[30px] border border-white/65 bg-white/55 shadow-[0_35px_110px_rgba(187,177,204,0.38)] backdrop-blur-xl"
          style={{ minHeight: "calc(100dvh - 12px)" }}
        >
          <div className="hidden w-[286px] shrink-0 border-r border-white/35 lg:block">
            <Sidebar
              activeSection={activeSection}
              chats={chats}
              activeChatId={chatId}
              savedPrompts={savedPrompts}
              userEmail={userEmail}
              userName={userName}
              onSectionChange={handleSectionChange}
              onNewChat={handleNewChat}
              onOpenChat={openChat}
              onRenameChat={renameChat}
              onDeleteChat={deleteChat}
              onUsePrompt={handleUsePrompt}
            />
          </div>

          <AnimatePresence>
            {isSidebarOpen ? (
              <>
                <motion.button
                  type="button"
                  aria-label="Close sidebar overlay"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsSidebarOpen(false)}
                  className="fixed inset-0 z-40 bg-[#1f1a27]/12 backdrop-blur-sm lg:hidden"
                />
                <motion.div
                  initial={{ x: -28, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -28, opacity: 0 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="fixed z-50 overflow-hidden rounded-r-[28px] shadow-[0_35px_110px_rgba(187,177,204,0.38)] lg:hidden"
                  style={{
                    top: 20,
                    bottom: 20,
                    left: 20,
                    width: "min(242px, calc(100vw - 40px))",
                  }}
                >
                  <Sidebar
                    activeSection={activeSection}
                    chats={chats}
                    activeChatId={chatId}
                    savedPrompts={savedPrompts}
                    userEmail={userEmail}
                    userName={userName}
                    onSectionChange={handleSectionChange}
                    onNewChat={handleNewChat}
                    onOpenChat={openChat}
                    onRenameChat={renameChat}
                    onDeleteChat={deleteChat}
                    onUsePrompt={handleUsePrompt}
                    onClose={() => setIsSidebarOpen(false)}
                  />
                </motion.div>
              </>
            ) : null}
          </AnimatePresence>

          <ChatWindow
            chatId={chatId}
            messages={messages}
            loading={loading}
            prompt={prompt}
            userName={userName}
            models={models}
            selectedModel={selectedModel}
            activeSection={activeSection}
            savedPrompts={savedPrompts}
            userEmail={userEmail}
            userRole={userRole}
            userStatus={userStatus}
            defaultModel={defaultModel}
            adminConnection={adminConnection}
            onPromptChange={setPrompt}
            onSubmit={() => {
              void streamMessage(prompt);
            }}
            onNewChat={handleNewChat}
            onOpenSidebar={() => setIsSidebarOpen(true)}
            onOpenSettings={handleOpenSettings}
            onOpenSavedPrompts={handleOpenSavedPrompts}
            onModelChange={setSelectedModel}
            onUsePrompt={handleUsePrompt}
            onLogout={logout}
          />
        </div>
      </div>
    </main>
  );
}
