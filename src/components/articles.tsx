import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Clock } from "lucide-react";
import { articles, readMinutes, type Article } from "@/lib/articles";

export const usePublishedArticles = () => useQuery({ queryKey: ["articles", "published"], queryFn: () => articles.listPublished(), staleTime: 5 * 60_000 });

export const isNew = (a: Article) => Date.now() - new Date(a.publish_at).getTime() < 4 * 86400e3;
export const dateLabel = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

/** Renders article text: blank line = new paragraph, "## " = heading, "- " = bullet, **bold**. Never renders HTML. */
export function ArticleBody({ body }: { body: string }) {
  const blocks = body.replace(/\r/g, "").split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  const inline = (s: string) => s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? <b key={i}>{part.slice(2, -2)}</b> : part);
  return (
    <div className="grid gap-3 text-[15px] leading-relaxed text-ink-2">
      {blocks.map((b, i) => {
        const lines = b.split("\n");
        if (lines.every((l) => l.startsWith("- "))) return <ul key={i} className="list-disc space-y-1 pl-5">{lines.map((l, j) => <li key={j}>{inline(l.slice(2))}</li>)}</ul>;
        if (b.startsWith("## ")) {
          const [head, ...rest] = lines;
          return (
            <div key={i} className="grid gap-1.5">
              <h2 className="text-lg font-bold text-ink">{head.slice(3)}</h2>
              {rest.length > 0 && <ArticleBody body={rest.join("\n")} />}
            </div>
          );
        }
        if (lines.some((l) => l.startsWith("- "))) {
          const [intro, ...items] = lines;
          return <div key={i}><p>{inline(intro)}</p><ul className="mt-1 list-disc space-y-1 pl-5">{items.map((l, j) => <li key={j}>{inline(l.replace(/^- /, ""))}</li>)}</ul></div>;
        }
        return <p key={i}>{lines.map((l, j) => <span key={j}>{j > 0 && <br />}{inline(l)}</span>)}</p>;
      })}
    </div>
  );
}

export function ArticleCover({ article, className = "" }: { article: Pick<Article, "cover_image_url" | "title">; className?: string }) {
  return article.cover_image_url
    ? <img src={article.cover_image_url} alt="" loading="lazy" className={`object-cover ${className}`} />
    : <span className={`grid place-items-center bg-gradient-to-br from-sky-500 to-brand-700 text-white ${className}`}><BookOpen className="h-6 w-6" /></span>;
}

export function ArticleCard({ article: a }: { article: Article }) {
  return (
    <Link to={`/learn/${a.slug}`} className="card flex gap-3 overflow-hidden p-2.5 transition hover:border-brand-600">
      <ArticleCover article={a} className="h-20 w-24 shrink-0 rounded-xl" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-[11px] text-ink-muted">
          {isNew(a) && <span className="badge bg-citrus-100 text-citrus-600">New</span>}
          {dateLabel(a.publish_at)} · <Clock className="h-3 w-3" /> {readMinutes(a.body)} min read
        </span>
        <b className="mt-0.5 line-clamp-2 block leading-snug">{a.title}</b>
        {a.summary && <span className="line-clamp-2 text-xs text-ink-muted">{a.summary}</span>}
      </span>
    </Link>
  );
}
