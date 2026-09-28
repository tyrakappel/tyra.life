import "server-only";
import { randomUUID } from "node:crypto";
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Cloudflare R2 via S3-API:t. Browsern laddar upp direkt mot R2 med en
 * presignad PUT, servern rör aldrig filinnehållet. Läsning sker via den
 * publika domänen i R2_PUBLIC_BASE_URL.
 *
 * Bucketen behöver en CORS-regel som tillåter PUT från appens domäner
 * (localhost:3000 i dev).
 */

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
] as const;

export const ALLOWED_VIDEO_TYPES = ["video/mp4"] as const;

export const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 300 * 1024 * 1024;

const UPLOAD_WINDOW_SECONDS = 600;

const ENV_KEYS = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
  "R2_PUBLIC_BASE_URL",
] as const;

function env(name: (typeof ENV_KEYS)[number]) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} saknas`);
  return value;
}

export function hasStorage() {
  return ENV_KEYS.every((k) => !!process.env[k]);
}

let s3: S3Client | null = null;
function client() {
  s3 ??= new S3Client({
    region: "auto",
    endpoint: `https://${env("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env("R2_ACCESS_KEY_ID"),
      secretAccessKey: env("R2_SECRET_ACCESS_KEY"),
    },
  });
  return s3;
}

export function publicUrl(key: string) {
  return `${env("R2_PUBLIC_BASE_URL").replace(/\/+$/, "")}/${key}`;
}

function extFor(contentType: string) {
  const ext = contentType.split("/")[1];
  return ext === "jpeg" ? "jpg" : ext;
}

/** Originalfilnamnet används aldrig, bara användare + tid + slump. */
export function moodPrefix(userId: string) {
  return `mood/${userId}/`;
}

export function moodKey(userId: string, contentType: string) {
  return `${moodPrefix(userId)}${Date.now()}-${randomUUID().slice(0, 8)}.${extFor(contentType)}`;
}

/** Postern ligger bredvid videon: samma namn med -poster.webp. */
export function posterKeyFor(videoKey: string) {
  return videoKey.replace(/\.[^.]+$/, "") + "-poster.webp";
}

export function presignUpload(key: string, contentType: string) {
  return getSignedUrl(
    client(),
    new PutObjectCommand({
      Bucket: env("R2_BUCKET"),
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn: UPLOAD_WINDOW_SECONDS }
  );
}

export async function deleteObject(key: string) {
  await client().send(
    new DeleteObjectCommand({ Bucket: env("R2_BUCKET"), Key: key })
  );
}
