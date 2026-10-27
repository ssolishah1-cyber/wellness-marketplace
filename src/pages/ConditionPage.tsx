import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Check, ExternalLink, Info, Minus, Sparkles } from "lucide-react";
import { conditionGuide, conditionInsight, isoDay, mealIdeas, sumMacros } from "@/lib/nutrition";
import { ConditionIcon, MealIdeaRow } from "@/components/health";
import { useFood, useProfile, useWater } from "@/components/nutrition";
import { useViewer } from "@/components/ui";
import { useToast } from "@/components/Toast";
import Placeholder from "./Placeholder";

export default function ConditionPage() {
  const { id = "" } = useParams();
  const guide = conditionGuide(id);
  const today = isoDay();
  const { data: viewer } = useViewer();
  const signedIn = !!viewer?.userId;
  const profile = useProfile();
  const food = useFood(today, signedIn);
  const water = useWater(today, signedIn);
  const toast = useToast();
  if (!guide) return <Placeholder title="Page not found" />;

  const p = profile.data;
  const insight = p && p.conditions.includes(guide.id)
    ? conditionInsight(guide.id, { entries: food.data ?? [], macros: sumMacros(food.data ?? []), profile: p, water: water.data ?? 0, hour: new Date().getHours() })
    : null;
  const ideas = mealIdeas({ prefs: p?.food_preferences ?? [], conditions: [guide.id], condition: guide.id });

  return (
    <div className="mx-auto grid max-w-xl gap-4">
      <Link to="/" className="flex w-fit items-center gap-1 text-sm font-semibold text-brand-700"><ArrowLeft className="h-4 w-4" /> Home</Link>
      <div className="flex animate-rise items-center gap-3">
        <ConditionIcon guide={guide} size={52} />
        <div>
          <h1 className="text-[24px] font-extrabold leading-tight">{guide.name}</h1>
          <p className="text-sm text-ink-muted">{guide.short}</p>
        </div>
      </div>
      <p className="animate-rise text-[15px] text-ink-2">{guide.intro}</p>

      {insight && (
        <section className={`card flex animate-rise gap-3 p-4 ${insight.tone === "good" ? "border-brand-200 bg-brand-50" : "border-citrus-100 bg-citrus-50"}`} aria-label="Today">
          <Sparkles className={`h-5 w-5 shrink-0 ${insight.tone === "good" ? "text-brand-700" : "text-citrus-600"}`} />
          <div><b className="block text-sm">Today</b><p className="text-sm text-ink-2">{insight.text}</p></div>
        </section>
      )}

      <section className="card grid animate-rise gap-4 p-4 sm:grid-cols-2">
        <List title="Eat more" items={guide.eatMore} icon={<Check className="h-4 w-4 text-brand-600" />} />
        <List title="Go easy on" items={guide.limit} icon={<Minus className="h-4 w-4 text-citrus-600" />} />
        <div className="sm:col-span-2"><List title="Daily habits" items={guide.habits} icon={<Sparkles className="h-4 w-4 text-sky-500" />} /></div>
      </section>

      <section className="card animate-rise p-4">
        <h2 className="text-base font-bold">Meal ideas</h2>
        <p className="mb-1 text-xs text-ink-muted">{p?.food_preferences.length ? "Matched to your food preferences. " : ""}Tap Log to add one to today.</p>
        {ideas.length ? ideas.slice(0, 8).map((m) => signedIn
          ? <MealIdeaRow key={m.id} idea={m} day={today} onAdded={(n) => toast(`${n} logged`)} />
          : <p key={m.id} className="border-b border-[#d8e2d9] py-2 text-sm last:border-0">{m.name} <span className="num text-xs text-ink-muted">· {m.kcal} kcal</span></p>)
          : <p className="text-sm text-ink-muted">No ideas match all of your food preferences yet. Try removing one in Profile.</p>}
      </section>

      <section className="grid animate-rise gap-2 rounded-2xl bg-[#e8eee7] p-4 text-xs text-ink-2">
        <p className="flex gap-2"><Info className="h-4 w-4 shrink-0" /> General education, not medical advice. It doesn't replace your doctor's, dietitian's or care team's plan. Contact a professional about new or worsening symptoms.</p>
        <div className="grid gap-1">
          <b>Learn more</b>
          {guide.sources.map((s) => (
            <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 font-semibold text-brand-700"><ExternalLink className="h-3 w-3" /> {s.label}</a>
          ))}
        </div>
      </section>
    </div>
  );
}

function List({ title, items, icon }: { title: string; items: string[]; icon: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-1.5 text-sm font-bold">{title}</h2>
      <ul className="grid gap-1.5">{items.map((i) => <li key={i} className="flex gap-2 text-sm text-ink-2"><span className="mt-0.5 shrink-0">{icon}</span>{i}</li>)}</ul>
    </div>
  );
}
