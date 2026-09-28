import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handler, jsonError, requireUserApi } from "@/lib/api";
import { ORDER_STEP } from "@/lib/ordering";

const SELECT = { id: true, name: true, emoji: true, order: true } as const;

/** Listar användarens mood boards. Har man ingen skapas en första. */
export const GET = handler(async () => {
  const user = await requireUserApi();
  let boards = await prisma.moodBoard.findMany({
    where: { userId: user.id },
    orderBy: { order: "asc" },
    select: SELECT,
  });
  if (!boards.length) {
    const first = await prisma.moodBoard.create({
      data: { userId: user.id!, name: "Mitt mood board", emoji: "✨", order: ORDER_STEP },
      select: SELECT,
    });
    boards = [first];
  }
  return NextResponse.json({ boards });
});

export const POST = handler(async (req: NextRequest) => {
  const user = await requireUserApi();
  const { name, emoji } = (await req.json()) as { name?: string; emoji?: string | null };
  if (!name?.trim()) return jsonError("Name required");

  const last = await prisma.moodBoard.findFirst({
    where: { userId: user.id },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const board = await prisma.moodBoard.create({
    data: {
      userId: user.id!,
      name: name.trim(),
      emoji: emoji?.trim() || null,
      order: (last?.order ?? 0) + ORDER_STEP,
    },
    select: SELECT,
  });
  return NextResponse.json({ board });
});
