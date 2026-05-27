"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  Check,
  Plus,
  Copy,
  Pencil,
  Trash2,
  LayoutGrid,
} from "lucide-react";
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
  onRename: (name: string) => void;
  onChangeEmoji: (emoji: string | null) => void;
};

export function BoardSwitcher({
  boardId,
  boardName,
  boardEmoji,
  onRename,
  onChangeEmoji,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
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
    setBusy("new");
    try {
      const name = window.prompt("Namn på den nya boarden:");
      if (!name?.trim()) {
        setBusy(null);
        return;
      }
      const emoji = window.prompt("Emoji för boarden (frivilligt):") || undefined;
      const r = await api.createBoard(name.trim(), emoji?.trim());
      setOpen(false);
      router.push(`/board/${r.board.id}`);
    } catch (err) {
      console.error(err);
      alert("Kunde inte skapa boarden.");
    } finally {
      setBusy(null);
    }
  };

  const handleDuplicate = async () => {
    setBusy("duplicate");
    try {
      const customName = window.prompt(
        "Namn på kopian:",
        `${boardName} (kopia)`
      );
      if (!customName?.trim()) {
        setBusy(null);
        return;
      }
      const r = await api.duplicateBoard(boardId, customName.trim());
      setOpen(false);
      router.push(`/board/${r.id}`);
    } catch (err) {
      console.error(err);
      alert("Kunde inte duplicera boarden.");
    } finally {
      setBusy(null);
    }
  };

  const handleRename = () => {
    const name = window.prompt("Nytt namn på boarden:", boardName);
    if (name && name.trim() && name.trim() !== boardName) {
      onRename(name.trim());
    }
    setOpen(false);
  };

  const handleChangeEmoji = () => {
    const emoji = window.prompt(
      "Ny emoji (lämna tomt för att ta bort):",
      boardEmoji ?? ""
    );
    if (emoji === null) return;
    onChangeEmoji(emoji.trim() || null);
    setOpen(false);
  };

  const handleDelete = async () => {
    if (boards.length <= 1) {
      alert("Du måste ha minst en board.");
      return;
    }
    if (
      !confirm(
        `Ta bort "${boardName}" och allt innehåll? Detta går inte att ångra.`
      )
    )
      return;
    setBusy("delete");
    try {
      await api.deleteBoard(boardId);
      // Hitta en annan board att navigera till
      const other = boards.find((b) => b.id !== boardId);
      setOpen(false);
      if (other) router.push(`/board/${other.id}`);
      else router.push("/");
    } catch (err) {
      console.error(err);
      alert("Kunde inte ta bort boarden.");
    } finally {
      setBusy(null);
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
        <span className="text-lg font-semibold truncate max-w-[14rem]">
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
            className="absolute left-0 top-full mt-2 w-80 card p-2 z-30 shadow-card-hover"
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
                        "flex items-center gap-3 w-full px-2 py-2 rounded-lg text-left transition-colors",
                        isActive
                          ? "bg-accent/10"
                          : "hover:bg-surface-hover"
                      )}
                    >
                      {b.emoji ? (
                        <span className="text-lg leading-none">{b.emoji}</span>
                      ) : (
                        <span className="inline-flex items-center justify-center size-7 rounded-md bg-muted text-fg-muted shrink-0">
                          <LayoutGrid className="size-3.5" />
                        </span>
                      )}
                      <span className="flex-1 truncate">
                        <span className="block text-sm font-medium leading-tight">
                          {b.name}
                        </span>
                        <span className="block text-xs text-fg-muted mt-0.5">
                          Uppdaterad{" "}
                          {new Date(b.updatedAt).toLocaleDateString("sv-SE", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      </span>
                      {isActive && (
                        <Check className="size-4 text-accent shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="h-px bg-border my-1.5" />

            <div className="space-y-0.5">
              <ActionItem
                icon={<Pencil className="size-3.5" />}
                label="Byt namn på denna board"
                onClick={handleRename}
              />
              <ActionItem
                icon={<span className="text-base leading-none">😀</span>}
                label={boardEmoji ? "Byt emoji" : "Lägg till emoji"}
                onClick={handleChangeEmoji}
              />
              <ActionItem
                icon={<Copy className="size-3.5" />}
                label="Duplicera denna board"
                onClick={handleDuplicate}
                busy={busy === "duplicate"}
              />
              <ActionItem
                icon={<Plus className="size-3.5" />}
                label="Skapa ny board"
                onClick={handleNew}
                busy={busy === "new"}
              />
              {boards.length > 1 && (
                <ActionItem
                  icon={<Trash2 className="size-3.5" />}
                  label="Ta bort denna board"
                  onClick={handleDelete}
                  busy={busy === "delete"}
                  danger
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ActionItem({
  icon,
  label,
  onClick,
  busy,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  busy?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={cn(
        "flex items-center gap-2.5 w-full px-2 py-1.5 rounded-lg text-sm transition-colors disabled:opacity-50",
        danger
          ? "text-danger hover:bg-danger/10"
          : "text-fg hover:bg-surface-hover"
      )}
    >
      <span
        className={cn(
          "inline-flex items-center justify-center size-5",
          danger ? "text-danger" : "text-fg-muted"
        )}
      >
        {icon}
      </span>
      <span className="flex-1 text-left">{busy ? "Arbetar..." : label}</span>
    </button>
  );
}
