import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handler, requireUserApi, assertBoardOwner } from "@/lib/api";
import type { SnapshotData } from "@/lib/snapshot";

type Ctx = { params: Promise<{ id: string; sid: string }> };

/** Hämta innehållet i en snapshot (för preview-läge). */
export const GET = handler(async (_req: NextRequest, ctx: Ctx) => {
  const user = await requireUserApi();
  const { id, sid } = await ctx.params;
  await assertBoardOwner(id, user.id);

  const snapshot = await prisma.boardSnapshot.findFirst({
    where: { id: sid, boardId: id },
  });
  if (!snapshot) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    snapshot: {
      id: snapshot.id,
      label: snapshot.label,
      reason: snapshot.reason,
      createdAt: snapshot.createdAt,
      data: snapshot.data as unknown as SnapshotData,
    },
  });
});

/** Ta bort en snapshot. */
export const DELETE = handler(async (_req: NextRequest, ctx: Ctx) => {
  const user = await requireUserApi();
  const { id, sid } = await ctx.params;
  await assertBoardOwner(id, user.id);

  await prisma.boardSnapshot.deleteMany({ where: { id: sid, boardId: id } });
  return NextResponse.json({ ok: true });
});
