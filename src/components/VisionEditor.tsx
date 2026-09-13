"use client";

import { useEffect, useState } from "react";
import { Check, Compass, ExternalLink, Save } from "lucide-react";
import { useData } from "./DataProvider";
import { CoverPicker } from "./CoverPicker";
import { Button, Card, Field, SectionTitle } from "./ui";

/**
 * Rédaction de l'onglet « Notre vision » de la page publique.
 *
 * Accessible aux deux profils : c'est du contenu public, au même titre que les
 * annonces. L'écriture passe par la fonction SQL maj_vision, qui ne touche
 * qu'à ce texte et à sa couverture — jamais aux montants ni à l'exercice.
 */
export function VisionEditor() {
  const { settings, saveVision } = useData();

  const [texte, setTexte] = useState(settings.vision);
  const [cover, setCover] = useState<string | null>(settings.vision_cover);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  // Reprend les valeurs enregistrées dès qu'elles arrivent (ou changent
  // depuis un autre appareil).
  useEffect(() => {
    setTexte(settings.vision);
    setCover(settings.vision_cover);
  }, [settings.vision, settings.vision_cover]);

  const modifie =
    texte !== settings.vision || cover !== settings.vision_cover;

  async function onSave() {
    setBusy(true);
    const ok = await saveVision(texte, cover);
    setBusy(false);
    if (ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  }

  return (
    <Card className="p-5">
      <SectionTitle
        title="Notre vision"
        subtitle="Second onglet de la page publique, à côté des actualités."
        action={
          <a
            href="/vision"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
          >
            <ExternalLink size={15} /> Voir la page
          </a>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
        <Field
          label="Texte"
          hint="Les retours à la ligne sont conservés : paragraphes et listes à puces fonctionnent."
        >
          <textarea
            className="field min-h-56 resize-y leading-relaxed"
            value={texte}
            onChange={(e) => setTexte(e.target.value)}
            placeholder={
              "Notre comité œuvre pour…\n\n" +
              "Nos valeurs : solidarité, unité, respect, développement de notre communauté.\n\n" +
              "Nos objectifs pour l'année :\n" +
              "• …\n• …"
            }
          />
        </Field>

        <CoverPicker value={cover} onChange={setCover} prefix="vision" />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-xs leading-relaxed text-muted">
          <Compass size={14} className="shrink-0 text-accent" />
          {texte.trim()
            ? "L'onglet « Notre vision » est visible de toute personne disposant du lien."
            : "Tant que ce texte est vide, l'onglet n'apparaît pas sur la page publique."}
        </p>

        <Button
          variant="primary"
          onClick={() => void onSave()}
          disabled={busy || (!modifie && !saved)}
        >
          {saved ? <Check size={15} /> : <Save size={15} />}
          {busy ? "Enregistrement…" : saved ? "Enregistré" : "Enregistrer la vision"}
        </Button>
      </div>
    </Card>
  );
}
