import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handler, requireUserApi, assertBoardOwner } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handler(async (_req: NextRequest, ctx: Ctx) => {
  const user = await requireUserApi();
  const { id } = await ctx.params;

  const board = await prisma.board.findFirst({
    where: { id, userId: user.id },
    include: {
      sections: {
        orderBy: { order: "asc" },
        include: {
          subcategories: {
            orderBy: { order: "asc" },
            include: {
              tasks: {
                orderBy: [{ completed: "asc" }, { order: "asc" }],
              },
            },
          },
        },
      },
    },
  });

  if (!board) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ board });
});

export const PATCH = handler(async (req: NextRequest, ctx: Ctx) => {
  const user = await requireUserApi();
  const { id } = await ctx.params;
  await assertBoardOwner(id, user.id);
  const body = await req.json();
  const data: { name?: string; emoji?: string | null } = {};
  if (typeof body.name === "string") data.name = body.name.trim();
  if (body.emoji !== undefined) data.emoji = body.emoji;
  const board = await prisma.board.update({ where: { id }, data });
  return NextResponse.json({ board });
});

export const DELETE = handler(async (_req: NextRequest, ctx: Ctx) => {
  const user = await requireUserApi();
  const { id } = await ctx.params;
  await assertBoardOwner(id, user.id);
  await prisma.board.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
