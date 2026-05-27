import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api";
import { ORDER_STEP } from "@/lib/ordering";

export default async function HomePage() {
  const user = await requireUser();

  let board = await prisma.board.findFirst({
    where: { userId: user.id },
    orderBy: { order: "asc" },
    select: { id: true },
  });

  if (!board) {
    board = await prisma.board.create({
      data: {
        userId: user.id,
        name: "Mitt liv",
        emoji: "🌱",
        order: ORDER_STEP,
      },
      select: { id: true },
    });
  }

  redirect(`/board/${board.id}`);
}
