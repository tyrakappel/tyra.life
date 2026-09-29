import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handler, jsonError, requireUserApi } from "@/lib/api";
import { deleteObject } from "@/lib/r2";

type Ctx = { params: Promise<{ id: string }> };

const SELECT = { id: true, name: true, emoji: true, order: true } as const;

async function findOwned(id: string, userId: string) {
  const board = await prisma.moodBoard.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!board) throw new Response("Not found", { status: 404 });
}

export const PATCH = handler(async (req: NextRequest, { params }: Ctx) => {
  const user = await requireUserApi();
  const { id } = await params;
  await findOwned(id, user.id!);

  const { name, emoji } = (await req.json()) as {
    name?: string;
    emoji?: string | null;
  };
  if (name !== undefined && !name.trim()) return jsonError("Name required");

  const board = await prisma.moodBoard.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(emoji !== undefined && { emoji: emoji?.trim() || null }),
    },
    select: SELECT,
  });
  return NextResponse.json({ board });
});

/**
 * Tar bort boarden och allt på den. Raderna försvinner via cascade, filerna
 * i R2 städas efteråt. Sista boarden får inte tas bort.
 */
export const DELETE = handler(async (_req: NextRequest, { params }: Ctx) => {
  const user = await requireUserApi();
  const { id } = await params;
  await findOwned(id, user.id!);

  const count = await prisma.moodBoard.count({ where: { userId: user.id } });
  if (count <= 1) return jsonError("Du måste ha minst ett mood board");

  const items = await prisma.moodItem.findMany({
    where: { moodBoardId: id },
    select: { key: true, posterKey: true },
  });
  await prisma.moodBoard.delete({ where: { id } });
  await Promise.allSettled(
    items
      .flatMap((i) => [i.key, i.posterKey])
      .filter((k): k is string => !!k)
      .map(deleteObject)
  );
  return NextResponse.json({ ok: true });
});
