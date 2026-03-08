"use client";

import { type ReactNode, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  ChevronDown,
  Globe,
  Mic,
  Paperclip,
  Sparkles,
} from "lucide-react";

type ChatInputProps = {
  value: string;
  loading: boolean;
  variant: "hero" | "sticky";
  models: string[];
  selectedModel: string;
  onChange: (value: string) => void;
  onModelChange: (value: string) => void;
  onSubmit: () => void;
  onOpenSavedPrompts: () => void;
};

function ToolbarButton({
  ariaLabel,
  children,
  className = "",
  onClick,
}: {
  ariaLabel: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <motion.button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
      className={`flex h-10 w-10 items-center justify-center rounded-full border border-[#ece6f3] bg-white text-[#5e556d] transition-colors hover:border-[#dccff1] hover:text-[#16131d] ${className}`}
    >
      {children}
    </motion.button>
  );
}

function ComposerShell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-[30px] border border-[#efe8f6] bg-white shadow-[0_26px_70px_rgba(207,198,223,0.34)] ${className}`}
    >
      {children}
    </div>
  );
}

function formatModelLabel(model: string) {
  if (model === "gpt-5-codex") {
    return "GPT-5.4";
  }

  if (model === "gpt-5") {
    return "GPT-5";
  }

  return model || "GPT-5.4";
}

function ModelPicker({
  models,
  selectedModel,
  onChange,
}: {
  models: string[];
  selectedModel: string;
  onChange: (value: string) => void;
}) {
  const availableModels = Array.from(new Set(models.filter(Boolean)));
  const activeModel = selectedModel || availableModels[0] || "gpt-5-codex";

  return (
    <div className="relative min-w-[128px]">
      <Sparkles className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#c2a4ff]" />
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8d8499]" />
      <select
        value={activeModel}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full appearance-none rounded-[16px] border border-[#2a2830] bg-[#1f1d24] pl-9 pr-9 text-[14px] font-medium text-white outline-none transition-colors hover:border-[#3a3643]"
      >
        {availableModels.length > 0 ? (
          availableModels.map((model) => (
            <option key={model} value={model}>
              {formatModelLabel(model)}
            </option>
          ))
        ) : (
          <option value={activeModel}>{formatModelLabel(activeModel)}</option>
        )}
      </select>
    </div>
  );
}

export default function ChatInput(props: ChatInputProps) {
  const {
    value,
    loading,
    variant,
    models,
    selectedModel,
    onChange,
    onModelChange,
    onSubmit,
  } = props;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  useEffect(() => {
    const element = textareaRef.current;
    if (!element) {
      return;
    }

    element.style.height = "auto";
    const maxHeight = variant === "hero" ? 124 : 148;
    element.style.height = `${Math.min(element.scrollHeight, maxHeight)}px`;
  }, [value, variant]);

  if (variant === "hero") {
    return (
      <div className="w-full" style={{ maxWidth: 780 }}>
        <ComposerShell className="rounded-[28px] border-[#f0e8f7] bg-white/92 shadow-[0_18px_45px_rgba(223,214,236,0.26)]">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              onSubmit();
            }}
          >
            <input ref={fileInputRef} type="file" className="hidden" />

            <div style={{ padding: "14px 18px 4px" }}>
              <textarea
                ref={textareaRef}
                rows={1}
                placeholder="Ask me anything..."
                value={value}
                onChange={(event) => onChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    onSubmit();
                  }
                }}
                className="w-full resize-none bg-transparent text-[14px] leading-6 text-[#1e1a28] outline-none placeholder:text-[#b7b0bf]"
                style={{ minHeight: 54 }}
              />
            </div>

            <div
              className="flex flex-wrap items-center justify-between"
              style={{ gap: 12, padding: "8px 14px 14px" }}
            >
              <ModelPicker
                models={models}
                selectedModel={selectedModel}
                onChange={onModelChange}
              />

              <div className="flex flex-wrap items-center justify-end" style={{ gap: 10 }}>
                <ToolbarButton
                  ariaLabel="Attach file or image"
                  className="h-9 w-9 border-transparent shadow-none"
                  onClick={openFilePicker}
                >
                  <Paperclip className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton ariaLabel="Web access" className="h-9 w-9 border-transparent shadow-none">
                  <Globe className="h-4 w-4" />
                </ToolbarButton>
                <motion.button
                  type="submit"
                  aria-label="Send message"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-[#d9c8f7] bg-[linear-gradient(135deg,#d8c5ff,#bda8f4)] text-white shadow-[0_8px_18px_rgba(197,170,242,0.36)] transition-opacity"
                >
                  {loading ? (
                    <div className="h-4.5 w-4.5 animate-spin rounded-full border-2 border-white/35 border-t-white" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </motion.button>
              </div>
            </div>
          </form>
        </ComposerShell>
      </div>
    );
  }

  return (
    <div
      className="sticky bottom-0 z-20 bg-gradient-to-t from-[#faf8fc] via-[#faf8fc]/94 to-transparent"
      style={{ padding: "18px 28px 24px" }}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
        className="mx-auto max-w-[980px]"
      >
        <ComposerShell className="rounded-[34px] border-[#ece6f3] bg-white/92 shadow-[0_18px_55px_rgba(212,202,226,0.26)]">
          <input ref={fileInputRef} type="file" className="hidden" />

          <div className="flex flex-wrap items-center" style={{ gap: 12, padding: "18px 18px" }}>
            <div className="flex items-center" style={{ gap: 10 }}>
              <ToolbarButton ariaLabel="Attach file or image" onClick={openFilePicker}>
                <Paperclip className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton ariaLabel="Web access">
                <Globe className="h-4 w-4" />
              </ToolbarButton>
            </div>

            <ModelPicker
              models={models}
              selectedModel={selectedModel}
              onChange={onModelChange}
            />

            <div
              className="flex min-w-0 flex-1 items-center rounded-[22px] bg-[#f7f4fb]"
              style={{ padding: "12px 18px" }}
            >
              <textarea
                ref={textareaRef}
                rows={1}
                placeholder="Ask anything..."
                value={value}
                onChange={(event) => onChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    onSubmit();
                  }
                }}
                className="min-h-[30px] w-full resize-none bg-transparent text-[15px] leading-7 text-[#1e1a28] outline-none placeholder:text-[#b7b0bf]"
              />
            </div>

            <motion.button
              type="submit"
              aria-label="Send message"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              disabled={loading || !value.trim()}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#d9d2ff,#bedff7)] text-white shadow-[0_12px_25px_rgba(197,170,242,0.35)] transition-opacity disabled:cursor-not-allowed disabled:opacity-45"
            >
              {loading ? (
                <div className="h-4.5 w-4.5 animate-spin rounded-full border-2 border-white/35 border-t-white" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </motion.button>
          </div>
        </ComposerShell>
      </form>
    </div>
  );
}
