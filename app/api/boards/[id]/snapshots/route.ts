import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handler, requireUserApi, assertBoardOwner } from "@/lib/api";
import { captureBoardSnapshot } from "@/lib/snapshot";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handler(async (_req: NextRequest, ctx: Ctx) => {
  const user = await requireUserApi();
  const { id } = await ctx.params;
  await assertBoardOwner(id, user.id);

  const snapshots = await prisma.boardSnapshot.findMany({
    where: { boardId: id },
    orderBy: { createdAt: "desc" },
    select: { id: true, label: true, reason: true, createdAt: true },
    take: 50,
  });
  return NextResponse.json({ snapshots });
});

export const POST = handler(async (req: NextRequest, ctx: Ctx) => {
  const user = await requireUserApi();
  const { id } = await ctx.params;
  await assertBoardOwner(id, user.id);

  const body = await req.json().catch(() => ({}));
  const label: string | undefined = body.label?.toString().trim() || undefined;
  const reason: string = body.reason?.toString() || "manuell";

  const data = await captureBoardSnapshot(id);

  const snapshot = await prisma.boardSnapshot.create({
    data: {
      boardId: id,
      label,
      reason,
      data: data as never,
    },
    select: { id: true, label: true, reason: true, createdAt: true },
  });

  return NextResponse.json({ snapshot }, { status: 201 });
});
