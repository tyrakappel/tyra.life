import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { handler, jsonError, requireUserApi } from "@/lib/api";
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

/** Flytta objektet till ett annat av användarens mood boards. */
export const PATCH = handler(async (req: NextRequest, { params }: Ctx) => {
  const user = await requireUserApi();
  const { id } = await params;
  const { moodBoardId } = (await req.json()) as { moodBoardId?: string };
  if (!moodBoardId) return jsonError("Mood board saknas");

  const [item, target] = await Promise.all([
    prisma.moodItem.findFirst({ where: { id, userId: user.id }, select: { id: true } }),
    prisma.moodBoard.findFirst({
      where: { id: moodBoardId, userId: user.id },
      select: { id: true },
    }),
  ]);
  if (!item || !target) return new NextResponse("Not found", { status: 404 });

  try {
    // createdAt ändras inte, så objektet hamnar i ordningen efter när det
    // laddades upp, inte när det flyttades.
    await prisma.moodItem.update({ where: { id }, data: { moodBoardId } });
  } catch (err) {
    // Samma fil (contentHash) finns redan på målboarden.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")
      return jsonError("Finns redan på det mood boardet", 409);
    throw err;
  }
  return NextResponse.json({ ok: true });
});
