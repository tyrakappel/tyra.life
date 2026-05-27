import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api";
import { BoardView } from "@/components/board/board-view";
import type { Board } from "@/lib/types";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const board = await prisma.board.findFirst({
    where: { id, userId: user.id },
    include: {
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

  if (!board) notFound();

  return <BoardView initialBoard={board as unknown as Board} />;
}
