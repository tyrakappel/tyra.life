import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handler, requireUserApi, assertSectionOwner } from "@/lib/api";
import { ORDER_STEP } from "@/lib/ordering";

export const POST = handler(async (req: NextRequest) => {
  const user = await requireUserApi();
  const { sectionId, title, description } = await req.json();
  if (!sectionId || !title?.trim()) {
    return NextResponse.json({ error: "sectionId and title required" }, { status: 400 });
  }
  await assertSectionOwner(sectionId, user.id);

  const last = await prisma.subcategory.findFirst({
    where: { sectionId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const subcategory = await prisma.subcategory.create({
    data: {
      sectionId,
      title: title.trim(),
      description,
      order: (last?.order ?? 0) + ORDER_STEP,
    },
    include: { tasks: true },
  });
  return NextResponse.json({ subcategory }, { status: 201 });
});
