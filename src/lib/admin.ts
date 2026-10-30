import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getDemoPersona } from "./demoApi";
import { demoSnapshot } from "./nutrition/demoNutrition";
import { DEMO_USERS } from "./demoData";
import { addDays, isoDay } from "./nutrition/logic";
import type { ConditionId, FoodEntry, Profile, WeightLog, WorkoutLog } from "./nutrition/types";

// Admin panel data. Mirrors supabase/migrations/007_admin_panel.sql and 008:
// totals, the client list, and each client's full record for admins (every
// client view is written to the audit log). The database rejects every call
// from non-admins, including Market reviewers.

export type Role = "admin" | "reviewer";

export interface AppStats {
  total_users: number;
  new_users_7d: number;
  new_users_30d: number;
  onboarded: number;
  active_7d: number;
  food_entries_7d: number;
  workouts_7d: number;
  with_health_focus: number;
  /** null = fewer than 5 people, hidden for privacy. */
  condition_counts: Partial<Record<ConditionId, number | null>>;
  signups_by_day: { day: string; n: number }[];
  pending_listings: number;
  pending_vendors: number;
  inquiries_7d: number;
}

export interface AdminUser {
  user_id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  onboarded: boolean;
  roles: string[];
  vendor_status: string | null;
  display_name: string | null;
  conditions: ConditionId[];
  last_logged_on: string | null;
  logged_days_30: number;
}

export interface ClientDetail {
  account: { email: string; created_at: string; last_sign_in_at: string | null };
  profile: Profile | null;
  food: Omit<FoodEntry, "id" | "created_at">[];
  water: { day: string; glasses: number }[];
  weights: WeightLog[];
  workouts: WorkoutLog[];
  inquiries: { created_at: string; listing_id: string; message: string; status: string }[];
  roles: string[];
}

export interface AuditEntry { id: number; action: "grant_role" | "revoke_role" | "view_client"; target_user_id: string | null; details: { role?: string }; created_at: string }

export interface AdminApi {
  stats(): Promise<AppStats>;
  listUsers(search: string, offset?: number): Promise<AdminUser[]>;
  setRole(userId: string, role: Role, grant: boolean): Promise<void>;
  auditLog(): Promise<AuditEntry[]>;
  /** Full record of one client for the last `days` days. Recorded in the audit log. */
  clientDetail(userId: string, days?: number): Promise<ClientDetail>;
  /** Grants the role now if the person has a confirmed account, otherwise when they sign up and confirm. */
  invite(email: string, role: Role): Promise<"granted" | "invited">;
  listInvites(): Promise<{ email: string; role: Role; created_at: string }[]>;
  cancelInvite(email: string): Promise<void>;
}

export const USERS_PAGE = 50;

function supabaseAdmin(sb: SupabaseClient): AdminApi {
  const check = <T>(r: { data: T | null; error: { message: string } | null }): T => {
    if (r.error) throw new Error(r.error.message);
    return r.data as T;
  };
  return {
    stats: async () => check<AppStats>(await sb.rpc("admin_app_stats")),
    listUsers: async (search, offset = 0) => check<AdminUser[]>(await sb.rpc("admin_list_users", { _search: search, _limit: USERS_PAGE, _offset: offset })),
    setRole: async (userId, role, grant) => { check(await sb.rpc("admin_set_role", { _user_id: userId, _role: role, _grant: grant })); },
    clientDetail: async (userId, days = 90) => {
      const d = check<ClientDetail>(await sb.rpc("admin_client_detail", { _user_id: userId, _days: days }));
      // Postgres numeric columns arrive as strings.
      return {
        ...d,
        food: d.food.map((f) => ({ ...f, protein_g: Number(f.protein_g), carbs_g: Number(f.carbs_g), fat_g: Number(f.fat_g) })),
        weights: d.weights.map((w) => ({ ...w, weight_kg: Number(w.weight_kg) })),
        profile: d.profile && { ...d.profile, start_weight_kg: d.profile.start_weight_kg == null ? null : Number(d.profile.start_weight_kg), goal_weight_kg: d.profile.goal_weight_kg == null ? null : Number(d.profile.goal_weight_kg) },
      };
    },
    invite: async (email, role) => check<"granted" | "invited">(await sb.rpc("admin_invite", { _email: email, _role: role })),
    listInvites: async () => check(await sb.from("role_invites").select("email, role, created_at").order("created_at", { ascending: false })),
    cancelInvite: async (email) => { check(await sb.from("role_invites").delete().eq("email", email)); },
    auditLog: async () => check<AuditEntry[]>(await sb.from("admin_audit_log").select("id, action, target_user_id, details, created_at").order("created_at", { ascending: false }).limit(50)),
  };
}

// ---------- demo ----------
const today = isoDay();
const demoUsers: AdminUser[] = [
  { user_id: DEMO_USERS.admin.id, email: DEMO_USERS.admin.email, created_at: addDays(today, -60) + "T10:00:00Z", last_sign_in_at: today + "T08:00:00Z", onboarded: true, roles: ["admin"], vendor_status: null, display_name: "Alex", conditions: [], last_logged_on: today, logged_days_30: 30 },
  { user_id: DEMO_USERS.vendor.id, email: DEMO_USERS.vendor.email, created_at: addDays(today, -40) + "T10:00:00Z", last_sign_in_at: addDays(today, -1) + "T18:00:00Z", onboarded: true, roles: [], vendor_status: "approved", display_name: "Maya", conditions: [], last_logged_on: today, logged_days_30: 30 },
  { user_id: DEMO_USERS.member.id, email: DEMO_USERS.member.email, created_at: addDays(today, -56) + "T10:00:00Z", last_sign_in_at: today + "T07:30:00Z", onboarded: true, roles: [], vendor_status: null, display_name: "Jordan", conditions: ["diabetes", "focus"], last_logged_on: today, logged_days_30: 30 },
  ...["jamie", "priya", "marcus", "lena", "tom", "ana", "chris", "dee"].map((n, i): AdminUser => ({
    user_id: `user-${n}`, email: `${n}@example.com`, created_at: addDays(today, -(i * 3 + 1)) + "T12:00:00Z",
    last_sign_in_at: addDays(today, -i) + "T12:00:00Z", onboarded: i % 3 !== 2, roles: [], vendor_status: null,
    display_name: n[0].toUpperCase() + n.slice(1), conditions: ([["weight_loss"], [], ["ibs"], ["heart_health", "hypertension"], [], ["relaxation"], ["general_wellness"], []] as ConditionId[][])[i],
    last_logged_on: i % 3 === 2 ? null : addDays(today, -i), logged_days_30: i % 3 === 2 ? 0 : 30 - i * 3,
  })),
];
const demoAudit: AuditEntry[] = [];
let demoInvites: { email: string; role: Role; created_at: string }[] = [];

const demoAdmin: AdminApi = {
  async stats() {
    if (getDemoPersona() !== "admin") throw new Error("Admins only");
    return {
      total_users: demoUsers.length, new_users_7d: demoUsers.filter((u) => u.created_at >= addDays(today, -7)).length,
      new_users_30d: demoUsers.filter((u) => u.created_at >= addDays(today, -30)).length,
      onboarded: demoUsers.filter((u) => u.onboarded).length, active_7d: 7, food_entries_7d: 164, workouts_7d: 23, with_health_focus: 6,
      condition_counts: { diabetes: 5, hypertension: null, ibs: null, focus: null, relaxation: null, weight_loss: 6, heart_health: null, general_wellness: null },
      signups_by_day: Array.from({ length: 30 }, (_, i) => {
        const day = addDays(today, i - 29);
        return { day, n: demoUsers.filter((u) => u.created_at.slice(0, 10) === day).length };
      }),
      pending_listings: 1, pending_vendors: 1, inquiries_7d: 3,
    };
  },
  async listUsers(search) {
    if (getDemoPersona() !== "admin") throw new Error("Admins only");
    return structuredClone(demoUsers.filter((u) => u.email.includes(search.trim().toLowerCase())));
  },
  async setRole(userId, role, grant) {
    if (getDemoPersona() !== "admin") throw new Error("Admins only");
    if (!grant && role === "admin" && userId === DEMO_USERS.admin.id) throw new Error("You can't remove your own admin role.");
    const u = demoUsers.find((x) => x.user_id === userId);
    if (!u) throw new Error("User not found");
    u.roles = grant ? [...new Set([...u.roles, role])].sort() : u.roles.filter((r) => r !== role);
    demoAudit.unshift({ id: demoAudit.length + 1, action: grant ? "grant_role" : "revoke_role", target_user_id: userId, details: { role }, created_at: new Date().toISOString() });
  },
  async auditLog() { return structuredClone(demoAudit); },
  async invite(email, role) {
    if (getDemoPersona() !== "admin") throw new Error("Admins only");
    const e = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) throw new Error("Enter a valid email address.");
    const u = demoUsers.find((x) => x.email === e);
    if (u) { await this.setRole(u.user_id, role, true); return "granted"; }
    demoInvites = [{ email: e, role, created_at: new Date().toISOString() }, ...demoInvites.filter((i) => i.email !== e)];
    return "invited";
  },
  async listInvites() { return structuredClone(demoInvites); },
  async cancelInvite(email) { demoInvites = demoInvites.filter((i) => i.email !== email); },
  async clientDetail(userId, days = 90) {
    if (getDemoPersona() !== "admin") throw new Error("Admins only");
    const u = demoUsers.find((x) => x.user_id === userId);
    if (!u) throw new Error("Client not found");
    demoAudit.unshift({ id: demoAudit.length + 1, action: "view_client", target_user_id: userId, details: {}, created_at: new Date().toISOString() });
    const s = demoSnapshot(userId);
    const since = addDays(today, -days);
    return {
      account: { email: u.email, created_at: u.created_at, last_sign_in_at: u.last_sign_in_at },
      profile: { ...s.profile, display_name: u.display_name, conditions: u.conditions, health_consent_at: u.conditions.length ? u.created_at : null },
      food: s.food.filter((f) => f.eaten_on >= since).sort((a, b) => b.eaten_on.localeCompare(a.eaten_on))
        .map(({ eaten_on, meal, name, kcal, protein_g, carbs_g, fat_g }) => ({ eaten_on, meal, name, kcal, protein_g, carbs_g, fat_g })),
      water: Object.entries(s.water).map(([day, glasses]) => ({ day, glasses })),
      weights: s.weights, workouts: s.workouts, inquiries: [], roles: u.roles,
    };
  },
};

export const admin: AdminApi = supabase ? supabaseAdmin(supabase) : demoAdmin;
