"use client";

import { useEffect, useRef, useState } from "react";
import {
  useSortable,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { motion, AnimatePresence } from "framer-motion";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import confetti from "canvas-confetti";

import type { Subcategory } from "@/lib/types";
import { InlineEdit } from "./inline-edit";
import { TaskItem } from "./task-item";
import { cn } from "@/lib/utils";

type Props = {
  sub: Subcategory;
  store: {
    renameSubcategory: (id: string, title: string) => void;
    deleteSubcategory: (id: string) => void;
    addTask: (subId: string, title: string) => void;
    renameTask: (id: string, title: string) => void;
    toggleTask: (id: string) => void;
    deleteTask: (id: string) => void;
    reorderTasks: (subId: string, taskIds: string[]) => void;
  };
  autoEdit?: boolean;
};

export function SubcategoryCard({ sub, store, autoEdit }: Props) {
  const sortableId = sub._clientKey ?? sub.id;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: sortableId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const [adding, setAdding] = useState(false);
  const newTaskRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const prevAllCompleted = useRef(false);

  // Sortera: completed först (åker överst), sedan efter order
  const sorted = [...sub.tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? -1 : 1;
    return a.order - b.order;
  });

  const total = sub.tasks.length;
  const completed = sub.tasks.filter((t) => t.completed).length;
  const allDone = total > 0 && completed === total;

  // Fyrverkeri när sista task bockas av
  useEffect(() => {
    if (allDone && !prevAllCompleted.current && cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      const x = (rect.left + rect.width / 2) / window.innerWidth;
      const y = (rect.top + rect.height / 2) / window.innerHeight;
      confetti({
        particleCount: 60,
        startVelocity: 25,
        spread: 70,
        origin: { x, y },
        scalar: 0.7,
        gravity: 0.8,
        colors: ["#6366f1", "#ec4899", "#22c55e", "#f59e0b", "#0ea5e9"],
      });
    }
    prevAllCompleted.current = allDone;
  }, [allDone]);

  // Använd _clientKey som dnd-id för stabilitet över id-byten
  const taskKey = (t: typeof sorted[number]) => t._clientKey ?? t.id;

  // Gör hela subkategorin droppable så användaren kan släppa en task
  // på den för att flytta över till denna subkategori (inkl. tomma)
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `sub-droppable-${sub._clientKey ?? sub.id}`,
    data: {
      type: "subcategory-drop",
      subcategoryId: sub.id,
    },
  });

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, y: 6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "card p-3 mb-2 group/sub",
        isDragging && "opacity-50 cursor-grabbing",
        allDone && "ring-2 ring-success/40"
      )}
    >
      <div ref={cardRef}>
        <div className="flex items-center gap-1.5 mb-2">
          <button
            {...attributes}
            {...listeners}
            className="touch-none cursor-grab active:cursor-grabbing opacity-0 group-hover/sub:opacity-100 transition-opacity text-fg-muted/60 hover:text-fg-muted"
            aria-label="Dra subkategori"
          >
            <GripVertical className="size-4" />
          </button>
          <div className="flex-1 min-w-0 font-medium text-sm">
            <InlineEdit
              value={sub.title}
              onChange={(v) => store.renameSubcategory(sub.id, v)}
              autoEdit={autoEdit}
            />
          </div>
          <span
            className={cn(
              "text-xs tabular-nums px-1.5 py-0.5 rounded-md transition-colors",
              allDone
                ? "bg-success/20 text-success"
                : "bg-muted text-fg-muted"
            )}
          >
            {completed}/{total}
          </span>
          <button
            onClick={() => store.deleteSubcategory(sub.id)}
            className="opacity-0 group-hover/sub:opacity-100 text-fg-muted hover:text-danger transition-all p-1 rounded"
            aria-label="Ta bort subkategori"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>

        <SortableContext
          items={sorted.map(taskKey)}
          strategy={verticalListSortingStrategy}
        >
          <div
            ref={setDroppableRef}
            className={cn(
              "space-y-0.5 rounded-lg transition-colors min-h-[8px]",
              isOver && sorted.length === 0 && "bg-accent/10 outline-2 outline-dashed outline-accent/40 -mx-1 px-1 py-2",
              isOver && sorted.length > 0 && "bg-accent/5"
            )}
          >
            <AnimatePresence initial={false}>
              {sorted.map((t) => (
                <TaskItem
                  key={t._clientKey ?? t.id}
                  task={t}
                  onToggle={() => store.toggleTask(t.id)}
                  onRename={(title) => store.renameTask(t.id, title)}
                  onDelete={() => store.deleteTask(t.id)}
                />
              ))}
            </AnimatePresence>
            {isOver && sorted.length === 0 && (
              <div className="text-xs text-accent text-center py-1.5 font-medium">
                Släpp för att flytta hit
              </div>
            )}
          </div>
        </SortableContext>

        {adding ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const v = newTaskRef.current?.value.trim();
              if (v) store.addTask(sub.id, v);
              if (newTaskRef.current) newTaskRef.current.value = "";
            }}
            className="mt-1.5 px-2 py-1"
          >
            <input
              ref={newTaskRef}
              autoFocus
              onBlur={() => setAdding(false)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setAdding(false);
              }}
              placeholder="Ny task..."
              className="w-full text-sm bg-muted/40 rounded px-2 py-1 outline-none ring-1 ring-accent/40"
            />
          </form>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="mt-1.5 w-full flex items-center gap-1.5 text-xs text-fg-muted hover:text-fg hover:bg-surface-hover/60 transition-colors rounded px-2 py-1"
          >
            <Plus className="size-3.5" />
            Lägg till task
          </button>
        )}
      </div>
    </motion.div>
  );
}
