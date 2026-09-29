"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy, ImagePlus, Loader2, TriangleAlert, X } from "lucide-react";
import { api, type MoodItem } from "@/lib/api-client";
import { prepareImage } from "@/lib/client/image";
import { convertVideo, isVideoFile } from "@/lib/client/video";
import { sha256Hex } from "@/lib/client/hash";
import { putWithProgress } from "@/lib/client/upload";
import { cn } from "@/lib/utils";

/**
 * Uppladdning till Mood Board: en eller flera bilder eller videor via
 * drag-n-drop eller filväljare. Video kodas om till mp4 i browsern och får
 * en posterbild. Kön körs en fil i taget så progressen blir begriplig och R2
 * inte får tjugo samtidiga PUT:ar. Varje färdigt objekt dyker upp på boarden
 * direkt, platsen räknas fram ur ordningen (lib/mood-layout.ts).
 */

type Status =
  | "waiting"
  | "preparing"
  | "uploading"
  | "done"
  | "duplicate"
  | "error";

type QueueItem = {
  id: string;
  file: File;
  isVideo: boolean;
  preview: string;
  status: Status;
  progress: number;
  error?: string;
};

const ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,image/avif,.avif,image/heic,image/heif,.heic,.heif,video/mp4,video/quicktime,.mov,.m4v";

export function MoodUploadModal({
  moodBoardId,
  open,
  onClose,
  onUploaded,
}: {
  moodBoardId: string;
  open: boolean;
  onClose: () => void;
  onUploaded: (item: MoodItem) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);
  const running = useRef(false);
  // Avtryck som redan finns eller laddats upp i den här sessionen, så samma
  // fil två gånger i samma batch också fångas.
  const seenHashes = useRef(new Set<string>());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);

  const busy = queue.some(
    (q) => q.status === "waiting" || q.status === "preparing" || q.status === "uploading"
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && close();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  const close = () => {
    if (busy) return;
    queue.forEach((q) => URL.revokeObjectURL(q.preview));
    setQueue([]);
    seenHashes.current.clear();
    onClose();
  };

  const update = (id: string, patch: Partial<QueueItem>) =>
    setQueue((qs) => qs.map((q) => (q.id === id ? { ...q, ...patch } : q)));

  const addFiles = (files: FileList | File[]) => {
    const images = Array.from(files).filter(
      (f) =>
        f.type.startsWith("image/") ||
        /\.(heic|heif)$/i.test(f.name) ||
        isVideoFile(f)
    );
    if (!images.length) return;
    const items: QueueItem[] = images.map((file) => ({
      id: crypto.randomUUID(),
      file,
      isVideo: isVideoFile(file),
      preview: URL.createObjectURL(file),
      status: "waiting",
      progress: 0,
    }));
    setQueue((qs) => [...qs, ...items]);
    void run(items);
  };

  // Kör nya filer i tur och ordning. Startas en ny batch medan en körs
  // hakar den på samma loop.
  const pending = useRef<QueueItem[]>([]);
  const run = async (items: QueueItem[]) => {
    pending.current.push(...items);
    if (running.current) return;
    running.current = true;
    while (pending.current.length) {
      const item = pending.current.shift()!;
      try {
        update(item.id, { status: "preparing" });
        // Fingeravtryck på originalfilen, innan den kodas om.
        const hash = await sha256Hex(item.file);
        if (seenHashes.current.has(hash) || (await isOnBoard(hash))) {
          update(item.id, { status: "duplicate", progress: 0 });
          continue;
        }
        seenHashes.current.add(hash);
        const { item: saved } = item.isVideo
          ? await uploadVideo(item, hash)
          : await uploadImage(item, hash);
        update(item.id, { status: "done", progress: 1 });
        onUploaded(saved);
      } catch (err) {
        // 409: samma fil hann sparas av en annan uppladdning under tiden.
        if (err instanceof Error && err.message.startsWith("409")) {
          update(item.id, { status: "duplicate", progress: 0 });
          continue;
        }
        update(item.id, {
          status: "error",
          error: friendlyError(err),
        });
      }
    }
    running.current = false;
  };

  const isOnBoard = async (hash: string) => {
    const { existing } = await api.findMoodDuplicates(moodBoardId, [hash]);
    return existing.length > 0;
  };

  const uploadImage = async (item: QueueItem, contentHash: string) => {
    const prepared = await prepareImage(item.file);
    const { uploadUrl, key } = await api.createMoodUpload(
      prepared.type,
      prepared.blob.size
    );
    update(item.id, { status: "uploading", progress: 0 });
    await putWithProgress(uploadUrl, prepared.blob, prepared.type, (p) =>
      update(item.id, { progress: p })
    );
    return api.saveMoodItem(moodBoardId, {
      key,
      width: prepared.width,
      height: prepared.height,
      bytes: prepared.blob.size,
      contentHash,
    });
  };

  // Omkodningen tar mätbar tid, så den får egen progress innan uppladdningen.
  const uploadVideo = async (item: QueueItem, contentHash: string) => {
    const film = await convertVideo(item.file, (p) =>
      update(item.id, { progress: p })
    );
    const ticket = await api.createMoodUpload(
      "video/mp4",
      film.video.size,
      film.poster.size
    );
    update(item.id, { status: "uploading", progress: 0 });
    await putWithProgress(ticket.uploadUrl, film.video, "video/mp4", (p) =>
      update(item.id, { progress: p })
    );
    await putWithProgress(ticket.posterUploadUrl!, film.poster, "image/webp", () => {});
    return api.saveMoodItem(moodBoardId, {
      key: ticket.key,
      width: film.width,
      height: film.height,
      bytes: film.video.size,
      contentHash,
    });
  };

  const doneCount = queue.filter((q) => q.status === "done").length;
  const duplicateCount = queue.filter((q) => q.status === "duplicate").length;
  const errorCount = queue.filter((q) => q.status === "error").length;
  const firstError = queue.find((q) => q.status === "error")?.error;

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          data-color-theme="mood"
          role="dialog"
          aria-modal="true"
          aria-label="Ladda upp bilder och video"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={close}
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 p-6 text-fg"
        >
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-xl bg-surface border border-border rounded-2xl shadow-2xl p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">Lägg till bilder och video</h2>
              <button
                type="button"
                onClick={close}
                disabled={busy}
                aria-label="Stäng"
                className="inline-flex items-center justify-center size-9 rounded-full text-fg-muted hover:text-fg hover:bg-surface-hover transition-colors disabled:opacity-40"
              >
                <X className="size-5" />
              </button>
            </div>

            <div
              onDragEnter={(e) => {
                e.preventDefault();
                dragDepth.current++;
                setDragging(true);
              }}
              onDragOver={(e) => e.preventDefault()}
              onDragLeave={() => {
                dragDepth.current--;
                if (dragDepth.current <= 0) setDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                dragDepth.current = 0;
                setDragging(false);
                addFiles(e.dataTransfer.files);
              }}
              onClick={() => inputRef.current?.click()}
              className={cn(
                "flex flex-col items-center justify-center gap-3 h-56 rounded-xl border-2 border-dashed cursor-pointer transition-colors",
                dragging
                  ? "border-accent bg-accent/10"
                  : "border-border hover:border-fg-muted/50 hover:bg-surface-hover/50"
              )}
            >
              <ImagePlus
                className={cn("size-9", dragging ? "text-accent" : "text-fg-muted")}
              />
              <div className="text-center">
                <p className="text-sm font-medium">
                  Släpp filer här, eller klicka för att välja
                </p>
                <p className="text-xs text-fg-muted mt-1">
                  En eller flera. Bilder (JPG, PNG, WebP, AVIF, GIF, HEIC) och video (MP4, MOV).
                </p>
              </div>
              <input
                ref={inputRef}
                type="file"
                multiple
                accept={ACCEPT}
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>

            {queue.length > 0 && (
              <>
                <div className="mt-5 mb-2 flex items-center justify-between text-xs text-fg-muted">
                  <span>
                    {doneCount} av {queue.length - duplicateCount} uppladdade
                    {duplicateCount > 0 &&
                      `, ${duplicateCount} fanns redan`}
                  </span>
                  {!busy && errorCount > 0 && (
                    <span className="text-danger">
                      {errorCount === 1 ? "1 fil" : `${errorCount} filer`} misslyckades
                    </span>
                  )}
                  {!busy && errorCount === 0 && doneCount > 0 && (
                    <span>Allt har placerats i din rymd</span>
                  )}
                </div>
                {!busy && firstError && (
                  <p className="mb-2 text-xs text-danger">{firstError}</p>
                )}
                <ul className="grid grid-cols-5 gap-2 max-h-64 overflow-y-auto scrollbar-thin">
                  {queue.map((q) => (
                    <QueueThumb key={q.id} item={q} />
                  ))}
                </ul>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

function QueueThumb({ item }: { item: QueueItem }) {
  return (
    <li
      className="relative aspect-square overflow-hidden bg-muted"
      title={item.error ?? item.file.name}
    >
      {item.isVideo ? (
        <video
          src={item.preview}
          muted
          playsInline
          preload="metadata"
          className={cn(
            "size-full object-cover transition-opacity",
            item.status !== "done" && "opacity-50"
          )}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.preview}
          alt=""
          className={cn(
            "size-full object-cover transition-opacity",
            item.status !== "done" && "opacity-50"
          )}
        />
      )}
      <div className="absolute inset-0 flex items-center justify-center">
        {(item.status === "waiting" ||
          (item.status === "preparing" && !item.isVideo)) && (
          <Loader2 className="size-5 animate-spin text-white/80" />
        )}
        {item.status === "done" && (
          <span className="inline-flex items-center justify-center size-6 rounded-full bg-success text-black">
            <Check className="size-4" />
          </span>
        )}
        {item.status === "duplicate" && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/70 text-[10px] font-medium text-white/90">
            <Copy className="size-3" />
            Finns redan
          </span>
        )}
        {item.status === "error" && (
          <TriangleAlert className="size-5 text-danger" />
        )}
      </div>
      {(item.status === "uploading" ||
        (item.status === "preparing" && item.isVideo)) && (
        <div className="absolute inset-x-0 bottom-0 h-1 bg-black/40">
          <div
            className={cn(
              "h-full transition-[width] duration-150",
              item.status === "preparing" ? "bg-fg-muted" : "bg-accent"
            )}
            style={{ width: `${Math.round(item.progress * 100)}%` }}
          />
        </div>
      )}
    </li>
  );
}

/**
 * API-fel kommer som "503: {\"error\":\"...\"}". Plocka ut meddelandet så
 * användaren ser en mening, inte JSON.
 */
function friendlyError(err: unknown) {
  if (!(err instanceof Error)) return "Något gick fel";
  const match = err.message.match(/^\d{3}: (.*)$/s);
  if (!match) return err.message;
  try {
    const body = JSON.parse(match[1]) as { error?: string };
    if (body.error) return body.error;
  } catch {
    // inte JSON, använd texten som den är
  }
  return match[1] || "Något gick fel";
}
