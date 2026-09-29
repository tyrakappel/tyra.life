import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { MoodBoardView } from "@/components/board/mood-board-view";

/**
 * Publik läslänk till ett mood board. Ingen inloggning: tokenen i URL:en är
 * nyckeln, och den kan när som helst stängas av av ägaren. Sidan är
 * skrivskyddad och indexeras inte av sökmotorer.
 */

type Props = { params: Promise<{ token: string }> };

async function findShared(token: string) {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  return prisma.moodBoard.findUnique({
    where: { shareToken: token },
    select: {
      id: true,
      name: true,
      emoji: true,
      items: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          kind: true,
          url: true,
          posterUrl: true,
          width: true,
          height: true,
          depth: true,
        },
      },
    },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const board = await findShared((await params).token);
  return {
    title: board ? `${board.name} · Levalife` : "Levalife",
    robots: { index: false, follow: false },
  };
}

export default async function SharedMoodBoardPage({ params }: Props) {
  const board = await findShared((await params).token);
  if (!board) notFound();

  return (
    <div data-color-theme="mood" className="h-dvh flex flex-col bg-bg text-fg">
      <header className="flex-shrink-0 px-3 sm:px-5 py-3 flex items-center gap-3 border-b border-border/60">
        <div
          aria-label="Levalife"
          className="flex-shrink-0 inline-flex items-center justify-center size-8 rounded-lg bg-accent shadow-sm shadow-accent/40 ring-1 ring-accent/30"
        >
          <Sparkles className="size-4 text-accent-fg" strokeWidth={2.4} />
        </div>
        <div className="flex items-center gap-1.5 min-w-0">
          {board.emoji && <span className="text-base leading-none">{board.emoji}</span>}
          <h1 className="text-sm font-semibold truncate">{board.name}</h1>
        </div>
        <span className="ml-auto text-xs text-fg-muted/60 select-none">Delat från Levalife</span>
      </header>
      <MoodBoardView
        moodBoardId={board.id}
        readOnly
        initialItems={board.items.map((i) => ({
          ...i,
          kind: i.kind === "video" ? "video" : "image",
        }))}
      />
    </div>
  );
}
