"use client";

import { create } from "zustand";
import { nanoid } from "nanoid";
import { api } from "./api-client";
import { computeOrder, ORDER_STEP } from "./ordering";
import type { Board, Section, Subcategory, Task } from "./types";

type State = {
  board: Board;

  // Board
  renameBoard: (name: string) => void;

  // Sections
  addSection: (title: string) => void;
  renameSection: (id: string, title: string) => void;
  setSectionDescription: (id: string, description: string | null) => void;
  setSectionColor: (id: string, color: string | null) => void;
  deleteSection: (id: string) => void;
  reorderSections: (sectionIds: string[]) => void;

  // Subcategories
  addSubcategory: (sectionId: string, title: string) => void;
  renameSubcategory: (id: string, title: string) => void;
  deleteSubcategory: (id: string) => void;
  reorderSubcategories: (sectionId: string, subIds: string[]) => void;

  // Tasks
  addTask: (subcategoryId: string, title: string) => void;
  renameTask: (id: string, title: string) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  reorderTasks: (subcategoryId: string, taskIds: string[]) => void;
  moveTaskToSubcategory: (
    taskId: string,
    toSubcategoryId: string,
    insertBeforeTaskId: string | null
  ) => void;
};

const findSection = (board: Board, id: string) =>
  board.sections.find((s) => s.id === id);

const findSubcategory = (board: Board, id: string) => {
  for (const s of board.sections) {
    const sub = s.subcategories.find((c) => c.id === id);
    if (sub) return { section: s, sub };
  }
  return null;
};

const findTask = (board: Board, id: string) => {
  for (const s of board.sections) {
    for (const c of s.subcategories) {
      const t = c.tasks.find((t) => t.id === id);
      if (t) return { section: s, sub: c, task: t };
    }
  }
  return null;
};

export const createBoardStore = (initialBoard: Board) =>
  create<State>((set, get) => ({
    board: initialBoard,

    renameBoard: (name) => {
      const id = get().board.id;
      set((st) => ({ board: { ...st.board, name } }));
      api.updateBoard(id, { name }).catch(console.error);
    },

    // ============ Sections ============

    addSection: (title) => {
      const boardId = get().board.id;
      const tempId = `tmp_${nanoid()}`;
      const last = get().board.sections.at(-1);
      const order = (last?.order ?? 0) + ORDER_STEP;
      const optimistic: Section = {
        id: tempId,
        _clientKey: tempId,
        boardId,
        title,
        description: null,
        color: null,
        order,
        subcategories: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      set((st) => ({
        board: { ...st.board, sections: [...st.board.sections, optimistic] },
      }));
      api.createSection(boardId, title).then((r) => {
        set((st) => ({
          board: {
            ...st.board,
            sections: st.board.sections.map((s) =>
              s.id === tempId
                ? { ...r.section, _clientKey: tempId, subcategories: [] }
                : s
            ),
          },
        }));
      }).catch(console.error);
    },

    renameSection: (id, title) => {
      set((st) => ({
        board: {
          ...st.board,
          sections: st.board.sections.map((s) =>
            s.id === id ? { ...s, title } : s
          ),
        },
      }));
      if (!id.startsWith("tmp_")) api.updateSection(id, { title }).catch(console.error);
    },

    setSectionDescription: (id, description) => {
      set((st) => ({
        board: {
          ...st.board,
          sections: st.board.sections.map((s) =>
            s.id === id ? { ...s, description } : s
          ),
        },
      }));
      if (!id.startsWith("tmp_")) api.updateSection(id, { description }).catch(console.error);
    },

    setSectionColor: (id, color) => {
      set((st) => ({
        board: {
          ...st.board,
          sections: st.board.sections.map((s) =>
            s.id === id ? { ...s, color } : s
          ),
        },
      }));
      if (!id.startsWith("tmp_")) api.updateSection(id, { color }).catch(console.error);
    },

    deleteSection: (id) => {
      set((st) => ({
        board: {
          ...st.board,
          sections: st.board.sections.filter((s) => s.id !== id),
        },
      }));
      if (!id.startsWith("tmp_")) api.deleteSection(id).catch(console.error);
    },

    reorderSections: (sectionIds) => {
      const current = get().board.sections;
      const byId = new Map(current.map((s) => [s.id, s]));
      const reordered = sectionIds
        .map((id) => byId.get(id))
        .filter((s): s is Section => Boolean(s));
      // ge nya orders med jämna mellanrum
      const withOrders = reordered.map((s, i) => ({
        ...s,
        order: (i + 1) * ORDER_STEP,
      }));
      set((st) => ({ board: { ...st.board, sections: withOrders } }));

      // hitta vad som flyttats och persistera bara den ena
      const movedIdx = withOrders.findIndex((s, i) => current[i]?.id !== s.id);
      if (movedIdx < 0) return;
      const moved = withOrders[movedIdx];
      const prev = withOrders[movedIdx - 1];
      const next = withOrders[movedIdx + 1];
      api.reorderSection(moved.id, next?.id ?? null, prev?.id ?? null).catch(console.error);
    },

    // ============ Subcategories ============

    addSubcategory: (sectionId, title) => {
      const tempId = `tmp_${nanoid()}`;
      const section = findSection(get().board, sectionId);
      if (!section) return;
      const last = section.subcategories.at(-1);
      const order = (last?.order ?? 0) + ORDER_STEP;
      const optimistic: Subcategory = {
        id: tempId,
        _clientKey: tempId,
        sectionId,
        title,
        description: null,
        order,
        tasks: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      set((st) => ({
        board: {
          ...st.board,
          sections: st.board.sections.map((s) =>
            s.id === sectionId
              ? { ...s, subcategories: [...s.subcategories, optimistic] }
              : s
          ),
        },
      }));
      api.createSubcategory(sectionId, title).then((r) => {
        set((st) => ({
          board: {
            ...st.board,
            sections: st.board.sections.map((s) =>
              s.id === sectionId
                ? {
                    ...s,
                    subcategories: s.subcategories.map((sub) =>
                      sub.id === tempId
                        ? { ...r.subcategory, _clientKey: tempId, tasks: [] }
                        : sub
                    ),
                  }
                : s
            ),
          },
        }));
      }).catch(console.error);
    },

    renameSubcategory: (id, title) => {
      set((st) => ({
        board: {
          ...st.board,
          sections: st.board.sections.map((s) => ({
            ...s,
            subcategories: s.subcategories.map((sub) =>
              sub.id === id ? { ...sub, title } : sub
            ),
          })),
        },
      }));
      if (!id.startsWith("tmp_")) api.updateSubcategory(id, { title }).catch(console.error);
    },

    deleteSubcategory: (id) => {
      set((st) => ({
        board: {
          ...st.board,
          sections: st.board.sections.map((s) => ({
            ...s,
            subcategories: s.subcategories.filter((sub) => sub.id !== id),
          })),
        },
      }));
      if (!id.startsWith("tmp_")) api.deleteSubcategory(id).catch(console.error);
    },

    reorderSubcategories: (sectionId, subIds) => {
      const section = findSection(get().board, sectionId);
      if (!section) return;
      const byId = new Map(section.subcategories.map((s) => [s.id, s]));
      const reordered = subIds
        .map((id) => byId.get(id))
        .filter((s): s is Subcategory => Boolean(s))
        .map((sub, i) => ({ ...sub, order: (i + 1) * ORDER_STEP }));

      const movedIdx = reordered.findIndex(
        (sub, i) => section.subcategories[i]?.id !== sub.id
      );

      set((st) => ({
        board: {
          ...st.board,
          sections: st.board.sections.map((s) =>
            s.id === sectionId ? { ...s, subcategories: reordered } : s
          ),
        },
      }));

      if (movedIdx < 0) return;
      const moved = reordered[movedIdx];
      const prev = reordered[movedIdx - 1];
      const next = reordered[movedIdx + 1];
      api
        .reorderSubcategory(moved.id, sectionId, next?.id ?? null, prev?.id ?? null)
        .catch(console.error);
    },

    // ============ Tasks ============

    addTask: (subcategoryId, title) => {
      const tempId = `tmp_${nanoid()}`;
      const found = findSubcategory(get().board, subcategoryId);
      if (!found) return;
      const lastIncomplete = found.sub.tasks
        .filter((t) => !t.completed)
        .at(-1);
      const order = (lastIncomplete?.order ?? 0) + ORDER_STEP;
      const optimistic: Task = {
        id: tempId,
        _clientKey: tempId,
        subcategoryId,
        title,
        description: null,
        completed: false,
        completedAt: null,
        order,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      set((st) => ({
        board: {
          ...st.board,
          sections: st.board.sections.map((s) => ({
            ...s,
            subcategories: s.subcategories.map((sub) =>
              sub.id === subcategoryId
                ? { ...sub, tasks: [...sub.tasks, optimistic] }
                : sub
            ),
          })),
        },
      }));
      api.createTask(subcategoryId, title).then((r) => {
        set((st) => ({
          board: {
            ...st.board,
            sections: st.board.sections.map((s) => ({
              ...s,
              subcategories: s.subcategories.map((sub) =>
                sub.id === subcategoryId
                  ? {
                      ...sub,
                      tasks: sub.tasks.map((t) =>
                        t.id === tempId
                          ? { ...r.task, _clientKey: tempId }
                          : t
                      ),
                    }
                  : sub
              ),
            })),
          },
        }));
      }).catch(console.error);
    },

    renameTask: (id, title) => {
      set((st) => ({
        board: {
          ...st.board,
          sections: st.board.sections.map((s) => ({
            ...s,
            subcategories: s.subcategories.map((sub) => ({
              ...sub,
              tasks: sub.tasks.map((t) => (t.id === id ? { ...t, title } : t)),
            })),
          })),
        },
      }));
      if (!id.startsWith("tmp_")) api.updateTask(id, { title }).catch(console.error);
    },

    toggleTask: (id) => {
      const found = findTask(get().board, id);
      if (!found) return;
      const completed = !found.task.completed;
      set((st) => ({
        board: {
          ...st.board,
          sections: st.board.sections.map((s) => ({
            ...s,
            subcategories: s.subcategories.map((sub) => ({
              ...sub,
              tasks: sub.tasks.map((t) =>
                t.id === id
                  ? { ...t, completed, completedAt: completed ? new Date() : null }
                  : t
              ),
            })),
          })),
        },
      }));
      if (!id.startsWith("tmp_")) api.updateTask(id, { completed }).catch(console.error);
    },

    deleteTask: (id) => {
      set((st) => ({
        board: {
          ...st.board,
          sections: st.board.sections.map((s) => ({
            ...s,
            subcategories: s.subcategories.map((sub) => ({
              ...sub,
              tasks: sub.tasks.filter((t) => t.id !== id),
            })),
          })),
        },
      }));
      if (!id.startsWith("tmp_")) api.deleteTask(id).catch(console.error);
    },

    reorderTasks: (subcategoryId, taskIds) => {
      const found = findSubcategory(get().board, subcategoryId);
      if (!found) return;
      const byId = new Map(found.sub.tasks.map((t) => [t.id, t]));
      const reordered = taskIds
        .map((id) => byId.get(id))
        .filter((t): t is Task => Boolean(t))
        .map((t, i) => ({ ...t, order: (i + 1) * ORDER_STEP }));

      const movedIdx = reordered.findIndex(
        (t, i) => found.sub.tasks[i]?.id !== t.id
      );

      set((st) => ({
        board: {
          ...st.board,
          sections: st.board.sections.map((s) => ({
            ...s,
            subcategories: s.subcategories.map((sub) =>
              sub.id === subcategoryId ? { ...sub, tasks: reordered } : sub
            ),
          })),
        },
      }));

      if (movedIdx < 0) return;
      const moved = reordered[movedIdx];
      const prev = reordered[movedIdx - 1];
      const next = reordered[movedIdx + 1];
      api
        .reorderTask(moved.id, subcategoryId, next?.id ?? null, prev?.id ?? null)
        .catch(console.error);
    },

    /**
     * Flytta en task till en annan subkategori vid en specifik position.
     * - `taskId`: task som flyttas
     * - `toSubcategoryId`: målsubkategori
     * - `insertBeforeTaskId`: id på task som ska komma EFTER den flyttade
     *   i mål-listan. null = lägg sist.
     */
    moveTaskToSubcategory: (
      taskId: string,
      toSubcategoryId: string,
      insertBeforeTaskId: string | null
    ) => {
      const board = get().board;
      // Hitta source
      let fromSub: Subcategory | null = null;
      let task: Task | null = null;
      for (const s of board.sections) {
        for (const c of s.subcategories) {
          const t = c.tasks.find((x) => x.id === taskId);
          if (t) {
            fromSub = c;
            task = t;
            break;
          }
        }
        if (task) break;
      }
      if (!task || !fromSub) return;
      if (fromSub.id === toSubcategoryId) return; // not a cross-move

      const toSubFound = findSubcategory(board, toSubcategoryId);
      if (!toSubFound) return;

      // Bygg ny task med uppdaterat subcategoryId
      // Beräkna ny order baserat på target-listans grannar
      const targetTasks = toSubFound.sub.tasks;
      const insertIndex =
        insertBeforeTaskId == null
          ? targetTasks.length
          : Math.max(
              0,
              targetTasks.findIndex((t) => t.id === insertBeforeTaskId)
            );
      const prevOrder = targetTasks[insertIndex - 1]?.order ?? null;
      const nextOrder = targetTasks[insertIndex]?.order ?? null;
      const newOrder = computeOrder(prevOrder, nextOrder);

      const movedTask: Task = {
        ...task,
        subcategoryId: toSubcategoryId,
        order: newOrder,
      };

      // Uppdatera state: ta bort från fromSub, lägg in i toSub vid rätt index
      set((st) => ({
        board: {
          ...st.board,
          sections: st.board.sections.map((s) => ({
            ...s,
            subcategories: s.subcategories.map((sub) => {
              if (sub.id === fromSub!.id) {
                return {
                  ...sub,
                  tasks: sub.tasks.filter((t) => t.id !== taskId),
                };
              }
              if (sub.id === toSubcategoryId) {
                const newList = [...sub.tasks];
                newList.splice(insertIndex, 0, movedTask);
                return { ...sub, tasks: newList };
              }
              return sub;
            }),
          })),
        },
      }));

      // Skicka till server — passar med subcategoryId så servern uppdaterar fk:n
      if (!taskId.startsWith("tmp_")) {
        const afterId = targetTasks[insertIndex - 1]?.id ?? null;
        const beforeId = insertBeforeTaskId;
        api
          .reorderTask(taskId, toSubcategoryId, beforeId, afterId)
          .catch(console.error);
      }
    },
  }));

// Compute helper exporterad så komponenter slipper importera ordering direkt
export { computeOrder };
