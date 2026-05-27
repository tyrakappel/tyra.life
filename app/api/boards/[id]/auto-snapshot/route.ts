import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handler, requireUserApi, assertBoardOwner } from "@/lib/api";
import { captureBoardSnapshot } from "@/lib/snapshot";

type Ctx = { params: Promise<{ id: string }> };

const AUTO_SNAPSHOT_MIN_INTERVAL_MS = 30 * 60 * 1000; // 30 min

/**
 * Idempotent + rate-limited auto-snapshot.
 * Klient anropar denna periodiskt (var 5:e min) + vid page load.
 *
 * Skapar en snapshot endast om:
 *  1. Det inte finns en auto-snapshot inom de senaste 30 min, OCH
 *  2. Boarden har uppdaterats sedan senaste auto-snapshot
 *     (eller om det inte finns någon alls).
 */
export const POST = handler(async (_req: NextRequest, ctx: Ctx) => {
  const user = await requireUserApi();
  const { id } = await ctx.params;
  await assertBoardOwner(id, user.id);

  const [board, lastAuto] = await Promise.all([
    prisma.board.findUnique({
      where: { id },
      select: { updatedAt: true },
    }),
    prisma.boardSnapshot.findFirst({
      where: { boardId: id, reason: "auto" },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);

  if (!board) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const now = Date.now();

  if (lastAuto) {
    const sinceLast = now - lastAuto.createdAt.getTime();
    if (sinceLast < AUTO_SNAPSHOT_MIN_INTERVAL_MS) {
      return NextResponse.json({ skipped: true, reason: "too-recent" });
    }
    // Kolla om något ändrats sedan senaste auto-snapshot
    // (board.updatedAt cascading uppdateras ej för section/task ändringar i Prisma
    //  out-of-the-box — vi måste kolla deepest leaf)
    const latestChild = await prisma.task.findFirst({
      where: { subcategory: { section: { boardId: id } } },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    });
    const latestUpdate = Math.max(
      board.updatedAt.getTime(),
      latestChild?.updatedAt.getTime() ?? 0
    );
    if (latestUpdate <= lastAuto.createdAt.getTime()) {
      return NextResponse.json({ skipped: true, reason: "no-changes" });
    }
  }

  const data = await captureBoardSnapshot(id);
  const snapshot = await prisma.boardSnapshot.create({
    data: {
      boardId: id,
      reason: "auto",
      data: data as never,
    },
    select: { id: true, label: true, reason: true, createdAt: true },
  });

  return NextResponse.json({ snapshot });
});
