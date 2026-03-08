"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Command,
  Compass,
  History,
  Library,
  PanelLeftClose,
  PencilLine,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Trash2,
} from "lucide-react";

export type SidebarSection = "chat" | "history" | "saved" | "settings";

type SavedPrompt = {
  id: string;
  title: string;
  description: string;
  prompt: string;
};

type ChatItem = {
  id: string;
  title: string;
  updatedAt?: string;
};

type SidebarProps = {
  activeSection: SidebarSection;
  chats: ChatItem[];
  activeChatId: string | null;
  savedPrompts: SavedPrompt[];
  userEmail: string;
  userName: string;
  onSectionChange: (section: SidebarSection) => void;
  onNewChat: () => void;
  onOpenChat: (chatId: string) => void;
  onRenameChat: (chatId: string, currentTitle: string) => void;
  onDeleteChat: (chatId: string) => void;
  onUsePrompt: (prompt: string) => void;
  onClose?: () => void;
};

const navItems = [
  { id: "chat", label: "Explore", icon: Compass },
  { id: "saved", label: "Library", icon: Library },
  { id: "settings", label: "Settings", icon: Settings2 },
  { id: "history", label: "History", icon: History },
] as const;

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatGroupLabel(dateString?: string) {
  if (!dateString) {
    return "Earlier";
  }

  const date = new Date(dateString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const difference = Math.round((today.getTime() - target.getTime()) / 86400000);

  if (difference <= 0) {
    return "Today";
  }

  if (difference === 1) {
    return "Yesterday";
  }

  if (difference <= 7) {
    return "7 days";
  }

  return "Earlier";
}

export default function Sidebar({
  activeSection,
  chats,
  activeChatId,
  savedPrompts,
  userEmail,
  userName,
  onSectionChange,
  onNewChat,
  onOpenChat,
  onRenameChat,
  onDeleteChat,
  onUsePrompt,
  onClose,
}: SidebarProps) {
  const [query, setQuery] = useState("");
  const initials = getInitials(userName || "AI");

  const filteredChats = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return chats;
    }

    return chats.filter((chat) => chat.title.toLowerCase().includes(normalizedQuery));
  }, [chats, query]);

  const groupedChats = useMemo(() => {
    const groups = new Map<string, ChatItem[]>();

    filteredChats.forEach((chat) => {
      const label = formatGroupLabel(chat.updatedAt);
      const existing = groups.get(label) ?? [];
      existing.push(chat);
      groups.set(label, existing);
    });

    return Array.from(groups.entries());
  }, [filteredChats]);

  return (
    <aside
      className="flex h-full w-full flex-col border-r border-[#deddd9] bg-[#f3f2f1] text-[#171717]"
      style={{ padding: "18px 16px 16px" }}
    >
      <div className="flex items-center justify-between" style={{ gap: 12, padding: "0 2px" }}>
        <div className="flex min-w-0 items-center" style={{ gap: 10 }}>
          <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#c7b7f6] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
            <Sparkles className="h-4 w-4" strokeWidth={2.1} />
          </div>
          <h1 className="truncate text-[16px] font-semibold tracking-[-0.03em] text-[#20201d]">
            ChatGPT
          </h1>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-[#d9d7d3] bg-[#f8f7f5] text-[#6b6863] transition-colors hover:bg-white hover:text-[#1c1c19]"
            aria-label="Close sidebar"
          >
            <PanelLeftClose className="h-4 w-4" strokeWidth={1.9} />
          </button>
        ) : null}
      </div>

      <motion.button
        type="button"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        onClick={onNewChat}
        className="flex h-10 items-center justify-center gap-2 rounded-[12px] bg-[#111111] text-[15px] font-medium text-white"
        style={{ marginTop: 12 }}
      >
        <Plus className="h-4 w-4" />
        New chat
      </motion.button>

      <div className="relative" style={{ marginTop: 12 }}>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#b7b4af]" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search"
          className="h-10 w-full rounded-[12px] border border-[#e2e0dc] bg-[#faf9f7] text-[14px] text-[#1c1c19] outline-none transition-colors placeholder:text-[#a6a39e] focus:border-[#d3d0ca] focus:bg-white"
          style={{ paddingLeft: 40, paddingRight: 40 }}
        />
        <Command className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#b9ade8]" />
      </div>

      <nav className="flex flex-col" style={{ marginTop: 14, gap: 2 }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === activeSection;

          return (
            <motion.button
              key={item.id}
              type="button"
              whileHover={{ x: 1.5 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSectionChange(item.id)}
              className={`flex h-[38px] w-full items-center rounded-[10px] text-left text-[15px] transition-colors ${
                isActive
                  ? "bg-transparent text-[#171714]"
                  : "text-[#3d3b37] hover:bg-white/70 hover:text-[#171714]"
              }`}
              style={{ gap: 12, padding: "0 10px" }}
            >
              <Icon
                className={`h-4.5 w-4.5 ${isActive ? "text-[#1f1e1b]" : "text-[#383632]"}`}
                strokeWidth={1.9}
              />
              <span className={isActive ? "font-medium" : "font-medium"}>{item.label}</span>
            </motion.button>
          );
        })}
      </nav>

      <div className="h-px bg-[#e1dfdb]" style={{ marginTop: 16 }} />

      <div className="min-h-0 flex-1 overflow-hidden" style={{ marginTop: 16 }}>
        {(activeSection === "chat" || activeSection === "history") && (
          <div className="h-full overflow-y-auto pr-1">
            {groupedChats.length === 0 ? (
              <div className="px-1 text-[14px] text-[#8f8b85]" style={{ paddingTop: 4 }}>
                No conversations yet.
              </div>
            ) : (
              groupedChats.map(([label, items]) => (
                <div key={label} style={{ marginBottom: 18 }}>
                  <p
                    className="text-[11px] font-medium tracking-wide text-[#a9a6a1]"
                    style={{ marginBottom: 8, padding: "0 2px" }}
                  >
                    {label}
                  </p>
                  <div className="flex flex-col">
                    {items.map((chat) => (
                      <div
                        key={chat.id}
                        className={`group rounded-[10px] transition-colors ${
                          chat.id === activeChatId ? "bg-[#ece9e4]" : "hover:bg-white/70"
                        }`}
                        style={{ padding: "0 2px" }}
                      >
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => onOpenChat(chat.id)}
                            className="block w-full truncate rounded-[8px] pr-16 text-left text-[14px] text-[#272623]"
                            style={{ padding: "8px" }}
                            title={chat.title}
                          >
                            {chat.title}
                          </button>
                          <div
                            className="pointer-events-none absolute inset-y-0 right-2 flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100"
                          >
                            <button
                              type="button"
                              aria-label="Rename chat"
                              onClick={() => onRenameChat(chat.id, chat.title)}
                              className="rounded-full p-1.5 text-[#86827c] transition-colors hover:bg-[#eeebe6] hover:text-[#1f1e1b]"
                            >
                              <PencilLine className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              aria-label="Delete chat"
                              onClick={() => onDeleteChat(chat.id)}
                              className="rounded-full p-1.5 text-[#86827c] transition-colors hover:bg-[#f4e8ea] hover:text-[#9c344a]"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeSection === "saved" && (
          <div className="overflow-y-auto pr-1" style={{ display: "grid", gap: 12 }}>
            {savedPrompts.map((prompt) => (
              <motion.button
                key={prompt.id}
                type="button"
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => onUsePrompt(prompt.prompt)}
                className="w-full rounded-[18px] border border-[#e2e0dc] bg-[#faf9f7] text-left shadow-[0_1px_0_rgba(255,255,255,0.7)]"
                style={{ padding: 16 }}
              >
                <p className="text-sm font-semibold text-[#1d1d1a]">{prompt.title}</p>
                <p className="text-sm leading-6 text-[#78756f]" style={{ marginTop: 6 }}>
                  {prompt.description}
                </p>
              </motion.button>
            ))}
          </div>
        )}

        {activeSection === "settings" && (
          <div className="overflow-y-auto pr-1" style={{ display: "grid", gap: 12 }}>
            <div
              className="rounded-[18px] border border-[#e2e0dc] bg-[#faf9f7] shadow-[0_1px_0_rgba(255,255,255,0.7)]"
              style={{ padding: 16 }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#96918a]">
                Main panel
              </p>
              <p className="mt-2 text-sm font-semibold text-[#1d1d1a]">
                Manage account, model, and workspace settings on the right.
              </p>
              <p className="mt-2 text-sm leading-6 text-[#78756f]">
                Use the profile card below to keep this section selected, or return to chats from the navigation list.
              </p>
            </div>
          </div>
        )}
      </div>

      <motion.button
        type="button"
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.99 }}
        onClick={() => onSectionChange("settings")}
        className={`mt-4 flex w-full items-center justify-between rounded-[16px] border px-3 py-3 text-left shadow-[0_1px_0_rgba(255,255,255,0.72)] transition-colors ${
          activeSection === "settings"
            ? "border-[#d8d1e5] bg-white"
            : "border-[#e2e0dc] bg-[#faf9f7] hover:bg-white"
        }`}
      >
        <div className="flex min-w-0 items-center" style={{ gap: 12 }}>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#c4b2f7,#f0d7cb)] text-sm font-semibold text-[#23201c] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold text-[#1d1d1a]">{userName}</p>
            <p className="truncate text-[12px] text-[#8b8781]">{userEmail}</p>
          </div>
        </div>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#e3dfda] bg-white text-[#4a4641]">
          {activeSection === "settings" ? (
            <BadgeCheck className="h-4 w-4" />
          ) : (
            <ArrowRight className="h-4 w-4" />
          )}
        </div>
      </motion.button>
    </aside>
  );
}
