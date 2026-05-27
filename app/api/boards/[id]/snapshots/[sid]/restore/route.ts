import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handler, requireUserApi, assertBoardOwner } from "@/lib/api";
import { restoreBoardFromSnapshot, type SnapshotData } from "@/lib/snapshot";

type Ctx = { params: Promise<{ id: string; sid: string }> };

export const POST = handler(async (_req: NextRequest, ctx: Ctx) => {
  const user = await requireUserApi();
  const { id, sid } = await ctx.params;
  await assertBoardOwner(id, user.id);

  const snapshot = await prisma.boardSnapshot.findFirst({
    where: { id: sid, boardId: id },
  });
  if (!snapshot) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await restoreBoardFromSnapshot(id, snapshot.data as unknown as SnapshotData);
  return NextResponse.json({ ok: true });
});
