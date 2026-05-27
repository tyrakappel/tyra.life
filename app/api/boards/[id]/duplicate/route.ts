import { NextRequest, NextResponse } from "next/server";
import { handler, requireUserApi, assertBoardOwner } from "@/lib/api";
import { duplicateBoard } from "@/lib/board-ops";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handler(async (req: NextRequest, ctx: Ctx) => {
  const user = await requireUserApi();
  const { id } = await ctx.params;
  await assertBoardOwner(id, user.id);

  const body = await req.json().catch(() => ({}));
  const customName: string | undefined = body?.name?.toString().trim() || undefined;

  const newId = await duplicateBoard(id, user.id, customName);
  return NextResponse.json({ id: newId }, { status: 201 });
});
