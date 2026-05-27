import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handler, requireUserApi } from "@/lib/api";
import { ORDER_STEP } from "@/lib/ordering";

export const GET = handler(async () => {
  const user = await requireUserApi();
  const boards = await prisma.board.findMany({
    where: { userId: user.id },
    orderBy: { order: "asc" },
    select: { id: true, name: true, emoji: true, order: true, updatedAt: true },
  });
  return NextResponse.json({ boards });
});

export const POST = handler(async (req: NextRequest) => {
  const user = await requireUserApi();
  const body = await req.json();
  const { name, emoji } = body as { name: string; emoji?: string };
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const last = await prisma.board.findFirst({
    where: { userId: user.id },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const board = await prisma.board.create({
    data: {
      userId: user.id,
      name: name.trim(),
      emoji,
      order: (last?.order ?? 0) + ORDER_STEP,
    },
  });
  return NextResponse.json({ board }, { status: 201 });
});
