"use client";

import { useRef, useState } from "react";
import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  KeyboardSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { motion, AnimatePresence } from "framer-motion";
import { GripVertical, Plus, MoreHorizontal, Trash2 } from "lucide-react";

import type { Section } from "@/lib/types";
import { InlineEdit } from "./inline-edit";
import { SubcategoryCard } from "./subcategory-card";
import { cn } from "@/lib/utils";
import { resolveSectionColor } from "@/lib/section-palette";

type StoreFns = {
  renameSection: (id: string, title: string) => void;
  setSectionDescription: (id: string, desc: string | null) => void;
  setSectionColor: (id: string, color: string | null) => void;
  deleteSection: (id: string) => void;
  addSubcategory: (sectionId: string, title: string) => void;
  renameSubcategory: (id: string, title: string) => void;
  deleteSubcategory: (id: string) => void;
  reorderSubcategories: (sectionId: string, subIds: string[]) => void;
  addTask: (subId: string, title: string) => void;
  renameTask: (id: string, title: string) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  reorderTasks: (subId: string, taskIds: string[]) => void;
};

type Props = {
  section: Section;
  /** Index i listan av sektioner — för auto-color fallback. */
  index: number;
  store: StoreFns;
};

export function SectionColumn({ section, index, store }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: section.id, data: { type: "section" } });

  const tint = resolveSectionColor(section.color, index);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    // Exponera till CSS — i Spectrum-temat används den för bg + watermark;
    // i andra teman ignoreras den.
    ["--section-tint" as never]: tint,
  };

  const [menuOpen, setMenuOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const newSubRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = section.subcategories.map((s) => s.id);
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    const next = [...ids];
    next.splice(to, 0, next.splice(from, 1)[0]);
    store.reorderSubcategories(section.id, next);
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "section-column card flex flex-col w-[320px] flex-shrink-0 max-h-full relative",
        isDragging && "opacity-60",
        // Lyft hela kolumnen ovanför grannar när menyn är öppen så att
        // dropdown:en inte göms under nästa kolumn
        menuOpen && "z-30"
      )}
    >
      <div
        className="section-column-header flex items-center gap-1.5 p-3 pb-2 sticky top-0 rounded-t-xl z-10"
        style={{
          // I icke-spectrum-teman: smal accent-stripe till vänster.
          // I spectrum-temat: ignoreras av .section-column-header bg-rule.
          boxShadow: `inset 3px 0 0 ${tint}`,
        }}
      >
        <button
          {...attributes}
          {...listeners}
          className="touch-none cursor-grab active:cursor-grabbing text-fg-muted/60 hover:text-fg-muted transition-colors"
          aria-label="Dra kolumn"
        >
          <GripVertical className="size-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">
            <InlineEdit
              value={section.title}
              onChange={(v) => store.renameSection(section.id, v)}
            />
          </div>
          <div className="text-xs text-fg-muted">
            <InlineEdit
              value={section.description || ""}
              onChange={(v) =>
                store.setSectionDescription(section.id, v || null)
              }
              placeholder="lägg till beskrivning"
              allowEmpty
              multiline
            />
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            onBlur={() => setTimeout(() => setMenuOpen(false), 150)}
            className={cn(
              "inline-flex items-center justify-center size-7 rounded-md transition-colors outline-none",
              "text-fg-muted/70 hover:text-fg hover:bg-black/5 dark:hover:bg-white/10",
              menuOpen && "bg-black/5 dark:bg-white/10 text-fg"
            )}
            aria-label="Meny"
          >
            <MoreHorizontal className="size-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 card p-1.5 w-48 z-50 animate-slide-up">
              <button
                onMouseDown={() => {
                  if (confirm(`Ta bort "${section.title}" och allt inom?`)) {
                    store.deleteSection(section.id);
                  }
                  setMenuOpen(false);
                }}
                className="w-full text-left px-2 py-2 text-sm rounded-lg hover:bg-danger/10 text-danger flex items-center gap-2.5 transition-colors"
              >
                <Trash2 className="size-3.5 shrink-0" />
                Ta bort kolumn
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 pt-2 scrollbar-thin relative z-10">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={section.subcategories.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <AnimatePresence initial={false}>
              {section.subcategories.map((sub) => (
                <SubcategoryCard key={sub.id} sub={sub} store={store} />
              ))}
            </AnimatePresence>
          </SortableContext>
        </DndContext>

        {adding ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const v = newSubRef.current?.value.trim();
              if (v) store.addSubcategory(section.id, v);
              if (newSubRef.current) newSubRef.current.value = "";
            }}
          >
            <input
              ref={newSubRef}
              autoFocus
              onBlur={() => setAdding(false)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setAdding(false);
              }}
              placeholder="Ny subkategori..."
              className="w-full text-sm bg-muted/40 rounded px-2 py-1.5 outline-none ring-1 ring-accent/40"
            />
          </form>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="w-full flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg hover:bg-surface-hover/60 transition-colors rounded-lg px-2 py-1.5"
          >
            <Plus className="size-4" />
            Lägg till subkategori
          </button>
        )}
      </div>

    </motion.div>
  );
}
