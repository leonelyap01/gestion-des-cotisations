/**
 * Générateurs de messages WhatsApp prêts à copier-coller.
 *
 * Ce sont de simples fonctions pures : elles assemblent du texte à partir des
 * paramètres et des indicateurs déjà calculés par lib/cotisations.ts.
 */

import { MONTH_NAMES, fullName } from "./cotisations";
import type { DashboardSummary } from "./cotisations";
import { formatAmount, formatPercent } from "./format";
import type { MemberStats, Settings } from "./types";

/** Bloc « coordonnées de paiement », omis si rien n'est renseigné. */
export function paymentBlock(settings: Settings): string {
  const lines: string[] = [];
  if (settings.pay_wave) lines.push("• Wave : " + settings.pay_wave);
  if (settings.pay_mtn) lines.push("• MTN Mobile Money : " + settings.pay_mtn);
  if (settings.pay_orange) lines.push("• Orange Money : " + settings.pay_orange);
  if (lines.length === 0) return "";
  return "\n\n💳 *Moyens de paiement*\n" + lines.join("\n");
}

function signature(settings: Settings): string {
  return "\n\nMerci pour votre engagement 🙏\n_" + settings.association_name + "_";
}

/** Liste des mois dus, lisible : « Mars, Avril et Mai ». */
export function monthList(months: number[]): string {
  const names = months.map((m) => MONTH_NAMES[m - 1]);
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  return names.slice(0, -1).join(", ") + " et " + names[names.length - 1];
}

/** 1. Rappel de cotisation pour le mois en cours. */
export function monthlyReminder(settings: Settings, month: number): string {
  return (
    "📢 *Rappel de cotisation — " +
    MONTH_NAMES[month - 1] +
    " " +
    settings.exercise_year +
    "*\n\n" +
    "Chers membres,\n" +
    "La cotisation du mois de " +
    MONTH_NAMES[month - 1] +
    " est de *" +
    formatAmount(settings.monthly_amount, settings.currency) +
    "*.\n" +
    "Merci de bien vouloir vous acquitter de votre part avant la fin du mois." +
    paymentBlock(settings) +
    signature(settings)
  );
}

/** 2. Annonce de l'ouverture d'un nouveau mois. */
export function newMonthAnnouncement(settings: Settings, month: number): string {
  return (
    "🗓️ *Ouverture du mois de " +
    MONTH_NAMES[month - 1] +
    " " +
    settings.exercise_year +
    "*\n\n" +
    "Chers membres,\n" +
    "Le mois de " +
    MONTH_NAMES[month - 1] +
    " est désormais ouvert aux cotisations.\n" +
    "Montant : *" +
    formatAmount(settings.monthly_amount, settings.currency) +
    "*\n" +
    "Nouveaux membres : un droit d'adhésion unique de *" +
    formatAmount(settings.membership_fee, settings.currency) +
    "* s'ajoute à la cotisation du mois d'arrivée." +
    paymentBlock(settings) +
    signature(settings)
  );
}

/** 3. Alerte collective pour les membres cumulant 3 mois d'arriérés ou plus. */
export function arrearsAlert(stats: MemberStats[], settings: Settings): string {
  const late = stats
    .filter((s) => s.member.active && s.dueMonths.length >= 3)
    .sort((a, b) => b.dueMonths.length - a.dueMonths.length);

  if (late.length === 0) {
    return (
      "✅ *Point sur les arriérés*\n\n" +
      "Aucun membre ne cumule 3 mois d'impayés à ce jour. Merci à tous !" +
      signature(settings)
    );
  }

  const lines = late.map(
    (s) =>
      "• " +
      fullName(s.member) +
      " — " +
      s.dueMonths.length +
      " mois (" +
      monthList(s.dueMonths) +
      ") = " +
      formatAmount(s.dueMonths.length * settings.monthly_amount, settings.currency),
  );

  return (
    "⚠️ *Arriérés de cotisation*\n\n" +
    "Les membres suivants cumulent 3 mois d'impayés ou plus :\n\n" +
    lines.join("\n") +
    "\n\nPour rappel, *3 mois d'impayés consécutifs* pour un membre présent depuis " +
    "l'ouverture de l'exercice entraînent un examen de sa situation en vue d'un " +
    "retrait du comité.\n" +
    "Merci de régulariser votre situation dans les meilleurs délais." +
    paymentBlock(settings) +
    signature(settings)
  );
}

/** 4. Message individuel, personnalisé avec le nom et les mois dus. */
export function individualReminder(stats: MemberStats, settings: Settings): string {
  const { member, dueMonths } = stats;
  const feeOwed = stats.feeDue && !stats.feePaid;
  const duesAmount = dueMonths.length * settings.monthly_amount;
  const total = duesAmount + (feeOwed ? settings.membership_fee : 0);

  if (dueMonths.length === 0 && !feeOwed) {
    return (
      "Bonjour " +
      fullName(member) +
      " 👋\n\n" +
      "Votre situation est parfaitement à jour pour l'exercice " +
      settings.exercise_year +
      " : *" +
      stats.paidMonths +
      " mois soldés sur " +
      stats.eligibleMonths +
      "*.\n" +
      "Merci pour votre régularité !" +
      signature(settings)
    );
  }

  const parts: string[] = [];
  if (dueMonths.length > 0) {
    parts.push(
      "• Cotisations dues : *" +
        dueMonths.length +
        " mois* (" +
        monthList(dueMonths) +
        ") = " +
        formatAmount(duesAmount, settings.currency),
    );
  }
  if (feeOwed) {
    parts.push(
      "• Droit d'adhésion (unique) : " +
        formatAmount(settings.membership_fee, settings.currency),
    );
  }

  return (
    "Bonjour " +
    fullName(member) +
    " 👋\n\n" +
    "Point sur vos cotisations — exercice " +
    settings.exercise_year +
    " :\n\n" +
    parts.join("\n") +
    "\n• *Total à régler : " +
    formatAmount(total, settings.currency) +
    "*\n\n" +
    "Mois déjà soldés : " +
    stats.paidMonths +
    " / " +
    stats.eligibleMonths +
    " (" +
    formatPercent(stats.recoveryRate, 0) +
    ")" +
    paymentBlock(settings) +
    signature(settings)
  );
}

/** 5. Point de caisse synthétique à partager avec l'ensemble des membres. */
export function cashPointMessage(
  dashboard: DashboardSummary,
  settings: Settings,
): string {
  const c = settings.currency;
  const openMonths = dashboard.months.filter((m) => m.open);
  const lines = openMonths.map(
    (m) =>
      "• " +
      m.label +
      " : " +
      m.paid +
      "/" +
      m.eligible +
      " soldés — " +
      formatAmount(m.collected, c),
  );

  return (
    "📊 *Point de caisse — exercice " +
    settings.exercise_year +
    "*\n" +
    "_" +
    settings.association_name +
    "_\n\n" +
    "• Membres actifs : " +
    dashboard.activeMembers +
    "\n" +
    "• Montant théorique attendu : *" +
    formatAmount(dashboard.expected, c) +
    "*\n" +
    "• Montant réellement perçu : *" +
    formatAmount(dashboard.collected, c) +
    "*\n" +
    "• Manque à gagner : *" +
    formatAmount(dashboard.outstanding, c) +
    "*\n" +
    "• Taux de recouvrement : *" +
    formatPercent(dashboard.recoveryRate) +
    "*\n\n" +
    "*Détail par mois*\n" +
    (lines.length > 0 ? lines.join("\n") : "Aucun mois ouvert pour le moment.") +
    paymentBlock(settings) +
    signature(settings)
  );
}
