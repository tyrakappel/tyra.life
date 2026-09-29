/**
 * Klient-API wrappers. Alla muterande kall returnerar Promise<void>;
 * det är store:n som hanterar optimistic state.
 */

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}

export const api = {
  // Sections
  createSection: (boardId: string, title: string) =>
    req<{ section: any }>("/api/sections", {
      method: "POST",
      body: JSON.stringify({ boardId, title }),
    }),
  updateSection: (id: string, data: { title?: string; description?: string | null; color?: string | null }) =>
    req(`/api/sections/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteSection: (id: string) =>
    req(`/api/sections/${id}`, { method: "DELETE" }),
  reorderSection: (id: string, beforeId: string | null, afterId: string | null) =>
    req("/api/sections/reorder", {
      method: "POST",
      body: JSON.stringify({ id, beforeId, afterId }),
    }),

  // Subcategories
  createSubcategory: (sectionId: string, title: string) =>
    req<{ subcategory: any }>("/api/subcategories", {
      method: "POST",
      body: JSON.stringify({ sectionId, title }),
    }),
  updateSubcategory: (id: string, data: { title?: string; description?: string | null }) =>
    req(`/api/subcategories/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteSubcategory: (id: string) =>
    req(`/api/subcategories/${id}`, { method: "DELETE" }),
  reorderSubcategory: (id: string, sectionId: string, beforeId: string | null, afterId: string | null) =>
    req("/api/subcategories/reorder", {
      method: "POST",
      body: JSON.stringify({ id, sectionId, beforeId, afterId }),
    }),

  // Tasks
  createTask: (subcategoryId: string, title: string) =>
    req<{ task: any }>("/api/tasks", {
      method: "POST",
      body: JSON.stringify({ subcategoryId, title }),
    }),
  updateTask: (id: string, data: { title?: string; description?: string | null; completed?: boolean }) =>
    req(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteTask: (id: string) =>
    req(`/api/tasks/${id}`, { method: "DELETE" }),
  reorderTask: (id: string, subcategoryId: string, beforeId: string | null, afterId: string | null) =>
    req("/api/tasks/reorder", {
      method: "POST",
      body: JSON.stringify({ id, subcategoryId, beforeId, afterId }),
    }),

  // Board
  listBoards: () =>
    req<{
      boards: {
        id: string;
        name: string;
        emoji: string | null;
        order: number;
        updatedAt: string;
      }[];
    }>("/api/boards"),
  createBoard: (
    name: string,
    opts?: { emoji?: string; template?: "empty" | "livshjul" }
  ) =>
    req<{ board: { id: string; name: string; emoji: string | null; order: number } }>(
      "/api/boards",
      {
        method: "POST",
        body: JSON.stringify({
          name,
          emoji: opts?.emoji,
          template: opts?.template,
        }),
      }
    ),
  updateBoard: (id: string, data: { name?: string; emoji?: string | null }) =>
    req(`/api/boards/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteBoard: (id: string) =>
    req(`/api/boards/${id}`, { method: "DELETE" }),
  duplicateBoard: (id: string, name?: string) =>
    req<{ id: string }>(`/api/boards/${id}/duplicate`, {
      method: "POST",
      body: JSON.stringify({ name }),
    }),

  // Snapshots
  listSnapshots: (boardId: string) =>
    req<{
      snapshots: {
        id: string;
        label: string | null;
        reason: string | null;
        createdAt: string;
      }[];
    }>(`/api/boards/${boardId}/snapshots`),
  createSnapshot: (boardId: string, label?: string) =>
    req<{ snapshot: { id: string; label: string | null; reason: string | null; createdAt: string } }>(
      `/api/boards/${boardId}/snapshots`,
      {
        method: "POST",
        body: JSON.stringify({ label, reason: "manuell" }),
      }
    ),
  getSnapshot: (boardId: string, snapshotId: string) =>
    req<{
      snapshot: {
        id: string;
        label: string | null;
        reason: string | null;
        createdAt: string;
        data: import("./snapshot").SnapshotData;
      };
    }>(`/api/boards/${boardId}/snapshots/${snapshotId}`),
  deleteSnapshot: (boardId: string, snapshotId: string) =>
    req(`/api/boards/${boardId}/snapshots/${snapshotId}`, { method: "DELETE" }),
  restoreSnapshot: (boardId: string, snapshotId: string) =>
    req(`/api/boards/${boardId}/snapshots/${snapshotId}/restore`, { method: "POST" }),
  autoSnapshot: (boardId: string) =>
    req<{ snapshot?: { id: string; createdAt: string }; skipped?: boolean; reason?: string }>(
      `/api/boards/${boardId}/auto-snapshot`,
      { method: "POST" }
    ),

  // LifeCurve
  getLifeCurve: (boardId: string) =>
    req<{ lifeCurve: { birthYear: number | null; values: number[] } }>(
      `/api/boards/${boardId}/life-curve`
    ),
  putLifeCurve: (
    boardId: string,
    data: { birthYear?: number | null; values: number[] }
  ) =>
    req<{ lifeCurve: { birthYear: number | null; values: number[] } }>(
      `/api/boards/${boardId}/life-curve`,
      { method: "PUT", body: JSON.stringify(data) }
    ),

  // Mood Board
  listMoodBoards: () => req<{ boards: MoodBoardSummary[] }>("/api/mood-boards"),
  createMoodBoard: (name: string, emoji: string | null) =>
    req<{ board: MoodBoardSummary }>("/api/mood-boards", {
      method: "POST",
      body: JSON.stringify({ name, emoji }),
    }),
  updateMoodBoard: (id: string, data: { name?: string; emoji?: string | null }) =>
    req<{ board: MoodBoardSummary }>(`/api/mood-boards/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteMoodBoard: (id: string) =>
    req(`/api/mood-boards/${id}`, { method: "DELETE" }),
  listMoodItems: (moodBoardId: string) =>
    req<{ items: MoodItem[] }>(`/api/mood-boards/${moodBoardId}/items`),
  createMoodUpload: (contentType: string, bytes: number, posterBytes?: number) =>
    req<{
      uploadUrl: string;
      key: string;
      posterUploadUrl?: string;
      posterKey?: string;
    }>("/api/mood-items/upload-url", {
      method: "POST",
      body: JSON.stringify({ contentType, bytes, posterBytes }),
    }),
  moveMoodItem: (id: string, moodBoardId: string) =>
    req(`/api/mood-items/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ moodBoardId }),
    }),
  deleteMoodItem: (id: string) =>
    req(`/api/mood-items/${id}`, { method: "DELETE" }),
  findMoodDuplicates: (moodBoardId: string, hashes: string[]) =>
    req<{ existing: string[] }>(`/api/mood-boards/${moodBoardId}/duplicates`, {
      method: "POST",
      body: JSON.stringify({ hashes }),
    }),
  saveMoodItem: (moodBoardId: string, data: {
    key: string;
    width: number;
    height: number;
    bytes: number;
    contentHash: string;
  }) =>
    req<{ item: MoodItem }>(`/api/mood-boards/${moodBoardId}/items`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

export type MoodBoardSummary = {
  id: string;
  name: string;
  emoji: string | null;
  order: number;
};

export type MoodItem = {
  id: string;
  kind: "image" | "video";
  url: string;
  posterUrl: string | null;
  width: number;
  height: number;
  depth: number;
};
