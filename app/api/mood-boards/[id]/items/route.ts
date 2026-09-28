import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { handler, jsonError, requireUserApi } from "@/lib/api";
import { moodPrefix, posterKeyFor, publicUrl } from "@/lib/r2";

type Ctx = { params: Promise<{ id: string }> };

const SELECT = {
  id: true,
  kind: true,
  url: true,
  posterUrl: true,
  width: true,
  height: true,
  depth: true,
} as const;

async function assertMoodBoardOwner(moodBoardId: string, userId: string) {
  const board = await prisma.moodBoard.findFirst({
    where: { id: moodBoardId, userId },
    select: { id: true },
  });
  if (!board) throw new Response("Not found", { status: 404 });
}

export const GET = handler(async (_req: NextRequest, { params }: Ctx) => {
  const user = await requireUserApi();
  const { id } = await params;
  await assertMoodBoardOwner(id, user.id!);
  const items = await prisma.moodItem.findMany({
    where: { moodBoardId: id },
    orderBy: { createdAt: "asc" },
    select: SELECT,
  });
  return NextResponse.json({ items });
});

/**
 * Steg 2 efter PUT mot R2: spara raden. Platsen i rymden räknas fram i
 * klienten ur ordningen (lib/mood-layout.ts), bara djupet slumpas här.
 */
export const POST = handler(async (req: NextRequest, { params }: Ctx) => {
  const user = await requireUserApi();
  const { id } = await params;
  await assertMoodBoardOwner(id, user.id!);

  const { key, width, height, bytes, contentHash } = (await req.json()) as {
    key?: string;
    width?: number;
    height?: number;
    bytes?: number;
    contentHash?: string;
  };
  // Nyckeln måste vara en som vi själva delat ut till just den här användaren.
  if (!key || !key.startsWith(moodPrefix(user.id!)))
    return jsonError("Ogiltig nyckel");
  if (!width || !height || width <= 0 || height <= 0)
    return jsonError("Mått saknas");

  const isVideo = key.endsWith(".mp4");
  const posterKey = isVideo ? posterKeyFor(key) : null;

  const hash =
    contentHash && /^[0-9a-f]{64}$/.test(contentHash) ? contentHash : null;

  const create = prisma.moodItem.create({
    data: {
      userId: user.id!,
      moodBoardId: id,
      kind: isVideo ? "video" : "image",
      key,
      url: publicUrl(key),
      posterKey,
      posterUrl: posterKey ? publicUrl(posterKey) : null,
      width: Math.round(width),
      height: Math.round(height),
      bytes: bytes ? Math.round(bytes) : null,
      contentHash: hash,
      depth: 0.25 + Math.random() * 0.75,
    },
    select: SELECT,
  });

  try {
    const item = await create;
    return NextResponse.json({ item });
  } catch (err) {
    // Samma fil hann sparas av en parallell uppladdning. Filen i R2 blir
    // föräldralös, men boarden får ingen dubblett.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")
      return jsonError("Finns redan på boarden", 409);
    throw err;
  }
});
