"use client";

import { useEffect, useState } from "react";
import { RefreshCw, X } from "lucide-react";

const POLL_INTERVAL = 60_000;

type Version = { version: string; commitHash: string; buildTime: string };

export function VersionWatcher() {
  const [stale, setStale] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [loaded, setLoaded] = useState<Version | null>(null);

  useEffect(() => {
    let cancelled = false;
    let initial: Version | null = null;

    async function fetchVersion(): Promise<Version | null> {
      try {
        const res = await fetch("/version.json", { cache: "no-store" });
        if (!res.ok) return null;
        return (await res.json()) as Version;
      } catch {
        return null;
      }
    }

    async function check() {
      const current = await fetchVersion();
      if (!current || cancelled) return;
      if (!initial) {
        initial = current;
        setLoaded(current);
        return;
      }
      if (current.commitHash !== initial.commitHash) {
        setStale(true);
      }
    }

    check();
    const interval = setInterval(check, POLL_INTERVAL);
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (!stale || dismissed) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
      <div className="card flex items-center gap-3 px-4 py-3 pr-3 shadow-card-hover">
        <RefreshCw className="size-4 text-accent" />
        <div className="text-sm">
          Ny version tillgänglig
          <button
            onClick={() => window.location.reload()}
            className="ml-2 text-accent font-medium hover:underline"
          >
            Ladda om
          </button>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-fg-muted hover:text-fg p-1 rounded transition-colors"
          aria-label="Stäng"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
