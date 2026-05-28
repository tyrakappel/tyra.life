"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { GripVertical, Trash2 } from "lucide-react";
import type { Task } from "@/lib/types";
import { InlineEdit } from "./inline-edit";
import { cn } from "@/lib/utils";

type Props = {
  task: Task;
  onToggle: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
  autoEdit?: boolean;
};

export function TaskItem({ task, onToggle, onRename, onDelete, autoEdit }: Props) {
  // Använd _clientKey som dnd-kit-id så identiteten är stabil när task.id
  // byts från tmp_xxx → server-id efter API-svar (annars omregistreras
  // useSortable och vi får en synlig flicker/layout-justering).
  const sortableId = task._clientKey ?? task.id;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: sortableId,
    data: {
      type: "task",
      subcategoryId: task.subcategoryId,
      taskId: task.id,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "group flex items-start gap-2 px-2 py-1.5 rounded-lg",
        "hover:bg-surface-hover/70 transition-colors",
        // När man drar: fadar ut original till en streckad "ghost"-platshållare
        isDragging &&
          "opacity-40 outline outline-2 outline-dashed outline-accent/40 bg-accent/5"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="touch-none cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity pt-0.5 text-fg-muted/60 hover:text-fg-muted"
        aria-label="Dra för att flytta"
      >
        <GripVertical className="size-3.5" />
      </button>

      <input
        type="checkbox"
        checked={task.completed}
        onChange={onToggle}
        className={cn(
          "mt-1 size-4 rounded border-border accent-accent cursor-pointer",
          "transition-transform active:scale-90"
        )}
      />

      <div className="flex-1 min-w-0">
        <InlineEdit
          value={task.title}
          onChange={onRename}
          autoEdit={autoEdit}
          className={cn(
            "text-sm leading-snug",
            task.completed && "line-through text-fg-muted"
          )}
        />
      </div>

      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 text-fg-muted hover:text-danger transition-all p-0.5 rounded"
        aria-label="Ta bort"
      >
        <Trash2 className="size-3.5" />
      </button>
    </motion.div>
  );
}

/**
 * Statiskt renderad version av en task för att visas i en DragOverlay.
 * Skippar useSortable, dnd-kit-listeners, mutation-knappar.
 */
export function TaskOverlayCard({ task }: { task: Task }) {
  return (
    <div className="card flex items-start gap-2 px-2 py-1.5 rounded-lg shadow-xl shadow-accent/30 ring-1 ring-accent/40 cursor-grabbing scale-[1.02] rotate-[0.5deg]">
      <div className="pt-0.5 text-fg-muted">
        <GripVertical className="size-3.5" />
      </div>
      <input
        type="checkbox"
        checked={task.completed}
        readOnly
        className="mt-1 size-4 rounded border-border accent-accent pointer-events-none"
      />
      <div
        className={cn(
          "text-sm leading-snug flex-1",
          task.completed && "line-through text-fg-muted"
        )}
      >
        {task.title}
      </div>
    </div>
  );
}
