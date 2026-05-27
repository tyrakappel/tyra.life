import { prisma } from "./prisma";
import { ORDER_STEP } from "./ordering";

/**
 * Serialiserar en boards hela innehåll till JSON som kan sparas
 * i BoardSnapshot.data.
 */
export type SnapshotData = {
  name: string;
  emoji: string | null;
  lifeCurve: {
    birthYear: number | null;
    values: number[];
  } | null;
  sections: {
    title: string;
    description: string | null;
    color: string | null;
    order: number;
    subcategories: {
      title: string;
      description: string | null;
      order: number;
      tasks: {
        title: string;
        description: string | null;
        completed: boolean;
        completedAt: string | null;
        order: number;
      }[];
    }[];
  }[];
};

export async function captureBoardSnapshot(boardId: string): Promise<SnapshotData> {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: {
      lifeCurve: true,
      sections: {
        orderBy: { order: "asc" },
        include: {
          subcategories: {
            orderBy: { order: "asc" },
            include: {
              tasks: { orderBy: { order: "asc" } },
            },
          },
        },
      },
    },
  });
  if (!board) throw new Response("Board not found", { status: 404 });

  return {
    name: board.name,
    emoji: board.emoji,
    lifeCurve: board.lifeCurve
      ? {
          birthYear: board.lifeCurve.birthYear,
          values: Array.isArray(board.lifeCurve.values)
            ? (board.lifeCurve.values as number[])
            : [],
        }
      : null,
    sections: board.sections.map((s) => ({
      title: s.title,
      description: s.description,
      color: s.color,
      order: s.order,
      subcategories: s.subcategories.map((sub) => ({
        title: sub.title,
        description: sub.description,
        order: sub.order,
        tasks: sub.tasks.map((t) => ({
          title: t.title,
          description: t.description,
          completed: t.completed,
          completedAt: t.completedAt?.toISOString() ?? null,
          order: t.order,
        })),
      })),
    })),
  };
}

/**
 * Återställer en board från en snapshot. Skapar först en
 * "pre-restore"-snapshot av nuvarande tillstånd (för säkerhet) och
 * skriver sedan över board-innehållet inom en transaktion.
 */
export async function restoreBoardFromSnapshot(
  boardId: string,
  data: SnapshotData
): Promise<void> {
  // Skapa säkerhetskopia av nuvarande state innan vi skriver över
  const beforeRestore = await captureBoardSnapshot(boardId);
  await prisma.boardSnapshot.create({
    data: {
      boardId,
      label: "Auto-säkerhetskopia",
      reason: "pre-restore",
      data: beforeRestore as never,
    },
  });

  await prisma.$transaction(async (tx) => {
    // Uppdatera board-metadata
    await tx.board.update({
      where: { id: boardId },
      data: { name: data.name, emoji: data.emoji },
    });

    // LifeCurve — upsert eller delete
    if (data.lifeCurve) {
      await tx.lifeCurve.upsert({
        where: { boardId },
        create: {
          boardId,
          birthYear: data.lifeCurve.birthYear,
          values: data.lifeCurve.values as never,
        },
        update: {
          birthYear: data.lifeCurve.birthYear,
          values: data.lifeCurve.values as never,
        },
      });
    } else {
      await tx.lifeCurve.deleteMany({ where: { boardId } });
    }

    // Rensa allt befintligt innehåll (cascade till subcategories + tasks)
    await tx.section.deleteMany({ where: { boardId } });

    // Återskapa sections → subcategories → tasks
    for (const [si, s] of data.sections.entries()) {
      await tx.section.create({
        data: {
          boardId,
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
  });
}
