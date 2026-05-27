"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Plus, LayoutGrid } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type BoardSummary = {
  id: string;
  name: string;
  emoji: string | null;
  order: number;
  updatedAt: string;
};

type Props = {
  boardId: string;
  boardName: string;
  boardEmoji: string | null;
  editing?: boolean;
  onEditCancel?: () => void;
  onEditSubmit?: (newName: string) => void;
};

const isMac =
  typeof window !== "undefined" && /Mac/i.test(window.navigator.userAgent);
const MOD_KEY = isMac ? "⌘" : "Ctrl+";

export function BoardSwitcher({
  boardId,
  boardName,
  boardEmoji,
  editing = false,
  onEditCancel,
  onEditSubmit,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [creating, setCreating] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(boardName);
  const cancelledRef = useRef(false);

  // Hämta boards vid mount + när boardId ändras (efter navigation)
  useEffect(() => {
    let cancelled = false;
    api
      .listBoards()
      .then((r) => {
        if (!cancelled) setBoards(r.boards);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [boardId]);

  // Stäng vid klick utanför
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // Tangentbordsgenvägar ⌘/Ctrl + 1..9 för att växla board
  useEffect(() => {
    if (editing) return;
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.shiftKey || e.altKey) return;
      const target = document.activeElement;
      // Hoppa över om man skriver i ett textfält
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target as HTMLElement | null)?.isContentEditable
      ) {
        return;
      }
      const num = parseInt(e.key, 10);
      if (isNaN(num) || num < 1 || num > 9) return;
      const targetBoard = boards[num - 1];
      if (!targetBoard) return;
      if (targetBoard.id === boardId) return;
      e.preventDefault();
      router.push(`/board/${targetBoard.id}`);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [boards, boardId, router, editing]);

  // Synka draft när vi går in i edit-läge
  useEffect(() => {
    if (editing) {
      setDraft(boardName);
      cancelledRef.current = false;
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [editing, boardName]);

  const handleSelect = (id: string) => {
    if (id !== boardId) router.push(`/board/${id}`);
    setOpen(false);
  };

  const handleNew = async () => {
    setCreating(true);
    try {
      const name = window.prompt("Namn på den nya boarden:");
      if (!name?.trim()) {
        setCreating(false);
        return;
      }
      const emoji = window.prompt("Emoji (frivilligt):") || undefined;
      const r = await api.createBoard(name.trim(), emoji?.trim());
      setOpen(false);
      router.push(`/board/${r.board.id}`);
    } catch (err) {
      console.error(err);
      alert("Kunde inte skapa boarden.");
    } finally {
      setCreating(false);
    }
  };

  // Inline edit-läge
  if (editing) {
    return (
      <div className="inline-flex items-center gap-2 -ml-2 px-2 py-1.5">
        {boardEmoji ? (
          <span className="text-xl leading-none">{boardEmoji}</span>
        ) : (
          <span className="inline-flex items-center justify-center size-6 rounded-md bg-accent/15 text-accent">
            <LayoutGrid className="size-3.5" />
          </span>
        )}
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            if (cancelledRef.current) return;
            const trimmed = draft.trim();
            if (trimmed && trimmed !== boardName) onEditSubmit?.(trimmed);
            else onEditCancel?.();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              (e.target as HTMLInputElement).blur();
            } else if (e.key === "Escape") {
              cancelledRef.current = true;
              onEditCancel?.();
            }
          }}
          className="text-lg font-semibold bg-muted/40 rounded-md px-2 py-0.5 outline-none ring-2 ring-accent/40 min-w-[14rem]"
        />
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-2 -ml-2 px-2 py-1.5 rounded-lg transition-colors",
          "hover:bg-surface-hover",
          open && "bg-surface-hover"
        )}
      >
        {boardEmoji ? (
          <span className="text-xl leading-none">{boardEmoji}</span>
        ) : (
          <span className="inline-flex items-center justify-center size-6 rounded-md bg-accent/15 text-accent">
            <LayoutGrid className="size-3.5" />
          </span>
        )}
        <span className="text-lg font-semibold truncate max-w-[16rem]">
          {boardName}
        </span>
        <ChevronDown
          className={cn(
            "size-4 text-fg-muted transition-transform duration-150",
            open && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-0 top-full mt-2 min-w-[20rem] card p-2 z-50 shadow-card-hover"
          >
            <div className="px-2.5 pt-1.5 pb-2 text-xs font-semibold text-fg-muted uppercase tracking-wider">
              Dina boards
            </div>

            <div className="space-y-0.5 max-h-80 overflow-y-auto scrollbar-thin">
              {boards.map((b, idx) => {
                const isActive = b.id === boardId;
                return (
                  <button
                    key={b.id}
                    onClick={() => handleSelect(b.id)}
                    className={cn(
                      "relative flex items-center gap-3 w-full pl-3 pr-2.5 py-2.5 rounded-lg text-left transition-colors",
                      "hover:bg-surface-hover"
                    )}
                  >
                    {/* Aktiv-indikator: 3px stapel till vänster */}
                    {isActive && (
                      <span
                        className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-accent"
                        aria-hidden
                      />
                    )}
                    {b.emoji ? (
                      <span className="text-xl leading-none w-7 text-center shrink-0">
                        {b.emoji}
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center size-7 rounded-md bg-muted/60 text-fg-muted shrink-0">
                        <LayoutGrid className="size-3.5" />
                      </span>
                    )}
                    <span
                      className={cn(
                        "flex-1 text-sm truncate",
                        isActive ? "font-semibold text-fg" : "font-medium"
                      )}
                    >
                      {b.name}
                    </span>
                    {idx < 9 && (
                      <span
                        className={cn(
                          "text-xs tabular-nums shrink-0 px-1.5 py-0.5 rounded font-medium",
                          isActive
                            ? "text-accent"
                            : "text-fg-muted/70"
                        )}
                      >
                        {MOD_KEY}
                        {idx + 1}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="h-px bg-border my-1.5" />

            <button
              onClick={handleNew}
              disabled={creating}
              className="flex items-center gap-3 w-full pl-3 pr-2.5 py-2.5 rounded-lg text-sm font-medium hover:bg-surface-hover transition-colors disabled:opacity-50"
            >
              <span className="inline-flex items-center justify-center size-7 rounded-md bg-muted/60 text-fg-muted shrink-0">
                <Plus className="size-4" />
              </span>
              <span className="flex-1 text-left">
                {creating ? "Skapar..." : "Skapa ny board"}
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
