"use client";

import { type CSSProperties, type ReactNode, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  BadgeCheck,
  ChartPie,
  ChevronDown,
  CircleHelp,
  Languages,
  Lightbulb,
  Link2,
  LogOut,
  Menu,
  Paintbrush,
  ShieldCheck,
  Settings2,
  Sparkles,
  SquarePen,
} from "lucide-react";
import ChatInput from "@/components/ChatInput";
import MessageBubble from "@/components/MessageBubble";
import { formatModelLabel } from "@/lib/provider-models";

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

type SidebarSection = "chat" | "history" | "saved" | "settings";
type UserStatus = "PENDING" | "APPROVED" | "REJECTED";

type ProviderStatus = {
  id: "openai" | "gemini" | "claude-code" | "qwen-code";
  label: string;
  connected: boolean;
  enabled: boolean;
};

type AdminConnection = {
  connected: boolean;
  email: string | null;
  plan: string | null;
  expiresAt: string | null;
  models: string[];
  defaultModel: string;
  providers?: ProviderStatus[];
};

type ChatWindowProps = {
  chatId: string | null;
  messages: Message[];
  loading: boolean;
  prompt: string;
  userName: string;
  userEmail: string;
  userRole: "ADMIN" | "USER" | null;
  userStatus: UserStatus | null;
  models: string[];
  selectedModel: string;
  defaultModel: string;
  adminConnection: AdminConnection | null;
  activeSection: SidebarSection;
  savedPrompts: SavedPrompt[];
  onPromptChange: (value: string) => void;
  onSubmit: () => void;
  onNewChat: () => void;
  onOpenSidebar: () => void;
  onOpenSettings: () => void;
  onOpenSavedPrompts: () => void;
  onModelChange: (model: string) => void;
  onUsePrompt: (prompt: string) => void;
  onLogout: () => void;
};

function buildChatExportFileName(messages: Message[]) {
  const firstPrompt =
    messages.find((message) => message.role === "USER" && message.content.trim())?.content ?? "chat";
  const slug = firstPrompt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return `${slug || "chat"}-${new Date().toISOString().slice(0, 10)}.txt`;
}

function buildChatExportText({
  chatId,
  messages,
  model,
}: {
  chatId: string | null;
  messages: Message[];
  model: string;
}) {
  const lines = [
    "Chat export",
    `Exported: ${new Date().toISOString()}`,
    `Model: ${formatModelLabel(model)}`,
    ...(chatId ? [`Chat ID: ${chatId}`] : []),
    "",
  ];

  messages.forEach((message) => {
    lines.push(message.role === "USER" ? "You" : "Assistant");
    lines.push(message.content.trim() || "[empty]");
    lines.push("");
  });

  return lines.join("\n");
}

function ActionButton({
  onClick,
  children,
  className = "",
  style,
  title,
  ariaLabel,
  disabled = false,
}: {
  onClick?: () => void;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  title?: string;
  ariaLabel?: string;
  disabled?: boolean;
}) {
  return (
    <motion.button
      type="button"
      whileHover={disabled ? undefined : { scale: 1.03 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      onClick={onClick}
      title={title}
      aria-label={ariaLabel ?? title}
      disabled={disabled}
      style={{ height: 42, padding: "0 14px", ...style }}
      className={`inline-flex items-center justify-center rounded-xl border border-[#ebe5f0] bg-white text-sm text-[#1f1929] shadow-[0_10px_24px_rgba(233,226,240,0.7)] disabled:cursor-not-allowed disabled:opacity-55 ${className}`}
    >
      {children}
    </motion.button>
  );
}

function GreetingOrb() {
  return (
    <motion.div
      aria-hidden="true"
      className="relative h-[106px] w-[106px]"
      animate={{
        y: [0, -4, 1, -2, 0],
        scale: [1, 1.02, 0.99, 1.02, 1],
      }}
      transition={{
        duration: 6.8,
        ease: "easeInOut",
        repeat: Number.POSITIVE_INFINITY,
      }}
    >
      <motion.div
        className="absolute inset-[16%] rounded-full bg-[#b690f4]/36 blur-[14px]"
        animate={{
          opacity: [0.34, 0.58, 0.34],
          scale: [0.96, 1.06, 0.98],
        }}
        transition={{
          duration: 4.2,
          ease: "easeInOut",
          repeat: Number.POSITIVE_INFINITY,
        }}
      />
      <motion.div
        className="absolute left-[19%] top-[10%] h-[70%] w-[70%] rounded-full border-[3px] border-[#b795f4]/58"
        animate={{
          x: [0, -4, 2, 0],
          y: [0, 3, -2, 0],
          rotate: [22, 32, 18, 22],
          opacity: [0.66, 0.48, 0.66],
        }}
        transition={{
          duration: 4.8,
          ease: "easeInOut",
          repeat: Number.POSITIVE_INFINITY,
        }}
      />
      <motion.div
        className="absolute inset-[22%] rounded-full bg-[radial-gradient(circle_at_38%_30%,rgba(255,255,255,0.98),rgba(240,232,255,0.9)_26%,rgba(217,199,252,0.72)_56%,rgba(183,152,241,0.3)_84%,rgba(183,152,241,0.08)_100%)] shadow-[inset_0_1px_16px_rgba(255,255,255,0.8),0_8px_24px_rgba(185,154,244,0.2)]"
        animate={{
          scale: [1, 1.02, 0.99, 1],
          opacity: [0.96, 1, 0.96],
        }}
        transition={{
          duration: 4,
          ease: "easeInOut",
          repeat: Number.POSITIVE_INFINITY,
        }}
      >
        <motion.div
          className="absolute left-[18%] top-[14%] h-[28%] w-[28%] rounded-full bg-white/55 blur-md"
          animate={{
            x: [0, 2, -1, 0],
            y: [0, -2, 1, 0],
            opacity: [0.45, 0.76, 0.45],
          }}
          transition={{
            duration: 3.2,
            ease: "easeInOut",
            repeat: Number.POSITIVE_INFINITY,
          }}
        />
      </motion.div>
    </motion.div>
  );
}

function PromptCardIcon({ id }: { id: string }) {
  if (id === "synthesize") {
    return <ChartPie className="h-5 w-5" strokeWidth={1.8} />;
  }

  if (id === "brainstorm") {
    return <Lightbulb className="h-5 w-5" strokeWidth={1.8} />;
  }

  return <Paintbrush className="h-5 w-5" strokeWidth={1.8} />;
}

function formatAccessStatus(status: UserStatus | null) {
  if (status === "APPROVED") {
    return "Approved";
  }

  if (status === "REJECTED") {
    return "Rejected";
  }

  return "Pending";
}

function SettingsPanel({
  userName,
  userEmail,
  userRole,
  userStatus,
  models,
  selectedModel,
  defaultModel,
  adminConnection,
  onModelChange,
  onLogout,
}: {
  userName: string;
  userEmail: string;
  userRole: "ADMIN" | "USER" | null;
  userStatus: UserStatus | null;
  models: string[];
  selectedModel: string;
  defaultModel: string;
  adminConnection: AdminConnection | null;
  onModelChange: (model: string) => void;
  onLogout: () => void;
}) {
  const initials = userName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  const availableModels = models.length > 0 ? models : [defaultModel || "gpt-5-codex"];
  const activeModel = selectedModel || defaultModel || availableModels[0];
  const isConnected = Boolean(adminConnection?.connected);
  const expiresLabel = adminConnection?.expiresAt
    ? new Date(adminConnection.expiresAt).toLocaleDateString()
    : "No expiry";
  const activeProviders = (adminConnection?.providers ?? []).filter(
    (provider) => provider.connected && (provider.enabled || provider.id === "openai"),
  );
  const adminCardDescription = userRole === "ADMIN"
    ? "Workspace connection status, plan details, and admin controls."
    : "Workspace connection details managed by your admin.";

  return (
    <div className="flex flex-1 overflow-y-auto px-5 pb-8 pt-5 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1160px] flex-col">
        <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-[#9d96aa]">Settings</p>
            <h2 className="mt-2 text-[34px] font-semibold tracking-[-0.04em] text-[#17131d] sm:text-[42px]">
              Account and preferences
            </h2>
            <p className="mt-2 text-[15px] text-[#7b7488]">
              Manage your profile, active model, and workspace connection settings.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#e8e1f0] bg-white/84 px-3 py-2 text-[13px] font-medium text-[#5d5569]">
              <Sparkles className="h-4 w-4 text-[#a58ce5]" />
              {formatModelLabel(activeModel)}
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#e8e1f0] bg-white/84 px-3 py-2 text-[13px] font-medium text-[#5d5569]">
              <BadgeCheck className="h-4 w-4 text-[#a58ce5]" />
              {formatAccessStatus(userStatus)} access
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
          <div className="space-y-5">
            <div className="rounded-[30px] border border-[#ede7f4] bg-white/88 p-6 shadow-[0_18px_45px_rgba(223,214,236,0.22)]">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#ebe4f3] bg-[#faf8fd] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8e86a0]">
                <Settings2 className="h-3.5 w-3.5" />
                Account
              </div>
              <div className="mt-5 flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#c7b4f6,#eed7cd)] text-[22px] font-semibold text-[#251f2c] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
                  {initials || "AI"}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[24px] font-semibold tracking-[-0.03em] text-[#1d1925]">
                    {userName}
                  </p>
                  <p className="truncate text-[15px] text-[#7b7488]">{userEmail}</p>
                </div>
              </div>
              <div className="mt-6 grid gap-3">
                <div className="rounded-[22px] bg-[#f7f3fb] px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9d96aa]">Role</p>
                  <p className="mt-1 text-[17px] font-semibold text-[#1d1925]">{userRole ?? "USER"}</p>
                </div>
                <div className="rounded-[22px] bg-[#f7f3fb] px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9d96aa]">Access</p>
                  <p className="mt-1 text-[17px] font-semibold text-[#1d1925]">
                    {formatAccessStatus(userStatus)}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[30px] border border-[#ede7f4] bg-white/88 p-6 shadow-[0_18px_45px_rgba(223,214,236,0.22)]">
              <p className="text-[15px] font-semibold text-[#1d1925]">Actions</p>
              <p className="mt-2 text-[14px] leading-6 text-[#7b7488]">
                Manage your current workspace session and open related controls.
              </p>
              {userRole === "ADMIN" ? (
                <a
                  href="/admin"
                  className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[16px] border border-[#ddd5ec] bg-[#faf8fd] px-4 text-[14px] font-semibold text-[#2a2432] transition-colors hover:bg-white"
                >
                  <ShieldCheck className="h-4 w-4 text-[#8b77cd]" />
                  Open admin console
                  <ArrowUpRight className="h-4 w-4 text-[#8b77cd]" />
                </a>
              ) : null}
              <button
                type="button"
                onClick={onLogout}
                className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[16px] border border-[#dfd9ea] bg-white/88 px-4 text-[14px] font-semibold text-[#1d1925] transition-colors hover:bg-white"
              >
                <LogOut className="h-4 w-4" />
                Log out
              </button>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-[30px] border border-[#ede7f4] bg-white/88 p-6 shadow-[0_18px_45px_rgba(223,214,236,0.22)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[15px] font-semibold text-[#1d1925]">Chat model</p>
                  <p className="mt-1 text-[14px] text-[#7b7488]">
                    Select the default experience used in this workspace.
                  </p>
                </div>
                <Sparkles className="h-5 w-5 text-[#a58ce5]" />
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9d96aa]">
                    Active model
                  </label>
                  <div className="relative mt-2">
                    <select
                      value={activeModel}
                      onChange={(event) => onModelChange(event.target.value)}
                      className="h-12 w-full appearance-none rounded-[16px] border border-[#e5dfec] bg-[#fcfbfd] px-4 pr-10 text-[16px] text-[#1d1925] outline-none"
                    >
                      {availableModels.map((model) => (
                        <option key={model} value={model}>
                          {formatModelLabel(model)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8d8499]" />
                  </div>
                  <p className="mt-3 text-[14px] text-[#7b7488]">
                    Default model:{" "}
                    <span className="font-semibold text-[#1d1925]">
                      {formatModelLabel(defaultModel || availableModels[0])}
                    </span>
                  </p>
                </div>

                <div className="rounded-[24px] bg-[linear-gradient(160deg,rgba(245,239,255,0.95),rgba(252,250,255,0.88))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9d96aa]">
                    Workspace default
                  </p>
                  <p className="mt-3 text-[22px] font-semibold tracking-[-0.03em] text-[#1d1925]">
                    {formatModelLabel(defaultModel || availableModels[0])}
                  </p>
                  <p className="mt-2 text-[13px] leading-5 text-[#7b7488]">
                    New chats start with this model until you switch.
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {availableModels.map((model) => (
                  <span
                    key={model}
                    className={`rounded-full border px-3 py-1.5 text-[12px] font-medium ${
                      model === activeModel
                        ? "border-[#cebdf2] bg-[#f2ebff] text-[#8c72cf]"
                        : "border-[#e5dfec] bg-white text-[#6e6878]"
                    }`}
                  >
                    {formatModelLabel(model)}
                  </span>
                ))}
              </div>
            </div>

            {userRole === "ADMIN" ? (
              <div className="rounded-[30px] border border-[#ede7f4] bg-white/88 p-6 shadow-[0_18px_45px_rgba(223,214,236,0.22)]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[15px] font-semibold text-[#1d1925]">Admin connection</p>
                    <p className="mt-1 text-[14px] text-[#7b7488]">
                      {adminCardDescription}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-semibold ${
                      isConnected
                        ? "bg-[#ecf8ef] text-[#2c7a45]"
                        : "bg-[#f7ecee] text-[#a04258]"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        isConnected ? "bg-[#2c7a45]" : "bg-[#a04258]"
                      }`}
                    />
                    {isConnected ? "Connected" : "Disconnected"}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <div className="rounded-[22px] bg-[#f7f3fb] px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9d96aa]">
                      Active providers
                    </p>
                    <p className="mt-1 truncate text-[17px] font-semibold text-[#1d1925]">
                      {activeProviders.length > 0
                        ? activeProviders.map((provider) => provider.label).join(", ")
                        : "Not linked"}
                    </p>
                  </div>
                  <div className="rounded-[22px] bg-[#f7f3fb] px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9d96aa]">
                      ChatGPT account
                    </p>
                    <p className="mt-1 text-[17px] font-semibold text-[#1d1925]">
                      {adminConnection?.email ?? "Not linked"}
                    </p>
                  </div>
                  <div className="rounded-[22px] bg-[#f7f3fb] px-4 py-4 sm:col-span-2 xl:col-span-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9d96aa]">
                      ChatGPT token
                    </p>
                    <p className="mt-1 text-[17px] font-semibold text-[#1d1925]">{expiresLabel}</p>
                  </div>
                </div>

                <a
                  href="/admin"
                  className="mt-6 inline-flex items-center gap-2 rounded-[14px] border border-[#dfd9ea] bg-[#fcfbfd] px-4 py-3 text-[14px] font-semibold text-[#1d1925] transition-colors hover:bg-white"
                >
                  <ShieldCheck className="h-4 w-4 text-[#8b77cd]" />
                  Open admin console
                  <ArrowUpRight className="h-4 w-4 text-[#8b77cd]" />
                </a>
              </div>

            ) : (
              <div className="rounded-[30px] border border-[#ede7f4] bg-white/88 p-6 shadow-[0_18px_45px_rgba(223,214,236,0.22)]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[15px] font-semibold text-[#1d1925]">Workspace connection</p>
                    <p className="mt-1 text-[14px] text-[#7b7488]">{adminCardDescription}</p>
                  </div>
                  <ShieldCheck className="h-5 w-5 text-[#a58ce5]" />
                </div>
                <div className="mt-5 rounded-[22px] bg-[#f7f3fb] px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9d96aa]">
                    Admin connection
                  </p>
                  <p className="mt-2 text-[15px] leading-6 text-[#1d1925]">
                    {isConnected
                      ? "Your workspace admin has an active connection configured for this team."
                      : "No workspace connection is configured yet. Contact your admin if model access is limited."}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChatWindow({
  chatId,
  messages,
  loading,
  prompt,
  userName,
  userEmail,
  userRole,
  userStatus,
  models,
  selectedModel,
  defaultModel,
  adminConnection,
  activeSection,
  savedPrompts,
  onPromptChange,
  onSubmit,
  onNewChat,
  onOpenSidebar,
  onOpenSettings,
  onOpenSavedPrompts,
  onModelChange,
  onUsePrompt,
  onLogout,
}: ChatWindowProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const displayModel = selectedModel || models[0] || "gpt-5-codex";
  const availableModels = Array.from(new Set([displayModel, ...models]));
  const firstName = userName.split(" ")[0] || "Jackson";
  const isSettingsView = activeSection === "settings";
  const exportableMessages = messages.filter((message) => message.content.trim());

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  async function handleCopyChatLink() {
    if (!chatId) {
      return;
    }

    const chatUrl = `${window.location.origin}/chat?chatId=${chatId}`;

    try {
      await navigator.clipboard.writeText(chatUrl);
      window.alert("Chat link copied to clipboard.");
    } catch {
      window.prompt("Copy chat link", chatUrl);
    }
  }

  function handleExportChat() {
    if (exportableMessages.length === 0) {
      return;
    }

    const exportText = buildChatExportText({
      chatId,
      messages: exportableMessages,
      model: displayModel,
    });
    const blob = new Blob([exportText], { type: "text/plain;charset=utf-8" });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = downloadUrl;
    link.download = buildChatExportFileName(exportableMessages);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(downloadUrl);
  }

  return (
    <section className="relative flex min-h-full flex-1 overflow-hidden rounded-[32px] bg-[#fcfbfd]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(212,194,244,0.48),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(206,236,255,0.55),transparent_26%)]" />

      <div className="relative flex min-h-full w-full flex-col">
        {isSettingsView ? (
          <header
            className="flex items-center justify-between lg:hidden"
            style={{ padding: "18px 20px 0" }}
          >
            <ActionButton onClick={onOpenSidebar} style={{ width: 42, padding: 0 }}>
              <span className="sr-only">Open sidebar</span>
              <Menu className="h-5 w-5" />
            </ActionButton>

            <div className="inline-flex items-center gap-2 rounded-full border border-[#e8e1f0] bg-white/90 px-3 py-2 text-[13px] font-medium text-[#5d5569]">
              <BadgeCheck className="h-4 w-4 text-[#a58ce5]" />
              {formatAccessStatus(userStatus)}
            </div>
          </header>
        ) : (
          <header
            className="flex items-center justify-between"
            style={{ padding: "18px 24px 10px" }}
          >
            <div className="flex items-center" style={{ gap: 12 }}>
              <ActionButton
                onClick={onOpenSidebar}
                className="lg:hidden"
                style={{ width: 42, padding: 0 }}
              >
                <span className="sr-only">Open sidebar</span>
                <Menu className="h-5 w-5" />
              </ActionButton>

              <div className="relative">
                <Sparkles className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#b798ef]" />
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8d8499]" />
                <select
                  value={displayModel}
                  onChange={(event) => onModelChange(event.target.value)}
                  style={{ height: 42, paddingLeft: 38, paddingRight: 38 }}
                  className="appearance-none rounded-xl border border-[#ebe5f0] bg-white text-sm font-medium text-[#1f1929] shadow-[0_10px_24px_rgba(233,226,240,0.7)] outline-none"
                >
                  {availableModels.map((model) => (
                    <option key={model} value={model}>
                      {formatModelLabel(model)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="hidden items-center md:flex" style={{ gap: 10 }}>
              <ActionButton
                onClick={() => {
                  void handleCopyChatLink();
                }}
                style={{ width: 42, padding: 0 }}
                title={chatId ? "Copy chat link" : "Open or create a chat to copy its link"}
                ariaLabel="Copy chat link"
                disabled={!chatId}
              >
                <Link2 className="h-4 w-4" />
              </ActionButton>
              <ActionButton
                onClick={handleExportChat}
                className="gap-2"
                title={
                  exportableMessages.length > 0 ? "Export chat" : "Start a chat to export it"
                }
                disabled={exportableMessages.length === 0}
              >
                <SquarePen className="h-4 w-4" />
                Export chat
              </ActionButton>
            </div>

            <div className="flex items-center md:hidden" style={{ gap: 10 }}>
              <ActionButton onClick={onNewChat} style={{ width: 42, padding: 0 }}>
                <SquarePen className="h-4 w-4" />
              </ActionButton>
              <ActionButton onClick={onOpenSettings} style={{ width: 42, padding: 0 }}>
                <Settings2 className="h-4 w-4" />
              </ActionButton>
            </div>
          </header>
        )}

        {isSettingsView ? (
          <SettingsPanel
            userName={userName}
            userEmail={userEmail}
            userRole={userRole}
            userStatus={userStatus}
            models={models}
            selectedModel={selectedModel}
            defaultModel={defaultModel}
            adminConnection={adminConnection}
            onModelChange={onModelChange}
            onLogout={onLogout}
          />
        ) : messages.length === 0 ? (
          <div className="flex flex-1 justify-center overflow-hidden px-5 pb-3">
            <div
              className="flex min-h-full w-full flex-col items-center text-center"
              style={{ maxWidth: 980, paddingTop: 8 }}
            >
              <GreetingOrb />

              <p
                className="text-[22px] font-semibold tracking-tight text-[#c3a7f1] md:text-[24px]"
                style={{ marginTop: 16 }}
              >
                Hello, {firstName}
              </p>
              <h2
                className="text-[34px] font-semibold leading-[1.02] tracking-[-0.04em] text-[#111111] md:text-[50px]"
                style={{ marginTop: 4, maxWidth: 700 }}
              >
                How can I assist you today?
              </h2>

              <div className="flex w-full justify-center" style={{ marginTop: 22 }}>
                <ChatInput
                  value={prompt}
                  loading={loading}
                  variant="hero"
                  models={availableModels}
                  selectedModel={displayModel}
                  onChange={onPromptChange}
                  onModelChange={onModelChange}
                  onSubmit={onSubmit}
                  onOpenSavedPrompts={onOpenSavedPrompts}
                />
              </div>

              <div
                className="grid w-full md:grid-cols-3"
                style={{ maxWidth: 940, marginTop: 16, gap: 14 }}
              >
                {savedPrompts.map((promptItem) => (
                  <motion.button
                    key={promptItem.id}
                    type="button"
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => onUsePrompt(promptItem.prompt)}
                    className="rounded-[22px] border border-[#f0ecf5] bg-white/84 text-left shadow-[0_8px_22px_rgba(233,226,240,0.22)]"
                    style={{ padding: 18, minHeight: 126 }}
                  >
                    <div className="text-[#29252f]">
                      <PromptCardIcon id={promptItem.id} />
                    </div>
                    <p className="text-[15px] font-semibold text-[#17111f]" style={{ marginTop: 18 }}>
                      {promptItem.title}
                    </p>
                    <p className="text-[13px] leading-5 text-[#a19aaa]" style={{ marginTop: 6 }}>
                      {promptItem.description}
                    </p>
                  </motion.button>
                ))}
              </div>

              <div
                className="mt-auto flex w-full items-center"
                style={{ maxWidth: 940, paddingTop: 18 }}
              >
                <div className="w-[88px]" />
                <p className="flex-1 text-center text-[11px] text-[#a39cab]">
                  Join the various community for more insights{" "}
                  <a href="#" className="text-[#a886f0] underline underline-offset-2">
                    Join Discord
                  </a>
                </p>
                <div className="flex items-center justify-end" style={{ width: 88, gap: 10 }}>
                  <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e8e1f0] bg-white/84 text-[#534b61]"
                  >
                    <Languages className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e8e1f0] bg-white/84 text-[#534b61]"
                  >
                    <CircleHelp className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto" style={{ padding: "18px 28px 24px" }}>
              <div className="mx-auto flex w-full max-w-[980px] flex-col" style={{ gap: 30 }}>
                <AnimatePresence initial={false} mode="popLayout">
                  {messages.map((message, index) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      isPending={
                        loading &&
                        message.role === "ASSISTANT" &&
                        !message.content &&
                        index === messages.length - 1
                      }
                    />
                  ))}
                </AnimatePresence>
                <div ref={endRef} />
              </div>
            </div>

            <ChatInput
              value={prompt}
              loading={loading}
              variant="sticky"
              models={availableModels}
              selectedModel={displayModel}
              onChange={onPromptChange}
              onModelChange={onModelChange}
              onSubmit={onSubmit}
              onOpenSavedPrompts={onOpenSavedPrompts}
            />
          </>
        )}
      </div>
    </section>
  );
}
