import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handler, requireUserApi, assertSubcategoryOwner } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handler(async (req: NextRequest, ctx: Ctx) => {
  const user = await requireUserApi();
  const { id } = await ctx.params;
  await assertSubcategoryOwner(id, user.id);
  const body = await req.json();
  const data: { title?: string; description?: string | null } = {};
  if (typeof body.title === "string") data.title = body.title.trim();
  if (body.description !== undefined) data.description = body.description;
  const subcategory = await prisma.subcategory.update({ where: { id }, data });
  return NextResponse.json({ subcategory });
});

export const DELETE = handler(async (_req: NextRequest, ctx: Ctx) => {
  const user = await requireUserApi();
  const { id } = await ctx.params;
  await assertSubcategoryOwner(id, user.id);
  await prisma.subcategory.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
