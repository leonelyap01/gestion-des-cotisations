/**
 * Adresses des images de couverture.
 *
 * Volontairement hors de storage.ts, qui est un module client : ces fonctions
 * sont aussi appelées par les pages publiques rendues sur le serveur.
 */

export const COVER_BUCKET = "couvertures";

/**
 * Adresse publique d'une couverture, construite à partir de l'URL du projet
 * Supabase. Le bucket est public : l'image s'affiche sans session.
 */
export function coverUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return (
    base.replace(/\/$/, "") +
    "/storage/v1/object/public/" +
    COVER_BUCKET +
    "/" +
    path
  );
}
