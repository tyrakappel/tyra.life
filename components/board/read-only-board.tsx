"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useHorizontalScroll } from "./use-horizontal-scroll";
import type { Board } from "@/lib/types";

/**
 * Read-only rendering av en board (används i preview-läge).
 * Speglar SectionColumn / SubcategoryCard / TaskItem-stilen men utan
 * DnD, inline-edit eller mutation-knappar.
 */
export function ReadOnlyBoard({ board }: { board: Board }) {
  const scrollRef = useHorizontalScroll<HTMLDivElement>();

  useEffect(() => {
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
  }, [scrollRef]);

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-x-auto overflow-y-hidden scroll-x scrollbar-thin"
    >
      <div className="h-full flex gap-4 px-5 py-4 items-stretch min-w-min">
        {board.sections.map((section) => (
          <div
            key={section.id}
            className="card flex flex-col w-[320px] flex-shrink-0 max-h-full"
          >
            <div
              className="p-3 pb-2 border-b border-border/70 rounded-t-xl bg-surface"
              style={
                section.color
                  ? { boxShadow: `inset 3px 0 0 ${section.color}` }
                  : undefined
              }
            >
              <div className="font-semibold text-sm">{section.title}</div>
              {section.description && (
                <div className="text-xs text-fg-muted mt-0.5">
                  {section.description}
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-3 pt-2 scrollbar-thin">
              {section.subcategories.map((sub) => {
                const total = sub.tasks.length;
                const completed = sub.tasks.filter((t) => t.completed).length;
                const allDone = total > 0 && completed === total;
                const sorted = [...sub.tasks].sort((a, b) => {
                  if (a.completed !== b.completed) return a.completed ? -1 : 1;
                  return a.order - b.order;
                });

                return (
                  <div
                    key={sub.id}
                    className={cn(
                      "card p-3 mb-2",
                      allDone && "ring-2 ring-success/40"
                    )}
                  >
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className="flex-1 min-w-0 font-medium text-sm">
                        {sub.title}
                      </div>
                      <span
                        className={cn(
                          "text-xs tabular-nums px-1.5 py-0.5 rounded-md",
                          allDone
                            ? "bg-success/20 text-success"
                            : "bg-muted text-fg-muted"
                        )}
                      >
                        {completed}/{total}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      {sorted.map((t) => (
                        <div
                          key={t.id}
                          className="flex items-start gap-2 px-2 py-1.5 rounded-lg"
                        >
                          <input
                            type="checkbox"
                            checked={t.completed}
                            disabled
                            readOnly
                            className="mt-1 size-4 rounded border-border accent-accent cursor-default"
                          />
                          <div
                            className={cn(
                              "text-sm leading-snug flex-1",
                              t.completed && "line-through text-fg-muted"
                            )}
                          >
                            {t.title}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
