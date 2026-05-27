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
import { api } from "@/lib/api-client";
import { snapshotToBoard } from "@/lib/snapshot-to-board";
import type { SnapshotData } from "@/lib/snapshot";
import { SectionColumn } from "./section-column";
import { useHorizontalScroll } from "./use-horizontal-scroll";
import { useBoardPan } from "./use-board-pan";
import { VersionMenu } from "./version-menu";
import { PreviewBanner } from "./preview-banner";
import { ReadOnlyBoard } from "./read-only-board";
import { ColorThemeMenu } from "../color-theme-menu";
import { BoardSwitcher } from "./board-switcher";
import { BoardActionsMenu } from "./board-actions-menu";
import { ViewToggle, type ViewMode } from "./view-toggle";
import { LifeCurveView } from "./life-curve-view";

export function BoardView({ initialBoard }: { initialBoard: Board }) {
  // Skapa store en gång per initialBoard.id
  const useStore = useMemo(() => createBoardStore(initialBoard), [initialBoard.id]);
  const board = useStore((s) => s.board);
  const store = useStore();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [addingSection, setAddingSection] = useState(false);
  const [editingName, setEditingName] = useState(false);

  // ViewMode synkad mot URL ?view=plan|curve så reload behåller flik.
  // Använder window.location direkt + history.replaceState för att undvika
  // SSR-pre-render-mismatches med useSearchParams.
  const [viewMode, setViewModeInternal] = useState<ViewMode>("plan");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("view") === "curve") setViewModeInternal("curve");

    // Lyssna på back/forward navigation
    const onPop = () => {
      const p = new URLSearchParams(window.location.search);
      setViewModeInternal(p.get("view") === "curve" ? "curve" : "plan");
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const setViewMode = (next: ViewMode) => {
    setViewModeInternal(next);
    const params = new URLSearchParams(window.location.search);
    if (next === "plan") params.delete("view");
    else params.set("view", next);
    const qs = params.toString();
    const url = qs
      ? `${window.location.pathname}?${qs}`
      : window.location.pathname;
    window.history.replaceState({}, "", url);
  };

  const newSectionRef = useRef<HTMLInputElement>(null);

  // Preview-läge
  const [previewSnapshot, setPreviewSnapshot] = useState<{
    id: string;
    label: string | null;
    createdAt: string;
    data: SnapshotData;
  } | null>(null);
  const [restoring, setRestoring] = useState(false);

  const scrollRef = useHorizontalScroll<HTMLDivElement>();
  useBoardPan(scrollRef);

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

  // Auto-snapshot: debounced ~2s efter senaste ändring av board-state.
  // Endpoint:en upsertar — det finns alltid bara EN auto-snapshot per board.
  useEffect(() => {
    if (previewSnapshot) return; // pausa under förhandsgranskning
    const timer = setTimeout(() => {
      api.autoSnapshot(board.id).catch(() => {});
    }, 2000);
    return () => clearTimeout(timer);
  }, [board, previewSnapshot]);

  // Keyboard horizontal scroll (bara live-läge)
  useEffect(() => {
    if (previewSnapshot) return;
    const el = scrollRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      )
        return;
      const step = 340;
      if (e.key === "ArrowRight") el.scrollBy({ left: step, behavior: "smooth" });
      else if (e.key === "ArrowLeft") el.scrollBy({ left: -step, behavior: "smooth" });
      else if (e.key === "Home") el.scrollTo({ left: 0, behavior: "smooth" });
      else if (e.key === "End") el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [scrollRef, previewSnapshot]);

  const handlePreview = async (snapshotId: string | null) => {
    if (!snapshotId) {
      setPreviewSnapshot(null);
      return;
    }
    try {
      const r = await api.getSnapshot(board.id, snapshotId);
      setPreviewSnapshot({
        id: r.snapshot.id,
        label: r.snapshot.label,
        createdAt: r.snapshot.createdAt,
        data: r.snapshot.data,
      });
    } catch (err) {
      console.error("Failed to load snapshot", err);
      alert("Kunde inte ladda versionen.");
    }
  };

  const handleRestore = async () => {
    if (!previewSnapshot) return;
    if (
      !confirm(
        "Ersätt nuvarande liveversion med denna? En säkerhetskopia av nuvarande state sparas automatiskt."
      )
    )
      return;
    setRestoring(true);
    try {
      await api.restoreSnapshot(board.id, previewSnapshot.id);
      // Ladda om sidan så server-componenten hämtar färska data
      window.location.reload();
    } catch (err) {
      console.error("Restore failed", err);
      alert("Kunde inte återställa versionen.");
      setRestoring(false);
    }
  };

  const previewBoard = previewSnapshot
    ? snapshotToBoard(previewSnapshot.data, board.id)
    : null;

  return (
    <div className="h-screen flex flex-col bg-bg">
      {/* Header */}
      <header className="flex-shrink-0 px-5 py-3 flex items-center gap-3 border-b border-border/60">
        {previewSnapshot ? (
          <div className="flex items-center gap-2 -ml-2 px-2 py-1.5">
            {board.emoji && <span className="text-xl leading-none">{board.emoji}</span>}
            <span className="text-lg font-semibold">
              {previewBoard?.name ?? board.name}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-0.5">
            <BoardSwitcher
              boardId={board.id}
              boardName={board.name}
              boardEmoji={board.emoji}
              editing={editingName}
              onEditCancel={() => setEditingName(false)}
              onEditSubmit={(name) => {
                store.renameBoard(name);
                setEditingName(false);
              }}
            />
            <BoardActionsMenu
              boardId={board.id}
              boardName={board.name}
              boardEmoji={board.emoji}
              onRequestRename={() => setEditingName(true)}
              onChangeEmoji={(emoji) => {
                api
                  .updateBoard(board.id, { emoji })
                  .then(() => window.location.reload())
                  .catch(console.error);
              }}
            />
            <div className="ml-3">
              <ViewToggle view={viewMode} onChange={setViewMode} />
            </div>
          </div>
        )}
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-0.5 p-0.5 rounded-xl bg-muted/40 border border-border/60">
            <VersionMenu
              boardId={board.id}
              previewSnapshotId={previewSnapshot?.id ?? null}
              onPreview={handlePreview}
            />
            <ColorThemeMenu />
          </div>
          <a
            href="/api/auth/signout"
            className="inline-flex items-center gap-1.5 h-10 px-3 rounded-xl bg-muted/40 border border-border/60 text-fg-muted hover:text-danger hover:bg-surface-hover hover:border-danger/30 active:scale-95 transition-all duration-150 ease-snap text-sm font-medium"
            aria-label="Logga ut"
          >
            <LogOut className="size-[18px]" />
            <span>Logga ut</span>
          </a>
        </div>
      </header>

      {/* Preview banner */}
      <AnimatePresence>
        {previewSnapshot && (
          <PreviewBanner
            createdAt={previewSnapshot.createdAt}
            label={previewSnapshot.label}
            onCancel={() => setPreviewSnapshot(null)}
            onRestore={handleRestore}
            restoring={restoring}
          />
        )}
      </AnimatePresence>

      {/* Board */}
      {previewBoard ? (
        <ReadOnlyBoard board={previewBoard} />
      ) : viewMode === "curve" ? (
        <LifeCurveView boardId={board.id} />
      ) : (
        <div
          ref={scrollRef}
          className="flex-1 overflow-x-auto overflow-y-hidden scroll-x scrollbar-thin cursor-grab"
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
                  {board.sections.map((section, i) => (
                    <SectionColumn
                      key={section.id}
                      section={section}
                      index={i}
                      store={store}
                    />
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
                        if (newSectionRef.current)
                          newSectionRef.current.value = "";
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
                  <div className="font-semibold text-sm">
                    {activeSection.title}
                  </div>
                  <div className="text-xs text-fg-muted mt-0.5">
                    {activeSection.subcategories.length} subkategorier
                  </div>
                </motion.div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      )}
    </div>
  );
}
