import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handler, requireUserApi, assertBoardOwner } from "@/lib/api";
import { captureBoardSnapshot } from "@/lib/snapshot";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Auto-snapshot — det FINNS BARA EN per board.
 * Vid varje anrop uppsertas (skapas eller uppdateras) den enda
 * snapshot:en med reason="auto" så att den alltid speglar senaste
 * sparade state. Manuella snapshots ligger separat och berörs inte.
 *
 * Klienten anropar denna debounced ~2s efter senaste mutation.
 */
export const POST = handler(async (_req: NextRequest, ctx: Ctx) => {
  const user = await requireUserApi();
  const { id } = await ctx.params;
  await assertBoardOwner(id, user.id);

  const data = await captureBoardSnapshot(id);

  // Hämta alla auto-snapshots — behåll bara den nyaste, ta bort resten.
  // Detta städar upp historiska "Auto"-rader för boards som hade flera
  // innan endpoint:en blev upsert.
  const allAuto = await prisma.boardSnapshot.findMany({
    where: { boardId: id, reason: "auto" },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  const keep = allAuto[0];
  const toDelete = allAuto.slice(1).map((s) => s.id);
  if (toDelete.length) {
    await prisma.boardSnapshot.deleteMany({
      where: { id: { in: toDelete } },
    });
  }

  const snapshot = keep
    ? await prisma.boardSnapshot.update({
        where: { id: keep.id },
        data: {
          data: data as never,
          createdAt: new Date(), // bumpa tidsstämpeln så listan sorteras rätt
        },
        select: { id: true, label: true, reason: true, createdAt: true },
      })
    : await prisma.boardSnapshot.create({
        data: {
          boardId: id,
          reason: "auto",
          data: data as never,
        },
        select: { id: true, label: true, reason: true, createdAt: true },
      });

  return NextResponse.json({ snapshot });
});
