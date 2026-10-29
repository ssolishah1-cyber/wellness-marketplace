import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { History, Search } from "lucide-react";
import { USERS_PAGE, admin, type AdminUser, type Role } from "@/lib/admin";
import { ErrorNote, Spinner } from "@/components/ui";
import { useToast } from "@/components/Toast";

const date = (s: string | null) => (s ? new Date(s).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "Never");

export default function AdminUsers({ myId }: { myId: string }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [page, setPage] = useState(0);
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

  return (
    <div className="space-y-4">
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); setTerm(search); setPage(0); }}>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input id="admin-user-search" className="input pl-9" type="search" placeholder="Search by email" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button className="btn-primary">Search</button>
      </form>
      <ErrorNote error={users.error ?? setRole.error} />
      {users.isLoading ? <Spinner /> : (
        <div className="card divide-y divide-slate-100">
          {(users.data ?? []).map((u) => (
            <div key={u.user_id} className="flex flex-wrap items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <b className="block truncate text-sm">{u.email}{u.user_id === myId && <span className="font-normal text-slate-500"> (you)</span>}</b>
                <span className="text-[11px] text-slate-500">Joined {date(u.created_at)} · last sign-in {date(u.last_sign_in_at)} · {u.onboarded ? "setup done" : "setup not finished"}{u.vendor_status ? ` · vendor (${u.vendor_status})` : ""}</span>
              </div>
              <div className="flex gap-1.5">
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
        <h2 className="flex items-center gap-1.5 font-semibold"><History className="h-4 w-4" /> Role changes</h2>
        {audit.data?.length ? (
          <ul className="mt-2 divide-y divide-slate-100 text-sm">
            {audit.data.map((a) => (
              <li key={a.id} className="py-2">{a.action === "grant_role" ? "Gave" : "Removed"} <b>{a.details.role}</b> {a.action === "grant_role" ? "to" : "from"} {emailOf(a.target_user_id)} <span className="text-xs text-slate-500">· {new Date(a.created_at).toLocaleString()}</span></li>
            ))}
          </ul>
        ) : <p className="mt-1 text-sm text-slate-500">No role changes yet.</p>}
      </div>
    </div>
  );
}
