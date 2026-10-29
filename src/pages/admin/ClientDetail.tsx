import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, Eye } from "lucide-react";
import { admin, type ClientDetail as Detail } from "@/lib/admin";
import { FOOD_PREF_LABEL, MEAL_LABEL, addDays, conditionGuide, isoDay, parseDay } from "@/lib/nutrition";
import { LEVEL_LABEL, PLACE_LABEL } from "@/lib/fitness";
import { toDisplayWeight, useUnits, weightUnit } from "@/lib/units";
import { saveFile } from "@/lib/native";
import { BarChart, LineChart } from "@/components/nutrition";
import { ConditionIcon } from "@/components/health";
import { ErrorNote, Spinner } from "@/components/ui";

const DAYS = 30;
const fmt = (s: string | null | undefined) => (s ? new Date(s).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—");

/** CSV with a header row; values are quoted so commas and quotes are safe. */
export function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const q = (v: unknown) => {
    const s = v == null ? "" : Array.isArray(v) ? v.join("; ") : String(v);
    // Leading = + - @ would run as a formula in spreadsheet apps.
    const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => q(r[c])).join(","))].join("\n");
}

export default function ClientDetail({ userId, onBack }: { userId: string; onBack: () => void }) {
  const units = useUnits();
  const U = weightUnit(units);
  const q = useQuery({ queryKey: ["admin-client", userId], queryFn: () => admin.clientDetail(userId, 90), staleTime: 60_000 });
  const d = q.data;
  const today = isoDay();

  const summary = useMemo(() => {
    if (!d) return null;
    const from = addDays(today, -(DAYS - 1));
    const days = Array.from({ length: DAYS }, (_, i) => addDays(from, i));
    const kcal = days.map((day) => d.food.filter((f) => f.eaten_on === day).reduce((s, f) => s + f.kcal, 0));
    const logged = kcal.filter((k) => k > 0);
    const protein = days.map((day) => d.food.filter((f) => f.eaten_on === day).reduce((s, f) => s + Number(f.protein_g), 0)).filter((p) => p > 0);
    const workouts = d.workouts.filter((w) => w.done_on >= from);
    const water = d.water.filter((w) => w.day >= from);
    return {
      days, kcal,
      loggedDays: logged.length,
      avgKcal: logged.length ? Math.round(logged.reduce((a, b) => a + b, 0) / logged.length) : null,
      avgProtein: protein.length ? Math.round(protein.reduce((a, b) => a + b, 0) / protein.length) : null,
      workouts: workouts.length, workoutMinutes: workouts.reduce((s, w) => s + w.minutes, 0),
      avgWater: water.length ? Math.round((water.reduce((s, w) => s + w.glasses, 0) / water.length) * 10) / 10 : null,
    };
  }, [d, today]);

  if (q.isLoading) return <Spinner />;
  if (!d || !summary) return <><button className="btn-outline" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Clients</button><ErrorNote error={q.error} /></>;
  const p = d.profile;
  const name = p?.display_name || d.account.email.split("@")[0];
  const w = d.weights;
  const latest = w.at(-1)?.weight_kg ?? null;
  const wVals = w.map((x) => toDisplayWeight(x.weight_kg, units));
  const download = (kind: "json" | "csv") => {
    const base = `client-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${today}`;
    return kind === "json"
      ? saveFile(`${base}.json`, JSON.stringify(d, null, 2))
      : saveFile(`${base}-food-log.csv`, toCsv(d.food as unknown as Record<string, unknown>[]), "text/csv");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn-outline" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Clients</button>
        <span className="flex items-center gap-1 text-xs text-slate-500"><Eye className="h-3.5 w-3.5" /> Your view of this record is saved in the audit log.</span>
      </div>

      <div className="card flex flex-wrap items-center gap-3 p-4">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-citrus-500 to-rose-600 font-display text-xl font-extrabold text-white">{name[0]?.toUpperCase()}</span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-bold">{name}</h2>
          <p className="truncate text-xs text-slate-500">{d.account.email} · joined {fmt(d.account.created_at)} · last sign-in {fmt(d.account.last_sign_in_at)}{d.roles.length ? ` · ${d.roles.join(", ")}` : ""}</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-outline px-3 py-1.5 text-xs" onClick={() => download("csv")}><Download className="h-3.5 w-3.5" /> Food log (CSV)</button>
          <button className="btn-outline px-3 py-1.5 text-xs" onClick={() => download("json")}><Download className="h-3.5 w-3.5" /> Everything (JSON)</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile k={`Days logged (${DAYS} d)`} v={`${summary.loggedDays}`} sub={`of ${DAYS}`} />
        <Tile k="Average calories" v={summary.avgKcal?.toLocaleString() ?? "—"} sub={p ? `goal ${p.kcal_goal.toLocaleString()}` : ""} />
        <Tile k="Average protein" v={summary.avgProtein != null ? `${summary.avgProtein} g` : "—"} sub={p ? `goal ${p.protein_goal_g} g` : ""} />
        <Tile k={`Workouts (${DAYS} d)`} v={`${summary.workouts}`} sub={`${summary.workoutMinutes} min`} />
        <Tile k="Current weight" v={latest != null ? `${toDisplayWeight(latest, units)} ${U}` : "—"} sub={p?.goal_weight_kg ? `goal ${toDisplayWeight(p.goal_weight_kg, units)} ${U}` : "no goal set"} />
        <Tile k="Start weight" v={p?.start_weight_kg ? `${toDisplayWeight(p.start_weight_kg, units)} ${U}` : "—"} sub={latest != null && p?.start_weight_kg ? `${toDisplayWeight(latest - p.start_weight_kg, units) > 0 ? "+" : ""}${toDisplayWeight(latest - p.start_weight_kg, units)} ${U} so far` : ""} />
        <Tile k="Water" v={summary.avgWater != null ? `${summary.avgWater}` : "—"} sub={p ? `glasses/day · goal ${p.water_goal_glasses}` : ""} />
        <Tile k="Setup" v={p?.onboarded_at ? "Done" : "Not finished"} sub={p?.onboarded_at ? fmt(p.onboarded_at) : ""} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-4">
          <h3 className="font-semibold">Health &amp; preferences</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {p?.conditions.length ? p.conditions.map((c) => {
              const g = conditionGuide(c);
              return g ? <span key={c} className="flex items-center gap-2 rounded-full border border-slate-200 py-1 pl-1 pr-3 text-sm font-semibold"><ConditionIcon guide={g} size={22} /> {g.name}</span> : null;
            }) : <span className="text-sm text-slate-500">No health focus chosen</span>}
          </div>
          <dl className="mt-3 grid gap-1 text-sm">
            <Row k="Food preferences" v={p?.food_preferences.length ? p.food_preferences.map((f) => FOOD_PREF_LABEL[f]).join(", ") : "None"} />
            <Row k="Workouts" v={p ? `${LEVEL_LABEL[p.fitness_level]} · ${PLACE_LABEL[p.workout_place]} · ${p.workout_days} days a week` : "—"} />
            <Row k="Daily targets" v={p ? `${p.kcal_goal} kcal · ${p.protein_goal_g} g protein · ${p.carbs_goal_g} g carbs · ${p.fat_goal_g} g fat` : "—"} />
            <Row k="Health focus consent" v={fmt(p?.health_consent_at)} />
          </dl>
        </section>
        <section className="card p-4">
          <h3 className="font-semibold">Weight</h3>
          <LineChart points={w.map((x) => ({ label: parseDay(x.measured_on).toLocaleDateString(undefined, { month: "short", day: "numeric" }), value: toDisplayWeight(x.weight_kg, units) }))}
            unit={U} min={Math.floor(Math.min(...wVals, Infinity) - 2)} max={Math.ceil(Math.max(...wVals, -Infinity) + 2)} ariaLabel="Client weight over time" />
        </section>
      </div>

      <section className="card p-4">
        <h3 className="font-semibold">Calories, last {DAYS} days</h3>
        <BarChart points={summary.days.map((day, i) => ({ label: i % 5 === 0 ? parseDay(day).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "", value: summary.kcal[i] }))} goal={p?.kcal_goal} unit="kcal" />
      </section>

      <section className="card overflow-x-auto p-0">
        <h3 className="p-4 pb-2 font-semibold">Food log (last 14 days)</h3>
        <FoodTable food={d.food.filter((f) => f.eaten_on >= addDays(today, -13))} />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-4">
          <h3 className="font-semibold">Workouts</h3>
          {d.workouts.length ? (
            <ul className="mt-2 divide-y divide-slate-100 text-sm">{d.workouts.slice(0, 12).map((x) => <li key={x.done_on + x.session_id} className="flex justify-between py-1.5"><span>{fmt(x.done_on)} · {x.session_id.replace(/-/g, " ")}</span><span className="num text-slate-500">{x.minutes} min</span></li>)}</ul>
          ) : <p className="mt-1 text-sm text-slate-500">No workouts marked done yet.</p>}
        </section>
        <section className="card p-4">
          <h3 className="font-semibold">Questions sent to providers</h3>
          {d.inquiries.length ? (
            <ul className="mt-2 divide-y divide-slate-100 text-sm">{d.inquiries.map((x) => <li key={x.created_at} className="py-1.5"><span className="text-xs text-slate-500">{fmt(x.created_at)} · {x.status}</span><p className="line-clamp-2">{x.message}</p></li>)}</ul>
          ) : <p className="mt-1 text-sm text-slate-500">None.</p>}
        </section>
      </div>
    </div>
  );
}

function FoodTable({ food }: { food: Detail["food"] }) {
  if (!food.length) return <p className="px-4 pb-4 text-sm text-slate-500">Nothing logged in the last 14 days.</p>;
  return (
    <table className="w-full text-sm">
      <thead className="bg-slate-50 text-left text-xs text-slate-500">
        <tr><th className="p-2 pl-4">Day</th><th className="p-2">Meal</th><th className="p-2">Food</th><th className="p-2 text-right">kcal</th><th className="p-2 text-right">Protein</th><th className="p-2 pr-4 text-right">Carbs</th></tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {food.map((f, i) => (
          <tr key={i}>
            <td className="whitespace-nowrap p-2 pl-4">{parseDay(f.eaten_on).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</td>
            <td className="p-2">{MEAL_LABEL[f.meal]}</td>
            <td className="p-2">{f.name}</td>
            <td className="num p-2 text-right">{f.kcal}</td>
            <td className="num p-2 text-right">{Math.round(Number(f.protein_g))} g</td>
            <td className="num p-2 pr-4 text-right">{Math.round(Number(f.carbs_g))} g</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Tile({ k, v, sub }: { k: string; v: string; sub: string }) {
  return <div className="card p-3"><span className="text-[11px] text-slate-500">{k}</span><b className="num block font-display text-[20px]">{v}</b><span className="text-[11px] text-slate-500">{sub}</span></div>;
}
function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex gap-2"><dt className="w-40 shrink-0 text-slate-500">{k}</dt><dd>{v}</dd></div>;
}
