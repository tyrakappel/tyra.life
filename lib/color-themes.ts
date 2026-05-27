export type ColorTheme = "indigo" | "emerald" | "spectrum";

export const COLOR_THEMES: {
  id: ColorTheme;
  name: string;
  /** Förhandsvisning i menyn — kan vara en gradient eller solid */
  preview: string;
  description?: string;
}[] = [
  {
    id: "indigo",
    name: "Indigo",
    preview: "rgb(168 145 255)",
    description: "Mörk midnatt",
  },
  {
    id: "emerald",
    name: "Emerald",
    preview: "rgb(5 150 105)",
    description: "Ljus daggryning",
  },
  {
    id: "spectrum",
    name: "Spectrum",
    preview:
      "linear-gradient(135deg, #fca5a5 0%, #fcd34d 25%, #86efac 50%, #93c5fd 75%, #f0abfc 100%)",
    description: "Färgglada kolumner",
  },
];

export const DEFAULT_COLOR_THEME: ColorTheme = "indigo";
export const COLOR_THEME_STORAGE_KEY = "tyra-color-theme";
