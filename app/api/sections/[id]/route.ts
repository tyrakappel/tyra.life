import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handler, requireUserApi, assertSectionOwner } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handler(async (req: NextRequest, ctx: Ctx) => {
  const user = await requireUserApi();
  const { id } = await ctx.params;
  await assertSectionOwner(id, user.id);
  const body = await req.json();
  const data: { title?: string; description?: string | null; color?: string | null } = {};
  if (typeof body.title === "string") data.title = body.title.trim();
  if (body.description !== undefined) data.description = body.description;
  if (body.color !== undefined) data.color = body.color;
  const section = await prisma.section.update({ where: { id }, data });
  return NextResponse.json({ section });
});

export const DELETE = handler(async (_req: NextRequest, ctx: Ctx) => {
  const user = await requireUserApi();
  const { id } = await ctx.params;
  await assertSectionOwner(id, user.id);
  await prisma.section.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
