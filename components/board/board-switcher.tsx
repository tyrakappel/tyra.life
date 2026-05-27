"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Check, Plus, LayoutGrid } from "lucide-react";
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
};

export function BoardSwitcher({ boardId, boardName, boardEmoji }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api
      .listBoards()
      .then((r) => setBoards(r.boards))
      .finally(() => setLoading(false));
  }, [open]);

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
            className="absolute left-0 top-full mt-2 w-72 card p-1.5 z-30 shadow-card-hover"
          >
            <div className="px-2 py-1.5 text-xs font-semibold text-fg-muted uppercase tracking-wider">
              Dina boards
            </div>

            {loading ? (
              <div className="p-4 text-sm text-fg-muted text-center">
                Laddar...
              </div>
            ) : (
              <div className="space-y-0.5 max-h-72 overflow-y-auto scrollbar-thin">
                {boards.map((b) => {
                  const isActive = b.id === boardId;
                  return (
                    <button
                      key={b.id}
                      onClick={() => handleSelect(b.id)}
                      className={cn(
                        "flex items-center gap-2.5 w-full px-2 py-1.5 rounded-lg text-left transition-colors",
                        isActive ? "bg-accent/10" : "hover:bg-surface-hover"
                      )}
                    >
                      {b.emoji ? (
                        <span className="text-base leading-none w-6 text-center shrink-0">
                          {b.emoji}
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center size-6 rounded-md bg-muted text-fg-muted shrink-0">
                          <LayoutGrid className="size-3" />
                        </span>
                      )}
                      <span className="flex-1 text-sm font-medium truncate">
                        {b.name}
                      </span>
                      {isActive && (
                        <Check className="size-4 text-accent shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="h-px bg-border my-1" />

            <button
              onClick={handleNew}
              disabled={creating}
              className="flex items-center gap-2.5 w-full px-2 py-2 rounded-lg text-sm font-medium hover:bg-surface-hover transition-colors disabled:opacity-50"
            >
              <span className="inline-flex items-center justify-center size-6 rounded-md bg-muted text-fg-muted shrink-0">
                <Plus className="size-3.5" />
              </span>
              {creating ? "Skapar..." : "Skapa ny board"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
