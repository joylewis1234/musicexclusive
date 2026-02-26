export type AccentColorKey = "gold" | "red" | "blue" | "neon-purple" | "white" | "black";

export const ACCENT_COLORS: Record<AccentColorKey, { label: string; hsl: string }> = {
  gold: { label: "Gold", hsl: "hsl(42, 65%, 62%)" },
  red: { label: "Red", hsl: "hsl(0, 70%, 50%)" },
  blue: { label: "Blue", hsl: "hsl(210, 70%, 50%)" },
  "neon-purple": { label: "Neon Purple", hsl: "hsl(280, 80%, 60%)" },
  white: { label: "White", hsl: "hsl(0, 0%, 100%)" },
  black: { label: "Black", hsl: "hsl(0, 0%, 10%)" },
};
