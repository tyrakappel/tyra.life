"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Copy, Trash2, SmilePlus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type Props = {
  boardId: string;
  boardName: string;
  boardEmoji: string | null;
  onRename: (name: string) => void;
  onChangeEmoji: (emoji: string | null) => void;
};

export function BoardActionsMenu({
  boardId,
  boardName,
  boardEmoji,
  onRename,
  onChangeEmoji,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
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

  const handleRename = () => {
    setOpen(false);
    const name = window.prompt("Nytt namn på boarden:", boardName);
    if (name && name.trim() && name.trim() !== boardName) onRename(name.trim());
  };

  const handleChangeEmoji = () => {
    setOpen(false);
    const emoji = window.prompt(
      "Ny emoji (lämna tomt för att ta bort):",
      boardEmoji ?? ""
    );
    if (emoji === null) return;
    onChangeEmoji(emoji.trim() || null);
  };

  const handleDuplicate = async () => {
    setBusy("duplicate");
    try {
      const customName = window.prompt("Namn på kopian:", `${boardName} (kopia)`);
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

  const handleDelete = async () => {
    const { boards } = await api.listBoards();
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
          "inline-flex items-center justify-center size-9 rounded-lg transition-all duration-150 ease-snap",
          "text-fg-muted hover:text-fg hover:bg-surface-hover active:scale-95",
          open && "bg-surface-hover text-fg"
        )}
        aria-label="Hantera board"
        title="Hantera board"
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
            className="absolute left-0 top-full mt-2 w-60 card p-1.5 z-50 shadow-card-hover space-y-0.5"
          >
            <Action
              icon={<Pencil className="size-4" />}
              label="Byt namn"
              onClick={handleRename}
            />
            <Action
              icon={<SmilePlus className="size-4" />}
              label={boardEmoji ? "Byt emoji" : "Lägg till emoji"}
              onClick={handleChangeEmoji}
            />
            <Action
              icon={<Copy className="size-4" />}
              label="Duplicera board"
              onClick={handleDuplicate}
              busy={busy === "duplicate"}
            />
            <div className="h-px bg-border my-1.5" />
            <Action
              icon={<Trash2 className="size-4" />}
              label="Ta bort board"
              onClick={handleDelete}
              busy={busy === "delete"}
              danger
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Action({
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
        "flex items-center gap-3 w-full px-2.5 py-2 rounded-lg text-sm transition-colors disabled:opacity-50",
        danger
          ? "text-danger hover:bg-danger/10"
          : "text-fg hover:bg-surface-hover"
      )}
    >
      <span
        className={cn(
          "inline-flex items-center justify-center size-7 rounded-md shrink-0",
          danger ? "text-danger bg-danger/10" : "text-fg-muted bg-muted/60"
        )}
      >
        {icon}
      </span>
      <span className="flex-1 text-left font-medium">
        {busy ? "Arbetar..." : label}
      </span>
    </button>
  );
}
