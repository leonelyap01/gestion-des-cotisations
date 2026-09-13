/**
 * Export Word (.docx) de la grille de cotisations.
 *
 * Même mise en page que l'export PDF : A4 paysage, une ligne par membre, une
 * colonne par mois, code couleur identique. Le fichier reste modifiable, ce qui
 * permet d'y ajouter des remarques avant diffusion.
 */

import {
  AlignmentType,
  Document,
  HeadingLevel,
  ImageRun,
  PageOrientation,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";
import {
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
import { PRINT, accentHex, noHash } from "./theme";

/** Cellule de tableau, avec fond et alignement configurables. */
function cell(
  text: string,
  options: {
    bold?: boolean;
    fill?: string;
    color?: string;
    align?: (typeof AlignmentType)[keyof typeof AlignmentType];
    width?: number;
  } = {},
): TableCell {
  return new TableCell({
    shading: options.fill ? { fill: noHash(options.fill) } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    width: options.width ? { size: options.width, type: WidthType.DXA } : undefined,
    margins: { top: 40, bottom: 40, left: 60, right: 60 },
    children: [
      new Paragraph({
        alignment: options.align ?? AlignmentType.CENTER,
        children: [
          new TextRun({
            text,
            bold: options.bold,
            size: 15, // demi-points → ~7,5 pt, pour tenir sur une page
            color: options.color ? noHash(options.color) : undefined,
            font: "Calibri",
          }),
        ],
      }),
    ],
  });
}

export async function buildGrilleDocx({
  rows,
  settings,
  payments,
  dashboard,
  logo,
}: {
  rows: MemberStats[];
  settings: Settings;
  payments: Payment[];
  dashboard: DashboardSummary;
  /** Octets du logo du comité (facultatif). */
  logo?: ArrayBuffer | null;
}): Promise<Blob> {
  const accent = accentHex(settings.accent);
  const months = exerciseMonths(settings);
  const year = settings.exercise_year;
  const c = settings.currency;

  const index = new Map<string, Payment>();
  for (const p of payments) index.set(paymentKey(p.member_id, p.year, p.month), p);

  // --- En-tête du tableau ---
  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      cell("N°", { bold: true, fill: PRINT.headerBg }),
      cell("Nom et prénoms", {
        bold: true,
        fill: PRINT.headerBg,
        align: AlignmentType.LEFT,
        width: 2600,
      }),
      cell("Adhésion", { bold: true, fill: PRINT.headerBg, width: 1100 }),
      cell("Droit", { bold: true, fill: PRINT.headerBg }),
      ...months.map((m) => cell(MONTH_SHORT[m - 1], { bold: true, fill: PRINT.headerBg })),
      cell("Soldés", { bold: true, fill: PRINT.headerBg }),
      cell("Reste dû", { bold: true, fill: PRINT.headerBg, width: 1100 }),
    ],
  });

  // --- Une ligne par membre ---
  const memberRows = rows.map((s, i) => {
    const zebra = i % 2 === 1 ? PRINT.zebra : "#FFFFFF";

    const monthCells = months.map((m) => {
      const paid = index.has(paymentKey(s.member.id, year, m));
      const status = cellStatus(s.member, m, settings, paid);
      // Règle métier n°1 : la case d'un mois antérieur à l'adhésion est grisée
      // et vide — elle n'est jamais présentée comme un impayé.
      if (status === "not_member") return cell("", { fill: PRINT.nonMemberBg });
      if (status === "paid")
        return cell("X", { fill: PRINT.paidBg, color: PRINT.paidText, bold: true });
      if (status === "due") return cell(".", { fill: PRINT.dueBg, color: PRINT.dueText });
      return cell("", { fill: zebra });
    });

    return new TableRow({
      children: [
        cell(String(i + 1), { fill: zebra }),
        cell(fullName(s.member) + (s.atRisk ? " (*)" : ""), {
          fill: zebra,
          align: AlignmentType.LEFT,
          color: s.atRisk ? PRINT.dangerText : undefined,
        }),
        cell(joinLabel(s.member), { fill: zebra, color: PRINT.muted }),
        cell(!s.feeDue ? "-" : s.feePaid ? "X" : ".", {
          fill: !s.feeDue ? PRINT.nonMemberBg : s.feePaid ? PRINT.paidBg : PRINT.dueBg,
          color: !s.feeDue ? PRINT.muted : s.feePaid ? PRINT.paidText : PRINT.dueText,
          bold: s.feePaid,
        }),
        ...monthCells,
        cell(s.paidMonths + "/" + s.eligibleMonths, { fill: zebra }),
        cell(formatNumber(s.outstanding), {
          fill: zebra,
          color: s.outstanding > 0 ? PRINT.dueText : PRINT.paidText,
        }),
      ],
    });
  });

  // --- Ligne de totaux ---
  const totalRow = new TableRow({
    children: [
      cell("", { fill: PRINT.headerBg }),
      cell("TOTAL (" + rows.length + " membres)", {
        bold: true,
        fill: PRINT.headerBg,
        align: AlignmentType.LEFT,
      }),
      cell("", { fill: PRINT.headerBg }),
      cell(String(rows.filter((s) => s.feeDue && s.feePaid).length), {
        bold: true,
        fill: PRINT.headerBg,
      }),
      ...months.map((m) => {
        const summary = dashboard.months.find((x) => x.month === m);
        return cell(
          summary && summary.open ? summary.paid + "/" + summary.eligible : "-",
          { bold: true, fill: PRINT.headerBg },
        );
      }),
      cell(formatPercent(dashboard.recoveryRate, 0), {
        bold: true,
        fill: PRINT.headerBg,
      }),
      cell(formatNumber(dashboard.outstanding), {
        bold: true,
        fill: PRINT.headerBg,
        color: PRINT.dueText,
      }),
    ],
  });

  const doc = new Document({
    creator: settings.association_name,
    title: "Grille de cotisations " + year,
    description: "Suivi des cotisations mensuelles",
    sections: [
      {
        properties: {
          page: {
            size: { orientation: PageOrientation.LANDSCAPE },
            margin: { top: 720, bottom: 720, left: 720, right: 720 },
          },
        },
        children: [
          // Logo du comité, quand il a pu être chargé.
          ...(logo
            ? [
                new Paragraph({
                  spacing: { after: 60 },
                  children: [
                    new ImageRun({
                      type: "jpg",
                      data: logo,
                      transformation: { width: 86, height: 68 },
                    }),
                  ],
                }),
              ]
            : []),
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [
              new TextRun({
                text: settings.association_name,
                bold: true,
                size: 30,
                color: noHash(accent),
                font: "Calibri",
              }),
            ],
          }),
          ...(settings.motto
            ? [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "« " + settings.motto + " »",
                      italics: true,
                      size: 18,
                      color: noHash(PRINT.muted),
                      font: "Calibri",
                    }),
                  ],
                }),
              ]
            : []),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: "Grille de suivi des cotisations — exercice " + year,
                size: 20,
                color: noHash(PRINT.muted),
                font: "Calibri",
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text:
                  "Cotisation mensuelle : " +
                  formatAmount(settings.monthly_amount, c) +
                  "   |   Droit d'adhésion : " +
                  formatAmount(settings.membership_fee, c) +
                  "   |   Édité le " +
                  formatDate(new Date()),
                size: 17,
                color: noHash(PRINT.muted),
                font: "Calibri",
              }),
            ],
          }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [headerRow, ...memberRows, totalRow],
          }),

          new Paragraph({
            spacing: { before: 240 },
            children: [
              new TextRun({
                text:
                  "Légende : X = mois soldé  ·  . = mois dû (non soldé)  ·  case grisée = " +
                  "personne non membre à cette période, jamais comptée comme un arriéré  ·  " +
                  "(*) = membre signalé pour 3 mois d'impayés consécutifs.",
                size: 16,
                italics: true,
                color: noHash(PRINT.muted),
                font: "Calibri",
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 120 },
            children: [
              new TextRun({
                text:
                  "Théorique attendu : " +
                  formatAmount(dashboard.expected, c) +
                  "   |   Perçu : " +
                  formatAmount(dashboard.collected, c) +
                  "   |   Manque à gagner : " +
                  formatAmount(dashboard.outstanding, c) +
                  "   |   Taux de recouvrement : " +
                  formatPercent(dashboard.recoveryRate),
                size: 17,
                bold: true,
                font: "Calibri",
              }),
            ],
          }),
        ],
      },
    ],
  });

  return Packer.toBlob(doc);
}
