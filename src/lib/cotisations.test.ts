/**
 * Tests des règles métier (npm test).
 *
 * Ils vérifient les quatre règles strictes du comité. Si l'un de ces tests
 * échoue, c'est qu'un calcul de cotisation est devenu faux : ne pas le
 * contourner, corriger lib/cotisations.ts.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  cellStatus,
  computeDashboard,
  computeMemberStats,
  indexPayments,
  openMonths,
} from "./cotisations";
import type { Member, Payment, Settings } from "./types";

const SETTINGS: Settings = {
  id: 1,
  association_name: "Comité de test",
  currency: "FCFA",
  monthly_amount: 1000,
  membership_fee: 5000,
  exercise_year: 2026,
  start_month: 3, // Mars
  end_month: 12, // Décembre
  active_months: [3, 4, 5, 6, 7, 8, 9], // Mars → Septembre ouverts
  pay_wave: "",
  pay_mtn: "",
  pay_orange: "",
  accent: "emerald",
};

function member(over: Partial<Member> = {}): Member {
  return {
    id: over.id ?? "m1",
    last_name: "TEST",
    first_name: "Membre",
    phone: "",
    join_year: 2026,
    join_month: 3,
    membership_fee_due: true,
    membership_fee_paid_at: null,
    active: true,
    notes: "",
    ...over,
  };
}

function paid(memberId: string, months: number[]): Payment[] {
  return months.map((m) => ({
    id: memberId + "-" + m,
    member_id: memberId,
    year: 2026,
    month: m,
    amount: 1000,
    paid_at: "2026-" + String(m).padStart(2, "0") + "-15T10:00:00Z",
  }));
}

const stats = (m: Member, payments: Payment[] = []) =>
  computeMemberStats(m, SETTINGS, indexPayments(payments));

describe("Règle n°1 — aucun mois antérieur à l'adhésion n'est dû", () => {
  it("ignore les mois précédant l'adhésion dans les mois exigibles", () => {
    // Adhésion en juin : seuls juin, juillet, août, septembre sont ouverts et dus.
    const s = stats(member({ join_month: 6 }));
    assert.equal(s.eligibleMonths, 4);
    assert.deepEqual(s.dueMonths, [6, 7, 8, 9]);
  });

  it("marque les mois antérieurs comme « non membre » dans la grille", () => {
    const m = member({ join_month: 6 });
    assert.equal(cellStatus(m, 3, SETTINGS, false), "not_member");
    assert.equal(cellStatus(m, 5, SETTINGS, false), "not_member");
    assert.equal(cellStatus(m, 6, SETTINGS, false), "due");
    assert.equal(cellStatus(m, 6, SETTINGS, true), "paid");
  });

  it("n'inclut pas les mois antérieurs dans le montant théorique", () => {
    const s = stats(member({ join_month: 6 }));
    // 4 mois × 1 000 + 5 000 de droit d'adhésion
    assert.equal(s.expected, 4 * 1000 + 5000);
  });

  it("ne compte jamais un mois non ouvert comme un arriéré", () => {
    // Octobre est dans la grille mais absent de active_months.
    const m = member();
    assert.equal(cellStatus(m, 10, SETTINGS, false), "upcoming");
    assert.ok(!stats(m).dueMonths.includes(10));
  });
});

describe("Règle n°2 — le droit d'adhésion est distinct et dû une seule fois", () => {
  it("ajoute le droit d'adhésion une seule fois au théorique", () => {
    const s = stats(member({ join_month: 3 }));
    const openCount = openMonths(SETTINGS).length; // 7 mois
    assert.equal(s.expected, openCount * 1000 + 5000);
  });

  it("ne réclame pas le droit d'adhésion quand il n'est pas dû", () => {
    const s = stats(member({ membership_fee_due: false }));
    assert.equal(s.expected, openMonths(SETTINGS).length * 1000);
  });

  it("comptabilise le droit d'adhésion réglé dans le montant perçu", () => {
    const m = member({ membership_fee_paid_at: "2026-03-10T09:00:00Z" });
    const s = stats(m, paid("m1", [3]));
    assert.equal(s.collected, 1000 + 5000);
  });
});

describe("Règle n°3 — le recouvrement ne porte que sur les mois d'appartenance", () => {
  it("atteint 100 % pour un membre arrivé en cours d'année ayant tout réglé", () => {
    const m = member({
      join_month: 8,
      membership_fee_paid_at: "2026-08-05T09:00:00Z",
    });
    const s = stats(m, paid("m1", [8, 9]));
    assert.equal(s.eligibleMonths, 2);
    assert.equal(s.paidMonths, 2);
    assert.equal(s.recoveryRate, 1);
    assert.equal(s.outstanding, 0);
  });

  it("calcule le taux sur les seuls mois exigibles", () => {
    // Adhésion en juin (4 mois exigibles), 2 mois réglés, droit d'adhésion non dû.
    const m = member({ join_month: 6, membership_fee_due: false });
    const s = stats(m, paid("m1", [6, 7]));
    assert.equal(s.recoveryRate, 0.5);
  });
});

describe("Règle n°4 — signalement des 3 mois consécutifs impayés", () => {
  it("signale un membre présent dès l'ouverture avec 3 impayés consécutifs", () => {
    // Réglé mars et avril, puis rien en mai, juin, juillet.
    const s = stats(member(), paid("m1", [3, 4, 8, 9]));
    assert.equal(s.longestUnpaidStreak, 3);
    assert.equal(s.foundingMember, true);
    assert.equal(s.atRisk, true);
  });

  it("ne signale pas deux impayés consécutifs entrecoupés d'un paiement", () => {
    const s = stats(member(), paid("m1", [3, 5, 7, 9]));
    assert.equal(s.longestUnpaidStreak, 1);
    assert.equal(s.atRisk, false);
  });

  it("ne signale pas un membre arrivé en cours d'exercice", () => {
    // Adhésion en juin, aucun paiement : 4 mois consécutifs impayés,
    // mais la procédure de retrait ne le vise pas.
    const s = stats(member({ join_month: 6 }));
    assert.equal(s.longestUnpaidStreak, 4);
    assert.equal(s.foundingMember, false);
    assert.equal(s.atRisk, false);
  });

  it("ne signale pas un membre déjà retiré du comité", () => {
    const s = stats(member({ active: false }));
    assert.equal(s.atRisk, false);
  });
});

describe("Tableau de bord", () => {
  const members = [
    member({ id: "a", join_month: 3, membership_fee_due: false }), // tout réglé
    member({ id: "b", join_month: 6, membership_fee_due: false }), // rien réglé
    member({ id: "c", join_month: 3, active: false }), // retiré : exclu
  ];
  const payments = paid("a", [3, 4, 5, 6, 7, 8, 9]);
  const d = computeDashboard(members, SETTINGS, payments);

  it("exclut les membres inactifs", () => {
    assert.equal(d.activeMembers, 2);
  });

  it("calcule le théorique en tenant compte des dates d'adhésion", () => {
    // a : 7 mois ; b : 4 mois (juin → septembre). Aucun droit d'adhésion dû.
    assert.equal(d.expected, (7 + 4) * 1000);
    assert.equal(d.collected, 7 * 1000);
    assert.equal(d.outstanding, 4 * 1000);
  });

  it("ne compte comme concernés que les membres déjà adhérents", () => {
    const mars = d.months.find((m) => m.month === 3)!;
    const juin = d.months.find((m) => m.month === 6)!;
    assert.equal(mars.eligible, 1); // seul « a » était membre en mars
    assert.equal(juin.eligible, 2);
  });

  it("neutralise les mois non ouverts", () => {
    const octobre = d.months.find((m) => m.month === 10)!;
    assert.equal(octobre.open, false);
    assert.equal(octobre.eligible, 0);
    assert.equal(octobre.expected, 0);
  });

  it("répartit correctement les membres par situation", () => {
    assert.equal(d.upToDate, 1);
    assert.equal(d.lateMembers, 1);
    assert.equal(d.neverPaid, 1);
    assert.equal(d.atLeastOnePaid, 1);
  });
});
