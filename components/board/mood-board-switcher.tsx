"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Globe,
  Images,
  MoreHorizontal,
  Pencil,
  Plus,
  Share2,
  Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api, type MoodBoardSummary } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { isModOnly, MOD_KEY_LABEL } from "@/lib/shortcuts";
import { NewBoardModal } from "./new-board-modal";
import { Action } from "./board-actions-menu";
import { MoodSharePanel } from "./mood-share-menu";

/**
 * Väljare för mood boards, samma form som BoardSwitcher för livsplanen.
 * Mood boards byts inom samma sida (?mood=<id>), inte via routing, så
 * väljaren äger listan och rapporterar vald board uppåt.
 */

const MOD_KEY = MOD_KEY_LABEL;

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
  const [editOpen, setEditOpen] = useState(false);
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
    if (!activeId || !boards.some((b) => b.id === activeId))
      onChange(boards[0].id);
  }, [boards, activeId, onChange]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // ⌘/Ctrl + 1..9 växlar mood board, precis som för livsplanen.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isModOnly(e)) return;
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

  const handleCreate = async ({
    name,
    emoji,
  }: {
    name: string;
    emoji: string | null;
  }) => {
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

  const handleEdit = async ({
    name,
    emoji,
  }: {
    name: string;
    emoji: string | null;
  }) => {
    if (!active) return;
    try {
      const { board } = await api.updateMoodBoard(active.id, { name, emoji });
      setBoards((bs) => bs.map((b) => (b.id === board.id ? board : b)));
      setEditOpen(false);
    } catch (err) {
      console.error(err);
      alert("Kunde inte spara.");
    }
  };

  const handleDelete = async () => {
    if (!active) return;
    if (boards.length <= 1) {
      alert("Du måste ha minst ett mood board.");
      return;
    }
    if (
      !confirm(
        `Ta bort "${active.name}" och all media på den? Detta går inte att ångra.`,
      )
    )
      return;
    try {
      await api.deleteMoodBoard(active.id);
      const rest = boards.filter((b) => b.id !== active.id);
      setBoards(rest);
      onChange(rest[0].id);
    } catch (err) {
      console.error(err);
      alert("Kunde inte ta bort mood boarden.");
    }
  };

  return (
    <div className="flex items-center gap-0.5 min-w-0">
      <div ref={ref} className="relative min-w-0">
        <button
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "inline-flex items-center gap-1.5 h-9 px-2.5 rounded-lg transition-colors max-w-full",
            "hover:bg-surface-hover",
            open && "bg-surface-hover",
          )}
        >
          <BoardIcon emoji={active?.emoji ?? null} small />
          <span className="text-sm font-semibold truncate max-w-[9rem] sm:max-w-[16rem]">
            {active?.name ?? "Mood board"}
          </span>
          <ChevronDown
            className={cn(
              "size-3.5 text-fg-muted transition-transform duration-150",
              open && "rotate-180",
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
              className="absolute left-0 top-full mt-2 w-[20rem] max-w-[calc(100vw-1.5rem)] card p-2 z-[300] shadow-card-hover"
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
                          isActive ? "font-semibold text-fg" : "font-medium",
                        )}
                      >
                        {b.name}
                      </span>
                      {idx < 9 && (
                        <span
                          className={cn(
                            "text-xs tabular-nums shrink-0 px-1.5 py-0.5 rounded font-medium",
                            isActive ? "text-accent" : "text-fg-muted/70",
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

      {active && (
        <MoodBoardActions
          board={active}
          onEdit={() => setEditOpen(true)}
          onDelete={handleDelete}
          onShareChange={(shareToken) =>
            setBoards((bs) =>
              bs.map((b) => (b.id === active.id ? { ...b, shareToken } : b)),
            )
          }
        />
      )}

      {/* Namn och emoji redigeras i samma modal som när boarden skapades. */}
      <NewBoardModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onCreate={handleEdit}
        withTemplates={false}
        title="Redigera mood board"
        initialName={active?.name ?? ""}
        initialEmoji={active?.emoji ?? null}
        submitLabel="Spara"
      />
    </div>
  );
}

function MoodBoardActions({
  board,
  onEdit,
  onDelete,
  onShareChange,
}: {
  board: MoodBoardSummary;
  onEdit: () => void;
  onDelete: () => void;
  onShareChange: (shareToken: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center justify-center size-9 rounded-lg transition-all duration-150 ease-snap",
          "text-fg-muted hover:text-fg hover:bg-surface-hover active:scale-95",
          open && "bg-surface-hover text-fg",
        )}
        aria-label="Hantera mood board"
        title="Hantera mood board"
      >
        <MoreHorizontal className="size-[18px]" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 sm:right-auto sm:left-0 top-full mt-2 w-[13rem] card p-1.5 z-[300] shadow-card-hover space-y-0.5"
          >
            <Action
              icon={
                board.shareToken ? (
                  <Globe className="size-4 text-accent" />
                ) : (
                  <Share2 className="size-4" />
                )
              }
              label={board.shareToken ? "Delas publikt" : "Dela"}
              onClick={() => {
                setOpen(false);
                setShareOpen(true);
              }}
            />
            <Action
              icon={<Pencil className="size-4" />}
              label="Byt namn och emoji"
              onClick={() => {
                setOpen(false);
                onEdit();
              }}
            />
            <div className="h-px bg-border my-1.5" />
            <Action
              icon={<Trash2 className="size-4" />}
              label="Ta bort mood board"
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
              danger
            />
          </motion.div>
        )}
      </AnimatePresence>
      <MoodSharePanel
        board={board}
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        onChange={onShareChange}
      />
    </div>
  );
}

function BoardIcon({
  emoji,
  small,
}: {
  emoji: string | null;
  small?: boolean;
}) {
  if (emoji)
    return (
      <span
        className={cn(
          "leading-none text-center shrink-0",
          small ? "text-base" : "text-xl w-7",
        )}
      >
        {emoji}
      </span>
    );
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md shrink-0",
        small
          ? "size-5 bg-accent/15 text-accent"
          : "size-7 bg-muted/60 text-fg-muted",
      )}
    >
      <Images className="size-3.5" />
    </span>
  );
}
