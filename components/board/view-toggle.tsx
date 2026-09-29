"use client";

import { Images, LayoutGrid, LineChart } from "lucide-react";
import { cn } from "@/lib/utils";

export type ViewMode = "plan" | "curve" | "mood";

export const VIEW_MODES: ViewMode[] = ["plan", "curve", "mood"];

type Props = {
  view: ViewMode;
  onChange: (v: ViewMode) => void;
};

export function ViewToggle({ view, onChange }: Props) {
  return (
    <div
      role="tablist"
      className="flex items-center gap-0.5 p-0.5 rounded-xl bg-muted/40 border border-border/60"
    >
      <ViewTab
        active={view === "plan"}
        onClick={() => onChange("plan")}
        icon={<LayoutGrid className="size-[18px]" />}
        label="Livsplan"
      />
      <ViewTab
        active={view === "curve"}
        onClick={() => onChange("curve")}
        icon={<LineChart className="size-[18px]" />}
        label="Livskurva"
      />
      <ViewTab
        active={view === "mood"}
        onClick={() => onChange("mood")}
        icon={<Images className="size-[18px]" />}
        label="Mood Board"
      />
    </div>
  );
}

function ViewTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      title={label}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 h-9 px-2.5 rounded-lg whitespace-nowrap transition-all duration-150 ease-snap text-sm font-medium",
        active
          ? "bg-surface text-fg shadow-sm"
          : "text-fg-muted hover:text-fg hover:bg-surface-hover/60"
      )}
    >
      {icon}
      {/* På smal skärm bara ikonen, etiketten finns kvar för skärmläsare */}
      <span className="sr-only sm:not-sr-only">{label}</span>
    </button>
  );
}
