import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  handler,
  requireUserApi,
  assertSubcategoryOwner,
  assertSectionOwner,
} from "@/lib/api";
import { computeOrder } from "@/lib/ordering";

/**
 * Flytta en subkategori (inom samma sektion eller över till en annan).
 * Body: { id, sectionId, beforeId?, afterId? }
 */
export const POST = handler(async (req: NextRequest) => {
  const user = await requireUserApi();
  const { id, sectionId, beforeId, afterId } = await req.json();
  if (!id || !sectionId) {
    return NextResponse.json({ error: "id and sectionId required" }, { status: 400 });
  }

  await assertSubcategoryOwner(id, user.id);
  await assertSectionOwner(sectionId, user.id);

  const [prev, next] = await Promise.all([
    afterId
      ? prisma.subcategory.findFirst({
          where: { id: afterId, sectionId },
          select: { order: true },
        })
      : null,
    beforeId
      ? prisma.subcategory.findFirst({
          where: { id: beforeId, sectionId },
          select: { order: true },
        })
      : null,
  ]);

  const newOrder = computeOrder(prev?.order ?? null, next?.order ?? null);
  await prisma.subcategory.update({
    where: { id },
    data: { order: newOrder, sectionId },
  });

  return NextResponse.json({ ok: true, order: newOrder });
});
