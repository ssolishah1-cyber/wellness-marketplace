import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getDemoPersona } from "./demoApi";
import { DEMO_USERS } from "./demoData";
import { addDays, isoDay } from "./nutrition/logic";
import type { ConditionId } from "./nutrition/types";

// Admin panel data. Mirrors supabase/migrations/007_admin_panel.sql: totals
// and account details only, never anyone's meals, weight, workouts or
// health focus. The database rejects every call from non-admins.

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
}

export interface AuditEntry { id: number; action: string; target_user_id: string | null; details: { role?: string }; created_at: string }

export interface AdminApi {
  stats(): Promise<AppStats>;
  listUsers(search: string, offset?: number): Promise<AdminUser[]>;
  setRole(userId: string, role: Role, grant: boolean): Promise<void>;
  auditLog(): Promise<AuditEntry[]>;
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
    auditLog: async () => check<AuditEntry[]>(await sb.from("admin_audit_log").select("id, action, target_user_id, details, created_at").order("created_at", { ascending: false }).limit(50)),
  };
}

// ---------- demo ----------
const today = isoDay();
const demoUsers: AdminUser[] = [
  { user_id: DEMO_USERS.admin.id, email: DEMO_USERS.admin.email, created_at: addDays(today, -60) + "T10:00:00Z", last_sign_in_at: today + "T08:00:00Z", onboarded: true, roles: ["admin"], vendor_status: null },
  { user_id: DEMO_USERS.vendor.id, email: DEMO_USERS.vendor.email, created_at: addDays(today, -40) + "T10:00:00Z", last_sign_in_at: addDays(today, -1) + "T18:00:00Z", onboarded: true, roles: [], vendor_status: "approved" },
  { user_id: DEMO_USERS.member.id, email: DEMO_USERS.member.email, created_at: addDays(today, -56) + "T10:00:00Z", last_sign_in_at: today + "T07:30:00Z", onboarded: true, roles: [], vendor_status: null },
  ...["jamie", "priya", "marcus", "lena", "tom", "ana", "chris", "dee"].map((n, i): AdminUser => ({
    user_id: `user-${n}`, email: `${n}@example.com`, created_at: addDays(today, -(i * 3 + 1)) + "T12:00:00Z",
    last_sign_in_at: addDays(today, -i) + "T12:00:00Z", onboarded: i % 3 !== 2, roles: [], vendor_status: null,
  })),
];
const demoAudit: AuditEntry[] = [];

const demoAdmin: AdminApi = {
  async stats() {
    if (getDemoPersona() !== "admin") throw new Error("Admins only");
    return {
      total_users: demoUsers.length, new_users_7d: demoUsers.filter((u) => u.created_at >= addDays(today, -7)).length,
      new_users_30d: demoUsers.filter((u) => u.created_at >= addDays(today, -30)).length,
      onboarded: demoUsers.filter((u) => u.onboarded).length, active_7d: 7, food_entries_7d: 164, workouts_7d: 23, with_health_focus: 6,
      condition_counts: { diabetes: 5, hypertension: null, ibs: null, focus: null, relaxation: null },
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
};

export const admin: AdminApi = supabase ? supabaseAdmin(supabase) : demoAdmin;
