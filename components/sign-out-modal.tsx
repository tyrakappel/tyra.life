"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, Loader2 } from "lucide-react";
import { signOutAction } from "@/app/actions/sign-out";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function SignOutModal({ open, onClose }: Props) {
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, busy]);

  const confirm = async () => {
    setBusy(true);
    try {
      await signOutAction();
    } catch {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => !busy && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-sm bg-surface border border-border rounded-2xl p-8 shadow-card-hover"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="inline-flex items-center justify-center size-12 rounded-full bg-danger/10 ring-1 ring-danger/20 mb-4">
                <LogOut className="size-5 text-danger" />
              </div>
              <h2 className="font-bold text-xl mb-2">Logga ut?</h2>
              <p className="text-fg-muted text-sm mb-7">
                Du loggas ut från Levalife och behöver logga in igen för att
                fortsätta.
              </p>

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={confirm}
                  disabled={busy}
                  className="flex items-center justify-center gap-2 w-full bg-danger hover:bg-danger/90 active:bg-danger/80 text-white font-bold text-sm py-3 px-5 rounded-full shadow-lg shadow-danger/30 hover:shadow-xl hover:shadow-danger/40 transition-all duration-150 ease-snap disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {busy ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Loggar ut…
                    </>
                  ) : (
                    "Logga ut"
                  )}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={busy}
                  className="w-full border border-border hover:border-fg-muted/40 text-fg-muted hover:text-fg py-2.5 px-5 rounded-full text-sm font-medium transition-colors duration-150 disabled:opacity-50"
                >
                  Avbryt
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
