/**
 * Palette d'impression, partagée par les exports PDF et Word.
 *
 * Les rapports sont volontairement clairs (fond blanc) pour rester lisibles à
 * l'impression ; seule la couleur d'accent suit le thème choisi dans
 * les paramètres de l'application.
 */

import type { AccentKey } from "../types";

export const ACCENT_HEX: Record<AccentKey, string> = {
  "navy-gold": "#1B2A4A",
  emerald: "#0F766E",
  orange: "#C2410C",
};

export const PRINT = {
  text: "#1A1A1A",
  muted: "#6B7280",
  line: "#D8DDE3",
  headerBg: "#F1F4F7",
  zebra: "#FAFBFC",
  paidBg: "#DCF5E4",
  paidText: "#106B33",
  dueBg: "#FDF0D9",
  dueText: "#92500E",
  dangerText: "#B42318",
  nonMemberBg: "#ECEFF3",
} as const;

export function accentHex(accent: AccentKey): string {
  return ACCENT_HEX[accent] ?? ACCENT_HEX.emerald;
}

/** Variante Word : les couleurs y sont attendues sans le croisillon. */
export function noHash(hex: string): string {
  return hex.replace("#", "");
}
