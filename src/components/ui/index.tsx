"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

/* =========================================================================
   Petite bibliothèque de composants d'interface, volontairement minimaliste.
   Tout est basé sur les variables CSS du thème (voir globals.css).
   ========================================================================= */

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={"card " + className}>{children}</div>;
}

export function SectionTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {subtitle && <p className="text-sm text-muted mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

type ButtonVariant = "primary" | "ghost" | "outline" | "danger";

const BUTTON_STYLES: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-contrast hover:opacity-90 font-medium",
  ghost: "text-ink hover:bg-surface-2",
  outline: "border border-line text-ink hover:bg-surface-2",
  danger: "bg-danger-soft text-danger border border-danger/30 hover:bg-danger/20",
};

export function Button({
  children,
  variant = "outline",
  className = "",
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      type={type}
      className={
        "inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm transition disabled:opacity-50 disabled:pointer-events-none " +
        BUTTON_STYLES[variant] +
        " " +
        className
      }
      {...props}
    >
      {children}
    </button>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "paid" | "due" | "danger" | "accent";
}) {
  const tones: Record<string, string> = {
    neutral: "bg-surface-2 text-muted border-line",
    paid: "bg-paid-soft text-paid border-paid/30",
    due: "bg-due-soft text-due border-due/30",
    danger: "bg-danger-soft text-danger border-danger/30",
    accent: "bg-accent-soft text-accent border-accent/30",
  };
  return (
    <span
      className={
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs whitespace-nowrap " +
        tones[tone]
      }
    >
      {children}
    </span>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  // Fermeture au clavier + blocage du défilement de l'arrière-plan.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-black/65 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={
          "relative w-full card overflow-hidden rounded-b-none sm:rounded-2xl max-h-[92vh] flex flex-col " +
          (wide ? "sm:max-w-3xl" : "sm:max-w-lg")
        }
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h3 className="font-semibold">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      {icon && <div className="text-muted opacity-70">{icon}</div>}
      <p className="font-medium">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted">{description}</p>}
      {action}
    </div>
  );
}

export function Spinner({ label = "Chargement…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-sm text-muted">
      <span
        className="h-4 w-4 animate-spin rounded-full border-2 border-line"
        style={{ borderTopColor: "var(--accent)" }}
      />
      {label}
    </div>
  );
}

/** Barre de progression utilisée pour les taux de recouvrement. */
export function Progress({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(1, Number(value) || 0)) * 100;
  const color = pct >= 80 ? "var(--paid)" : pct >= 50 ? "var(--due)" : "var(--danger)";
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2"
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full transition-all"
        style={{ width: pct + "%", background: color }}
      />
    </div>
  );
}
