"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Copy, Globe, Link2, Loader2 } from "lucide-react";
import { api, type MoodBoardSummary } from "@/lib/api-client";
import { cn } from "@/lib/utils";

/**
 * Panel för att dela ett mood board via publik länk. Öppnas från
 * tre prickar-menyn och förankras under den. Länken kräver ingen inloggning och
 * visar rymden skrivskyddad. Slås delningen av slutar länken fungera direkt;
 * slås den på igen blir det en ny länk.
 */
export function MoodSharePanel({
  board,
  open,
  onClose,
  onChange,
}: {
  board: MoodBoardSummary;
  open: boolean;
  onClose: () => void;
  onChange: (shareToken: string | null) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const url = board.shareToken
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/share/${board.shareToken}`
    : null;

  const toggle = async (on: boolean) => {
    setBusy(true);
    try {
      const { shareToken } = on
        ? await api.shareMoodBoard(board.id)
        : await api.unshareMoodBoard(board.id);
      onChange(shareToken);
    } catch (err) {
      console.error(err);
      alert("Kunde inte ändra delningen.");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Kopiera länken:", url);
    }
  };

  return (
    <div ref={ref}>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 top-full mt-2 w-[22rem] max-w-[calc(100vw-1.5rem)] card p-4 z-[300] shadow-card-hover"
          >
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "inline-flex items-center justify-center size-9 rounded-lg shrink-0",
                  board.shareToken
                    ? "bg-accent/15 text-accent"
                    : "bg-muted/60 text-fg-muted",
                )}
              >
                {board.shareToken ? (
                  <Globe className="size-4" />
                ) : (
                  <Link2 className="size-4" />
                )}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">
                  {board.shareToken ? "Publik länk är på" : "Dela med en länk"}
                </p>
                <p className="text-xs text-fg-muted mt-0.5">
                  {board.shareToken
                    ? "Alla med länken kan se det här mood boardet, utan att logga in. De kan inte ändra något."
                    : "Skapa en länk som vem som helst kan öppna utan att logga in. De ser rymden men kan inte ändra något."}
                </p>
              </div>
            </div>

            {url ? (
              <>
                <div className="mt-4 flex items-center gap-1.5">
                  <input
                    readOnly
                    value={url}
                    onFocus={(e) => e.currentTarget.select()}
                    className="flex-1 min-w-0 h-9 px-3 rounded-lg bg-muted/40 border border-border text-xs text-fg-muted outline-none focus:ring-2 focus:ring-accent/40"
                  />
                  <button
                    onClick={copy}
                    className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-accent text-accent-fg text-sm font-semibold hover:bg-accent/90 transition-colors shrink-0"
                  >
                    {copied ? (
                      <Check className="size-4" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                    {copied ? "Kopierad" : "Kopiera"}
                  </button>
                </div>
                <button
                  onClick={() => toggle(false)}
                  disabled={busy}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-fg-muted hover:text-danger transition-colors disabled:opacity-50"
                >
                  {busy && <Loader2 className="size-3 animate-spin" />}
                  Sluta dela, länken slutar fungera
                </button>
              </>
            ) : (
              <button
                onClick={() => toggle(true)}
                disabled={busy}
                className="mt-4 flex items-center justify-center gap-2 w-full h-10 rounded-lg bg-accent text-accent-fg text-sm font-semibold hover:bg-accent/90 transition-colors disabled:opacity-60"
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Link2 className="size-4" />
                )}
                Skapa publik länk
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
