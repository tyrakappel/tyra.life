/**
 * Förbereder en bild i browsern innan uppladdning: HEIC blir JPEG, långsidan
 * skalas ner till MAX_EDGE och allt utom GIF kodas om till webp. Går något
 * fel skickas originalet. Returnerar alltid mått, som Mood Board behöver
 * för att veta bildens proportioner.
 */

const MAX_EDGE = 2400;
const QUALITY = 0.85;

export type PreparedImage = {
  blob: Blob;
  type: string;
  width: number;
  height: number;
};

function isHeic(file: File) {
  return (
    /image\/hei[cf]/.test(file.type) || /\.(heic|heif)$/i.test(file.name)
  );
}

async function toJpeg(file: File): Promise<Blob> {
  const { default: heic2any } = await import("heic2any");
  const out = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
  return Array.isArray(out) ? out[0] : out;
}

export async function prepareImage(file: File): Promise<PreparedImage> {
  const source: Blob = isHeic(file) ? await toJpeg(file) : file;
  const bitmap = await createImageBitmap(source);
  const { width, height } = bitmap;

  // GIF skickas orörd så animationen följer med.
  if (source.type === "image/gif") {
    bitmap.close();
    return { blob: source, type: "image/gif", width, height };
  }

  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
    const w = Math.round(width * scale);
    const h = Math.round(height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", QUALITY)
    );
    if (!blob) throw new Error("toBlob misslyckades");
    return { blob, type: "image/webp", width: w, height: h };
  } catch {
    return { blob: source, type: source.type || "image/jpeg", width, height };
  } finally {
    bitmap.close();
  }
}
