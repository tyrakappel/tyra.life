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
  updateBoard: (id: string, data: { name?: string; emoji?: string | null }) =>
    req(`/api/boards/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
};
