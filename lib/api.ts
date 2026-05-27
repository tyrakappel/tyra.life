import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { prisma } from "./prisma";

export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}

/**
 * För server components: redirectar till /signin om inte inloggad.
 * För API-routes: använd requireUserApi som kastar 401.
 */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  return user;
}

export async function requireUserApi() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Response("Unauthorized", { status: 401 });
  }
  return user;
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function assertBoardOwner(boardId: string, userId: string) {
  const board = await prisma.board.findFirst({
    where: { id: boardId, userId },
    select: { id: true },
  });
  if (!board) throw new Response("Not found", { status: 404 });
}

export async function assertSectionOwner(sectionId: string, userId: string) {
  const section = await prisma.section.findFirst({
    where: { id: sectionId, board: { userId } },
    select: { id: true, boardId: true },
  });
  if (!section) throw new Response("Not found", { status: 404 });
  return section;
}

export async function assertSubcategoryOwner(subcategoryId: string, userId: string) {
  const sub = await prisma.subcategory.findFirst({
    where: { id: subcategoryId, section: { board: { userId } } },
    select: { id: true, sectionId: true },
  });
  if (!sub) throw new Response("Not found", { status: 404 });
  return sub;
}

export async function assertTaskOwner(taskId: string, userId: string) {
  const task = await prisma.task.findFirst({
    where: { id: taskId, subcategory: { section: { board: { userId } } } },
    select: { id: true, subcategoryId: true, completed: true },
  });
  if (!task) throw new Response("Not found", { status: 404 });
  return task;
}

/**
 * Wrap an API handler so thrown Responses become the response.
 */
export function handler<T extends (...args: never[]) => Promise<Response>>(
  fn: T
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof Response) return err;
      console.error("[api]", err);
      return jsonError("Internal server error", 500);
    }
  }) as T;
}
