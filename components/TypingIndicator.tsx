"use client";

import { motion } from "framer-motion";

const dots = [0, 1, 2];

export default function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 py-1">
      {dots.map((dot) => (
        <motion.span
          key={dot}
          className="h-2.5 w-2.5 rounded-full bg-[#b79af4]"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
          transition={{
            duration: 0.82,
            delay: dot * 0.1,
            ease: "easeInOut",
            repeat: Number.POSITIVE_INFINITY,
          }}
        />
      ))}
    </div>
  );
}
