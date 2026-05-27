"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  KeyboardSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, LogOut } from "lucide-react";

import type { Board } from "@/lib/types";
import { createBoardStore } from "@/lib/board-store";
import { SectionColumn } from "./section-column";
import { InlineEdit } from "./inline-edit";
import { ThemeToggle } from "../theme-toggle";
import { useHorizontalScroll } from "./use-horizontal-scroll";

export function BoardView({ initialBoard }: { initialBoard: Board }) {
  // Skapa store en gång per initialBoard.id
  const useStore = useMemo(() => createBoardStore(initialBoard), [initialBoard.id]);
  const board = useStore((s) => s.board);
  const store = useStore();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [addingSection, setAddingSection] = useState(false);
  const newSectionRef = useRef<HTMLInputElement>(null);

  const scrollRef = useHorizontalScroll<HTMLDivElement>();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = board.sections.map((s) => s.id);
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    const next = [...ids];
    next.splice(to, 0, next.splice(from, 1)[0]);
    store.reorderSections(next);
  };

  const activeSection = activeId
    ? board.sections.find((s) => s.id === activeId)
    : null;

  // Keyboard horizontal scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;
      const step = 340;
      if (e.key === "ArrowRight") el.scrollBy({ left: step, behavior: "smooth" });
      else if (e.key === "ArrowLeft") el.scrollBy({ left: -step, behavior: "smooth" });
      else if (e.key === "Home") el.scrollTo({ left: 0, behavior: "smooth" });
      else if (e.key === "End") el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [scrollRef]);

  return (
    <div className="h-screen flex flex-col bg-bg">
      {/* Header */}
      <header className="flex-shrink-0 px-5 py-3 flex items-center gap-3 border-b border-border/60">
        <span className="text-xl">{board.emoji}</span>
        <h1 className="text-lg font-semibold">
          <InlineEdit value={board.name} onChange={(v) => store.renameBoard(v)} />
        </h1>
        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          <a
            href="/api/auth/signout"
            className="btn-ghost size-8 px-0"
            aria-label="Logga ut"
            title="Logga ut"
          >
            <LogOut className="size-4" />
          </a>
        </div>
      </header>

      {/* Board */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-x-auto overflow-y-hidden scroll-x scrollbar-thin"
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={board.sections.map((s) => s.id)}
            strategy={horizontalListSortingStrategy}
          >
            <div className="h-full flex gap-4 px-5 py-4 items-stretch min-w-min">
              <AnimatePresence initial={false}>
                {board.sections.map((section) => (
                  <SectionColumn key={section.id} section={section} store={store} />
                ))}
              </AnimatePresence>

              {/* Add section */}
              <div className="w-[320px] flex-shrink-0">
                {addingSection ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const v = newSectionRef.current?.value.trim();
                      if (v) store.addSection(v);
                      if (newSectionRef.current) newSectionRef.current.value = "";
                    }}
                    className="card p-3"
                  >
                    <input
                      ref={newSectionRef}
                      autoFocus
                      onBlur={() => setAddingSection(false)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") setAddingSection(false);
                      }}
                      placeholder="Kolumnens namn..."
                      className="w-full text-sm bg-muted/40 rounded px-2 py-1.5 outline-none ring-1 ring-accent/40"
                    />
                  </form>
                ) : (
                  <button
                    onClick={() => setAddingSection(true)}
                    className="w-full h-12 flex items-center justify-center gap-1.5 text-sm text-fg-muted hover:text-fg border border-dashed border-border hover:border-fg-muted/40 hover:bg-surface-hover/40 transition-all rounded-xl"
                  >
                    <Plus className="size-4" />
                    Ny kolumn
                  </button>
                )}
              </div>
            </div>
          </SortableContext>

          <DragOverlay>
            {activeSection ? (
              <motion.div
                initial={{ scale: 1 }}
                animate={{ scale: 1.02 }}
                className="card w-[320px] p-3 shadow-card-hover opacity-90"
              >
                <div className="font-semibold text-sm">{activeSection.title}</div>
                <div className="text-xs text-fg-muted mt-0.5">
                  {activeSection.subcategories.length} subkategorier
                </div>
              </motion.div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
