"use client";

import { useEffect, useRef, useState } from "react";
import { Palette, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useColorTheme } from "./color-theme-provider";
import { COLOR_THEMES } from "@/lib/color-themes";
import { cn } from "@/lib/utils";

export function ColorThemeMenu() {
  const { colorTheme, setColorTheme } = useColorTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-1.5 h-9 px-2.5 rounded-lg transition-all duration-150 ease-snap text-sm font-medium",
          "text-fg-muted hover:text-fg hover:bg-surface-hover active:scale-95",
          open && "bg-surface-hover text-fg"
        )}
        aria-label="Färgtema"
      >
        <Palette className="size-[18px]" />
        <span>Färgtema</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 top-full mt-2 w-56 card p-1.5 z-30 shadow-card-hover"
          >
            <div className="px-2 py-1.5 text-xs font-semibold text-fg-muted uppercase tracking-wider">
              Färgtema
            </div>
            <div className="space-y-0.5">
              {COLOR_THEMES.map((t) => {
                const isActive = colorTheme === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      setColorTheme(t.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex items-center gap-3 w-full px-2 py-2 rounded-lg text-sm transition-colors",
                      isActive
                        ? "bg-accent/10 text-fg"
                        : "hover:bg-surface-hover text-fg"
                    )}
                  >
                    <span
                      className="inline-flex items-center justify-center size-7 rounded-lg shadow-sm ring-1 ring-black/10 shrink-0"
                      style={{ background: t.preview }}
                      aria-hidden
                    />
                    <span className="flex-1 text-left">
                      <div className="font-medium leading-tight">{t.name}</div>
                      {t.description && (
                        <div className="text-xs text-fg-muted">{t.description}</div>
                      )}
                    </span>
                    {isActive && <Check className="size-4 text-accent shrink-0" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
