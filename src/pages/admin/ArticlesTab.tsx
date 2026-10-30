import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, CalendarX, Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { articles, nextSlots, readMinutes, type Article } from "@/lib/articles";
import { CONDITIONS, type ConditionId } from "@/lib/nutrition";
import { ArticleBody } from "@/components/articles";
import ImageUpload from "@/components/ImageUpload";
import { EmptyState, ErrorNote, Field, Spinner } from "@/components/ui";
import { useToast } from "@/components/Toast";

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const when = (iso: string) => new Date(iso).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
/** yyyy-mm-ddThh:mm in local time, for <input type="datetime-local">. */
const toInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

export default function ArticlesTab() {
  const qc = useQueryClient();
  const toast = useToast();
  const list = useQuery({ queryKey: ["admin-articles"], queryFn: () => articles.listAll() });
  const stats = useQuery({ queryKey: ["admin-article-stats"], queryFn: () => articles.stats() });
  const [editing, setEditing] = useState<Article | { publish_at: string } | null>(null);
  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: ["admin-articles"] }), qc.invalidateQueries({ queryKey: ["articles"] })]);
  const remove = useMutation({ mutationFn: (id: string) => articles.remove(id), onSuccess: async () => { await refresh(); toast("Article deleted"); } });

  const reads = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of stats.data ?? []) m.set(s.article_id, (m.get(s.article_id) ?? 0) + s.reads);
    return m;
  }, [stats.data]);

  if (editing) return <ArticleForm article={"id" in editing ? editing : null} defaultDate={editing.publish_at} onDone={async (saved) => { setEditing(null); if (saved) { await refresh(); toast("Article saved"); } }} />;
  if (list.isLoading) return <Spinner />;

  const all = list.data ?? [];
  const now = new Date().toISOString();
  const slots = nextSlots(4).map((d) => ({ d, a: all.find((x) => x.is_published && sameDay(new Date(x.publish_at), d)) }));
  const status = (a: Article) => !a.is_published ? { label: "Draft", cls: "bg-slate-100 text-slate-600" }
    : a.publish_at > now ? { label: "Scheduled", cls: "bg-sky-100 text-sky-800" } : { label: "Published", cls: "bg-emerald-100 text-emerald-800" };

  return (
    <div className="space-y-4">
      <section className="card p-4">
        <h2 className="font-semibold">Next 2 weeks: Tuesdays and Fridays</h2>
        <p className="mb-3 text-xs text-slate-500">Two articles a week keeps people coming back. Tap an empty slot to write for that day.</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {slots.map(({ d, a }) => (
            <button key={d.toISOString()} type="button" onClick={() => setEditing(a ?? { publish_at: d.toISOString() })}
              className={`rounded-xl border p-3 text-left text-sm transition hover:border-brand-500 ${a ? "border-emerald-200 bg-emerald-50" : "border-dashed border-amber-300 bg-amber-50/50"}`}>
              <span className="flex items-center gap-1.5 text-xs font-semibold">{a ? <CalendarCheck className="h-3.5 w-3.5 text-emerald-700" /> : <CalendarX className="h-3.5 w-3.5 text-amber-700" />}{d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</span>
              <span className="mt-1 line-clamp-2 block text-xs text-slate-600">{a ? a.title : "Nothing scheduled"}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="flex items-center gap-2">
        <button className="btn-primary" onClick={() => setEditing({ publish_at: (slots.find((s) => !s.a)?.d ?? new Date()).toISOString() })}><Plus className="h-4 w-4" /> New article</button>
        <span className="text-sm text-slate-500">{all.filter((a) => status(a).label === "Published").length} published · {all.filter((a) => status(a).label === "Scheduled").length} scheduled · {all.filter((a) => !a.is_published).length} drafts</span>
      </div>
      <ErrorNote error={list.error ?? remove.error} />
      {!all.length ? <EmptyState title="No articles yet">Write the first one, or tap a Tuesday or Friday above.</EmptyState> : (
        <div className="card divide-y divide-slate-100">
          {all.map((a) => {
            const st = status(a);
            return (
              <div key={a.id} className="flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1 text-sm">
                  <div className="flex flex-wrap items-center gap-2"><b className="truncate">{a.title}</b><span className={`badge ${st.cls}`}>{st.label}</span></div>
                  <p className="text-xs text-slate-500">{when(a.publish_at)} · {readMinutes(a.body)} min read · {(reads.get(a.id) ?? 0).toLocaleString()} reads</p>
                </div>
                <button className="btn-outline px-2.5 py-1.5" aria-label={`Edit ${a.title}`} onClick={() => setEditing(a)}><Pencil className="h-3.5 w-3.5" /></button>
                <button className="btn-outline px-2.5 py-1.5 text-rose-700" aria-label={`Delete ${a.title}`} disabled={remove.isPending}
                  onClick={() => confirm(`Delete "${a.title}"?`) && remove.mutate(a.id)}><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ArticleForm({ article: a, defaultDate, onDone }: { article: Article | null; defaultDate: string; onDone: (saved: boolean) => void }) {
  const [f, setF] = useState({
    title: a?.title ?? "", summary: a?.summary ?? "", body: a?.body ?? "", cover_image_url: a?.cover_image_url ?? "",
    author_name: a?.author_name ?? "Care team", conditions: (a?.conditions ?? []) as ConditionId[],
    publish_at: toInput(new Date(a?.publish_at ?? defaultDate)), is_published: a?.is_published ?? false,
  });
  const [preview, setPreview] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));
  const save = useMutation({
    mutationFn: (publish: boolean) => articles.save({
      id: a?.id, title: f.title.trim(), summary: f.summary.trim() || null, body: f.body.trim(), cover_image_url: f.cover_image_url.trim() || null,
      author_name: f.author_name.trim() || null, conditions: f.conditions, publish_at: new Date(f.publish_at).toISOString(), is_published: publish,
    }),
    onSuccess: () => onDone(true),
  });
  const future = new Date(f.publish_at) > new Date();

  return (
    <form className="card space-y-3 p-4" onSubmit={(e) => { e.preventDefault(); save.mutate(true); }}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">{a ? "Edit article" : "New article"}</h2>
        <button type="button" className="btn-outline px-3 py-1.5 text-xs" onClick={() => setPreview(!preview)}><Eye className="h-3.5 w-3.5" /> {preview ? "Edit" : "Preview"}</button>
      </div>
      {preview ? (
        <div className="grid gap-2 rounded-xl border border-slate-200 p-4">
          <h1 className="text-2xl font-extrabold">{f.title || "Untitled"}</h1>
          {f.summary && <p className="text-ink-2">{f.summary}</p>}
          <ArticleBody body={f.body} />
        </div>
      ) : (
        <>
          <Field label="Title"><input id="art-title" className="input" required minLength={3} maxLength={120} value={f.title} onChange={(e) => set("title", e.target.value)} /></Field>
          <Field label="One-line summary"><input id="art-summary" className="input" maxLength={240} value={f.summary} onChange={(e) => set("summary", e.target.value)} /></Field>
          <Field label="Article" hint='Blank line = new paragraph · "## " starts a heading · "- " makes a bullet · **bold**'>
            <textarea id="art-body" className="input font-mono text-sm" rows={14} maxLength={20000} required value={f.body} onChange={(e) => set("body", e.target.value)} />
          </Field>
          <div>
            <Field label="Cover image (optional, wide)"><input className="input" type="url" placeholder="https://" value={f.cover_image_url} onChange={(e) => set("cover_image_url", e.target.value)} /></Field>
            <div className="mt-2 flex items-center gap-2">
              {f.cover_image_url && <img src={f.cover_image_url} alt="" className="h-12 w-24 rounded-lg border border-slate-200 object-cover" />}
              <ImageUpload folder="staff" label="Upload image" onUploaded={(url) => set("cover_image_url", url)} />
            </div>
          </div>
          <div>
            <span className="label">Show first to people focused on</span>
            <div className="flex flex-wrap gap-1.5">
              {CONDITIONS.map((c) => {
                const on = f.conditions.includes(c.id);
                return <button key={c.id} type="button" aria-pressed={on} onClick={() => set("conditions", on ? f.conditions.filter((x) => x !== c.id) : [...f.conditions, c.id])}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${on ? "border-brand-600 bg-brand-600 text-white" : "border-slate-200 bg-white"}`}>{c.name}</button>;
              })}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Publish on"><input id="art-date" className="input" type="datetime-local" required value={f.publish_at} onChange={(e) => set("publish_at", e.target.value)} /></Field>
            <Field label="Author"><input className="input" maxLength={80} value={f.author_name} onChange={(e) => set("author_name", e.target.value)} /></Field>
          </div>
        </>
      )}
      <p className="text-xs text-slate-500">Health articles should be general education. Avoid promising results or recommending specific products; partner offers belong in the Market.</p>
      <ErrorNote error={save.error} />
      <div className="flex flex-wrap gap-2">
        <button className="btn-primary" disabled={save.isPending}>{future ? "Schedule" : "Publish now"}</button>
        <button type="button" className="btn-outline" disabled={save.isPending} onClick={() => save.mutate(false)}>Save as draft</button>
        <button type="button" className="btn-outline" onClick={() => onDone(false)}>Cancel</button>
      </div>
    </form>
  );
}
