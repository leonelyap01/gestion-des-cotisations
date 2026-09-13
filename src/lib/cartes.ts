/**
 * Cartes de membre — numérotation et fonctions (fonctions pures).
 */

import { fullName } from "./cotisations";
import type { Member, Settings } from "./types";

/** Fonctions proposées dans le formulaire ; le champ reste libre. */
export const ROLES = [
  "Président",
  "Vice-Président",
  "Secrétaire Général",
  "Secrétaire Adjoint",
  "Trésorier",
  "Trésorier Adjoint",
  "Porte-parole du Président",
  "Commissaire aux comptes",
  "Chargé à l'organisation",
  "Chargé à la communication",
  "Membre",
];

/** Fonction affichée sur la carte lorsque le champ est vide. */
export const DEFAULT_ROLE = "Membre";

export function memberRole(member: Member): string {
  return member.role?.trim() || DEFAULT_ROLE;
}

/**
 * Numéro de carte : PRÉFIXE-ANNÉE-NNN, ex. « UCJEA-2026-014 ».
 * Le compteur est sur trois chiffres, ce qui couvre 999 membres.
 */
export function formatCardNumber(
  prefix: string,
  year: number,
  sequence: number,
): string {
  const safePrefix = (prefix || "MBR").trim().toUpperCase();
  return safePrefix + "-" + year + "-" + String(sequence).padStart(3, "0");
}

/** Extrait le compteur d'un numéro existant, ou null s'il ne suit pas le format. */
export function parseSequence(cardNumber: string | null): number | null {
  if (!cardNumber) return null;
  const match = cardNumber.trim().match(/-(\d+)$/);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : null;
}

/**
 * Attribue un numéro aux membres qui n'en ont pas encore, par ordre
 * alphabétique, en reprenant la numérotation là où elle s'est arrêtée.
 *
 * Les numéros déjà attribués ne sont jamais modifiés : une carte imprimée
 * garde son numéro à vie.
 */
export function assignMissingCardNumbers(
  members: Member[],
  settings: Settings,
): { id: string; card_number: string }[] {
  const used = new Set<number>();
  for (const m of members) {
    const seq = parseSequence(m.card_number);
    if (seq !== null) used.add(seq);
  }

  const pending = members
    .filter((m) => m.active && !m.card_number)
    .sort((a, b) =>
      fullName(a).localeCompare(fullName(b), "fr", { sensitivity: "base" }),
    );

  let next = 1;
  const assignments: { id: string; card_number: string }[] = [];

  for (const member of pending) {
    while (used.has(next)) next++;
    used.add(next);
    assignments.push({
      id: member.id,
      card_number: formatCardNumber(
        settings.card_prefix,
        settings.exercise_year,
        next,
      ),
    });
  }

  return assignments;
}

/** Une carte est imprimable dès qu'elle a un numéro. La photo reste conseillée. */
export function isCardReady(member: Member): boolean {
  return Boolean(member.card_number);
}

export interface CardProgress {
  total: number;
  withNumber: number;
  withPhoto: number;
  issued: number;
  /** Membres actifs sans photo : la relance à faire. */
  missingPhoto: Member[];
}

export function cardProgress(members: Member[]): CardProgress {
  const active = members.filter((m) => m.active);
  return {
    total: active.length,
    withNumber: active.filter((m) => m.card_number).length,
    withPhoto: active.filter((m) => m.photo_path).length,
    issued: active.filter((m) => m.card_issued_at).length,
    missingPhoto: active.filter((m) => !m.photo_path),
  };
}

/** Adresse encodée dans le QR code : page publique de vérification. */
export function verificationUrl(origin: string, memberId: string): string {
  return origin.replace(/\/$/, "") + "/carte/" + memberId;
}
