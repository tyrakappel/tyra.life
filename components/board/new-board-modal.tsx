"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, LayoutGrid, Loader2 } from "lucide-react";
import { BOARD_TEMPLATES, type BoardTemplateId } from "@/lib/board-templates";
import { PRESET_EMOJIS } from "./emoji-picker";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreate: (input: {
    name: string;
    emoji: string | null;
    template: BoardTemplateId;
  }) => Promise<void>;
};

export function NewBoardModal({ open, onClose, onCreate }: Props) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState<string | null>(null);
  const [busy, setBusy] = useState<BoardTemplateId | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setEmoji(null);
      setBusy(null);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, busy]);

  const submit = async (template: BoardTemplateId) => {
    const trimmed = name.trim();
    if (!trimmed) {
      inputRef.current?.focus();
      return;
    }
    setBusy(template);
    try {
      await onCreate({ name: trimmed, emoji, template });
    } finally {
      setBusy(null);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => !busy && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-2xl card p-7 shadow-card-hover"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              disabled={!!busy}
              className="absolute right-4 top-4 inline-flex items-center justify-center size-8 rounded-lg text-fg-muted hover:text-fg hover:bg-surface-hover transition-colors disabled:opacity-40"
              aria-label="Stäng"
            >
              <X className="size-4" />
            </button>

            <h2 className="text-xl font-bold mb-1">Skapa ny board</h2>
            <p className="text-sm text-fg-muted mb-6">
              Välj namn, emoji och hur du vill börja.
            </p>

            {/* Namn */}
            <div className="mb-5">
              <label className="block text-xs font-semibold text-fg-muted uppercase tracking-wider mb-2">
                Namn
              </label>
              <input
                ref={inputRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="t.ex. Mitt liv 2026"
                disabled={!!busy}
                className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-accent/40 text-base font-medium disabled:opacity-50"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && name.trim()) {
                    e.preventDefault();
                    submit("livshjul");
                  }
                }}
              />
            </div>

            {/* Emoji */}
            <div className="mb-6">
              <label className="block text-xs font-semibold text-fg-muted uppercase tracking-wider mb-2">
                Emoji (valfritt)
              </label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setEmoji(null)}
                  disabled={!!busy}
                  className={cn(
                    "inline-flex items-center justify-center size-10 rounded-lg transition-all duration-150 ease-snap",
                    "hover:bg-surface-hover active:scale-90 disabled:opacity-40",
                    emoji === null && "bg-accent/15 ring-2 ring-accent/40"
                  )}
                  title="Ingen emoji"
                >
                  <X className="size-3.5 text-fg-muted" />
                </button>
                {PRESET_EMOJIS.map((e) => {
                  const active = emoji === e;
                  return (
                    <button
                      key={e}
                      onClick={() => setEmoji(e)}
                      disabled={!!busy}
                      className={cn(
                        "inline-flex items-center justify-center size-10 rounded-lg text-2xl leading-none transition-all duration-150 ease-snap",
                        "hover:bg-surface-hover active:scale-90 disabled:opacity-40",
                        active && "bg-accent/15 ring-2 ring-accent/40"
                      )}
                    >
                      {e}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Template-val */}
            <div>
              <label className="block text-xs font-semibold text-fg-muted uppercase tracking-wider mb-2">
                Hur vill du börja?
              </label>
              <div className="grid grid-cols-2 gap-3">
                <TemplateCard
                  template={BOARD_TEMPLATES.livshjul}
                  onClick={() => submit("livshjul")}
                  busy={busy === "livshjul"}
                  disabled={!!busy || !name.trim()}
                />
                <TemplateCard
                  template={BOARD_TEMPLATES.empty}
                  onClick={() => submit("empty")}
                  busy={busy === "empty"}
                  disabled={!!busy || !name.trim()}
                />
              </div>
              {!name.trim() && (
                <p className="mt-3 text-xs text-fg-muted/70 text-center">
                  Fyll i ett namn för att fortsätta
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function TemplateCard({
  template,
  onClick,
  busy,
  disabled,
}: {
  template: (typeof BOARD_TEMPLATES)[BoardTemplateId];
  onClick: () => void;
  busy: boolean;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group relative flex flex-col items-start text-left p-5 rounded-2xl border-2 transition-all duration-150 ease-snap",
        "border-border bg-surface hover:border-accent/40 hover:bg-accent/5 hover:-translate-y-0.5",
        "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:border-border disabled:hover:bg-surface"
      )}
    >
      <div className="text-3xl leading-none mb-3">{template.emoji}</div>
      <div className="font-bold text-sm mb-1">{template.name}</div>
      <div className="text-xs text-fg-muted leading-snug">
        {template.description}
      </div>
      {template.sections.length > 0 && (
        <div className="mt-3 text-[10px] font-semibold text-accent uppercase tracking-wider inline-flex items-center gap-1">
          <LayoutGrid className="size-3" />
          {template.sections.length} sektioner
        </div>
      )}
      {busy && (
        <div className="absolute inset-0 rounded-2xl bg-surface/80 backdrop-blur-sm flex items-center justify-center">
          <Loader2 className="size-6 text-accent animate-spin" />
        </div>
      )}
    </button>
  );
}
