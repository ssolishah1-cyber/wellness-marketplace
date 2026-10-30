import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Clock, Info } from "lucide-react";
import { articles, readMinutes } from "@/lib/articles";
import { conditionGuide } from "@/lib/nutrition";
import { ArticleBody, ArticleCard, ArticleCover, dateLabel, usePublishedArticles } from "@/components/articles";
import { useProfile } from "@/components/nutrition";
import { EmptyState, ErrorNote, Spinner } from "@/components/ui";
import Placeholder from "./Placeholder";

export default function LearnPage() {
  const list = usePublishedArticles();
  const profile = useProfile();
  const mine = profile.data?.conditions ?? [];
  const [forYou, setForYou] = useState(false);
  const shown = (list.data ?? []).filter((a) => !forYou || a.conditions.some((c) => mine.includes(c)));
  return (
    <div className="mx-auto grid max-w-xl grid-cols-[minmax(0,1fr)] gap-4">
      <div className="animate-rise">
        <h1 className="text-[26px] font-extrabold">Learn</h1>
        <p className="text-sm text-ink-muted">Short, practical articles from our care team. New ones every Tuesday and Friday.</p>
      </div>
      {mine.length > 0 && (
        <div className="flex gap-1.5">
          {([[false, "All"], [true, "For your focus"]] as const).map(([v, label]) => (
            <button key={label} type="button" aria-pressed={forYou === v} onClick={() => setForYou(v)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${forYou === v ? "border-ink bg-ink text-white" : "border-[#d8e2d9] bg-white"}`}>{label}</button>
          ))}
        </div>
      )}
      <ErrorNote error={list.error} />
      {list.isLoading ? <Spinner /> : shown.length
        ? <div className="grid gap-2">{shown.map((a) => <ArticleCard key={a.id} article={a} />)}</div>
        : <EmptyState title={forYou ? "Nothing for your focus yet" : "No articles yet"}>New articles arrive every Tuesday and Friday.</EmptyState>}
    </div>
  );
}

export function ArticlePage() {
  const { slug = "" } = useParams();
  const q = useQuery({ queryKey: ["article", slug], queryFn: () => articles.getPublished(slug) });
  const id = q.data?.id;
  useEffect(() => {
    if (!id) return;
    const key = `article-read-${id}`;
    try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, "1"); } catch { /* still count */ }
    void articles.recordRead(id);
  }, [id]);
  if (q.isLoading) return <Spinner />;
  const a = q.data;
  if (!a) return <Placeholder title="Article not found" />;
  return (
    <article className="mx-auto grid max-w-xl grid-cols-[minmax(0,1fr)] gap-4">
      <Link to="/learn" className="flex w-fit items-center gap-1 text-sm font-semibold text-brand-700"><ArrowLeft className="h-4 w-4" /> Learn</Link>
      <ArticleCover article={a} className="aspect-[2/1] w-full rounded-2xl" />
      <div>
        <p className="flex items-center gap-1.5 text-xs text-ink-muted">{dateLabel(a.publish_at)}{a.author_name && ` · ${a.author_name}`} · <Clock className="h-3 w-3" /> {readMinutes(a.body)} min read</p>
        <h1 className="mt-1 text-[26px] font-extrabold leading-tight">{a.title}</h1>
        {a.summary && <p className="mt-1 text-[15px] text-ink-2">{a.summary}</p>}
      </div>
      <ArticleBody body={a.body} />
      {a.conditions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {a.conditions.map((c) => { const g = conditionGuide(c); return g ? <Link key={c} to={`/health/${c}`} className="badge bg-brand-50 text-brand-700">{g.name} guide →</Link> : null; })}
        </div>
      )}
      <p className="flex gap-2 rounded-2xl bg-[#e8eee7] p-4 text-xs text-ink-2"><Info className="h-4 w-4 shrink-0" /> General education, not medical advice. Talk to your doctor or dietitian about your own situation.</p>
    </article>
  );
}
