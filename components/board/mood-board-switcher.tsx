"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Images, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api, type MoodBoardSummary } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { NewBoardModal } from "./new-board-modal";

/**
 * Väljare för mood boards, samma form som BoardSwitcher för livsplanen.
 * Mood boards byts inom samma sida (?mood=<id>), inte via routing, så
 * väljaren äger listan och rapporterar vald board uppåt.
 */

const isMac =
  typeof window !== "undefined" && /Mac/i.test(window.navigator.userAgent);
const MOD_KEY = isMac ? "⌘" : "Ctrl+";

export function MoodBoardSwitcher({
  activeId,
  onChange,
}: {
  activeId: string | null;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [boards, setBoards] = useState<MoodBoardSummary[]>([]);
  const [newModalOpen, setNewModalOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .listMoodBoards()
      .then(({ boards }) => setBoards(boards))
      .catch(console.error);
  }, []);

  // Ingen eller okänd board i URL:en: välj den första.
  useEffect(() => {
    if (!boards.length) return;
    if (!activeId || !boards.some((b) => b.id === activeId)) onChange(boards[0].id);
  }, [boards, activeId, onChange]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // ⌘/Ctrl + 1..9 växlar mood board, precis som för livsplanen.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.shiftKey || e.altKey) return;
      const t = document.activeElement;
      if (
        t instanceof HTMLInputElement ||
        t instanceof HTMLTextAreaElement ||
        (t as HTMLElement | null)?.isContentEditable
      )
        return;
      const num = parseInt(e.key, 10);
      const target = boards[num - 1];
      if (!target || target.id === activeId) return;
      e.preventDefault();
      onChange(target.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [boards, activeId, onChange]);

  const active = boards.find((b) => b.id === activeId);

  const handleCreate = async ({ name, emoji }: { name: string; emoji: string | null }) => {
    try {
      const { board } = await api.createMoodBoard(name, emoji);
      setBoards((bs) => [...bs, board]);
      setNewModalOpen(false);
      onChange(board.id);
    } catch (err) {
      console.error(err);
      alert("Kunde inte skapa mood boarden.");
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-1.5 h-9 px-2.5 rounded-lg transition-colors",
          "hover:bg-surface-hover",
          open && "bg-surface-hover"
        )}
      >
        <BoardIcon emoji={active?.emoji ?? null} small />
        <span className="text-sm font-semibold truncate max-w-[16rem]">
          {active?.name ?? "Mood board"}
        </span>
        <ChevronDown
          className={cn(
            "size-3.5 text-fg-muted transition-transform duration-150",
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
            className="absolute left-0 top-full mt-2 min-w-[20rem] card p-2 z-[300] shadow-card-hover"
          >
            <div className="px-2.5 pt-1.5 pb-2 text-xs font-semibold text-fg-muted uppercase tracking-wider">
              Dina mood boards
            </div>

            <div className="space-y-0.5 max-h-80 overflow-y-auto scrollbar-thin">
              {boards.map((b, idx) => {
                const isActive = b.id === activeId;
                return (
                  <button
                    key={b.id}
                    onClick={() => {
                      setOpen(false);
                      onChange(b.id);
                    }}
                    className="relative flex items-center gap-3 w-full pl-3 pr-2.5 py-2.5 rounded-lg text-left transition-colors hover:bg-surface-hover"
                  >
                    {isActive && (
                      <span
                        className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-accent"
                        aria-hidden
                      />
                    )}
                    <BoardIcon emoji={b.emoji} />
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
                          isActive ? "text-accent" : "text-fg-muted/70"
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
              onClick={() => {
                setOpen(false);
                setNewModalOpen(true);
              }}
              className="flex items-center gap-3 w-full pl-3 pr-2.5 py-2.5 rounded-lg text-sm font-medium hover:bg-surface-hover transition-colors"
            >
              <span className="inline-flex items-center justify-center size-7 rounded-md bg-muted/60 text-fg-muted shrink-0">
                <Plus className="size-4" />
              </span>
              <span className="flex-1 text-left">Skapa nytt mood board</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <NewBoardModal
        open={newModalOpen}
        onClose={() => setNewModalOpen(false)}
        onCreate={handleCreate}
        withTemplates={false}
        title="Skapa nytt mood board"
      />
    </div>
  );
}

function BoardIcon({ emoji, small }: { emoji: string | null; small?: boolean }) {
  if (emoji)
    return (
      <span
        className={cn(
          "leading-none text-center shrink-0",
          small ? "text-base" : "text-xl w-7"
        )}
      >
        {emoji}
      </span>
    );
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md shrink-0",
        small ? "size-5 bg-accent/15 text-accent" : "size-7 bg-muted/60 text-fg-muted"
      )}
    >
      <Images className="size-3.5" />
    </span>
  );
}
