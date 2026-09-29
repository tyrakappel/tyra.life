import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { handler, requireUserApi } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

async function findOwned(id: string, userId: string) {
  const board = await prisma.moodBoard.findFirst({
    where: { id, userId },
    select: { id: true, shareToken: true },
  });
  if (!board) throw new Response("Not found", { status: 404 });
  return board;
}

/** Slå på delning. Finns redan en token behålls den, så länken inte byts. */
export const POST = handler(async (_req: NextRequest, { params }: Ctx) => {
  const user = await requireUserApi();
  const { id } = await params;
  const board = await findOwned(id, user.id!);
  if (board.shareToken) return NextResponse.json({ shareToken: board.shareToken });

  // 24 slumpbyte = 192 bitar, går inte att gissa.
  const shareToken = randomBytes(24).toString("base64url");
  await prisma.moodBoard.update({ where: { id }, data: { shareToken } });
  return NextResponse.json({ shareToken });
});

/** Stäng av delning. Den gamla länken slutar fungera direkt. */
export const DELETE = handler(async (_req: NextRequest, { params }: Ctx) => {
  const user = await requireUserApi();
  const { id } = await params;
  await findOwned(id, user.id!);
  await prisma.moodBoard.update({ where: { id }, data: { shareToken: null } });
  return NextResponse.json({ shareToken: null });
});
