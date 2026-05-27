"use client";

import { useTheme } from "next-themes";
import { Moon, Sun, Monitor } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="size-9" />;

  const cycle = () => {
    if (theme === "system") setTheme("light");
    else if (theme === "light") setTheme("dark");
    else setTheme("system");
  };

  const Icon = theme === "system" ? Monitor : resolvedTheme === "dark" ? Moon : Sun;
  const label =
    theme === "system" ? "System" : resolvedTheme === "dark" ? "Mörkt" : "Ljust";

  return (
    <button
      onClick={cycle}
      className="inline-flex items-center justify-center size-9 rounded-lg text-fg-muted hover:text-fg hover:bg-surface-hover active:scale-95 transition-all duration-150 ease-snap"
      aria-label={`Tema: ${label}`}
      title={`Tema: ${label} (klick för att byta)`}
    >
      <Icon className="size-[18px]" />
    </button>
  );
}
