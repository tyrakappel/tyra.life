"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  multiline?: boolean;
  /** Rendera children istället för en pseudo-text när inte i edit-mode. */
  renderDisplay?: (value: string) => React.ReactNode;
  /** Tom value tillåten? Annars revertas. */
  allowEmpty?: boolean;
  /** Aktivera redigering automatiskt (för "ny item") */
  autoEdit?: boolean;
};

export function InlineEdit({
  value,
  onChange,
  placeholder = "Lägg till...",
  className,
  multiline = false,
  renderDisplay,
  allowEmpty = false,
  autoEdit = false,
}: Props) {
  const [editing, setEditing] = useState(autoEdit);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current instanceof HTMLInputElement) {
        inputRef.current.select();
      }
    }
  }, [editing]);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  const commit = () => {
    const trimmed = draft.trim();
    if (!trimmed && !allowEmpty) {
      setDraft(value);
    } else if (trimmed !== value) {
      onChange(trimmed);
    }
    setEditing(false);
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  if (!editing) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setEditing(true);
        }}
        className={cn(
          "text-left w-full rounded transition-colors hover:bg-surface-hover/60 -mx-1 px-1",
          !value && "text-fg-muted/60 italic",
          className
        )}
      >
        {renderDisplay ? renderDisplay(value) : value || placeholder}
      </button>
    );
  }

  if (multiline) {
    return (
      <textarea
        ref={inputRef as React.RefObject<HTMLTextAreaElement>}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Escape") cancel();
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commit();
        }}
        placeholder={placeholder}
        className={cn(
          "w-full bg-muted/40 rounded px-1 -mx-1 py-1 outline-none resize-none",
          "ring-1 ring-accent/40 transition-all",
          className
        )}
        rows={2}
      />
    );
  }

  return (
    <input
      ref={inputRef as React.RefObject<HTMLInputElement>}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Escape") cancel();
        if (e.key === "Enter") commit();
      }}
      placeholder={placeholder}
      className={cn(
        "w-full bg-muted/40 rounded px-1 -mx-1 py-0.5 outline-none",
        "ring-1 ring-accent/40 transition-all",
        className
      )}
    />
  );
}
