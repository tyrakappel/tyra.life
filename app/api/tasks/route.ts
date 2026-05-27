import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handler, requireUserApi, assertSubcategoryOwner } from "@/lib/api";
import { ORDER_STEP } from "@/lib/ordering";

export const POST = handler(async (req: NextRequest) => {
  const user = await requireUserApi();
  const { subcategoryId, title, description } = await req.json();
  if (!subcategoryId || !title?.trim()) {
    return NextResponse.json(
      { error: "subcategoryId and title required" },
      { status: 400 }
    );
  }
  await assertSubcategoryOwner(subcategoryId, user.id);

  const last = await prisma.task.findFirst({
    where: { subcategoryId, completed: false },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const task = await prisma.task.create({
    data: {
      subcategoryId,
      title: title.trim(),
      description,
      order: (last?.order ?? 0) + ORDER_STEP,
    },
  });
  return NextResponse.json({ task }, { status: 201 });
});
