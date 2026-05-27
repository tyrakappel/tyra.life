export type ColorTheme = "indigo" | "emerald" | "rose";

export const COLOR_THEMES: {
  id: ColorTheme;
  name: string;
  /** Förhandsvisning i menyn (dark-mode-version av accent) */
  preview: string;
}[] = [
  { id: "indigo", name: "Indigo", preview: "rgb(168 145 255)" },
  { id: "emerald", name: "Emerald", preview: "rgb(52 211 153)" },
  { id: "rose", name: "Rose", preview: "rgb(244 114 182)" },
];

export const DEFAULT_COLOR_THEME: ColorTheme = "indigo";
export const COLOR_THEME_STORAGE_KEY = "tyra-color-theme";
