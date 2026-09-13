/**
 * Helpers des annonces publiques (fonctions pures).
 */

import type { Post, PostCategory } from "./types";

export const POST_CATEGORIES: Record<
  PostCategory,
  { label: string; tone: "accent" | "paid" | "due" | "danger" }
> = {
  info: { label: "Information", tone: "accent" },
  annonce: { label: "Annonce", tone: "paid" },
  evenement: { label: "Événement", tone: "due" },
  urgent: { label: "Urgent", tone: "danger" },
};

export const POST_CATEGORY_ORDER: PostCategory[] = [
  "info",
  "annonce",
  "evenement",
  "urgent",
];

/** Couleur d'affichage d'une catégorie, exprimée en variable CSS du thème. */
export function categoryColor(category: PostCategory): string {
  switch (POST_CATEGORIES[category]?.tone) {
    case "paid":
      return "var(--paid)";
    case "due":
      return "var(--due)";
    case "danger":
      return "var(--danger)";
    default:
      return "var(--accent)";
  }
}

/**
 * Ordre d'affichage : les annonces épinglées d'abord, puis les plus récentes.
 * Utilisé aussi bien sur la page publique que dans l'espace trésorier.
 */
export function sortPosts(posts: Post[]): Post[] {
  return [...posts].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return (
      new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
    );
  });
}

/** Aperçu court du corps du message, pour les listes. */
export function excerpt(body: string, max = 160): string {
  const flat = body.replace(/\s+/g, " ").trim();
  return flat.length <= max ? flat : flat.slice(0, max - 1).trimEnd() + "…";
}
