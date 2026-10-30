import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Download, History, Search } from "lucide-react";
import { USERS_PAGE, admin, type AdminUser, type Role } from "@/lib/admin";
import { conditionGuide } from "@/lib/nutrition";
import { saveFile } from "@/lib/native";
import ClientDetail, { toCsv } from "./ClientDetail";
import { ErrorNote, Spinner } from "@/components/ui";
import { useToast } from "@/components/Toast";

const date = (s: string | null) => (s ? new Date(s).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "Never");

export default function AdminUsers({ myId }: { myId: string }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  const users = useQuery({ queryKey: ["admin-users", term, page], queryFn: () => admin.listUsers(term, page * USERS_PAGE) });
  const audit = useQuery({ queryKey: ["admin-audit"], queryFn: () => admin.auditLog() });
  const emailOf = (id: string | null) => users.data?.find((u) => u.user_id === id)?.email ?? "a user";

  const setRole = useMutation({
    mutationFn: ({ u, role, grant }: { u: AdminUser; role: Role; grant: boolean }) => admin.setRole(u.user_id, role, grant),
    onSuccess: async (_, { u, role, grant }) => {
      await Promise.all([qc.invalidateQueries({ queryKey: ["admin-users"] }), qc.invalidateQueries({ queryKey: ["admin-audit"] })]);
      toast(`${u.email} ${grant ? "is now" : "is no longer"} ${role === "admin" ? "an admin" : "a reviewer"}`);
    },
  });
  const toggle = (u: AdminUser, role: Role) => {
    const grant = !u.roles.includes(role);
    if (role === "admin" && grant && !confirm(`Make ${u.email} an admin? Admins can manage users, roles and the Market.`)) return;
    setRole.mutate({ u, role, grant });
  };

  const exportCsv = async () => {
    // Every page of the current search, for the spreadsheet.
    const all: AdminUser[] = [];
    for (let off = 0; ; off += USERS_PAGE) {
      const batch = await admin.listUsers(term, off);
      all.push(...batch);
      if (batch.length < USERS_PAGE) break;
    }
    await saveFile(`clients-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(all.map((u) => ({
      name: u.display_name, email: u.email, joined: u.created_at.slice(0, 10), last_sign_in: u.last_sign_in_at?.slice(0, 10),
      setup_done: u.onboarded ? "yes" : "no", health_focus: u.conditions.map((c) => conditionGuide(c)?.name ?? c),
      last_logged: u.last_logged_on, days_logged_30: u.logged_days_30, roles: u.roles, vendor: u.vendor_status,
    }))), "text/csv");
  };

  if (open) return <ClientDetail userId={open} onBack={() => { setOpen(null); void qc.invalidateQueries({ queryKey: ["admin-audit"] }); }} />;

  return (
    <div className="space-y-4">
      <InviteForm />
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); setTerm(search); setPage(0); }}>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input id="admin-user-search" className="input pl-9" type="search" placeholder="Search by name or email" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button className="btn-primary">Search</button>
        <button type="button" className="btn-outline" onClick={exportCsv} aria-label="Download client list"><Download className="h-4 w-4" /><span className="hidden sm:inline"> CSV</span></button>
      </form>
      <ErrorNote error={users.error ?? setRole.error} />
      {users.isLoading ? <Spinner /> : (
        <div className="card divide-y divide-slate-100">
          {(users.data ?? []).map((u) => (
            <div key={u.user_id} className="flex flex-wrap items-center gap-3 p-3">
              <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setOpen(u.user_id)} aria-label={`Open ${u.email}`}>
                <b className="block truncate text-sm">{u.display_name ? `${u.display_name} · ` : ""}{u.email}{u.user_id === myId && <span className="font-normal text-slate-500"> (you)</span>}</b>
                <span className="block text-[11px] text-slate-500">Joined {date(u.created_at)} · last logged {u.last_logged_on ? date(u.last_logged_on) : "never"} · {u.logged_days_30}/30 days · {u.onboarded ? "setup done" : "setup not finished"}{u.vendor_status ? ` · vendor (${u.vendor_status})` : ""}</span>
                {u.conditions.length > 0 && <span className="mt-1 flex flex-wrap gap-1">{u.conditions.map((c) => <span key={c} className="badge bg-brand-50 text-brand-700">{conditionGuide(c)?.name ?? c}</span>)}</span>}
              </button>
              <div className="flex items-center gap-1.5">
                {(["reviewer", "admin"] as Role[]).map((r) => {
                  const on = u.roles.includes(r);
                  const locked = r === "admin" && on && u.user_id === myId;
                  return (
                    <button key={r} type="button" aria-pressed={on} disabled={setRole.isPending || locked} title={locked ? "You can't remove your own admin role" : undefined}
                      onClick={() => toggle(u, r)}
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold capitalize transition ${on ? "border-brand-600 bg-brand-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-brand-500"} disabled:opacity-60`}>
                      {r}
                    </button>
                  );
                })}
                <button type="button" className="btn-outline px-2 py-1" aria-label={`View ${u.email}`} onClick={() => setOpen(u.user_id)}><ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
          {!users.data?.length && <p className="p-4 text-sm text-slate-500">No users found.</p>}
        </div>
      )}
      <div className="flex justify-between">
        <button className="btn-outline" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
        <button className="btn-outline" disabled={(users.data?.length ?? 0) < USERS_PAGE} onClick={() => setPage(page + 1)}>Next</button>
      </div>

      <div className="card p-4">
        <h2 className="flex items-center gap-1.5 font-semibold"><History className="h-4 w-4" /> Activity log</h2>
        {audit.data?.length ? (
          <ul className="mt-2 divide-y divide-slate-100 text-sm">
            {audit.data.map((a) => (
              <li key={a.id} className="py-2">
                {a.action === "view_client" ? <>Viewed the record of {emailOf(a.target_user_id)}</> : <>{a.action === "grant_role" ? "Gave" : "Removed"} <b>{a.details.role}</b> {a.action === "grant_role" ? "to" : "from"} {emailOf(a.target_user_id)}</>}
                <span className="text-xs text-slate-500"> · {new Date(a.created_at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        ) : <p className="mt-1 text-sm text-slate-500">No admin activity yet.</p>}
      </div>
    </div>
  );
}

function InviteForm() {
  const qc = useQueryClient();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("admin");
  const invites = useQuery({ queryKey: ["admin-invites"], queryFn: () => admin.listInvites() });
  const send = useMutation({
    mutationFn: () => admin.invite(email, role),
    onSuccess: async (r) => {
      toast(r === "granted" ? `${email} is now ${role === "admin" ? "an admin" : "a reviewer"}` : `${email} will become ${role === "admin" ? "an admin" : "a reviewer"} after signing up`);
      setEmail("");
      await Promise.all(["admin-invites", "admin-users", "admin-audit"].map((k) => qc.invalidateQueries({ queryKey: [k] })));
    },
  });
  const cancel = useMutation({ mutationFn: (e: string) => admin.cancelInvite(e), onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-invites"] }) });
  return (
    <section className="card grid gap-2 p-4">
      <h2 className="font-semibold">Give someone access</h2>
      <p className="text-xs text-slate-500">Enter their email. If they already have an account they get access now; otherwise as soon as they sign up at <b>/app/signup</b> and confirm their email.</p>
      <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); send.mutate(); }}>
        <input id="invite-email" className="input min-w-0 flex-1" type="email" required placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <select id="invite-role" className="input w-auto" value={role} onChange={(e) => setRole(e.target.value as Role)}>
          <option value="admin">Admin</option>
          <option value="reviewer">Reviewer</option>
        </select>
        <button className="btn-primary" disabled={send.isPending}>Give access</button>
      </form>
      <ErrorNote error={send.error ?? cancel.error} />
      {invites.data?.length ? (
        <ul className="divide-y divide-slate-100 text-sm">
          {invites.data.map((i) => (
            <li key={i.email} className="flex items-center justify-between gap-2 py-1.5">
              <span>{i.email} · <span className="capitalize">{i.role}</span> <span className="text-xs text-slate-500">(waiting for sign-up)</span></span>
              <button type="button" className="text-xs font-semibold text-rose-700" onClick={() => cancel.mutate(i.email)}>Cancel</button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
