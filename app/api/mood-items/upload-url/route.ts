import { NextRequest, NextResponse } from "next/server";
import { handler, jsonError, requireUserApi } from "@/lib/api";
import {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  hasStorage,
  moodKey,
  posterKeyFor,
  presignUpload,
} from "@/lib/r2";

/**
 * Steg 1: ge browsern presignade PUT-URL:er mot R2. För video följer en
 * andra URL med för postern, så båda filerna laddas upp innan raden sparas.
 */
export const POST = handler(async (req: NextRequest) => {
  const user = await requireUserApi();
  if (!hasStorage()) return jsonError("Lagring är inte konfigurerad", 503);

  const { contentType, bytes, posterBytes } = (await req.json()) as {
    contentType?: string;
    bytes?: number;
    posterBytes?: number;
  };

  const isImage = (ALLOWED_IMAGE_TYPES as readonly string[]).includes(contentType ?? "");
  const isVideo = (ALLOWED_VIDEO_TYPES as readonly string[]).includes(contentType ?? "");
  if (!contentType || (!isImage && !isVideo)) return jsonError("Filtypen stöds inte");

  const max = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (!bytes || bytes <= 0 || bytes > max) return jsonError("Filen är för stor");

  const key = moodKey(user.id!, contentType);
  const uploadUrl = await presignUpload(key, contentType);

  if (!isVideo) return NextResponse.json({ uploadUrl, key });

  if (!posterBytes || posterBytes <= 0 || posterBytes > MAX_IMAGE_BYTES)
    return jsonError("Poster saknas");
  const posterKey = posterKeyFor(key);
  const posterUploadUrl = await presignUpload(posterKey, "image/webp");
  return NextResponse.json({ uploadUrl, key, posterUploadUrl, posterKey });
});
