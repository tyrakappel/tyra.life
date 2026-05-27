import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handler, requireUserApi, assertSectionOwner } from "@/lib/api";
import { computeOrder } from "@/lib/ordering";

/**
 * Body: { id, beforeId?, afterId? }
 * beforeId = sektion som ska komma efter den nya positionen
 * afterId  = sektion som ska komma före den nya positionen
 * Skicka null/undefined för att betyda "i kanten".
 */
export const POST = handler(async (req: NextRequest) => {
  const user = await requireUserApi();
  const { id, beforeId, afterId } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const section = await assertSectionOwner(id, user.id);
  const boardId = section.boardId;

  const [prev, next] = await Promise.all([
    afterId
      ? prisma.section.findFirst({ where: { id: afterId, boardId }, select: { order: true } })
      : null,
    beforeId
      ? prisma.section.findFirst({ where: { id: beforeId, boardId }, select: { order: true } })
      : null,
  ]);

  const newOrder = computeOrder(prev?.order ?? null, next?.order ?? null);
  await prisma.section.update({ where: { id }, data: { order: newOrder } });

  return NextResponse.json({ ok: true, order: newOrder });
});
