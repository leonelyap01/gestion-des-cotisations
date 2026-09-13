"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  computeAllStats,
  computeDashboard,
  paymentKey,
  type DashboardSummary,
} from "@/lib/cotisations";
import type {
  AppUser,
  Member,
  MemberStats,
  Payment,
  Post,
  Report,
  Settings,
  UserRole,
} from "@/lib/types";

/**
 * Source de vérité unique de l'application côté navigateur.
 *
 * Toutes les pages lisent ce contexte : les données ne sont chargées qu'une
 * fois, les indicateurs sont recalculés localement (fonctions pures de
 * lib/cotisations.ts) et chaque mutation est écrite dans Supabase puis
 * répercutée dans l'état local — l'interface reste instantanée sur mobile.
 */

const DEFAULT_SETTINGS: Settings = {
  id: 1,
  association_name: "Comité Jeunesse Émergente",
  currency: "FCFA",
  monthly_amount: 1000,
  membership_fee: 5000,
  exercise_year: new Date().getFullYear(),
  start_month: 3,
  end_month: 12,
  active_months: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  pay_wave: "",
  pay_mtn: "",
  pay_orange: "",
  accent: "emerald",
  motto: "",
  city: "",
  phone: "",
  logo_url: "/logo-ucjea.jpg",
  card_prefix: "UCJEA",
};

export type NewMember = {
  last_name: string;
  first_name: string;
  phone: string;
  join_year: number;
  join_month: number;
  membership_fee_due: boolean;
  membership_fee_paid_at: string | null;
  active: boolean;
  notes: string;
  /** Fonction dans le bureau, imprimée sur la carte de membre. */
  role: string;
};

export type NewPost = {
  title: string;
  body: string;
  category: Post["category"];
  pinned: boolean;
  published: boolean;
};

interface DataContextValue {
  supabase: SupabaseClient;
  ready: boolean;
  loading: boolean;
  error: string | null;
  configured: boolean;
  settings: Settings;
  members: Member[];
  payments: Payment[];
  reports: Report[];
  /** Annonces, brouillons compris (l'espace trésorier voit tout). */
  posts: Post[];
  /** Profil du compte connecté ; null tant qu'il n'est pas chargé. */
  role: UserRole | null;
  /** Raccourci : le compte connecté a-t-il l'accès complet ? */
  isTreasurer: boolean;
  /** Comptes du bureau (visibles de tous, modifiables par le trésorier). */
  team: AppUser[];
  stats: MemberStats[];
  statsById: Map<string, MemberStats>;
  dashboard: DashboardSummary;
  paymentIndex: Map<string, Payment>;
  refresh: () => Promise<void>;
  saveSettings: (patch: Partial<Settings>) => Promise<void>;
  addMember: (member: NewMember) => Promise<Member | null>;
  updateMember: (id: string, patch: Partial<Member>) => Promise<void>;
  deleteMember: (id: string) => Promise<void>;
  /** Marque / démarque un mois comme soldé pour un membre. */
  togglePayment: (memberId: string, month: number, paid: boolean) => Promise<void>;
  /** Marque / démarque le droit d'adhésion comme réglé. */
  toggleMembershipFee: (memberId: string, paid: boolean) => Promise<void>;
  logReport: (kind: string, label: string, meta?: Record<string, unknown>) => Promise<void>;
  /** Met à jour les seuls champs de carte d'un membre (accessible aux deux profils). */
  updateCard: (memberId: string, patch: Partial<Member>) => Promise<void>;
  /** Change le profil d'un compte du bureau (trésorier uniquement). */
  setUserRole: (userId: string, role: UserRole) => Promise<void>;
  addPost: (post: NewPost) => Promise<Post | null>;
  updatePost: (id: string, patch: Partial<Post>) => Promise<void>;
  deletePost: (id: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData doit être utilisé dans <DataProvider>");
  return ctx;
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const configured = isSupabaseConfigured();

  const supabase = useMemo(() => createClient(), []);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [members, setMembers] = useState<Member[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [role, setRole] = useState<UserRole | null>(null);
  const [team, setTeam] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!configured) {
      setLoading(false);
      setReady(true);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [s, m, p, r, a, t, roleResult] = await Promise.all([
        supabase.from("settings").select("*").eq("id", 1).maybeSingle(),
        supabase.from("members").select("*").order("last_name"),
        supabase.from("payments").select("*"),
        supabase.from("reports").select("*").order("created_at", { ascending: false }).limit(60),
        supabase.from("posts").select("*").order("published_at", { ascending: false }),
        supabase.from("app_users").select("*").order("email"),
        supabase.rpc("mon_role"),
      ]);

      const firstError = s.error || m.error || p.error || r.error || a.error;
      if (firstError) throw firstError;

      // Le rôle conditionne l'affichage ; les droits réels sont appliqués
      // par les règles RLS de la base, pas par l'interface.
      setRole((roleResult.data as UserRole | null) ?? null);
      setTeam((t.data ?? []) as AppUser[]);

      if (s.data) {
        setSettings({
          ...DEFAULT_SETTINGS,
          ...s.data,
          monthly_amount: Number(s.data.monthly_amount),
          membership_fee: Number(s.data.membership_fee),
          active_months: s.data.active_months ?? [],
        });
      }
      setMembers((m.data ?? []) as Member[]);
      setPayments((p.data ?? []) as Payment[]);
      setReports((r.data ?? []) as Report[]);
      setPosts((a.data ?? []) as Post[]);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
    } finally {
      setLoading(false);
      setReady(true);
    }
  }, [configured, supabase]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Applique la couleur d'accent choisie dans les paramètres.
  useEffect(() => {
    document.documentElement.dataset.accent = settings.accent;
  }, [settings.accent]);

  // -----------------------------------------------------------------------
  //  Mutations
  // -----------------------------------------------------------------------

  const saveSettings = useCallback(
    async (patch: Partial<Settings>) => {
      const next = { ...settings, ...patch };
      setSettings(next); // mise à jour optimiste
      const { error: err } = await supabase
        .from("settings")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", 1);
      if (err) {
        setError(err.message);
        await refresh();
      }
    },
    [settings, supabase, refresh],
  );

  const addMember = useCallback(
    async (member: NewMember) => {
      const { data, error: err } = await supabase
        .from("members")
        .insert(member)
        .select()
        .single();
      if (err) {
        setError(err.message);
        return null;
      }
      setMembers((prev) => [...prev, data as Member]);
      return data as Member;
    },
    [supabase],
  );

  const updateMember = useCallback(
    async (id: string, patch: Partial<Member>) => {
      setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
      const { error: err } = await supabase.from("members").update(patch).eq("id", id);
      if (err) {
        setError(err.message);
        await refresh();
      }
    },
    [supabase, refresh],
  );

  const deleteMember = useCallback(
    async (id: string) => {
      setMembers((prev) => prev.filter((m) => m.id !== id));
      setPayments((prev) => prev.filter((p) => p.member_id !== id));
      const { error: err } = await supabase.from("members").delete().eq("id", id);
      if (err) {
        setError(err.message);
        await refresh();
      }
    },
    [supabase, refresh],
  );

  const togglePayment = useCallback(
    async (memberId: string, month: number, paid: boolean) => {
      const year = settings.exercise_year;

      if (paid) {
        const row = {
          member_id: memberId,
          year,
          month,
          amount: Number(settings.monthly_amount) || 0,
          paid_at: new Date().toISOString(),
        };
        // Optimiste : identifiant temporaire remplacé par la réponse serveur.
        const temp: Payment = { id: "temp-" + memberId + "-" + month, ...row };
        setPayments((prev) => [...prev, temp]);

        const { data, error: err } = await supabase
          .from("payments")
          .upsert(row, { onConflict: "member_id,year,month" })
          .select()
          .single();

        if (err) {
          setPayments((prev) => prev.filter((p) => p.id !== temp.id));
          setError(err.message);
          return;
        }
        setPayments((prev) =>
          prev.map((p) => (p.id === temp.id ? (data as Payment) : p)),
        );
      } else {
        const previous = payments;
        setPayments((prev) =>
          prev.filter(
            (p) => !(p.member_id === memberId && p.year === year && p.month === month),
          ),
        );
        const { error: err } = await supabase
          .from("payments")
          .delete()
          .eq("member_id", memberId)
          .eq("year", year)
          .eq("month", month);
        if (err) {
          setPayments(previous);
          setError(err.message);
        }
      }
    },
    [payments, settings.exercise_year, settings.monthly_amount, supabase],
  );

  const toggleMembershipFee = useCallback(
    async (memberId: string, paid: boolean) => {
      await updateMember(memberId, {
        membership_fee_paid_at: paid ? new Date().toISOString() : null,
      });
    },
    [updateMember],
  );

  const logReport = useCallback(
    async (kind: string, label: string, meta: Record<string, unknown> = {}) => {
      const { data, error: err } = await supabase
        .from("reports")
        .insert({ kind, label, meta })
        .select()
        .single();
      if (err) {
        setError(err.message);
        return;
      }
      setReports((prev) => [data as Report, ...prev].slice(0, 60));
    },
    [supabase],
  );

  /**
   * Champs de carte d'un membre (numéro, fonction, photo, remise).
   *
   * Passe par la fonction SQL maj_carte : c'est la seule écriture sur la table
   * des membres ouverte au profil « communication », et elle ne touche qu'à
   * ces quatre colonnes.
   */
  const updateCard = useCallback(
    async (memberId: string, patch: Partial<Member>) => {
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, ...patch } : m)),
      );
      const { error: err } = await supabase.rpc("maj_carte", {
        membre_id: memberId,
        patch,
      });
      if (err) {
        setError(err.message);
        await refresh();
      }
    },
    [supabase, refresh],
  );

  const setUserRole = useCallback(
    async (userId: string, nextRole: UserRole) => {
      setTeam((prev) =>
        prev.map((u) => (u.user_id === userId ? { ...u, role: nextRole } : u)),
      );
      const { error: err } = await supabase
        .from("app_users")
        .update({ role: nextRole })
        .eq("user_id", userId);
      if (err) {
        setError(err.message);
        await refresh();
      }
    },
    [supabase, refresh],
  );

  // ----- Annonces publiques ----------------------------------------------

  const addPost = useCallback(
    async (post: NewPost) => {
      const now = new Date().toISOString();
      const { data, error: err } = await supabase
        .from("posts")
        .insert({ ...post, published_at: now, updated_at: now })
        .select()
        .single();
      if (err) {
        setError(err.message);
        return null;
      }
      setPosts((prev) => [data as Post, ...prev]);
      return data as Post;
    },
    [supabase],
  );

  const updatePost = useCallback(
    async (id: string, patch: Partial<Post>) => {
      const next = { ...patch, updated_at: new Date().toISOString() };
      setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, ...next } : p)));
      const { error: err } = await supabase.from("posts").update(next).eq("id", id);
      if (err) {
        setError(err.message);
        await refresh();
      }
    },
    [supabase, refresh],
  );

  const deletePost = useCallback(
    async (id: string) => {
      setPosts((prev) => prev.filter((p) => p.id !== id));
      const { error: err } = await supabase.from("posts").delete().eq("id", id);
      if (err) {
        setError(err.message);
        await refresh();
      }
    },
    [supabase, refresh],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }, [supabase]);

  // -----------------------------------------------------------------------
  //  Valeurs dérivées (recalculées uniquement quand les données changent)
  // -----------------------------------------------------------------------

  const paymentIndex = useMemo(() => {
    const map = new Map<string, Payment>();
    for (const p of payments) map.set(paymentKey(p.member_id, p.year, p.month), p);
    return map;
  }, [payments]);

  const stats = useMemo(
    () => computeAllStats(members, settings, payments),
    [members, settings, payments],
  );

  const statsById = useMemo(() => {
    const map = new Map<string, MemberStats>();
    for (const s of stats) map.set(s.member.id, s);
    return map;
  }, [stats]);

  const dashboard = useMemo(
    () => computeDashboard(members, settings, payments),
    [members, settings, payments],
  );

  const value: DataContextValue = {
    supabase,
    ready,
    loading,
    error,
    configured,
    settings,
    members,
    payments,
    reports,
    posts,
    role,
    isTreasurer: role === "tresorier",
    team,
    stats,
    statsById,
    dashboard,
    paymentIndex,
    refresh,
    saveSettings,
    addMember,
    updateMember,
    deleteMember,
    togglePayment,
    toggleMembershipFee,
    logReport,
    updateCard,
    setUserRole,
    addPost,
    updatePost,
    deletePost,
    signOut,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
