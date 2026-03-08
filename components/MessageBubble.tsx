"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import TypingIndicator from "@/components/TypingIndicator";

type Message = {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
};

type MessageBubbleProps = {
  message: Message;
  isPending?: boolean;
};

export default function MessageBubble({
  message,
  isPending = false,
}: MessageBubbleProps) {
  const isUser = message.role === "USER";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`flex max-w-[min(72%,860px)] items-start gap-4 ${
          isUser ? "flex-row-reverse" : ""
        }`}
      >
        {!isUser ? (
          <div className="mt-1 hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f1ebfa] text-[#ad90ef] sm:flex">
            <Sparkles className="h-4 w-4" />
          </div>
        ) : null}

        <div className={`flex flex-col gap-2 ${isUser ? "items-end" : "items-start"}`}>
          <span className="px-1 text-[11px] font-semibold uppercase tracking-[0.34em] text-[#9c95a8]">
            {isUser ? "You" : "AI Assistant"}
          </span>

          <div
            className={`rounded-[30px] border px-6 py-4 text-[15px] leading-8 shadow-[0_14px_36px_rgba(221,213,234,0.22)] ${
              isUser
                ? "border-[#bfd9fa] bg-[linear-gradient(135deg,#7994ff,#7bc6f3)] text-white"
                : "border-[#ece6f3] bg-white/96 text-[#2a2533]"
            }`}
          >
            {isPending ? <TypingIndicator /> : message.content}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
