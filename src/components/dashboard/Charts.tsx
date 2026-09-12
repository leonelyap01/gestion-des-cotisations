"use client";

import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthSummary } from "@/lib/cotisations";
import { formatNumber, formatPercent } from "@/lib/format";

const AXIS = { fill: "var(--muted)", fontSize: 11 };

const TOOLTIP_STYLE = {
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  color: "var(--text)",
  fontSize: 12,
} as const;

/**
 * Évolution mensuelle du nombre de membres à jour.
 * Les mois non encore ouverts sont affichés en gris pour rester lisibles.
 */
export function MonthlyPaidChart({ months }: { months: MonthSummary[] }) {
  const data = months.map((m) => ({
    name: m.short,
    "À jour": m.paid,
    Attendus: m.eligible,
    open: m.open,
    rate: m.rate,
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <XAxis dataKey="name" tick={AXIS} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            cursor={{ fill: "var(--surface-2)", opacity: 0.5 }}
            formatter={(value, name) => [formatNumber(Number(value)), String(name)]}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: "var(--muted)" }} />
          <Bar dataKey="Attendus" fill="var(--surface-2)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="À jour" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.open ? "var(--accent)" : "var(--neutral)"}
                opacity={entry.open ? 1 : 0.4}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Répartition soldés / non soldés sur l'ensemble des mois exigibles. */
export function PaidDonutChart({
  paid,
  unpaid,
}: {
  paid: number;
  unpaid: number;
}) {
  const total = paid + unpaid;
  const data = [
    { name: "Soldés", value: paid, color: "var(--paid)" },
    { name: "Non soldés", value: unpaid, color: "var(--due)" },
  ];

  if (total === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted">
        Aucun mois ouvert pour l&apos;instant.
      </div>
    );
  }

  return (
    <div className="relative h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="62%"
            outerRadius="88%"
            paddingAngle={2}
            stroke="var(--surface)"
            strokeWidth={2}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(value, name) => [formatNumber(Number(value)) + " mois", String(name)]}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: "var(--muted)" }} />
        </PieChart>
      </ResponsiveContainer>

      {/* Taux global au centre du donut */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-7">
        <span className="text-2xl font-semibold tracking-tight">
          {formatPercent(total > 0 ? paid / total : 0, 0)}
        </span>
        <span className="text-xs text-muted">mois soldés</span>
      </div>
    </div>
  );
}
