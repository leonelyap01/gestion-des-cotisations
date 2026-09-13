import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Post, Settings } from "@/lib/types";

/**
 * Lectures de la partie publique du site (accueil, vision, carte).
 *
 * `cache()` déduplique l'appel au sein d'un même rendu : la mise en page et la
 * page qu'elle contient demandent toutes deux les paramètres, mais la base
 * n'est interrogée qu'une fois.
 */

export const getPublicSettings = cache(async (): Promise<Settings | null> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  return (data as Settings | null) ?? null;
});

/** Annonces publiées, les épinglées d'abord. */
export const getPublishedPosts = cache(async (): Promise<Post[]> => {
  const supabase = await createClient();
  const { data } = await supabase.from("posts").select("*").eq("published", true);
  return (data ?? []) as Post[];
});
