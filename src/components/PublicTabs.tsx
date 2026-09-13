"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Onglets de l'espace public.
 *
 * Chaque onglet est une adresse à part entière : le lien « Notre vision » se
 * partage directement, et la navigation fonctionne même sans JavaScript.
 */
export function PublicTabs({ showVision }: { showVision: boolean }) {
  const pathname = usePathname();

  const tabs = [
    { href: "/", label: "Actualités" },
    ...(showVision ? [{ href: "/vision", label: "Notre vision" }] : []),
  ];

  // Un seul onglet : la barre n'apporterait rien.
  if (tabs.length < 2) return null;

  return (
    <nav
      aria-label="Sections"
      className="mt-6 flex gap-1 border-b border-line"
    >
      {tabs.map(({ href, label }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={
              "-mb-px border-b-2 px-4 py-2.5 text-sm transition " +
              (active
                ? "border-accent font-medium text-accent"
                : "border-transparent text-muted hover:text-ink")
            }
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
