"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export const PRESET_EMOJIS = [
  "🌱",
  "✨",
  "🎯",
  "💼",
  "❤️",
  "🏠",
  "📚",
  "🌍",
  "💪",
  "🎨",
] as const;

type Props = {
  open: boolean;
  currentEmoji: string | null;
  onSelect: (emoji: string | null) => void;
  onClose: () => void;
  /** Anchor-position relativt parent (left|right). Default: left */
  align?: "left" | "right";
};

export function EmojiPicker({
  open,
  currentEmoji,
  onSelect,
  onClose,
  align = "left",
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: -4, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.96 }}
          transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            "absolute top-full mt-2 card p-3 z-50 shadow-card-hover w-[16.5rem]",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-fg-muted uppercase tracking-wider">
              Välj emoji
            </span>
            <button
              onClick={() => onSelect(null)}
              className="inline-flex items-center gap-1 text-xs text-fg-muted hover:text-danger transition-colors px-1.5 py-0.5 rounded"
              title="Ta bort emoji"
            >
              <X className="size-3" />
              Ingen
            </button>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {PRESET_EMOJIS.map((emoji) => {
              const isActive = currentEmoji === emoji;
              return (
                <button
                  key={emoji}
                  onClick={() => onSelect(emoji)}
                  className={cn(
                    "inline-flex items-center justify-center size-10 rounded-lg text-2xl leading-none transition-all duration-150 ease-snap",
                    "hover:bg-surface-hover active:scale-90",
                    isActive && "bg-accent/15 ring-2 ring-accent/40"
                  )}
                  title={emoji}
                >
                  {emoji}
                </button>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
