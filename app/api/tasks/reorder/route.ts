import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  handler,
  requireUserApi,
  assertTaskOwner,
  assertSubcategoryOwner,
} from "@/lib/api";
import { computeOrder } from "@/lib/ordering";

/**
 * Body: { id, subcategoryId, beforeId?, afterId? }
 */
export const POST = handler(async (req: NextRequest) => {
  const user = await requireUserApi();
  const { id, subcategoryId, beforeId, afterId } = await req.json();
  if (!id || !subcategoryId) {
    return NextResponse.json(
      { error: "id and subcategoryId required" },
      { status: 400 }
    );
  }
  await assertTaskOwner(id, user.id);
  await assertSubcategoryOwner(subcategoryId, user.id);

  const [prev, next] = await Promise.all([
    afterId
      ? prisma.task.findFirst({
          where: { id: afterId, subcategoryId },
          select: { order: true },
        })
      : null,
    beforeId
      ? prisma.task.findFirst({
          where: { id: beforeId, subcategoryId },
          select: { order: true },
        })
      : null,
  ]);

  const newOrder = computeOrder(prev?.order ?? null, next?.order ?? null);
  await prisma.task.update({
    where: { id },
    data: { order: newOrder, subcategoryId },
  });

  return NextResponse.json({ ok: true, order: newOrder });
});
