import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handler, requireUserApi, assertTaskOwner } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handler(async (req: NextRequest, ctx: Ctx) => {
  const user = await requireUserApi();
  const { id } = await ctx.params;
  await assertTaskOwner(id, user.id);
  const body = await req.json();
  const data: {
    title?: string;
    description?: string | null;
    completed?: boolean;
    completedAt?: Date | null;
  } = {};
  if (typeof body.title === "string") data.title = body.title.trim();
  if (body.description !== undefined) data.description = body.description;
  if (typeof body.completed === "boolean") {
    data.completed = body.completed;
    data.completedAt = body.completed ? new Date() : null;
  }
  const task = await prisma.task.update({ where: { id }, data });
  return NextResponse.json({ task });
});

export const DELETE = handler(async (_req: NextRequest, ctx: Ctx) => {
  const user = await requireUserApi();
  const { id } = await ctx.params;
  await assertTaskOwner(id, user.id);
  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
