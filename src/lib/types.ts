/** Types partages par toute l'application. Ils refletent le schema Supabase. */

/**
 * Profils d'accès.
 *  - « tresorier »     : accès complet.
 *  - « communication » : annonces et cartes de membre uniquement.
 */
export type UserRole = "tresorier" | "communication";

export const ROLE_LABELS: Record<UserRole, string> = {
  tresorier: "Trésorier — accès complet",
  communication: "Communication — annonces et cartes",
};

/** Compte du bureau autorisé à se connecter à l'application. */
export interface AppUser {
  user_id: string;
  email: string | null;
  display_name: string;
  role: UserRole;
  created_at: string;
}

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

  // --- Identité visuelle du comité (carte de membre, page publique, rapports) ---
  /** Devise, ex. « L'avenir nous appartient ». */
  motto: string;
  /** Ville ou localité, ex. « Aheoua, Côte d'Ivoire ». */
  city: string;
  /** Téléphone de contact du comité. */
  phone: string;
  /** Chemin du logo servi par l'application, ex. « /logo-ucjea.jpg ». */
  logo_url: string;
  /** Préfixe des numéros de carte, ex. « UCJEA ». */
  card_prefix: string;

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

  // --- Carte de membre ---
  /** Numéro imprimé sur la carte, ex. « UCJEA-2026-014 ». null = non attribué. */
  card_number: string | null;
  /** Fonction dans le bureau, ex. « Porte-parole du Président ». */
  role: string;
  /** Chemin du portrait dans le bucket privé « photos ». null = photo non reçue. */
  photo_path: string | null;
  /** Date de remise de la carte au membre. null = carte non remise. */
  card_issued_at: string | null;

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

/** Catégorie d'une annonce, qui détermine sa pastille de couleur. */
export type PostCategory = "info" | "annonce" | "evenement" | "urgent";

/** Actualité affichée sur la page publique /infos. */
export interface Post {
  id: string;
  title: string;
  body: string;
  category: PostCategory;
  /** Épinglée : remonte en tête de la page publique. */
  pinned: boolean;
  /** false = brouillon, visible uniquement dans l'espace trésorier. */
  published: boolean;
  published_at: string;
  created_at: string;
  updated_at: string;
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
