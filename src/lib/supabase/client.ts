"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Client Supabase utilisé dans le navigateur.
 *
 * La sécurité ne repose pas sur ce client mais sur les règles RLS définies
 * dans supabase/schema.sql : sans session authentifiée, aucune ligne n'est
 * lisible ni modifiable.
 */
export function createClient() {
  // Valeurs de repli : elles évitent une exception au rendu tant que
  // .env.local n'est pas renseigné. L'interface affiche alors l'écran
  // « Configuration requise » plutôt qu'une page en erreur.
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key",
  );
}

/** Les clés Supabase sont-elles renseignées ? */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
