"use client";

/**
 * Exports PDF, construits avec @react-pdf/renderer.
 *
 *  - Grille de cotisations : A4 paysage, une ligne par membre, une colonne par
 *    mois, pensée pour être imprimée et affichée en réunion.
 *  - Point de caisse : A4 portrait, synthèse théorique / perçu à partager.
 *
 * Aucune police externe n'est chargée : Helvetica (intégrée) gère les accents
 * français, ce qui garantit une génération hors ligne et instantanée.
 */

import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer";
import {
  MONTH_NAMES,
  MONTH_SHORT,
  cellStatus,
  exerciseMonths,
  fullName,
  joinLabel,
  paymentKey,
  type DashboardSummary,
} from "../cotisations";
import { formatAmount, formatDate, formatNumber, formatPercent } from "../format";
import type { MemberStats, Payment, Settings } from "../types";
import { PRINT, accentHex } from "./theme";

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 34,
    paddingHorizontal: 26,
    fontSize: 8,
    color: PRINT.text,
    fontFamily: "Helvetica",
  },
  title: { fontSize: 14, fontFamily: "Helvetica-Bold" },
  subtitle: { fontSize: 8.5, color: PRINT.muted, marginTop: 3 },
  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 2,
    paddingBottom: 8,
    marginBottom: 12,
  },
  metaRight: { alignItems: "flex-end" },
  metaLine: { fontSize: 8, color: PRINT.muted, marginBottom: 2 },

  row: { flexDirection: "row", alignItems: "stretch" },
  headCell: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    paddingVertical: 5,
    paddingHorizontal: 3,
    backgroundColor: PRINT.headerBg,
    borderRightWidth: 0.5,
    borderColor: PRINT.line,
    textAlign: "center",
    justifyContent: "center",
  },
  cell: {
    fontSize: 7.5,
    paddingVertical: 4,
    paddingHorizontal: 3,
    borderRightWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: PRINT.line,
    textAlign: "center",
    justifyContent: "center",
  },
  nameCell: { textAlign: "left" },

  footerNote: {
    position: "absolute",
    bottom: 16,
    left: 26,
    right: 26,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: PRINT.muted,
  },

  /* --- Point de caisse (portrait) --- */
  statGrid: { flexDirection: "row", gap: 8, marginBottom: 14 },
  statBox: {
    flex: 1,
    borderWidth: 0.8,
    borderColor: PRINT.line,
    borderRadius: 4,
    padding: 9,
  },
  statLabel: { fontSize: 7, color: PRINT.muted, textTransform: "uppercase" },
  statValue: { fontSize: 12, fontFamily: "Helvetica-Bold", marginTop: 4 },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    marginTop: 10,
    marginBottom: 6,
  },
  payBox: {
    marginTop: 14,
    borderWidth: 0.8,
    borderColor: PRINT.line,
    borderRadius: 4,
    padding: 10,
  },
});

/** Largeur des colonnes de la grille (en points). */
const COL = { index: 18, name: 118, join: 44, fee: 26, month: 22, paid: 32, rest: 52 };

// ---------------------------------------------------------------------------
//  1. Grille de cotisations (paysage)
// ---------------------------------------------------------------------------

export function GrilleDocument({
  rows,
  settings,
  payments,
  dashboard,
}: {
  rows: MemberStats[];
  settings: Settings;
  payments: Payment[];
  dashboard: DashboardSummary;
}) {
  const accent = accentHex(settings.accent);
  const months = exerciseMonths(settings);
  const year = settings.exercise_year;
  const c = settings.currency;

  const index = new Map<string, Payment>();
  for (const p of payments) index.set(paymentKey(p.member_id, p.year, p.month), p);

  return (
    <Document
      title={"Grille de cotisations " + year + " - " + settings.association_name}
      author={settings.association_name}
    >
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* En-tête */}
        <View style={[styles.headerBar, { borderBottomColor: accent }]}>
          <View>
            <Text style={[styles.title, { color: accent }]}>
              {settings.association_name}
            </Text>
            <Text style={styles.subtitle}>
              Grille de suivi des cotisations — exercice {year}
            </Text>
          </View>
          <View style={styles.metaRight}>
            <Text style={styles.metaLine}>
              Cotisation mensuelle : {formatAmount(settings.monthly_amount, c)}
            </Text>
            <Text style={styles.metaLine}>
              Droit d&apos;adhésion : {formatAmount(settings.membership_fee, c)}
            </Text>
            <Text style={styles.metaLine}>Édité le {formatDate(new Date())}</Text>
          </View>
        </View>

        {/* En-tête du tableau */}
        <View style={styles.row} fixed>
          <Text style={[styles.headCell, { width: COL.index }]}>N°</Text>
          <Text style={[styles.headCell, styles.nameCell, { width: COL.name }]}>
            Nom et prénoms
          </Text>
          <Text style={[styles.headCell, { width: COL.join }]}>Adhésion</Text>
          <Text style={[styles.headCell, { width: COL.fee }]}>Droit</Text>
          {months.map((m) => (
            <Text key={m} style={[styles.headCell, { width: COL.month }]}>
              {MONTH_SHORT[m - 1]}
            </Text>
          ))}
          <Text style={[styles.headCell, { width: COL.paid }]}>Soldés</Text>
          <Text style={[styles.headCell, { width: COL.rest }]}>Reste dû</Text>
        </View>

        {/* Lignes membres */}
        {rows.map((s, i) => {
          const zebra = i % 2 === 1 ? PRINT.zebra : "#FFFFFF";
          return (
            <View key={s.member.id} style={styles.row} wrap={false}>
              <Text style={[styles.cell, { width: COL.index, backgroundColor: zebra }]}>
                {i + 1}
              </Text>
              <Text
                style={[
                  styles.cell,
                  styles.nameCell,
                  { width: COL.name, backgroundColor: zebra },
                  s.atRisk ? { color: PRINT.dangerText } : {},
                ]}
              >
                {fullName(s.member)}
                {s.atRisk ? " (*)" : ""}
              </Text>
              <Text
                style={[
                  styles.cell,
                  { width: COL.join, backgroundColor: zebra, color: PRINT.muted },
                ]}
              >
                {joinLabel(s.member)}
              </Text>

              {/* Droit d'adhésion */}
              <Text
                style={[
                  styles.cell,
                  { width: COL.fee },
                  !s.feeDue
                    ? { backgroundColor: PRINT.nonMemberBg, color: PRINT.muted }
                    : s.feePaid
                      ? { backgroundColor: PRINT.paidBg, color: PRINT.paidText }
                      : { backgroundColor: PRINT.dueBg, color: PRINT.dueText },
                ]}
              >
                {!s.feeDue ? "-" : s.feePaid ? "X" : "."}
              </Text>

              {/* Mois */}
              {months.map((m) => {
                const paid = index.has(paymentKey(s.member.id, year, m));
                const status = cellStatus(s.member, m, settings, paid);
                // Règle métier n°1 : un mois antérieur à l'adhésion est grisé
                // et ne porte jamais la mention « dû ».
                const tone =
                  status === "not_member"
                    ? { backgroundColor: PRINT.nonMemberBg, color: PRINT.muted }
                    : status === "paid"
                      ? { backgroundColor: PRINT.paidBg, color: PRINT.paidText }
                      : status === "due"
                        ? { backgroundColor: PRINT.dueBg, color: PRINT.dueText }
                        : { backgroundColor: zebra, color: PRINT.muted };
                const glyph =
                  status === "not_member" ? "" : status === "paid" ? "X" : ".";
                return (
                  <Text key={m} style={[styles.cell, { width: COL.month }, tone]}>
                    {glyph}
                  </Text>
                );
              })}

              <Text style={[styles.cell, { width: COL.paid, backgroundColor: zebra }]}>
                {s.paidMonths}/{s.eligibleMonths}
              </Text>
              <Text
                style={[
                  styles.cell,
                  { width: COL.rest, backgroundColor: zebra },
                  s.outstanding > 0 ? { color: PRINT.dueText } : { color: PRINT.paidText },
                ]}
              >
                {formatNumber(s.outstanding)}
              </Text>
            </View>
          );
        })}

        {/* Ligne de totaux */}
        <View style={styles.row} wrap={false}>
          <Text
            style={[
              styles.cell,
              styles.nameCell,
              {
                width: COL.index + COL.name + COL.join,
                backgroundColor: PRINT.headerBg,
                fontFamily: "Helvetica-Bold",
              },
            ]}
          >
            TOTAL ({rows.length} membres)
          </Text>
          <Text
            style={[styles.cell, { width: COL.fee, backgroundColor: PRINT.headerBg }]}
          >
            {rows.filter((s) => s.feeDue && s.feePaid).length}
          </Text>
          {months.map((m) => {
            const summary = dashboard.months.find((x) => x.month === m);
            return (
              <Text
                key={m}
                style={[
                  styles.cell,
                  { width: COL.month, backgroundColor: PRINT.headerBg, fontSize: 6.5 },
                ]}
              >
                {summary && summary.open ? summary.paid + "/" + summary.eligible : "-"}
              </Text>
            );
          })}
          <Text
            style={[styles.cell, { width: COL.paid, backgroundColor: PRINT.headerBg }]}
          >
            {formatPercent(dashboard.recoveryRate, 0)}
          </Text>
          <Text
            style={[
              styles.cell,
              {
                width: COL.rest,
                backgroundColor: PRINT.headerBg,
                fontFamily: "Helvetica-Bold",
                color: PRINT.dueText,
              },
            ]}
          >
            {formatNumber(dashboard.outstanding)}
          </Text>
        </View>

        {/* Légende */}
        <Text style={{ marginTop: 10, fontSize: 7, color: PRINT.muted }}>
          Légende : X = mois soldé · . = mois dû (non soldé) · case grisée = personne
          non membre à cette période, jamais comptée comme un arriéré · (*) = membre
          signalé pour 3 mois d&apos;impayés consécutifs.
        </Text>

        <View style={styles.footerNote} fixed>
          <Text>
            {settings.association_name} — exercice {year}
          </Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              "Page " + pageNumber + " / " + totalPages
            }
          />
        </View>
      </Page>
    </Document>
  );
}

// ---------------------------------------------------------------------------
//  2. Point de caisse (portrait)
// ---------------------------------------------------------------------------

export function CaisseDocument({
  dashboard,
  settings,
  stats,
}: {
  dashboard: DashboardSummary;
  settings: Settings;
  stats: MemberStats[];
}) {
  const accent = accentHex(settings.accent);
  const c = settings.currency;
  const hasPay = settings.pay_wave || settings.pay_mtn || settings.pay_orange;

  return (
    <Document
      title={"Point de caisse " + settings.exercise_year}
      author={settings.association_name}
    >
      <Page size="A4" style={[styles.page, { fontSize: 9 }]}>
        <View style={[styles.headerBar, { borderBottomColor: accent }]}>
          <View>
            <Text style={[styles.title, { color: accent }]}>
              {settings.association_name}
            </Text>
            <Text style={styles.subtitle}>
              Point de caisse — exercice {settings.exercise_year}
            </Text>
          </View>
          <View style={styles.metaRight}>
            <Text style={styles.metaLine}>Édité le {formatDate(new Date())}</Text>
            <Text style={styles.metaLine}>
              {dashboard.activeMembers} membres actifs
            </Text>
          </View>
        </View>

        {/* Synthèse */}
        <View style={styles.statGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Théorique attendu</Text>
            <Text style={styles.statValue}>{formatAmount(dashboard.expected, c)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Réellement perçu</Text>
            <Text style={[styles.statValue, { color: PRINT.paidText }]}>
              {formatAmount(dashboard.collected, c)}
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Manque à gagner</Text>
            <Text style={[styles.statValue, { color: PRINT.dueText }]}>
              {formatAmount(dashboard.outstanding, c)}
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Taux de recouvrement</Text>
            <Text style={[styles.statValue, { color: accent }]}>
              {formatPercent(dashboard.recoveryRate)}
            </Text>
          </View>
        </View>

        <Text style={{ fontSize: 8, color: PRINT.muted, marginBottom: 10 }}>
          Le montant théorique tient compte de la date d&apos;adhésion de chaque
          membre : aucun mois antérieur à l&apos;arrivée d&apos;une personne n&apos;est
          compté. Il inclut {formatAmount(dashboard.duesExpected, c)} de cotisations et{" "}
          {formatAmount(dashboard.feesExpected, c)} de droits d&apos;adhésion.
        </Text>

        {/* Détail mensuel */}
        <Text style={styles.sectionTitle}>Détail par mois</Text>
        <View style={styles.row}>
          {["Mois", "Concernés", "Soldés", "Attendu", "Perçu", "Taux"].map((h, i) => (
            <Text
              key={h}
              style={[
                styles.headCell,
                { width: i === 0 ? 100 : 82 },
                i === 0 ? styles.nameCell : {},
              ]}
            >
              {h}
            </Text>
          ))}
        </View>
        {dashboard.months.map((m, i) => (
          <View key={m.month} style={styles.row} wrap={false}>
            <Text
              style={[
                styles.cell,
                styles.nameCell,
                {
                  width: 100,
                  backgroundColor: i % 2 ? PRINT.zebra : "#FFFFFF",
                  color: m.open ? PRINT.text : PRINT.muted,
                },
              ]}
            >
              {MONTH_NAMES[m.month - 1]}
              {m.open ? "" : " (non ouvert)"}
            </Text>
            <Text style={[styles.cell, { width: 82 }]}>{m.open ? m.eligible : "-"}</Text>
            <Text style={[styles.cell, { width: 82 }]}>{m.open ? m.paid : "-"}</Text>
            <Text style={[styles.cell, { width: 82 }]}>{formatNumber(m.expected)}</Text>
            <Text style={[styles.cell, { width: 82 }]}>{formatNumber(m.collected)}</Text>
            <Text
              style={[
                styles.cell,
                { width: 82, color: m.rate >= 0.8 ? PRINT.paidText : PRINT.dueText },
              ]}
            >
              {m.open ? formatPercent(m.rate, 0) : "-"}
            </Text>
          </View>
        ))}

        {/* Situation des membres */}
        <Text style={styles.sectionTitle}>Situation des membres</Text>
        <View style={styles.row}>
          <Text style={[styles.headCell, styles.nameCell, { width: 260 }]}>
            Catégorie
          </Text>
          <Text style={[styles.headCell, { width: 90 }]}>Nombre</Text>
        </View>
        {[
          ["Membres à jour (tous les mois soldés)", dashboard.upToDate],
          ["Membres avec au moins un mois d'arriéré", dashboard.lateMembers],
          ["Membres n'ayant jamais soldé un seul mois", dashboard.neverPaid],
          ["Membres ayant soldé au moins un mois", dashboard.atLeastOnePaid],
          ["Membres signalés (3 mois consécutifs impayés)", dashboard.atRisk],
        ].map(([label, value], i) => (
          <View key={String(label)} style={styles.row} wrap={false}>
            <Text
              style={[
                styles.cell,
                styles.nameCell,
                { width: 260, backgroundColor: i % 2 ? PRINT.zebra : "#FFFFFF" },
              ]}
            >
              {label}
            </Text>
            <Text style={[styles.cell, { width: 90 }]}>{value}</Text>
          </View>
        ))}

        {/* Membres signalés, nominativement */}
        {stats.some((s) => s.atRisk) && (
          <>
            <Text style={styles.sectionTitle}>
              Membres signalés en vue d&apos;un retrait
            </Text>
            {stats
              .filter((s) => s.atRisk)
              .map((s) => (
                <Text
                  key={s.member.id}
                  style={{ fontSize: 8, color: PRINT.dangerText, marginBottom: 2 }}
                >
                  • {fullName(s.member)} — {s.longestUnpaidStreak} mois consécutifs
                  impayés, {formatAmount(s.outstanding, c)} restant dû
                </Text>
              ))}
          </>
        )}

        {/* Coordonnées de paiement */}
        {hasPay && (
          <View style={styles.payBox}>
            <Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 5 }}>
              Moyens de paiement
            </Text>
            {settings.pay_wave ? <Text>Wave : {settings.pay_wave}</Text> : null}
            {settings.pay_mtn ? (
              <Text>MTN Mobile Money : {settings.pay_mtn}</Text>
            ) : null}
            {settings.pay_orange ? (
              <Text>Orange Money : {settings.pay_orange}</Text>
            ) : null}
          </View>
        )}

        <View style={styles.footerNote} fixed>
          <Text>Point de caisse — {settings.association_name}</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              "Page " + pageNumber + " / " + totalPages
            }
          />
        </View>
      </Page>
    </Document>
  );
}

// ---------------------------------------------------------------------------
//  Génération des fichiers
// ---------------------------------------------------------------------------

export async function buildGrillePdf(args: {
  rows: MemberStats[];
  settings: Settings;
  payments: Payment[];
  dashboard: DashboardSummary;
}): Promise<Blob> {
  return pdf(<GrilleDocument {...args} />).toBlob();
}

export async function buildCaissePdf(args: {
  dashboard: DashboardSummary;
  settings: Settings;
  stats: MemberStats[];
}): Promise<Blob> {
  return pdf(<CaisseDocument {...args} />).toBlob();
}
