import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Apple, Coffee, CupSoda, Egg, Fish, LogIn, Salad, Soup, Utensils, X, type LucideIcon } from "lucide-react";
import { isDemoMode } from "@/integrations/supabase/client";
import { MEAL_LABEL, QUICK_FOODS, nutrition, type MealSlot } from "@/lib/nutrition";
import { ErrorNote, Field } from "./ui";
import { tap } from "@/lib/native";

// ---------- data hooks ----------
export const useProfile = () => useQuery({ queryKey: ["profile"], queryFn: () => nutrition.getProfile() });
export const useFood = (day: string, enabled = true) => useQuery({ queryKey: ["food", day], queryFn: () => nutrition.listFood(day), enabled });
export const useWater = (day: string, enabled = true) => useQuery({ queryKey: ["water", day], queryFn: () => nutrition.getWater(day), enabled });
export const useTotals = (from: string, to: string, enabled = true) =>
  useQuery({ queryKey: ["totals", from, to], queryFn: () => nutrition.dailyTotals(from, to), enabled });
export const useWeights = (enabled = true) => useQuery({ queryKey: ["weights"], queryFn: () => nutrition.listWeights(), enabled });
export const useWorkouts = (from: string, to: string, enabled = true) =>
  useQuery({ queryKey: ["workouts", from, to], queryFn: () => nutrition.listWorkouts(from, to), enabled });

/** Invalidate everything that depends on the food log. */
export function useRefreshFood() {
  const qc = useQueryClient();
  return () => Promise.all([qc.invalidateQueries({ queryKey: ["food"] }), qc.invalidateQueries({ queryKey: ["totals"] })]);
}

// ---------- icons for food ----------
const FOOD_ICONS: Record<string, LucideIcon> = { coffee: Coffee, egg: Egg, salad: Salad, fish: Fish, soup: Soup, cup: CupSoda, apple: Apple };
const GRADS = ["from-sky-500 to-indigo-700", "from-brand-500 to-brand-700", "from-citrus-500 to-rose-600", "from-fuchsia-400 to-rose-700", "from-violet-400 to-violet-700", "from-teal-400 to-teal-700"];
export function FoodBadge({ name, icon, size = 42 }: { name: string; icon?: string; size?: number }) {
  const guess = icon ?? (/(yogurt|oat|granola|coffee|pancake)/i.test(name) ? "coffee" : /egg/i.test(name) ? "egg" : /(salmon|fish|sushi|tuna)/i.test(name) ? "fish"
    : /(soup|chili|lentil)/i.test(name) ? "soup" : /(smoothie|shake|milk)/i.test(name) ? "cup" : /(apple|banana|fruit|berr)/i.test(name) ? "apple" : /(salad|bowl|wrap|quinoa)/i.test(name) ? "salad" : "");
  const Icon = FOOD_ICONS[guess] ?? Utensils;
  const g = GRADS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % GRADS.length];
  return (
    <span className={`grid shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white ${g}`} style={{ width: size, height: size }}>
      <Icon className="h-5 w-5" />
    </span>
  );
}

// ---------- calorie ring ----------
export function CalorieRing({ eaten, goal }: { eaten: number; goal: number }) {
  const pct = Math.min(100, (eaten / Math.max(goal, 1)) * 100);
  const prev = useRef(0);
  const [shown, setShown] = useState(prev.current);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(pct));
    prev.current = pct;
    return () => cancelAnimationFrame(id);
  }, [pct]);
  const left = goal - eaten;
  return (
    <div className="relative h-[132px] w-[132px] shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="60" cy="60" r="52" fill="none" strokeWidth="12" className="stroke-[#e8eee7]" />
        <circle cx="60" cy="60" r="52" fill="none" strokeWidth="12" strokeLinecap="round" pathLength={100} strokeDasharray={100}
          strokeDashoffset={100 - shown} className="stroke-citrus-500 transition-[stroke-dashoffset] duration-1000 ease-out" />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <b className="num block font-display text-[27px] leading-none">{Math.abs(left).toLocaleString()}</b>
          <span className="text-[11px] text-ink-muted">{left >= 0 ? "kcal left" : "kcal over"}</span>
        </div>
      </div>
      <span className="sr-only">{eaten} of {goal} kcal eaten</span>
    </div>
  );
}

export function MacroBar({ label, value, goal, color }: { label: string; value: number; goal: number; color: string }) {
  return (
    <div className="grid gap-1">
      <div className="flex justify-between text-xs"><span className="font-semibold">{label}</span><span className="num text-ink-muted">{Math.round(value)} / {goal} g</span></div>
      <div className="h-[7px] overflow-hidden rounded-full bg-[#e8eee7]">
        <i className={`block h-full origin-left animate-grow rounded-full ${color}`} style={{ width: `${Math.min(100, (value / Math.max(goal, 1)) * 100)}%` }} />
      </div>
    </div>
  );
}

// ---------- water ----------
export function WaterGlasses({ day, goal }: { day: string; goal: number }) {
  const qc = useQueryClient();
  const water = useWater(day);
  const set = useMutation({
    mutationFn: (n: number) => nutrition.setWater(day, n),
    onMutate: (n) => qc.setQueryData(["water", day], n),
    onSettled: () => qc.invalidateQueries({ queryKey: ["water", day] }),
  });
  const n = water.data ?? 0;
  return (
    <div className="flex flex-wrap gap-1.5">
      {Array.from({ length: Math.max(goal, n) }, (_, i) => (
        <button key={i} type="button" aria-label={`${i + 1} glass${i ? "es" : ""}`} aria-pressed={i < n}
          onClick={() => { tap(); set.mutate(n === i + 1 ? i : i + 1); }}
          className="relative h-[34px] w-[26px] overflow-hidden rounded-b-[9px] rounded-t-md border-2 border-sky-500">
          <i className={`absolute inset-x-0 bottom-0 bg-sky-500 transition-[height] duration-500 ${i < n ? "h-full" : "h-0"}`} />
        </button>
      ))}
    </div>
  );
}

// ---------- sheet / modal ----------
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <button className="absolute inset-0 bg-black/40" aria-label="Close" onClick={onClose} />
      <div className="relative max-h-[88vh] w-full max-w-md animate-rise overflow-y-auto rounded-t-3xl bg-white p-5 pb-[max(20px,env(safe-area-inset-bottom))] sm:rounded-3xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button className="rounded-full p-1.5 hover:bg-ground" onClick={onClose} aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function AddFoodSheet({ day, meal: initialMeal, onClose, onAdded }: { day: string; meal: MealSlot; onClose: () => void; onAdded: (name: string, kcal: number) => void }) {
  const refresh = useRefreshFood();
  const [meal, setMeal] = useState<MealSlot>(initialMeal);
  const [custom, setCustom] = useState(false);
  const [f, setF] = useState({ name: "", kcal: "", protein_g: "", carbs_g: "", fat_g: "" });
  const add = useMutation({
    mutationFn: (food: { name: string; kcal: number; protein_g: number; carbs_g: number; fat_g: number }) => nutrition.addFood({ ...food, eaten_on: day, meal }),
    onSuccess: async (e) => { tap(); await refresh(); onAdded(e.name, e.kcal); onClose(); },
  });
  const n = (s: string) => (s.trim() === "" ? 0 : Number(s));
  return (
    <Sheet title={`Add to ${MEAL_LABEL[meal].toLowerCase()}`} onClose={onClose}>
      <div className="mb-3 flex gap-1.5 overflow-x-auto">
        {(Object.keys(MEAL_LABEL) as MealSlot[]).map((m) => (
          <button key={m} type="button" onClick={() => setMeal(m)} aria-pressed={meal === m}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${meal === m ? "border-ink bg-ink text-white" : "border-[#d8e2d9] bg-white"}`}>{MEAL_LABEL[m]}</button>
        ))}
      </div>
      {!custom ? (
        <div className="grid gap-2">
          <p className="text-xs text-ink-muted">Quick picks</p>
          {QUICK_FOODS.map((q) => (
            <button key={q.name} type="button" disabled={add.isPending} onClick={() => add.mutate(q)}
              className="grid grid-cols-[42px_1fr_auto] items-center gap-3 rounded-2xl border border-[#d8e2d9] bg-ground/60 p-2.5 text-left transition hover:translate-x-0.5 hover:border-brand-600">
              <FoodBadge name={q.name} icon={q.icon} />
              <span><b className="block text-sm">{q.name}</b><span className="num text-[11px] text-ink-muted">P {q.protein_g} g · C {q.carbs_g} g · F {q.fat_g} g</span></span>
              <b className="num text-sm">{q.kcal}</b>
            </button>
          ))}
          <button type="button" className="btn-outline mt-1" onClick={() => setCustom(true)}>Enter something else</button>
        </div>
      ) : (
        <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); add.mutate({ name: f.name.trim(), kcal: Math.round(n(f.kcal)), protein_g: n(f.protein_g), carbs_g: n(f.carbs_g), fat_g: n(f.fat_g) }); }}>
          <Field label="What did you eat?"><input id="food-name" className="input" required maxLength={120} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Turkey sandwich" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Calories (kcal)"><input id="food-kcal" className="input num" required type="number" min={0} max={5000} inputMode="numeric" value={f.kcal} onChange={(e) => setF({ ...f, kcal: e.target.value })} /></Field>
            <Field label="Protein (g)"><input id="food-p" className="input num" type="number" min={0} max={500} step="0.1" inputMode="decimal" value={f.protein_g} onChange={(e) => setF({ ...f, protein_g: e.target.value })} /></Field>
            <Field label="Carbs (g)"><input id="food-c" className="input num" type="number" min={0} max={1000} step="0.1" inputMode="decimal" value={f.carbs_g} onChange={(e) => setF({ ...f, carbs_g: e.target.value })} /></Field>
            <Field label="Fat (g)"><input id="food-f" className="input num" type="number" min={0} max={500} step="0.1" inputMode="decimal" value={f.fat_g} onChange={(e) => setF({ ...f, fat_g: e.target.value })} /></Field>
          </div>
          <div className="flex gap-2">
            <button className="btn-primary flex-1" disabled={add.isPending}>Add food</button>
            <button type="button" className="btn-outline" onClick={() => setCustom(false)}>Back</button>
          </div>
        </form>
      )}
      <ErrorNote error={add.error} />
    </Sheet>
  );
}

// ---------- charts ----------
interface Point { label: string; value: number }

export function LineChart({ points, unit, min, max, ariaLabel }: { points: Point[]; unit: string; min: number; max: number; ariaLabel: string }) {
  const [hover, setHover] = useState<number | null>(null);
  if (points.length < 2) return <p className="py-6 text-center text-sm text-ink-muted">Log at least two weigh-ins to see your trend.</p>;
  const W = 340, H = 170, pl = 34, pb = 22, pt = 14;
  const x = (i: number) => pl + (i * (W - pl - 10)) / (points.length - 1);
  const y = (v: number) => pt + ((max - v) / (max - min || 1)) * (H - pb - pt);
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(" ");
  const area = `${line} L${x(points.length - 1)} ${H - pb} L${pl} ${H - pb} Z`;
  const ticks = [min, (min + max) / 2, max];
  const every = Math.ceil(points.length / 6);
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible" role="img" aria-label={ariaLabel}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pl} x2={W - 4} y1={y(t)} y2={y(t)} stroke="#d8e2d9" />
            <text x={pl - 6} y={y(t) + 3} textAnchor="end" fontSize="10" fill="#728379">{t.toFixed(1)}</text>
          </g>
        ))}
        {points.map((p, i) => (i % every === 0 || i === points.length - 1) && (
          <text key={i} x={x(i)} y={H - 6} textAnchor="middle" fontSize="10" fill="#728379">{p.label}</text>
        ))}
        <path d={area} fill="#1c7a4b" opacity=".12" />
        <path d={line} fill="none" stroke="#1c7a4b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" pathLength={1}
          strokeDasharray={1} className="[animation:draw_1.4s_ease-out_both]" />
        {points.map((p, i) => (
          <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} tabIndex={0}
            aria-label={`${p.label}: ${p.value} ${unit}`}>
            <circle cx={x(i)} cy={y(p.value)} r="14" fill="transparent" />
            <circle cx={x(i)} cy={y(p.value)} r={hover === i ? 6 : i === points.length - 1 ? 5 : 3.5} fill="#fff" stroke="#1c7a4b" strokeWidth="2.5" />
          </g>
        ))}
      </svg>
      {hover !== null && (
        <div className="pointer-events-none absolute -translate-x-1/2 rounded-lg bg-ink px-2 py-1 text-xs font-bold text-white"
          style={{ left: `${(x(hover) / W) * 100}%`, top: `${(y(points[hover].value) / H) * 100 - 22}%` }}>
          {points[hover].value} {unit}
        </div>
      )}
    </div>
  );
}

export function BarChart({ points, goal, highlight, unit }: { points: Point[]; goal?: number; highlight?: number; unit: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 340, H = 150, pl = 34, pb = 22, pt = 10;
  const max = Math.max(...points.map((p) => p.value), goal ?? 0, 1) * 1.08;
  const mag = 10 ** Math.floor(Math.log10(max / 2)), step = (Math.ceil((max / 2 / mag) * 2) / 2) * mag;
  const ticks = [0, step, step * 2].filter((t) => t <= max);
  const slot = (W - pl - 4) / points.length, bw = Math.min(26, slot - 4);
  const y = (v: number) => pt + (1 - v / max) * (H - pb - pt);
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible" role="img" aria-label={`${unit} per day`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pl} x2={W} y1={y(t)} y2={y(t)} stroke="#d8e2d9" />
            <text x={pl - 6} y={y(t) + 3} textAnchor="end" fontSize="10" fill="#728379">{t >= 1000 ? `${(t / 1000).toFixed(1)}k` : t}</text>
          </g>
        ))}
        {goal ? <line x1={pl} x2={W} y1={y(goal)} y2={y(goal)} stroke="#43554b" strokeDasharray="4 4" strokeWidth="1.2" /> : null}
        {points.map((p, i) => {
          const bx = pl + i * slot + (slot - bw) / 2, by = y(p.value), bh = H - pb - by, r = Math.min(4, bw / 2, Math.max(bh, 0));
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} tabIndex={0}
              aria-label={`${p.label}: ${p.value} ${unit}`}>
              <rect x={pl + i * slot} y={pt} width={slot} height={H - pb - pt} fill="transparent" />
              {bh > 0 && (
                <path d={`M${bx} ${by + bh} V${by + r} Q${bx} ${by} ${bx + r} ${by} H${bx + bw - r} Q${bx + bw} ${by} ${bx + bw} ${by + r} V${by + bh} Z`}
                  fill={i === highlight ? "#e2702a" : "#1c7a4b"} opacity={hover === null || hover === i ? 1 : 0.5}
                  style={{ transformBox: "fill-box", transformOrigin: "bottom", animation: `growY .8s ${i * 45}ms cubic-bezier(.2,.8,.2,1) both` }} />
              )}
              <text x={bx + bw / 2} y={H - 6} textAnchor="middle" fontSize="10" fill="#728379">{p.label}</text>
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-lg bg-ink px-2 py-1 text-xs font-bold text-white"
          style={{ left: `${((pl + hover * slot + slot / 2) / W) * 100}%` }}>
          {points[hover].value.toLocaleString()} {unit}
        </div>
      )}
    </div>
  );
}

// ---------- signed-out prompt ----------
export function SignInPrompt({ what }: { what: string }) {
  return (
    <div className="card mx-auto grid max-w-md justify-items-center gap-3 p-8 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-100 text-brand-700"><LogIn className="h-6 w-6" /></span>
      <h1 className="text-xl font-bold">Sign in to {what}</h1>
      <p className="text-sm text-ink-2">Your meals, water and weight are kept in your account, visible only to you and our care team.</p>
      {isDemoMode
        ? <p className="text-xs text-ink-muted">Demo mode: choose <b>App user</b> in the bar at the top.</p>
        : <Link to="/profile" className="btn-primary">Sign in or create an account</Link>}
    </div>
  );
}
