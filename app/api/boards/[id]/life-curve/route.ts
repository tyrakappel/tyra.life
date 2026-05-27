import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handler, requireUserApi, assertBoardOwner } from "@/lib/api";
import type { LifeCurveData } from "@/lib/life-curve";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handler(async (_req: NextRequest, ctx: Ctx) => {
  const user = await requireUserApi();
  const { id } = await ctx.params;
  await assertBoardOwner(id, user.id);

  const curve = await prisma.lifeCurve.findUnique({
    where: { boardId: id },
    select: { birthYear: true, values: true },
  });

  const data: LifeCurveData = curve
    ? {
        birthYear: curve.birthYear,
        values: Array.isArray(curve.values) ? (curve.values as number[]) : [],
      }
    : { birthYear: null, values: [] };

  return NextResponse.json({ lifeCurve: data });
});

/**
 * Skriver hela kurvan. Upsert — skapar om den inte finns.
 * Body: { birthYear?: number | null, values: number[] }
 */
export const PUT = handler(async (req: NextRequest, ctx: Ctx) => {
  const user = await requireUserApi();
  const { id } = await ctx.params;
  await assertBoardOwner(id, user.id);

  const body = await req.json();
  const birthYear: number | null =
    typeof body.birthYear === "number"
      ? body.birthYear
      : body.birthYear === null
      ? null
      : undefined;
  const values: number[] = Array.isArray(body.values)
    ? body.values
        .map((v: unknown) => (typeof v === "number" ? v : 0))
        .map((v: number) => Math.max(-1, Math.min(1, v)))
    : [];

  const data: Parameters<typeof prisma.lifeCurve.upsert>[0]["create"] = {
    boardId: id,
    birthYear: birthYear ?? null,
    values: values as never,
  };

  const updateData: Parameters<typeof prisma.lifeCurve.upsert>[0]["update"] = {
    values: values as never,
  };
  if (birthYear !== undefined) updateData.birthYear = birthYear;

  const curve = await prisma.lifeCurve.upsert({
    where: { boardId: id },
    create: data,
    update: updateData,
    select: { birthYear: true, values: true },
  });

  return NextResponse.json({
    lifeCurve: {
      birthYear: curve.birthYear,
      values: Array.isArray(curve.values) ? (curve.values as number[]) : [],
    },
  });
});
