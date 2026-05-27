"use client";

import { useEffect, useRef, useState } from "react";
import { History, Save, Eye, Trash2, Check } from "lucide-react";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

type Snapshot = {
  id: string;
  label: string | null;
  reason: string | null;
  createdAt: string;
};

type Props = {
  boardId: string;
  previewSnapshotId: string | null;
  onPreview: (snapshotId: string | null) => void;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  const sameDay = new Date().toDateString() === d.toDateString();
  if (sameDay) {
    return `idag ${d.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })}`;
  }
  return d.toLocaleDateString("sv-SE", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function reasonLabel(reason: string | null) {
  if (reason === "manuell") return "Manuell";
  if (reason === "pre-restore") return "Före rollback";
  if (reason === "auto") return "Auto";
  return reason ?? "—";
}

export function VersionMenu({ boardId, previewSnapshotId, onPreview }: Props) {
  const [open, setOpen] = useState(false);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Stäng vid klick utanför
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const fetchSnapshots = async () => {
    setLoading(true);
    try {
      const r = await api.listSnapshots(boardId);
      setSnapshots(r.snapshots);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchSnapshots();
  }, [open, boardId]);

  const saveNow = async () => {
    setSaving(true);
    try {
      const label = window.prompt("Etikett för versionen (valfritt):") || undefined;
      await api.createSnapshot(boardId, label);
      await fetchSnapshots();
    } finally {
      setSaving(false);
    }
  };

  const deleteSnapshot = async (id: string) => {
    if (!confirm("Ta bort denna version?")) return;
    await api.deleteSnapshot(boardId, id);
    setSnapshots((s) => s.filter((x) => x.id !== id));
    if (previewSnapshotId === id) onPreview(null);
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-1.5 h-9 px-2.5 rounded-lg transition-all duration-150 ease-snap",
          "text-fg-muted hover:text-fg hover:bg-surface-hover active:scale-95",
          open && "bg-surface-hover text-fg"
        )}
        aria-label="Versionshistorik"
        title="Versionshistorik"
      >
        <History className="size-[18px]" />
        <span className="text-xs font-medium tabular-nums hidden sm:inline">
          Versioner
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 top-full mt-2 w-80 card p-2 z-30 shadow-card-hover"
          >
            <div className="flex items-center justify-between px-2 py-1.5">
              <div className="text-xs font-semibold text-fg-muted uppercase tracking-wider">
                Versioner
              </div>
              <button
                onClick={saveNow}
                disabled={saving}
                className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:text-accent/80 disabled:opacity-50 transition-colors"
              >
                <Save className="size-3.5" />
                {saving ? "Sparar..." : "Spara nu"}
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto scrollbar-thin">
              {loading ? (
                <div className="p-4 text-sm text-fg-muted text-center">Laddar...</div>
              ) : snapshots.length === 0 ? (
                <div className="p-6 text-sm text-fg-muted text-center">
                  Inga versioner sparade än.
                  <br />
                  Klicka "Spara nu" för att skapa en.
                </div>
              ) : (
                <div className="space-y-0.5">
                  {snapshots.map((s) => {
                    const isPreviewing = previewSnapshotId === s.id;
                    return (
                      <div
                        key={s.id}
                        className={cn(
                          "group flex items-center gap-2 px-2 py-2 rounded-lg transition-colors",
                          isPreviewing
                            ? "bg-accent/10 ring-1 ring-accent/30"
                            : "hover:bg-surface-hover"
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">
                              {s.label || formatDate(s.createdAt)}
                            </span>
                            {isPreviewing && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent bg-accent/15 px-1.5 py-0.5 rounded">
                                <Check className="size-3" /> Förhandsv.
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-fg-muted flex items-center gap-2 mt-0.5">
                            <span>{s.label ? formatDate(s.createdAt) : reasonLabel(s.reason)}</span>
                            {s.label && (
                              <>
                                <span>·</span>
                                <span>{reasonLabel(s.reason)}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() =>
                            onPreview(isPreviewing ? null : s.id)
                          }
                          className="opacity-0 group-hover:opacity-100 inline-flex items-center justify-center size-7 rounded-md text-fg-muted hover:text-accent hover:bg-bg transition-all"
                          aria-label={isPreviewing ? "Stäng förhandsgranskning" : "Förhandsgranska"}
                          title={isPreviewing ? "Stäng förhandsgranskning" : "Förhandsgranska"}
                        >
                          <Eye className="size-3.5" />
                        </button>
                        <button
                          onClick={() => deleteSnapshot(s.id)}
                          className="opacity-0 group-hover:opacity-100 inline-flex items-center justify-center size-7 rounded-md text-fg-muted hover:text-danger hover:bg-bg transition-all"
                          aria-label="Ta bort version"
                          title="Ta bort version"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
