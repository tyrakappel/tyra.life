"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useNavStore } from "@/lib/nav-store";

/**
 * Top progress bar som visas när vi navigerar mellan sidor.
 * Aktiveras explicit via useNavStore.start() och nollställs när
 * pathname har bytts.
 *
 * Animationsstrategi:
 *  1. start() sätter navigating=true → bar fade:r in och slidar till 70%
 *  2. När pathname bytts (nya sidan mountar) → bar slidar till 100% och fade:r ut
 */
export function NavProgress() {
  const navigating = useNavStore((s) => s.navigating);
  const stop = useNavStore((s) => s.stop);
  const pathname = usePathname();
  const [finishing, setFinishing] = useState(false);

  // När pathname byts under navigation: kör finish-animationen
  useEffect(() => {
    if (!navigating) return;
    setFinishing(true);
    const t = setTimeout(() => {
      stop();
      setFinishing(false);
    }, 250);
    return () => clearTimeout(t);
    // navigating är beroendet vi tar action på; pathname är trigger
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <AnimatePresence>
      {navigating && (
        <motion.div
          key="nav-progress"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed top-0 left-0 right-0 z-[100] pointer-events-none"
        >
          <motion.div
            initial={{ width: "0%" }}
            animate={{ width: finishing ? "100%" : "70%" }}
            transition={{
              duration: finishing ? 0.2 : 0.6,
              ease: finishing ? "easeOut" : [0.22, 1, 0.36, 1],
            }}
            className="h-[2.5px] bg-accent shadow-[0_0_8px_var(--color-accent)]"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
