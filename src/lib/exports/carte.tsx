"use client";

/**
 * Cartes de membre au format PDF, d'après la maquette du comité.
 *
 * Chaque carte fait 54 × 85,6 mm (format carte bancaire, en portrait). Une
 * page A4 reçoit deux membres, recto et verso côte à côte, avec des repères
 * de découpe : il suffit d'imprimer à 100 % et de couper.
 */

import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer";
import { fullName, joinLabel } from "../cotisations";
import { memberRole } from "../cartes";
import type { Member, Settings } from "../types";

// --- Dimensions ------------------------------------------------------------
const MM = 2.8346; // 1 mm en points PDF
const CARD_W = 54 * MM; // 153,1 pt
const CARD_H = 85.6 * MM; // 242,6 pt
const GAP = 14;

// --- Couleurs de la charte du comité --------------------------------------
const GREEN = "#0E3B22";
const GREEN_DARK = "#092B18";
const ORANGE = "#EF7622";
const GOLD = "#E3A917";
const RED = "#C0261C";
const INK = "#1A1A1A";
const GREY = "#6B7280";

/**
 * Proportions du médaillon du logo (193 × 197), déjà recadré en amont par
 * logoMedallionDataUrl() : @react-pdf/renderer n'applique pas `overflow`,
 * le recadrage ne peut donc pas se faire ici.
 */
const LOGO_RATIO = 197 / 193;

const styles = StyleSheet.create({
  page: { backgroundColor: "#FFFFFF", paddingTop: 34, paddingHorizontal: 30 },

  card: {
    width: CARD_W,
    height: CARD_H,
    backgroundColor: "#FFFFFF",
    borderRadius: 9,
    borderWidth: 0.5,
    borderColor: "#D8DDE3",
    overflow: "hidden",
  },

  // ---- Recto ----
  head: { paddingTop: 7, paddingHorizontal: 7, flexDirection: "row", gap: 5 },
  committee: { fontSize: 5.2, fontFamily: "Helvetica-Bold", color: ORANGE, letterSpacing: 0.4 },
  title: { fontSize: 7.4, fontFamily: "Helvetica-Bold", color: GREEN, lineHeight: 1.05 },
  subtitle: { fontSize: 5.6, fontFamily: "Helvetica-Bold", color: GREEN, letterSpacing: 0.8 },

  ribbon: {
    marginTop: 3,
    backgroundColor: GREEN,
    borderRadius: 2,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  ribbonText: {
    fontSize: 4.9,
    fontFamily: "Helvetica-Oblique",
    color: "#FFFFFF",
    textAlign: "center",
  },

  band: {
    marginTop: 6,
    backgroundColor: ORANGE,
    paddingVertical: 8,
    paddingHorizontal: 7,
    flexDirection: "row",
    gap: 6,
    borderTopRightRadius: 26,
    borderBottomLeftRadius: 26,
  },
  bandLabel: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    color: "#FFFFFF",
    lineHeight: 1.05,
  },
  numberBadge: {
    marginTop: 4,
    backgroundColor: GREEN,
    borderRadius: 2.5,
    paddingVertical: 2.5,
    paddingHorizontal: 4,
  },
  numberText: { fontSize: 5.2, fontFamily: "Helvetica-Bold", color: "#FFFFFF" },

  photo: {
    width: 54,
    height: 72,
    borderRadius: 5,
    borderWidth: 1.6,
    borderColor: "#FFFFFF",
    objectFit: "cover",
  },
  photoEmpty: {
    width: 54,
    height: 72,
    borderRadius: 5,
    borderWidth: 1.6,
    borderColor: "#FFFFFF",
    backgroundColor: "#F4D9C2",
    alignItems: "center",
    justifyContent: "center",
  },

  name: { fontSize: 11, fontFamily: "Helvetica-Bold", textAlign: "center" },
  roleBadge: {
    marginTop: 3.5,
    alignSelf: "center",
    borderWidth: 0.8,
    borderColor: GREEN,
    borderRadius: 7,
    paddingVertical: 2.5,
    paddingHorizontal: 8,
  },
  roleText: {
    fontSize: 5.4,
    fontFamily: "Helvetica-Bold",
    color: GREEN,
    letterSpacing: 0.3,
  },

  foot: {
    marginTop: "auto",
    backgroundColor: GREEN,
    paddingVertical: 5,
    paddingHorizontal: 7,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footLabel: { fontSize: 4.6, color: "#FFFFFF", textAlign: "center" },
  footSign: {
    fontSize: 6.4,
    fontFamily: "Helvetica-Oblique",
    color: GOLD,
    textAlign: "center",
    marginTop: 1,
  },

  // ---- Verso ----
  versoHead: {
    backgroundColor: GREEN,
    paddingVertical: 9,
    alignItems: "center",
  },
  versoTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#FFFFFF",
    letterSpacing: 0.6,
  },
  versoRule: { height: 2, backgroundColor: GOLD },
  versoBody: { paddingHorizontal: 11, paddingTop: 9, alignItems: "center" },
  versoText: {
    fontSize: 5.6,
    color: INK,
    lineHeight: 1.5,
    textAlign: "left",
    marginTop: 9,
  },
  divider: {
    marginTop: 9,
    marginBottom: 7,
    height: 0.6,
    width: "72%",
    backgroundColor: "#D8DDE3",
  },
  warning: { fontSize: 5.2, color: RED, lineHeight: 1.45, fontFamily: "Helvetica-Bold" },

  // ---- Repères de découpe ----
  cutRow: { flexDirection: "row", gap: GAP, marginBottom: 6 },
  cutLabel: { fontSize: 6, color: GREY, marginBottom: 3 },
});

/**
 * Médaillon du logo. `src` est l'image déjà recadrée ; la devise est rendue
 * séparément, en texte, dans sa propre banderole.
 */
function LogoRond({ src, size }: { src?: string | null; size: number }) {
  const height = size * LOGO_RATIO;

  if (!src) {
    return (
      <View
        style={{
          width: size,
          height,
          borderRadius: size / 2,
          borderWidth: 1,
          borderColor: ORANGE,
        }}
      />
    );
  }

  return <Image src={src} style={{ width: size, height }} />;
}

export interface CardAssets {
  /** Logo du comité en data URL. */
  logo: string | null;
  /** Portrait du membre en data URL, indexé par identifiant. */
  photos: Record<string, string | null>;
  /** QR code de vérification en data URL, indexé par identifiant. */
  qrCodes: Record<string, string | null>;
}

// ---------------------------------------------------------------------------
//  Recto
// ---------------------------------------------------------------------------

function Recto({
  member,
  settings,
  assets,
}: {
  member: Member;
  settings: Settings;
  assets: CardAssets;
}) {
  const photo = assets.photos[member.id];
  const qr = assets.qrCodes[member.id];
  const parts = fullName(member).split(" ");
  const surname = parts[0] ?? "";
  const given = parts.slice(1).join(" ");

  return (
    <View style={styles.card}>
      {/* En-tête : médaillon + intitulé du comité */}
      <View style={styles.head}>
        <LogoRond src={assets.logo} size={34} />
        <View style={{ flex: 1 }}>
          <Text style={styles.committee}>COMITÉ</Text>
          <Text style={styles.title}>JEUNESSE ÉMERGENTE</Text>
          <Text style={styles.subtitle}>— D&apos;AHEOUA —</Text>
        </View>
      </View>

      {settings.motto ? (
        <View style={{ paddingHorizontal: 7 }}>
          <View style={styles.ribbon}>
            <Text style={styles.ribbonText}>“{settings.motto}”</Text>
          </View>
        </View>
      ) : null}

      {/* Bandeau orange : identité de la carte + portrait */}
      <View style={styles.band}>
        <View style={{ flex: 1 }}>
          <Text style={styles.bandLabel}>CARTE{"\n"}DE MEMBRE</Text>

          {member.card_number ? (
            <View style={styles.numberBadge}>
              <Text style={styles.numberText}>N° : {member.card_number}</Text>
            </View>
          ) : null}

          {qr ? (
            <View
              style={{
                marginTop: 5,
                backgroundColor: "#FFFFFF",
                padding: 2,
                borderRadius: 2,
                width: 40,
              }}
            >
              <Image src={qr} style={{ width: 36, height: 36 }} />
            </View>
          ) : null}
        </View>

        {photo ? (
          <Image src={photo} style={styles.photo} />
        ) : (
          <View style={styles.photoEmpty}>
            <Text style={{ fontSize: 4.6, color: "#9A6B45", textAlign: "center" }}>
              Photo{"\n"}à fournir
            </Text>
          </View>
        )}
      </View>

      {/* Identité du titulaire */}
      <View style={{ paddingHorizontal: 6, paddingTop: 8 }}>
        <Text style={styles.name}>
          <Text style={{ color: GREEN }}>{surname.toUpperCase()} </Text>
          <Text style={{ color: ORANGE }}>{given}</Text>
        </Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{memberRole(member).toUpperCase()}</Text>
        </View>
      </View>

      {/* Pied : signatures */}
      <View style={styles.foot}>
        <View style={{ width: 52 }}>
          <Text style={styles.footLabel}>Le Président</Text>
          <Text style={styles.footSign}> </Text>
        </View>
        <LogoRond src={assets.logo} size={16} />
        <View style={{ width: 52 }}>
          <Text style={styles.footLabel}>Le Titulaire</Text>
          <Text style={styles.footSign}> </Text>
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
//  Verso
// ---------------------------------------------------------------------------

function Verso({
  member,
  settings,
  assets,
}: {
  member: Member;
  settings: Settings;
  assets: CardAssets;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.versoHead}>
        <Text style={styles.versoTitle}>CARTE DE MEMBRE</Text>
      </View>
      <View style={styles.versoRule} />

      <View style={styles.versoBody}>
        <LogoRond src={assets.logo} size={52} />

        {settings.motto ? (
          <View style={[styles.ribbon, { marginTop: 5, paddingHorizontal: 8 }]}>
            <Text style={styles.ribbonText}>“{settings.motto}”</Text>
          </View>
        ) : null}

        <Text style={styles.versoText}>
          Le titulaire de cette carte est un membre actif du{" "}
          {settings.association_name}. À ce titre, il s&apos;engage à promouvoir les
          valeurs de solidarité, d&apos;unité, de respect et de développement de
          notre communauté.
        </Text>

        <Text style={{ fontSize: 5.2, color: GREY, marginTop: 7 }}>
          Membre depuis {joinLabel(member)}
        </Text>

        <View style={styles.divider} />

        <Text style={styles.warning}>
          Cette carte est strictement personnelle et incessible. Elle doit être
          présentée sur demande.
        </Text>
      </View>

      <View style={[styles.foot, { justifyContent: "center", gap: 7 }]}>
        {settings.city ? (
          <Text style={{ fontSize: 4.8, color: "#FFFFFF" }}>{settings.city}</Text>
        ) : null}
        {settings.phone ? (
          <Text style={{ fontSize: 4.8, color: GOLD }}>| {settings.phone} |</Text>
        ) : null}
        <Text style={{ fontSize: 4.8, color: "#FFFFFF" }}>
          {settings.card_prefix}
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
//  Document
// ---------------------------------------------------------------------------

export function CartesDocument({
  members,
  settings,
  assets,
}: {
  members: Member[];
  settings: Settings;
  assets: CardAssets;
}) {
  // Deux membres par page A4 : recto et verso côte à côte sur une rangée.
  const pages: Member[][] = [];
  for (let i = 0; i < members.length; i += 2) pages.push(members.slice(i, i + 2));

  return (
    <Document
      title={"Cartes de membre — " + settings.association_name}
      author={settings.association_name}
    >
      {pages.map((group, index) => (
        <Page key={index} size="A4" style={styles.page}>
          {group.map((member) => (
            <View key={member.id} wrap={false} style={{ marginBottom: 18 }}>
              <Text style={styles.cutLabel}>
                {fullName(member)}
                {member.card_number ? " · " + member.card_number : " · numéro à attribuer"}
                {" — découper sur le contour"}
              </Text>
              <View style={styles.cutRow}>
                <Recto member={member} settings={settings} assets={assets} />
                <Verso member={member} settings={settings} assets={assets} />
              </View>
            </View>
          ))}
        </Page>
      ))}
    </Document>
  );
}

export async function buildCartesPdf(args: {
  members: Member[];
  settings: Settings;
  assets: CardAssets;
}): Promise<Blob> {
  return pdf(<CartesDocument {...args} />).toBlob();
}
