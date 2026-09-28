import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handler, jsonError, requireUserApi } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

const HASH = /^[0-9a-f]{64}$/;

/** Vilka av de skickade avtrycken finns redan på boarden? */
export const POST = handler(async (req: NextRequest, { params }: Ctx) => {
  const user = await requireUserApi();
  const { id } = await params;
  const { hashes } = (await req.json()) as { hashes?: string[] };
  if (!Array.isArray(hashes) || hashes.length > 500 || !hashes.every((h) => HASH.test(h)))
    return jsonError("Ogiltiga avtryck");

  const board = await prisma.moodBoard.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });
  if (!board) return new NextResponse("Not found", { status: 404 });

  const found = await prisma.moodItem.findMany({
    where: { moodBoardId: id, contentHash: { in: hashes } },
    select: { contentHash: true },
  });
  return NextResponse.json({ existing: found.map((f) => f.contentHash) });
});
