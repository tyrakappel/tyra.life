export type Task = {
  id: string;
  subcategoryId: string;
  title: string;
  description: string | null;
  completed: boolean;
  completedAt: string | Date | null;
  order: number;
  createdAt: string | Date;
  updatedAt: string | Date;
  /** Stabil React-nyckel som överlever id-byten optimistic→server */
  _clientKey?: string;
};

export type Subcategory = {
  id: string;
  sectionId: string;
  title: string;
  description: string | null;
  order: number;
  tasks: Task[];
  createdAt: string | Date;
  updatedAt: string | Date;
  _clientKey?: string;
};

export type Section = {
  id: string;
  boardId: string;
  title: string;
  description: string | null;
  color: string | null;
  order: number;
  subcategories: Subcategory[];
  createdAt: string | Date;
  updatedAt: string | Date;
  _clientKey?: string;
};

export type Board = {
  id: string;
  userId: string;
  name: string;
  emoji: string | null;
  order: number;
  sections: Section[];
  lifeCurve?: {
    birthYear: number | null;
    values: number[];
  } | null;
  createdAt: string | Date;
  updatedAt: string | Date;
};

export type BoardSummary = Pick<Board, "id" | "name" | "emoji" | "order"> & {
  updatedAt: string | Date;
};
