/** Types partages par toute l'application. Ils refletent le schema Supabase. */

export type AccentKey = "navy-gold" | "emerald" | "orange";

export interface Settings {
  id: number;
  association_name: string;
  currency: string;
  monthly_amount: number;
  membership_fee: number;
  exercise_year: number;
  start_month: number;
  end_month: number;
  /** Mois reellement ouverts a la cotisation (seuls ceux-ci sont exigibles). */
  active_months: number[];
  pay_wave: string;
  pay_mtn: string;
  pay_orange: string;
  accent: AccentKey;
  updated_at?: string;
}

export interface Member {
  id: string;
  last_name: string;
  first_name: string;
  phone: string;
  join_year: number;
  join_month: number;
  membership_fee_due: boolean;
  membership_fee_paid_at: string | null;
  active: boolean;
  notes: string;
  created_at?: string;
}

export interface Payment {
  id: string;
  member_id: string;
  year: number;
  month: number;
  amount: number;
  paid_at: string;
}

export interface Report {
  id: string;
  kind: string;
  label: string;
  meta: Record<string, unknown>;
  created_at: string;
}

/** Etat d'une cellule de la grille mensuelle. */
export type CellStatus =
  /** Le membre n'avait pas encore adhere : jamais exigible (regle metier n.1). */
  | "not_member"
  /** Mois solde. */
  | "paid"
  /** Mois ouvert, membre concerne, non solde => arriere. */
  | "due"
  /** Mois pas encore ouvert par le tresorier : ni du, ni en retard. */
  | "upcoming";

export interface MemberStats {
  member: Member;
  /** Nombre de mois ouverts pendant lesquels la personne etait membre. */
  eligibleMonths: number;
  paidMonths: number;
  /** Mois ouverts, dus et non regles. */
  dueMonths: number[];
  /** Taux de recouvrement personnel (regle metier n.3) : 0 -> 1. */
  recoveryRate: number;
  /** Montant theoriquement du (cotisations + droit d'adhesion si applicable). */
  expected: number;
  /** Montant reellement encaisse. */
  collected: number;
  /** expected - collected */
  outstanding: number;
  feeDue: boolean;
  feePaid: boolean;
  /** Plus longue serie de mois ouverts consecutifs impayes. */
  longestUnpaidStreak: number;
  /** Regle metier n.4 : present des le debut de l'exercice + 3 impayes consecutifs. */
  atRisk: boolean;
  /** Membre depuis le premier mois de l'exercice. */
  foundingMember: boolean;
}
