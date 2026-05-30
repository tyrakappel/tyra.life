"use client";

import { motion } from "framer-motion";
import { Eye, RotateCcw, Shield, X } from "lucide-react";

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
      <div className="flex items-center gap-2 text-accent shrink-0">
        <Eye className="size-4" />
        <span className="text-sm font-medium">Förhandsgranskar</span>
      </div>
      <span className="text-sm text-fg-muted truncate">
        {label ? <strong className="text-fg">{label}</strong> : null}
        {label ? <span className="mx-1.5">·</span> : null}
        {formatDate(createdAt)}
      </span>
      <span className="hidden md:inline-flex items-center gap-1.5 text-xs text-fg-muted/80 shrink-0">
        <Shield className="size-3.5 text-success" />
        Ditt aktuella arbete är säkert
      </span>

      <div className="ml-auto flex items-center gap-2 shrink-0">
        <button
          onClick={onCancel}
          disabled={restoring}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-fg-muted hover:text-fg hover:bg-surface-hover transition-colors disabled:opacity-50 text-sm font-medium"
          title="Stäng förhandsgranskning och gå tillbaka till aktuell version"
        >
          <X className="size-4" />
          Stäng
        </button>
        <button
          onClick={onRestore}
          disabled={restoring}
          className="inline-flex items-center gap-2 bg-accent hover:bg-accent/90 active:bg-accent/80 text-accent-fg text-sm font-semibold py-2 px-4 rounded-full shadow-md shadow-accent/30 hover:shadow-lg hover:shadow-accent/40 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150 ease-snap"
        >
          <RotateCcw className="size-4" />
          {restoring ? "Återställer..." : "Rulla tillbaka till denna"}
        </button>
      </div>
    </motion.div>
  );
}
