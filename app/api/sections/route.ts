import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handler, requireUserApi, assertBoardOwner } from "@/lib/api";
import { ORDER_STEP } from "@/lib/ordering";

export const POST = handler(async (req: NextRequest) => {
  const user = await requireUserApi();
  const { boardId, title, description, color } = await req.json();
  if (!boardId || !title?.trim()) {
    return NextResponse.json({ error: "boardId and title required" }, { status: 400 });
  }
  await assertBoardOwner(boardId, user.id);

  const last = await prisma.section.findFirst({
    where: { boardId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const section = await prisma.section.create({
    data: {
      boardId,
      title: title.trim(),
      description,
      color,
      order: (last?.order ?? 0) + ORDER_STEP,
    },
    include: { subcategories: { include: { tasks: true } } },
  });
  return NextResponse.json({ section }, { status: 201 });
});
