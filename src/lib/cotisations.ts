/**
 * Règles métier de la gestion des cotisations.
 *
 * Ce fichier ne contient QUE des fonctions pures (aucun appel réseau, aucun
 * composant React) : c'est le cœur vérifiable de l'application.
 *
 * Les quatre règles strictes du comité :
 *  1. Un membre n'est jamais redevable d'un mois antérieur à son adhésion.
 *  2. Le droit d'adhésion est distinct de la cotisation et dû une seule fois.
 *  3. Le taux de recouvrement se calcule uniquement sur les mois d'appartenance.
 *  4. Le signalement « risque de retrait » ne vise que les membres présents dès
 *     le début de l'exercice cumulant 3 mois d'impayés consécutifs.
 */

import type { CellStatus, Member, MemberStats, Payment, Settings } from "./types";

export const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

export const MONTH_SHORT = [
  "Jan", "Fév", "Mar", "Avr", "Mai", "Jui",
  "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc",
];

/** Nombre de mois consécutifs d'impayés qui déclenche le signalement. */
export const RISK_THRESHOLD = 3;

/** Repère absolu permettant de comparer deux couples (année, mois). */
export function ordinal(year: number, month: number): number {
  return year * 12 + month;
}

/** Colonnes de la grille : tous les mois de l'exercice, ouverts ou non. */
export function exerciseMonths(settings: Settings): number[] {
  const months: number[] = [];
  for (let m = settings.start_month; m <= settings.end_month; m++) months.push(m);
  return months;
}

/** Mois réellement ouverts à la cotisation, dans l'ordre chronologique. */
export function openMonths(settings: Settings): number[] {
  return exerciseMonths(settings).filter((m) => settings.active_months.includes(m));
}

/** Le membre appartenait-il au comité pendant ce mois ? (règle métier n°1) */
export function isMemberDuring(member: Member, year: number, month: number): boolean {
  return ordinal(year, month) >= ordinal(member.join_year, member.join_month);
}

export function paymentKey(memberId: string, year: number, month: number): string {
  return memberId + ":" + year + ":" + month;
}

/** Index rapide des paiements : « memberId:year:month » → Payment. */
export function indexPayments(payments: Payment[]): Map<string, Payment> {
  const map = new Map<string, Payment>();
  for (const p of payments) map.set(paymentKey(p.member_id, p.year, p.month), p);
  return map;
}

/** État d'une cellule de la grille pour un membre et un mois donnés. */
export function cellStatus(
  member: Member,
  month: number,
  settings: Settings,
  paid: boolean,
): CellStatus {
  const year = settings.exercise_year;
  if (!isMemberDuring(member, year, month)) return "not_member";
  if (paid) return "paid";
  return settings.active_months.includes(month) ? "due" : "upcoming";
}

/**
 * Calcule l'ensemble des indicateurs d'un membre pour l'exercice courant.
 * Fonction utilisée partout : listes, grille, tableau de bord, exports.
 */
export function computeMemberStats(
  member: Member,
  settings: Settings,
  index: Map<string, Payment>,
): MemberStats {
  const year = settings.exercise_year;
  const months = openMonths(settings);

  let eligibleMonths = 0;
  let paidMonths = 0;
  let collected = 0;
  const dueMonths: number[] = [];

  // Suivi de la plus longue série d'impayés consécutifs (règle métier n°4)
  let streak = 0;
  let longestUnpaidStreak = 0;

  for (const month of months) {
    // Règle métier n°1 : les mois antérieurs à l'adhésion sont ignorés ; ils ne
    // comptent ni dans le théorique, ni dans le taux de recouvrement du membre.
    if (!isMemberDuring(member, year, month)) continue;

    eligibleMonths++;
    const payment = index.get(paymentKey(member.id, year, month));

    if (payment) {
      paidMonths++;
      collected += Number(payment.amount) || 0;
      streak = 0;
    } else {
      dueMonths.push(month);
      streak++;
      if (streak > longestUnpaidStreak) longestUnpaidStreak = streak;
    }
  }

  // Règle métier n°2 : le droit d'adhésion, dû une seule fois, s'ajoute au théorique.
  const feeDue = member.membership_fee_due;
  const feePaid = Boolean(member.membership_fee_paid_at);
  const feeAmount = feeDue ? Number(settings.membership_fee) || 0 : 0;
  if (feeDue && feePaid) collected += feeAmount;

  const expected = eligibleMonths * (Number(settings.monthly_amount) || 0) + feeAmount;

  // Règle métier n°3 : recouvrement calculé sur les seuls mois d'appartenance.
  const recoveryRate = expected > 0 ? collected / expected : 1;

  // Règle métier n°4 : uniquement les membres présents dès le premier mois de
  // l'exercice, avec au moins 3 mois d'impayés consécutifs.
  const foundingMember =
    ordinal(member.join_year, member.join_month) <=
    ordinal(settings.exercise_year, settings.start_month);

  return {
    member,
    eligibleMonths,
    paidMonths,
    dueMonths,
    recoveryRate,
    expected,
    collected,
    outstanding: Math.max(0, expected - collected),
    feeDue,
    feePaid,
    longestUnpaidStreak,
    atRisk: member.active && foundingMember && longestUnpaidStreak >= RISK_THRESHOLD,
    foundingMember,
  };
}

export function computeAllStats(
  members: Member[],
  settings: Settings,
  payments: Payment[],
): MemberStats[] {
  const index = indexPayments(payments);
  return members.map((m) => computeMemberStats(m, settings, index));
}

// ---------------------------------------------------------------------------
//  Agrégats du tableau de bord
// ---------------------------------------------------------------------------

export interface MonthSummary {
  month: number;
  label: string;
  short: string;
  open: boolean;
  /** Membres concernés par ce mois (déjà adhérents à cette date). */
  eligible: number;
  paid: number;
  expected: number;
  collected: number;
  rate: number;
}

export interface DashboardSummary {
  activeMembers: number;
  totalMembers: number;
  /** Théorique total : cotisations des mois ouverts + droits d'adhésion dus. */
  expected: number;
  collected: number;
  /** Manque à gagner. */
  outstanding: number;
  recoveryRate: number;
  feesExpected: number;
  feesCollected: number;
  duesExpected: number;
  duesCollected: number;
  upToDate: number;
  lateMembers: number;
  neverPaid: number;
  atLeastOnePaid: number;
  atRisk: number;
  months: MonthSummary[];
}

export function computeDashboard(
  members: Member[],
  settings: Settings,
  payments: Payment[],
): DashboardSummary {
  const index = indexPayments(payments);
  const active = members.filter((m) => m.active);
  const stats = active.map((m) => computeMemberStats(m, settings, index));
  const year = settings.exercise_year;
  const monthly = Number(settings.monthly_amount) || 0;
  const fee = Number(settings.membership_fee) || 0;

  const months: MonthSummary[] = exerciseMonths(settings).map((month) => {
    const open = settings.active_months.includes(month);
    let eligible = 0;
    let paid = 0;
    let collected = 0;

    if (open) {
      for (const member of active) {
        // Règle métier n°1 : on ignore les membres pas encore adhérents.
        if (!isMemberDuring(member, year, month)) continue;
        eligible++;
        const payment = index.get(paymentKey(member.id, year, month));
        if (payment) {
          paid++;
          collected += Number(payment.amount) || 0;
        }
      }
    }

    const expected = eligible * monthly;
    return {
      month,
      label: MONTH_NAMES[month - 1],
      short: MONTH_SHORT[month - 1],
      open,
      eligible,
      paid,
      expected,
      collected,
      rate: expected > 0 ? collected / expected : 0,
    };
  });

  const duesExpected = months.reduce((s, m) => s + m.expected, 0);
  const duesCollected = months.reduce((s, m) => s + m.collected, 0);
  const feesExpected = stats.filter((s) => s.feeDue).length * fee;
  const feesCollected = stats.filter((s) => s.feeDue && s.feePaid).length * fee;

  const expected = duesExpected + feesExpected;
  const collected = duesCollected + feesCollected;

  return {
    activeMembers: active.length,
    totalMembers: members.length,
    expected,
    collected,
    outstanding: Math.max(0, expected - collected),
    recoveryRate: expected > 0 ? collected / expected : 0,
    feesExpected,
    feesCollected,
    duesExpected,
    duesCollected,
    upToDate: stats.filter((s) => s.dueMonths.length === 0 && (!s.feeDue || s.feePaid)).length,
    lateMembers: stats.filter((s) => s.dueMonths.length > 0).length,
    neverPaid: stats.filter((s) => s.paidMonths === 0).length,
    atLeastOnePaid: stats.filter((s) => s.paidMonths > 0).length,
    atRisk: stats.filter((s) => s.atRisk).length,
    months,
  };
}

// ---------------------------------------------------------------------------
//  Filtres et recherche de la liste des membres
// ---------------------------------------------------------------------------

export type MemberFilter =
  | "all"
  | "up_to_date"
  | "late_1"
  | "late_2"
  | "late_3plus"
  | "never_paid"
  | "paid_once"
  | "at_risk"
  | "fee_unpaid"
  | "inactive";

export const FILTER_LABELS: Record<MemberFilter, string> = {
  all: "Tous les membres",
  up_to_date: "À jour (tous les mois soldés)",
  late_1: "1 mois d'arriéré",
  late_2: "2 mois d'arriérés",
  late_3plus: "3 mois d'arriérés ou plus",
  never_paid: "N'a jamais soldé un seul mois",
  paid_once: "A soldé au moins un mois",
  at_risk: "Signalés (risque de retrait)",
  fee_unpaid: "Droit d'adhésion non réglé",
  inactive: "Membres retirés / inactifs",
};

export const FILTER_ORDER: MemberFilter[] = [
  "all", "up_to_date", "late_1", "late_2", "late_3plus",
  "never_paid", "paid_once", "at_risk", "fee_unpaid", "inactive",
];

export function matchesFilter(stats: MemberStats, filter: MemberFilter): boolean {
  const due = stats.dueMonths.length;
  const active = stats.member.active;
  switch (filter) {
    case "all":        return active;
    case "up_to_date": return active && due === 0 && (!stats.feeDue || stats.feePaid);
    case "late_1":     return active && due === 1;
    case "late_2":     return active && due === 2;
    case "late_3plus": return active && due >= 3;
    case "never_paid": return active && stats.paidMonths === 0;
    case "paid_once":  return active && stats.paidMonths > 0;
    case "at_risk":    return stats.atRisk;
    case "fee_unpaid": return active && stats.feeDue && !stats.feePaid;
    case "inactive":   return !active;
    default:           return true;
  }
}

/** Recherche simple sur le nom, les prénoms et le téléphone. */
export function matchesSearch(member: Member, query: string): boolean {
  const q = query.trim();
  if (!q) return true;
  const haystack = deaccent(
    member.last_name + " " + member.first_name + " " + member.phone,
  );
  return haystack.includes(deaccent(q));
}

/** Minuscules sans accent, pour une recherche tolérante : « kone » trouve « Koné ». */
export function deaccent(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function fullName(member: Member): string {
  return (member.last_name + " " + member.first_name).trim();
}

/** Libellé lisible de la date d'adhésion, ex. « Mars 2026 ». */
export function joinLabel(member: Member): string {
  return MONTH_NAMES[member.join_month - 1] + " " + member.join_year;
}

export function sortStats(list: MemberStats[]): MemberStats[] {
  return [...list].sort((a, b) =>
    fullName(a.member).localeCompare(fullName(b.member), "fr", { sensitivity: "base" }),
  );
}

/** Dernier mois ouvert de l'exercice — sert de « mois en cours » par défaut. */
export function currentOpenMonth(settings: Settings): number | null {
  const open = openMonths(settings);
  return open.length ? open[open.length - 1] : null;
}
