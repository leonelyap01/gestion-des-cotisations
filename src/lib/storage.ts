"use client";

/**
 * Gestion des portraits des membres (bucket privé « photos ») et des images
 * utilisées par les exports PDF/Word.
 *
 * Le bucket n'est pas public : une photo n'est jamais accessible par simple
 * URL. L'application obtient un lien signé temporaire, valable une heure,
 * uniquement avec une session authentifiée.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { COVER_BUCKET } from "./media";

export const PHOTO_BUCKET = "photos";

/** Durée de validité des liens signés (1 heure). */
const SIGNED_URL_TTL = 3600;

/** Côté le plus long d'un portrait après redimensionnement. */
const MAX_PHOTO_SIZE = 800;

/**
 * Redimensionne et recadre un portrait au format 3/4 (celui de la carte),
 * puis le convertit en JPEG. Une photo de téléphone de 4 Mo tombe ainsi
 * à quelques dizaines de kilo-octets — indispensable en connexion mobile.
 */
export async function preparePhoto(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);

  // Recadrage centré au format 3/4 (largeur / hauteur).
  const targetRatio = 3 / 4;
  const sourceRatio = bitmap.width / bitmap.height;

  let sx = 0;
  let sy = 0;
  let sw = bitmap.width;
  let sh = bitmap.height;

  if (sourceRatio > targetRatio) {
    // Image trop large : on rogne les côtés.
    sw = Math.round(bitmap.height * targetRatio);
    sx = Math.round((bitmap.width - sw) / 2);
  } else {
    // Image trop haute : on rogne le haut et le bas.
    sh = Math.round(bitmap.width / targetRatio);
    sy = Math.round((bitmap.height - sh) / 2);
  }

  const height = Math.min(MAX_PHOTO_SIZE, sh);
  const width = Math.round(height * targetRatio);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Impossible de préparer la photo sur cet appareil.");
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.86),
  );
  if (!blob) throw new Error("La conversion de la photo a échoué.");
  return blob;
}

/** Envoie le portrait d'un membre et renvoie son chemin de stockage. */
export async function uploadPhoto(
  supabase: SupabaseClient,
  memberId: string,
  file: File,
): Promise<string> {
  const blob = await preparePhoto(file);
  // Le suffixe horodaté évite qu'un navigateur serve l'ancienne photo en cache.
  const path = "membres/" + memberId + "-" + Date.now() + ".jpg";

  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, blob, { contentType: "image/jpeg", upsert: true });

  if (error) throw error;
  return path;
}

export async function deletePhoto(
  supabase: SupabaseClient,
  path: string | null,
): Promise<void> {
  if (!path) return;
  await supabase.storage.from(PHOTO_BUCKET).remove([path]);
}

/** Lien signé temporaire permettant d'afficher un portrait. */
export async function photoUrl(
  supabase: SupabaseClient,
  path: string | null,
): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL);
  if (error) return null;
  return data?.signedUrl ?? null;
}

/**
 * Convertit une image en data URL.
 *
 * @react-pdf/renderer et docx ont besoin des octets de l'image : on la
 * télécharge une fois, puis on la réutilise pour toutes les cartes.
 */
export async function toDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** Octets d'une image, pour l'export Word. */
export async function toArrayBuffer(url: string): Promise<ArrayBuffer | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.arrayBuffer();
  } catch {
    return null;
  }
}

/* =========================================================================
   Images de couverture des annonces et de la page « Notre vision »

   Bucket PUBLIC : ces images s'affichent pour des visiteurs sans session.
   Rien de sensible n'y est déposé — les portraits des membres restent dans
   le bucket privé « photos ».
   ========================================================================= */

/** Largeur maximale d'une couverture, en pixels. */
const MAX_COVER_WIDTH = 1600;

/** Proportions d'une couverture : format paysage 16/9. */
const COVER_RATIO = 16 / 9;

/** Recadre une image en 16/9, la réduit et la convertit en JPEG. */
export async function prepareCover(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);

  let sx = 0;
  let sy = 0;
  let sw = bitmap.width;
  let sh = bitmap.height;

  if (bitmap.width / bitmap.height > COVER_RATIO) {
    sw = Math.round(bitmap.height * COVER_RATIO);
    sx = Math.round((bitmap.width - sw) / 2);
  } else {
    sh = Math.round(bitmap.width / COVER_RATIO);
    sy = Math.round((bitmap.height - sh) / 2);
  }

  const width = Math.min(MAX_COVER_WIDTH, sw);
  const height = Math.round(width / COVER_RATIO);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Impossible de préparer l'image sur cet appareil.");
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.82),
  );
  if (!blob) throw new Error("La conversion de l'image a échoué.");
  return blob;
}

/**
 * Envoie une couverture et renvoie son chemin de stockage.
 *
 * @param prefix « annonces » ou « vision », pour garder le bucket lisible.
 */
export async function uploadCover(
  supabase: SupabaseClient,
  prefix: string,
  file: File,
): Promise<string> {
  const blob = await prepareCover(file);
  const path = prefix + "/" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + ".jpg";

  const { error } = await supabase.storage
    .from(COVER_BUCKET)
    .upload(path, blob, { contentType: "image/jpeg", upsert: true });

  if (error) throw error;
  return path;
}

export async function deleteCover(
  supabase: SupabaseClient,
  path: string | null,
): Promise<void> {
  if (!path) return;
  await supabase.storage.from(COVER_BUCKET).remove([path]);
}

/**
 * Médaillon circulaire du logo : le fichier fourni contient le médaillon ET la
 * banderole de devise, alors que la carte de membre n'utilise que le médaillon.
 *
 * Le recadrage est fait ici, avant le PDF : @react-pdf/renderer n'applique pas
 * `overflow: hidden`, une image y déborderait donc de son conteneur.
 */
export const LOGO_MEDALLION = { x: 72, y: 0, w: 193, h: 197 };

export async function cropToDataUrl(
  url: string,
  box: { x: number; y: number; w: number; h: number },
): Promise<string | null> {
  try {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = url;
    await image.decode();

    const canvas = document.createElement("canvas");
    canvas.width = box.w;
    canvas.height = box.h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Fond blanc : le JPEG source n'a pas de transparence, on reste cohérent.
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, box.w, box.h);
    ctx.drawImage(image, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h);

    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

/** Logo du comité recadré sur son seul médaillon, prêt pour les cartes. */
export async function logoMedallionDataUrl(logoUrl: string): Promise<string | null> {
  return cropToDataUrl(logoUrl, LOGO_MEDALLION);
}

/** Portrait d'un membre directement en data URL, prêt pour le PDF. */
export async function photoDataUrl(
  supabase: SupabaseClient,
  path: string | null,
): Promise<string | null> {
  const url = await photoUrl(supabase, path);
  if (!url) return null;
  return toDataUrl(url);
}
