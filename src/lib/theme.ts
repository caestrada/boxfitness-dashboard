export const themeStorageKey = "boxfitness:theme";

export const supportedThemes = ["light", "dark"] as const;

export type Theme = (typeof supportedThemes)[number];

export function isTheme(value: string | null | undefined): value is Theme {
  return value === "light" || value === "dark";
}
