import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Search, Sparkles } from "lucide-react";
import { EXERCISE_DB_CREDIT, MUSCLE_GROUPS, rankExercises, type DbExercise } from "@/lib/exerciseDb";
import { LEVEL_LABEL, PLACE_LABEL } from "@/lib/fitness";
import { conditionGuide } from "@/lib/nutrition";
import { ExercisePhoto, ExerciseSheet, cap, useExerciseDb } from "@/components/exercises";
import { SignInPrompt, useProfile } from "@/components/nutrition";
import { ErrorNote, Spinner, useViewer } from "@/components/ui";

const TYPES = [["all", "All"], ["strength", "Strength"], ["cardio", "Cardio"], ["stretching", "Stretch & mobility"]] as const;
const PAGE = 24;

export default function ExerciseLibraryPage() {
  const { data: viewer, isLoading } = useViewer();
  const profile = useProfile();
  const db = useExerciseDb();
  const [q, setQ] = useState("");
  const [type, setType] = useState<(typeof TYPES)[number][0]>("all");
  const [group, setGroup] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const [shown, setShown] = useState<{ e: DbExercise; why: string[] } | null>(null);

  const p = profile.data;
  const results = useMemo(() => {
    if (!db.data || !p) return [];
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const muscles = group ? MUSCLE_GROUPS[group] : null;
    return rankExercises(db.data, p, (e) =>
      (type === "all" || e.category === type) &&
      (!muscles || e.primaryMuscles.some((m) => muscles.includes(m))) &&
      words.every((w) => e.name.toLowerCase().includes(w) || e.primaryMuscles.some((m) => m.includes(w))));
  }, [db.data, p, q, type, group]);

  if (isLoading || profile.isLoading) return <Spinner />;
  if (!viewer?.userId || !p) return <SignInPrompt what="browse exercises matched to you" />;
  const focus = p.conditions.map((c) => conditionGuide(c)?.name).filter(Boolean).join(", ");

  return (
    <div className="mx-auto grid max-w-xl grid-cols-[minmax(0,1fr)] gap-4">
      <Link to="/workouts" className="flex w-fit items-center gap-1 text-sm font-semibold text-brand-700"><ArrowLeft className="h-4 w-4" /> Workouts</Link>
      <div className="animate-rise">
        <h1 className="text-[26px] font-extrabold">Exercise library</h1>
        <p className="flex items-start gap-1.5 text-sm text-ink-muted"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
          Matched to you: {LEVEL_LABEL[p.fitness_level].toLowerCase()}, {PLACE_LABEL[p.workout_place].toLowerCase()}{focus ? `, best for ${focus}` : ""}.</p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
        <input id="ex-search" className="input pl-9" type="search" placeholder="Search exercises or muscles" value={q} onChange={(e) => { setQ(e.target.value); setLimit(PAGE); }} />
      </div>
      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4">
        {TYPES.map(([t, label]) => (
          <button key={t} type="button" aria-pressed={type === t} onClick={() => { setType(t); setLimit(PAGE); }}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${type === t ? "border-ink bg-ink text-white" : "border-[#d8e2d9] bg-white"}`}>{label}</button>
        ))}
        <select aria-label="Muscle group" className="shrink-0 rounded-full border border-[#d8e2d9] bg-white px-3 py-1.5 text-xs font-semibold" value={group} onChange={(e) => { setGroup(e.target.value); setLimit(PAGE); }}>
          <option value="">All muscles</option>
          {Object.keys(MUSCLE_GROUPS).map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      <ErrorNote error={db.error} />
      {db.isLoading ? <Spinner /> : (
        <>
          <p className="num text-xs text-ink-muted">{results.length} exercises</p>
          <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
            {results.slice(0, limit).map(({ e, fit }) => (
              <li key={e.id} className="min-w-0">
                <button type="button" onClick={() => setShown({ e, why: fit.why })} className="card flex w-full items-center gap-3 p-2 text-left transition hover:border-brand-600">
                  <ExercisePhoto path={e.images[0]} alt="" className="h-16 w-20 shrink-0 rounded-xl" />
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-sm">{e.name}</b>
                    <span className="block truncate text-[11px] text-ink-muted">{cap(e.category)} · {cap(e.equipment)} · {e.primaryMuscles.map(cap).join(", ")}</span>
                    {fit.why[0] && <span className="mt-0.5 block truncate text-[11px] font-semibold text-brand-700">{fit.why[0]}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {results.length > limit && <button className="btn-outline" onClick={() => setLimit(limit + PAGE)}>Show more</button>}
          {!results.length && <p className="card p-4 text-sm text-ink-2">No matches. Try another search or muscle group.</p>}
        </>
      )}
      <p className="text-center text-[11px] text-ink-muted">Exercises and photos: <a className="font-semibold text-brand-700" href={EXERCISE_DB_CREDIT.url} target="_blank" rel="noopener noreferrer">{EXERCISE_DB_CREDIT.label}</a>. General fitness information, not medical advice.</p>
      {shown && <ExerciseSheet exercise={shown.e} why={shown.why} onClose={() => setShown(null)} />}
    </div>
  );
}
