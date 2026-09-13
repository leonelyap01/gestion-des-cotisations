"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Coins,
  TrendingDown,
  Users,
} from "lucide-react";
import { useData } from "@/components/DataProvider";
import { MonthlyPaidChart, PaidDonutChart } from "@/components/dashboard/Charts";
import { Badge, Card, Progress, SectionTitle, Spinner } from "@/components/ui";
import { formatAmount, formatNumber, formatPercent } from "@/lib/format";
import { fullName } from "@/lib/cotisations";

export default function DashboardPage() {
  const { dashboard, settings, stats, loading, members } = useData();
  const c = settings.currency;

  if (loading && members.length === 0) return <Spinner />;

  // Total des mois exigibles / soldés, tous membres confondus (donut).
  const paidCells = dashboard.months.reduce((s, m) => s + m.paid, 0);
  const eligibleCells = dashboard.months.reduce((s, m) => s + m.eligible, 0);

  const atRisk = stats.filter((s) => s.atRisk);
  const worst = [...stats]
    .filter((s) => s.member.active && s.dueMonths.length > 0)
    .sort((a, b) => b.dueMonths.length - a.dueMonths.length)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tableau de bord</h1>
        <p className="mt-1 text-sm text-muted">
          Exercice {settings.exercise_year} · cotisation {formatAmount(settings.monthly_amount, c)}
          /mois · droit d&apos;adhésion {formatAmount(settings.membership_fee, c)}
        </p>
      </div>

      {/* ---------- Indicateurs financiers ---------- */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<Coins size={18} />}
          label="Théorique attendu"
          value={formatAmount(dashboard.expected, c)}
          hint={`Cotisations ${formatAmount(dashboard.duesExpected, c)} + adhésions ${formatAmount(dashboard.feesExpected, c)}`}
        />
        <StatCard
          icon={<CheckCircle2 size={18} />}
          label="Réellement perçu"
          value={formatAmount(dashboard.collected, c)}
          hint={`Cotisations ${formatAmount(dashboard.duesCollected, c)} + adhésions ${formatAmount(dashboard.feesCollected, c)}`}
          tone="paid"
        />
        <StatCard
          icon={<TrendingDown size={18} />}
          label="Manque à gagner"
          value={formatAmount(dashboard.outstanding, c)}
          hint="Théorique − perçu"
          tone="due"
        />
        <StatCard
          icon={<Users size={18} />}
          label="Taux de recouvrement"
          value={formatPercent(dashboard.recoveryRate)}
          hint={`${formatNumber(dashboard.upToDate)} membre(s) à jour sur ${formatNumber(dashboard.activeMembers)}`}
          progress={dashboard.recoveryRate}
        />
      </div>

      {/* ---------- Alerte signalements ---------- */}
      {atRisk.length > 0 && (
        <Link
          href="/alertes"
          className="flex items-center gap-3 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm transition hover:bg-danger/15"
        >
          <AlertTriangle size={18} className="shrink-0 text-danger" />
          <span className="flex-1 text-danger">
            <strong>{atRisk.length}</strong> membre(s) signalé(s) : 3 mois d&apos;impayés
            consécutifs ou plus, en vue d&apos;un retrait du comité.
          </span>
          <ArrowRight size={16} className="shrink-0 text-danger" />
        </Link>
      )}

      {/* ---------- Graphiques ---------- */}
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="p-5 lg:col-span-3">
          <SectionTitle
            title="Évolution mensuelle"
            subtitle="Membres à jour par rapport aux membres attendus"
          />
          <MonthlyPaidChart months={dashboard.months} />
        </Card>

        <Card className="p-5 lg:col-span-2">
          <SectionTitle
            title="Répartition des mois"
            subtitle="Sur l'ensemble des mois ouverts"
          />
          <PaidDonutChart paid={paidCells} unpaid={eligibleCells - paidCells} />
        </Card>
      </div>

      {/* ---------- Détail par mois ---------- */}
      <Card className="overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <h2 className="font-semibold">Taux de recouvrement par mois</h2>
          <p className="mt-0.5 text-sm text-muted">
            Seuls les mois ouverts sont exigibles ; les membres arrivés plus tard ne
            sont comptés qu&apos;à partir de leur adhésion.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-5 py-3 font-medium">Mois</th>
                <th className="px-3 py-3 font-medium">Concernés</th>
                <th className="px-3 py-3 font-medium">Soldés</th>
                <th className="px-3 py-3 font-medium">Attendu</th>
                <th className="px-3 py-3 font-medium">Perçu</th>
                <th className="px-5 py-3 font-medium">Taux</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.months.map((m) => (
                <tr key={m.month} className="border-b border-line/60 last:border-0">
                  <td className="px-5 py-3">
                    <span className={m.open ? "" : "text-muted"}>{m.label}</span>
                    {!m.open && (
                      <span className="ml-2">
                        <Badge>Non ouvert</Badge>
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-muted">{formatNumber(m.eligible)}</td>
                  <td className="px-3 py-3">{formatNumber(m.paid)}</td>
                  <td className="px-3 py-3 text-muted">{formatAmount(m.expected, c)}</td>
                  <td className="px-3 py-3">{formatAmount(m.collected, c)}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="w-14 shrink-0 tabular-nums">
                        {m.open ? formatPercent(m.rate, 0) : "—"}
                      </span>
                      <div className="w-20">
                        <Progress value={m.open ? m.rate : 0} />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ---------- Répartition des membres + plus gros arriérés ---------- */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <SectionTitle title="État des membres" />
          <ul className="space-y-2.5 text-sm">
            <Row label="Membres actifs" value={formatNumber(dashboard.activeMembers)} />
            <Row label="À jour (tout soldé)" value={formatNumber(dashboard.upToDate)} tone="paid" />
            <Row label="Avec arriérés" value={formatNumber(dashboard.lateMembers)} tone="due" />
            <Row
              label="N'ont jamais soldé un mois"
              value={formatNumber(dashboard.neverPaid)}
              tone={dashboard.neverPaid > 0 ? "danger" : "neutral"}
            />
            <Row
              label="Ont soldé au moins un mois"
              value={formatNumber(dashboard.atLeastOnePaid)}
            />
            <Row
              label="Signalés (retrait)"
              value={formatNumber(dashboard.atRisk)}
              tone={dashboard.atRisk > 0 ? "danger" : "neutral"}
            />
          </ul>
        </Card>

        <Card className="p-5">
          <SectionTitle
            title="Plus gros arriérés"
            action={
              <Link href="/membres" className="text-sm text-accent hover:underline">
                Tout voir
              </Link>
            }
          />
          {worst.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">
              Aucun arriéré : tous les membres sont à jour.
            </p>
          ) : (
            <ul className="space-y-2">
              {worst.map((s) => (
                <li key={s.member.id}>
                  <Link
                    href={`/membres/${s.member.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 transition hover:bg-surface-2"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {fullName(s.member)}
                    </span>
                    <span className="text-sm text-muted tabular-nums">
                      {formatAmount(s.outstanding, c)}
                    </span>
                    <Badge tone={s.atRisk ? "danger" : "due"}>
                      {s.dueMonths.length} mois
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
  tone = "neutral",
  progress,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "paid" | "due";
  progress?: number;
}) {
  const colors: Record<string, string> = {
    neutral: "text-accent bg-accent-soft",
    paid: "text-paid bg-paid-soft",
    due: "text-due bg-due-soft",
  };
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <span className={"rounded-lg p-2 " + colors[tone]}>{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
          <p className="mt-1 truncate text-xl font-semibold tracking-tight">{value}</p>
        </div>
      </div>
      {progress !== undefined && (
        <div className="mt-3">
          <Progress value={progress} />
        </div>
      )}
      {hint && <p className="mt-2 text-xs leading-relaxed text-muted">{hint}</p>}
    </Card>
  );
}

function Row({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "paid" | "due" | "danger";
}) {
  const colors: Record<string, string> = {
    neutral: "text-ink",
    paid: "text-paid",
    due: "text-due",
    danger: "text-danger",
  };
  return (
    <li className="flex items-center justify-between gap-3 border-b border-line/60 pb-2 last:border-0 last:pb-0">
      <span className="text-muted">{label}</span>
      <span className={"font-semibold tabular-nums " + colors[tone]}>{value}</span>
    </li>
  );
}
