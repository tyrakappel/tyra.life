import type { Board } from "./types";
import type { SnapshotData } from "./snapshot";

/**
 * Konverterar en SnapshotData (utan id) till en Board-struktur som
 * komponenterna kan rendera. Genererar syntetiska id:n med en
 * `preview-`-prefix så DnD-listor får unika nycklar.
 */
export function snapshotToBoard(
  snapshot: SnapshotData,
  boardId: string
): Board {
  const now = new Date();
  return {
    id: boardId,
    userId: "preview",
    name: snapshot.name,
    emoji: snapshot.emoji,
    order: 0,
    createdAt: now,
    updatedAt: now,
    sections: snapshot.sections.map((s, si) => {
      const sectionId = `preview-sec-${si}`;
      return {
        id: sectionId,
        boardId,
        title: s.title,
        description: s.description,
        color: s.color,
        order: s.order,
        createdAt: now,
        updatedAt: now,
        subcategories: s.subcategories.map((sub, subi) => {
          const subcategoryId = `preview-sub-${si}-${subi}`;
          return {
            id: subcategoryId,
            sectionId,
            title: sub.title,
            description: sub.description,
            order: sub.order,
            createdAt: now,
            updatedAt: now,
            tasks: sub.tasks.map((t, ti) => ({
              id: `preview-task-${si}-${subi}-${ti}`,
              subcategoryId,
              title: t.title,
              description: t.description,
              completed: t.completed,
              completedAt: t.completedAt,
              order: t.order,
              createdAt: now,
              updatedAt: now,
            })),
          };
        }),
      };
    }),
  };
}
