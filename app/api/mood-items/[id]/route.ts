import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handler, requireUserApi } from "@/lib/api";
import { deleteObject } from "@/lib/r2";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Raderar raden först, sedan filerna i R2. Misslyckas R2 blir det bara en
 * föräldralös fil kvar i bucketen, aldrig en rad som pekar på något som
 * inte finns.
 */
export const DELETE = handler(async (_req: NextRequest, { params }: Ctx) => {
  const user = await requireUserApi();
  const { id } = await params;
  const item = await prisma.moodItem.findFirst({
    where: { id, userId: user.id },
    select: { id: true, key: true, posterKey: true },
  });
  if (!item) return new NextResponse("Not found", { status: 404 });

  await prisma.moodItem.delete({ where: { id: item.id } });
  await Promise.allSettled(
    [item.key, item.posterKey].filter((k): k is string => !!k).map(deleteObject)
  );
  return NextResponse.json({ ok: true });
});
