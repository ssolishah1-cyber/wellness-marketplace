import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, ChevronDown, Clock, Shuffle } from "lucide-react";
import { AREAS, DURATIONS, areaLabel, buildQuickWorkout, type AreaId } from "@/lib/quickWorkout";
import { isoDay, nutrition } from "@/lib/nutrition";
import { ExercisePhotos, cap, useExerciseDb } from "@/components/exercises";
import { SignInPrompt, useProfile } from "@/components/nutrition";
import { ErrorNote, Spinner, useViewer } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { tap } from "@/lib/native";

export default function QuickWorkoutPage() {
  const [params] = useSearchParams();
  const area = (AREAS.some((a) => a.id === params.get("area")) ? params.get("area") : "full") as AreaId;
  const minutes = DURATIONS.includes(Number(params.get("min")) as 10) ? Number(params.get("min")) : 20;
  const { data: viewer, isLoading } = useViewer();
  const profile = useProfile();
  const db = useExerciseDb(!!viewer?.userId);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e6) + 1);
  const [open, setOpen] = useState<string | null>(null);
  const qc = useQueryClient();
  const toast = useToast();
  const p = profile.data;
  const workout = useMemo(() => (db.data && p ? buildQuickWorkout(db.data, p, area, minutes, seed) : null), [db.data, p, area, minutes, seed]);
  const done = useMutation({
    mutationFn: () => nutrition.setWorkoutDone(isoDay(), `quick-${area}`, minutes),
    onSuccess: async () => { tap(); await qc.invalidateQueries({ queryKey: ["workouts"] }); toast(`${areaLabel(area)} workout done · ${minutes} min`); },
  });

  if (isLoading || profile.isLoading) return <Spinner />;
  if (!viewer?.userId || !p) return <SignInPrompt what="build a workout" />;
  return (
    <div className="mx-auto grid max-w-xl grid-cols-[minmax(0,1fr)] gap-4">
      <Link to="/workouts" className="flex w-fit items-center gap-1 text-sm font-semibold text-brand-700"><ArrowLeft className="h-4 w-4" /> Fitness</Link>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-1 text-sm text-ink-muted"><Clock className="h-3.5 w-3.5" /> {minutes} minutes · matched to you</p>
          <h1 className="text-[26px] font-extrabold">{areaLabel(area)} workout</h1>
        </div>
        <button type="button" className="btn-outline shrink-0 px-3 py-1.5 text-xs" onClick={() => { setSeed((s) => s + 7919); setOpen(null); }}><Shuffle className="h-3.5 w-3.5" /> Shuffle</button>
      </div>
      <ErrorNote error={db.error ?? done.error} />
      {!workout ? <Spinner /> : !workout.items.length
        ? <p className="card p-4 text-sm text-ink-2">No exercises match this area for your level and place yet. Try another area or switch to the gym in Profile.</p>
        : (
          <>
            <ul className="grid gap-1.5 rounded-xl bg-sky-50 p-3 text-xs text-sky-600">{workout.notes.map((n) => <li key={n}>{n}</li>)}</ul>
            <ol className="grid gap-1.5">
              {workout.items.map(({ exercise: e, dose, why }, i) => (
                <li key={e.id} className="card overflow-hidden">
                  <button type="button" className="flex w-full items-center gap-3 p-3 text-left" aria-expanded={open === e.id} onClick={() => setOpen(open === e.id ? null : e.id)}>
                    <span className="num grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ground text-xs font-bold">{i + 1}</span>
                    <span className="min-w-0 flex-1"><b className="block truncate text-sm">{e.name}</b><span className="text-[11px] text-ink-muted">{e.primaryMuscles.map(cap).join(", ")} · {cap(e.equipment)}</span></span>
                    <span className="num shrink-0 text-sm font-semibold">{dose}</span>
                    <ChevronDown className={`h-4 w-4 shrink-0 text-ink-muted transition ${open === e.id ? "rotate-180" : ""}`} />
                  </button>
                  {open === e.id && (
                    <div className="grid gap-2.5 border-t border-[#d8e2d9] p-3 text-sm text-ink-2">
                      <ExercisePhotos images={e.images} name={e.name} />
                      {why[0] && <p className="text-xs font-semibold text-brand-700">{why[0]}</p>}
                      <ol className="list-decimal space-y-1 pl-5">{e.instructions.map((s) => <li key={s}>{s}</li>)}</ol>
                    </div>
                  )}
                </li>
              ))}
            </ol>
            <button className="btn-primary" disabled={done.isPending || done.isSuccess} onClick={() => done.mutate()}>
              <Check className="h-4 w-4" /> {done.isSuccess ? "Done, nice work" : "Mark as done"}
            </button>
          </>
        )}
      <p className="text-center text-[11px] text-ink-muted">Stop if you feel pain, dizziness or chest discomfort. Check with your doctor before starting a new exercise plan.</p>
    </div>
  );
}
