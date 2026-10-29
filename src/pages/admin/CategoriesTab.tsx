import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Eye, EyeOff, Pencil, Plus } from "lucide-react";
import { api } from "@/lib/api";
import type { Category } from "@/lib/types";
import { CATEGORY_ICONS, CategoryIcon, ErrorNote, Field, Spinner } from "@/components/ui";
import { useToast } from "@/components/Toast";

export default function CategoriesTab() {
  const qc = useQueryClient();
  const toast = useToast();
  const cats = useQuery({ queryKey: ["admin-categories"], queryFn: () => api.listAllCategories() });
  const [editing, setEditing] = useState<Category | "new" | null>(null);
  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: ["admin-categories"] }), qc.invalidateQueries({ queryKey: ["categories"] })]);
  const save = useMutation({ mutationFn: (c: Partial<Category> & { name: string }) => api.saveCategory(c), onSuccess: refresh });

  // Swap display order with the neighbour.
  const move = async (i: number, dir: -1 | 1) => {
    const list = cats.data ?? [];
    const a = list[i], b = list[i + dir];
    if (!a || !b) return;
    await api.saveCategory({ id: a.id, name: a.name, display_order: b.display_order });
    await api.saveCategory({ id: b.id, name: b.name, display_order: a.display_order === b.display_order ? a.display_order + dir : a.display_order });
    await refresh();
  };

  if (editing) return <CategoryForm category={editing === "new" ? null : editing} nextOrder={(cats.data?.length ?? 0) + 1}
    onDone={async (saved) => { setEditing(null); if (saved) { await refresh(); toast("Category saved"); } }} />;
  if (cats.isLoading) return <Spinner />;

  return (
    <div className="space-y-3">
      <button className="btn-primary" onClick={() => setEditing("new")}><Plus className="h-4 w-4" /> New category</button>
      <ErrorNote error={cats.error ?? save.error} />
      <div className="card divide-y divide-slate-100">
        {cats.data?.map((c, i) => (
          <div key={c.id} className={`flex items-center gap-3 p-3 ${c.is_active ? "" : "opacity-60"}`}>
            <span className="rounded-xl bg-brand-50 p-2"><CategoryIcon name={c.icon} className="h-5 w-5 text-brand-700" /></span>
            <div className="min-w-0 flex-1 text-sm">
              <b>{c.name}</b> {!c.is_active && <span className="badge bg-slate-100 text-slate-600">Hidden</span>}
              <p className="truncate text-xs text-slate-500">{c.description}</p>
            </div>
            <div className="flex gap-1">
              <button className="btn-outline px-2 py-1.5" aria-label={`Move ${c.name} up`} disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp className="h-3.5 w-3.5" /></button>
              <button className="btn-outline px-2 py-1.5" aria-label={`Move ${c.name} down`} disabled={i === (cats.data?.length ?? 0) - 1} onClick={() => move(i, 1)}><ArrowDown className="h-3.5 w-3.5" /></button>
              <button className="btn-outline px-2 py-1.5" aria-label={c.is_active ? `Hide ${c.name}` : `Show ${c.name}`} onClick={() => save.mutate({ id: c.id, name: c.name, is_active: !c.is_active })}>
                {c.is_active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
              <button className="btn-outline px-2 py-1.5" aria-label={`Edit ${c.name}`} onClick={() => setEditing(c)}><Pencil className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-500">Hidden categories disappear from the Market but keep their listings. Categories can't be deleted while listings use them.</p>
    </div>
  );
}

function CategoryForm({ category, nextOrder, onDone }: { category: Category | null; nextOrder: number; onDone: (saved: boolean) => void }) {
  const [f, setF] = useState({ name: category?.name ?? "", description: category?.description ?? "", icon: category?.icon ?? "shopping-bag" });
  const save = useMutation({
    mutationFn: () => api.saveCategory({
      ...(category ? { id: category.id } : { display_order: nextOrder, is_active: true }),
      name: f.name.trim(), description: f.description.trim() || null, icon: f.icon,
    }),
    onSuccess: () => onDone(true),
  });
  return (
    <form className="card space-y-3 p-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
      <h2 className="font-semibold">{category ? `Edit ${category.name}` : "New category"}</h2>
      <Field label="Name"><input id="cat-name" className="input" required maxLength={60} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
      <Field label="Description"><input id="cat-description" className="input" maxLength={160} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
      <div>
        <span className="label">Icon</span>
        <div className="flex flex-wrap gap-1.5">
          {Object.keys(CATEGORY_ICONS).map((k) => (
            <button key={k} type="button" aria-label={k} aria-pressed={f.icon === k} onClick={() => setF({ ...f, icon: k })}
              className={`rounded-xl border p-2 ${f.icon === k ? "border-brand-600 bg-brand-50" : "border-slate-200 bg-white"}`}>
              <CategoryIcon name={k} className="h-5 w-5 text-brand-700" />
            </button>
          ))}
        </div>
      </div>
      <ErrorNote error={save.error} />
      <div className="flex gap-2">
        <button className="btn-primary" disabled={save.isPending}>Save</button>
        <button type="button" className="btn-outline" onClick={() => onDone(false)}>Cancel</button>
      </div>
    </form>
  );
}
