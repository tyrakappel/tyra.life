"use client";

import { motion } from "framer-motion";
import { Eye, RotateCcw, X } from "lucide-react";

type Props = {
  createdAt: string;
  label: string | null;
  onCancel: () => void;
  onRestore: () => void;
  restoring: boolean;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("sv-SE", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PreviewBanner({
  createdAt,
  label,
  onCancel,
  onRestore,
  restoring,
}: Props) {
  return (
    <motion.div
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -40, opacity: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="flex-shrink-0 bg-accent/10 border-b border-accent/30 px-5 py-2.5 flex items-center gap-3"
    >
      <div className="flex items-center gap-2 text-accent">
        <Eye className="size-4" />
        <span className="text-sm font-medium">
          Förhandsgranskar version
        </span>
      </div>
      <span className="text-sm text-fg-muted">
        {label ? <strong className="text-fg">{label}</strong> : null}
        {label ? <span className="mx-1.5">·</span> : null}
        {formatDate(createdAt)}
      </span>

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={onRestore}
          disabled={restoring}
          className="inline-flex items-center gap-2 bg-accent hover:bg-accent/90 active:bg-accent/80 text-accent-fg text-sm font-semibold py-2 px-4 rounded-full shadow-md shadow-accent/30 hover:shadow-lg hover:shadow-accent/40 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150 ease-snap"
        >
          <RotateCcw className="size-4" />
          {restoring ? "Återställer..." : "Ersätt liveversion med denna"}
        </button>
        <button
          onClick={onCancel}
          disabled={restoring}
          className="inline-flex items-center justify-center size-9 rounded-lg text-fg-muted hover:text-fg hover:bg-surface-hover transition-colors disabled:opacity-50"
          aria-label="Avbryt förhandsgranskning"
          title="Tillbaka till live"
        >
          <X className="size-4" />
        </button>
      </div>
    </motion.div>
  );
}
