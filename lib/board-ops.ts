import { prisma } from "./prisma";
import { captureBoardSnapshot } from "./snapshot";
import { ORDER_STEP } from "./ordering";

/**
 * Skapar en djup-kopia av en board, inklusive alla sektioner,
 * subkategorier och tasks. Returnerar id på den nya boarden.
 *
 * Använder captureBoardSnapshot för att läsa källans struktur och
 * skapar sedan allt på en gång via nested writes (en transaktion
 * per sektion för att hålla minne under kontroll på stora boards).
 */
export async function duplicateBoard(
  sourceBoardId: string,
  userId: string,
  customName?: string
): Promise<string> {
  const source = await prisma.board.findFirst({
    where: { id: sourceBoardId, userId },
    select: { name: true, emoji: true },
  });
  if (!source) throw new Response("Not found", { status: 404 });

  const data = await captureBoardSnapshot(sourceBoardId);

  const last = await prisma.board.findFirst({
    where: { userId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const newBoard = await prisma.board.create({
    data: {
      userId,
      name: customName?.trim() || `${source.name} (kopia)`,
      emoji: source.emoji,
      order: (last?.order ?? 0) + ORDER_STEP,
    },
  });

  // Återskapa sections → subcategories → tasks via nested writes
  for (const [si, s] of data.sections.entries()) {
    await prisma.section.create({
      data: {
        boardId: newBoard.id,
        title: s.title,
        description: s.description,
        color: s.color,
        order: s.order ?? (si + 1) * ORDER_STEP,
        subcategories: {
          create: s.subcategories.map((sub, subi) => ({
            title: sub.title,
            description: sub.description,
            order: sub.order ?? (subi + 1) * ORDER_STEP,
            tasks: {
              create: sub.tasks.map((t, ti) => ({
                title: t.title,
                description: t.description,
                // Bevara completed-status och tider — eller börja om?
                // Default: bevara så det är en exakt kopia
                completed: t.completed,
                completedAt: t.completedAt ? new Date(t.completedAt) : null,
                order: t.order ?? (ti + 1) * ORDER_STEP,
              })),
            },
          })),
        },
      },
    });
  }

  return newBoard.id;
}
