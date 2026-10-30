import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getDemoPersona } from "./demoApi";
import type { ConditionId } from "./nutrition/types";

// Educational articles (supabase/migrations/010_invites_and_articles.sql).
// Staff write and schedule them; everyone can read published ones. Reads are
// anonymous daily totals.

export interface Article {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  body: string;
  cover_image_url: string | null;
  conditions: ConditionId[];
  author_name: string | null;
  is_published: boolean;
  publish_at: string;
  created_at: string;
  updated_at: string;
}
export type ArticleInput = Partial<Omit<Article, "id" | "created_at" | "updated_at">> & { id?: string; title: string };
export interface ArticleStat { article_id: string; day: string; reads: number }

export interface ArticlesApi {
  listPublished(): Promise<Article[]>;
  getPublished(slug: string): Promise<Article | null>;
  recordRead(id: string): Promise<void>;
  // Staff
  listAll(): Promise<Article[]>;
  save(input: ArticleInput): Promise<Article>;
  remove(id: string): Promise<void>;
  stats(): Promise<ArticleStat[]>;
}

export function slugifyTitle(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 70) || "article";
}

/** Minutes to read at ~220 words a minute. */
export const readMinutes = (body: string) => Math.max(1, Math.round(body.trim().split(/\s+/).filter(Boolean).length / 220));

/** Next publishing slots on Tuesdays and Fridays at 10:00 local time. */
export function nextSlots(n: number, from = new Date()): Date[] {
  const out: Date[] = [];
  const d = new Date(from);
  d.setHours(10, 0, 0, 0);
  if (d <= from) d.setDate(d.getDate() + 1);
  while (out.length < n) {
    if (d.getDay() === 2 || d.getDay() === 5) out.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

const isLive = (a: Article, now = new Date().toISOString()) => a.is_published && a.publish_at <= now;

function supabaseArticles(sb: SupabaseClient): ArticlesApi {
  const check = <T>(r: { data: T | null; error: { message: string } | null }): T => {
    if (r.error) throw new Error(r.error.message);
    return r.data as T;
  };
  return {
    listPublished: async () => check<Article[]>(await sb.from("articles").select("*").eq("is_published", true).lte("publish_at", new Date().toISOString()).order("publish_at", { ascending: false })),
    getPublished: async (slug) => check<Article | null>(await sb.from("articles").select("*").eq("slug", slug).eq("is_published", true).lte("publish_at", new Date().toISOString()).maybeSingle()),
    recordRead: async (id) => { await sb.rpc("record_article_read", { _article_id: id }); },
    listAll: async () => check<Article[]>(await sb.from("articles").select("*").order("publish_at", { ascending: false })),
    save: async ({ id, ...fields }) => {
      if (!id && !fields.slug) fields.slug = `${slugifyTitle(fields.title)}-${Math.random().toString(36).slice(2, 6)}`;
      return check<Article>(id
        ? await sb.from("articles").update(fields).eq("id", id).select().single()
        : await sb.from("articles").insert(fields).select().single());
    },
    remove: async (id) => { check(await sb.from("articles").delete().eq("id", id)); },
    stats: async () => check<ArticleStat[]>(await sb.from("article_stats").select("*")),
  };
}

// ---------- demo ----------
const now = new Date();
const daysFrom = (n: number) => new Date(now.getTime() + n * 86400e3).toISOString();
const demoArticles: Article[] = [
  {
    id: "art-plate", slug: "balanced-plate-4-steps", title: "Build a balanced plate in 4 steps",
    summary: "A simple way to put together meals that keep you full and energised, without counting every calorie.",
    body: "Most meals come together in four parts.\n\n## 1. Half the plate: vegetables\nNon-starchy vegetables add fiber, vitamins and volume for very few calories.\n\n## 2. A quarter: protein\nFish, chicken, eggs, tofu, beans or Greek yogurt keep you full for longer.\n\n## 3. A quarter: whole-grain carbs\nBrown rice, oats, whole-wheat bread or potatoes with the skin give steady energy.\n\n## 4. A little healthy fat\nOlive oil, avocado, nuts or seeds help your body absorb vitamins.\n\n- Drink water with the meal\n- Eat slowly and stop when you're comfortably full",
    cover_image_url: null, conditions: ["general_wellness", "weight_loss", "diabetes"], author_name: "Care team",
    is_published: true, publish_at: daysFrom(-3), created_at: daysFrom(-5), updated_at: daysFrom(-5),
  },
  {
    id: "art-salt", slug: "where-salt-hides", title: "Salt: where it hides and how to cut back",
    summary: "Most salt comes from packaged and restaurant food, not the salt shaker.",
    body: "About 70% of the sodium we eat comes from packaged and restaurant food.\n\n## Common sources\n- Bread and rolls\n- Deli meats, bacon and sausages\n- Pizza, burgers and canned soups\n\n## Easy swaps\n- Cook with herbs, garlic, citrus and spices\n- Choose \"low sodium\" labels (140 mg or less per serving)\n- Rinse canned beans",
    cover_image_url: null, conditions: ["hypertension", "heart_health"], author_name: "Care team",
    is_published: true, publish_at: daysFrom(2), created_at: daysFrom(-1), updated_at: daysFrom(-1),
  },
];
let demoStats: ArticleStat[] = [{ article_id: "art-plate", day: daysFrom(-1).slice(0, 10), reads: 14 }];
const staff = () => { if (getDemoPersona() !== "admin") throw new Error("Only staff can manage articles."); };
const clone = <T>(v: T) => structuredClone(v);

const demoArticlesApi: ArticlesApi = {
  listPublished: async () => clone(demoArticles.filter((a) => isLive(a)).sort((a, b) => b.publish_at.localeCompare(a.publish_at))),
  getPublished: async (slug) => clone(demoArticles.find((a) => a.slug === slug && isLive(a)) ?? null),
  recordRead: async (id) => {
    if (!demoArticles.some((a) => a.id === id && isLive(a))) return;
    const day = new Date().toISOString().slice(0, 10);
    const row = demoStats.find((s) => s.article_id === id && s.day === day);
    if (row) row.reads++; else demoStats.push({ article_id: id, day, reads: 1 });
  },
  listAll: async () => { staff(); return clone([...demoArticles].sort((a, b) => b.publish_at.localeCompare(a.publish_at))); },
  save: async (input) => {
    staff();
    if (input.title.trim().length < 3) throw new Error("Give the article a title.");
    if (input.cover_image_url && !/^https?:\/\//i.test(input.cover_image_url) && !input.cover_image_url.startsWith("data:")) throw new Error("Image links must start with https://");
    const existing = input.id ? demoArticles.find((a) => a.id === input.id) : undefined;
    const ts = new Date().toISOString();
    const next: Article = {
      summary: null, body: "", cover_image_url: null, conditions: [], author_name: null, is_published: false, publish_at: ts,
      ...existing, ...input, id: existing?.id ?? Math.random().toString(36).slice(2, 10),
      slug: existing?.slug ?? input.slug ?? slugifyTitle(input.title), created_at: existing?.created_at ?? ts, updated_at: ts,
    } as Article;
    if (existing) Object.assign(existing, next); else demoArticles.push(next);
    return clone(next);
  },
  remove: async (id) => { staff(); const i = demoArticles.findIndex((a) => a.id === id); if (i >= 0) demoArticles.splice(i, 1); demoStats = demoStats.filter((s) => s.article_id !== id); },
  stats: async () => { staff(); return clone(demoStats); },
};

export const articles: ArticlesApi = supabase ? supabaseArticles(supabase) : demoArticlesApi;
