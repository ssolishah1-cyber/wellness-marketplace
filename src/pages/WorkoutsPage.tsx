import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, ChevronDown, ChevronRight, Clock, Dumbbell, HeartPulse, Info, Library, SlidersHorizontal, Wind } from "lucide-react";
import { isoDay, nutrition, weekOf, type Profile } from "@/lib/nutrition";
import { alternativesFor, type DbExercise } from "@/lib/exerciseDb";
import { ExercisePhoto, ExercisePhotos, ExerciseSheet, useExerciseDb } from "@/components/exercises";
import { LEVEL_LABEL, PLACE_LABEL, weekdayOf, weeklyPlan, type Session } from "@/lib/fitness";
import { SignInPrompt, useProfile, useWorkouts } from "@/components/nutrition";
import { Spinner, useViewer } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { tap } from "@/lib/native";

const DAY = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const KIND_ICON = { strength: Dumbbell, cardio: HeartPulse, mobility: Wind };

export default function WorkoutsPage() {
  const today = isoDay();
  const week = weekOf(today);
  const { data: viewer, isLoading } = useViewer();
  const signedIn = !!viewer?.userId;
  const profile = useProfile();
  const logs = useWorkouts(week[0], week[6], signedIn);
  const [selected, setSelected] = useState(weekdayOf(today));

  if (isLoading || (signedIn && profile.isLoading)) return <Spinner />;
  if (!signedIn || !profile.data) return <SignInPrompt what="get your workout plan" />;
  const p = profile.data;
  const plan = weeklyPlan(p);
  const done = new Set((logs.data ?? []).map((l) => `${l.done_on}|${l.session_id}`));
  const doneCount = plan.filter((d, i) => d.session && done.has(`${week[i]}|${d.session.id}`)).length;
  const planned = plan.filter((d) => d.session).length;
  const day = plan[selected];

  return (
    <div className="mx-auto grid max-w-xl gap-4">
      <Link to="/" className="flex w-fit items-center gap-1 text-sm font-semibold text-brand-700"><ArrowLeft className="h-4 w-4" /> Home</Link>
      <div className="flex animate-rise items-end justify-between gap-3">
        <div>
          <p className="text-sm text-ink-muted">{LEVEL_LABEL[p.fitness_level]} · {PLACE_LABEL[p.workout_place]} · {p.workout_days} days a week</p>
          <h1 className="text-[26px] font-extrabold">Your workouts</h1>
        </div>
        <Link to="/profile" className="flex shrink-0 items-center gap-1 text-sm font-semibold text-brand-700"><SlidersHorizontal className="h-3.5 w-3.5" /> Adjust</Link>
      </div>

      <section className="card animate-rise p-3" aria-label="This week">
        <div className="mb-2 flex items-center justify-between px-1 text-xs">
          <b>This week</b><span className="num text-ink-muted">{doneCount} of {planned} done</span>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {plan.map((d, i) => {
            const isDone = !!d.session && done.has(`${week[i]}|${d.session.id}`);
            const Icon = d.session ? KIND_ICON[d.session.kind] : null;
            return (
              <button key={i} type="button" onClick={() => setSelected(i)} aria-pressed={selected === i} aria-label={`${DAY[i]}: ${d.session?.title ?? "Rest day"}${isDone ? ", done" : ""}`}
                className={`grid justify-items-center gap-1 rounded-xl py-2 text-[11px] transition ${selected === i ? "bg-ink text-white" : "hover:bg-ground"} ${week[i] === today && selected !== i ? "ring-2 ring-brand-200" : ""}`}>
                <span className="font-semibold">{DAY[i]}</span>
                <span className={`grid h-7 w-7 place-items-center rounded-full ${isDone ? "bg-brand-600 text-white" : d.session ? (selected === i ? "bg-white/20" : "bg-brand-50 text-brand-700") : ""}`}>
                  {isDone ? <Check className="h-4 w-4" /> : Icon ? <Icon className="h-4 w-4" /> : <span className="text-ink-muted">·</span>}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {day.session
        ? <SessionCard key={`${selected}-${day.session.id}`} session={day.session} day={week[selected]} done={done.has(`${week[selected]}|${day.session.id}`)} future={week[selected] > today} profile={p} />
        : (
          <section className="card animate-rise p-5 text-center">
            <h2 className="text-lg font-bold">Rest day</h2>
            <p className="mt-1 text-sm text-ink-2">Recovery is part of the plan. A relaxed walk or some gentle stretching is still a good idea.</p>
          </section>
        )}

      <Link to="/workouts/library" className="card flex items-center gap-3 p-4 transition hover:border-brand-600">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-700 text-white"><Library className="h-5 w-5" /></span>
        <span className="flex-1"><b className="block">Exercise library</b><span className="text-xs text-ink-muted">700+ exercises with photos, matched to your level, place and health focus</span></span>
        <ChevronRight className="h-5 w-5 text-ink-muted" />
      </Link>

      <p className="flex gap-2 rounded-2xl bg-[#e8eee7] p-4 text-xs text-ink-2">
        <Info className="h-4 w-4 shrink-0" /> Check with your doctor before starting a new exercise plan, especially if you have a heart condition, diabetes, high blood pressure or are pregnant. Stop and seek help if you feel chest pain, severe breathlessness or dizziness.
      </p>
    </div>
  );
}

function SessionCard({ session: s, day, done, future, profile }: { session: Session; day: string; done: boolean; future: boolean; profile: Profile }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [open, setOpen] = useState<string | null>(null);
  const mark = useMutation({
    mutationFn: (minutes: number | null) => nutrition.setWorkoutDone(day, s.id, minutes),
    onSuccess: async (_, minutes) => { tap(); await qc.invalidateQueries({ queryKey: ["workouts"] }); if (minutes) toast(`${s.title} done · ${minutes} min`); },
  });
  const Icon = KIND_ICON[s.kind];
  return (
    <section className="card grid animate-rise gap-3 p-4" aria-label={s.title}>
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white"><Icon className="h-5 w-5" /></span>
        <div className="flex-1">
          <h2 className="text-lg font-bold leading-tight">{s.title}</h2>
          <span className="num flex items-center gap-1 text-xs text-ink-muted"><Clock className="h-3 w-3" /> About {s.minutes} min · {day === isoDay() ? "today" : new Date(day + "T12:00").toLocaleDateString(undefined, { weekday: "long" })}</span>
        </div>
      </div>

      {s.notes.length > 0 && (
        <ul className="grid gap-1.5 rounded-xl bg-sky-50 p-3 text-xs text-sky-600">{s.notes.map((n) => <li key={n}>{n}</li>)}</ul>
      )}

      <p className="text-sm"><b>Warm up:</b> <span className="text-ink-2">{s.warmup}</span></p>
      <ol className="grid gap-1.5">
        {s.blocks.map(({ exercise: e, dose }, i) => (
          <li key={e.id} className="rounded-xl border border-[#d8e2d9]">
            <button type="button" className="flex w-full items-center gap-3 p-3 text-left" aria-expanded={open === e.id} onClick={() => setOpen(open === e.id ? null : e.id)}>
              <span className="num grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ground text-xs font-bold">{i + 1}</span>
              <span className="flex-1"><b className="block text-sm">{e.name}</b><span className="text-[11px] text-ink-muted">{e.target}</span></span>
              <span className="num shrink-0 text-sm font-semibold">{dose}</span>
              <ChevronDown className={`h-4 w-4 shrink-0 text-ink-muted transition ${open === e.id ? "rotate-180" : ""}`} />
            </button>
            {open === e.id && (
              <div className="grid gap-2.5 border-t border-[#d8e2d9] p-3 text-sm text-ink-2">
                {e.dbId && <ExercisePhotos images={[`${e.dbId}/0.jpg`, `${e.dbId}/1.jpg`]} name={e.name} />}
                <ol className="list-decimal space-y-1 pl-5">{e.how.map((h) => <li key={h}>{h}</li>)}</ol>
                {e.easier && <p className="text-xs"><b>Easier:</b> {e.easier}</p>}
                {e.muscles && <Alternatives muscles={e.muscles} excludeId={e.dbId} profile={profile} />}
              </div>
            )}
          </li>
        ))}
      </ol>
      <p className="text-sm"><b>Cool down:</b> <span className="text-ink-2">{s.cooldown}</span></p>

      {done
        ? <button className="btn-outline" disabled={mark.isPending} onClick={() => mark.mutate(null)}><Check className="h-4 w-4 text-brand-600" /> Done · tap to undo</button>
        : <button className="btn-primary" disabled={mark.isPending || future} onClick={() => mark.mutate(s.minutes)}>{future ? "Coming up" : <><Check className="h-4 w-4" /> Mark as done</>}</button>}
    </section>
  );
}

function Alternatives({ muscles, excludeId, profile }: { muscles: string[]; excludeId?: string; profile: Profile }) {
  const db = useExerciseDb();
  const [shown, setShown] = useState<{ e: DbExercise; why: string[] } | null>(null);
  if (!db.data) return db.isError ? null : <p className="text-xs text-ink-muted">Loading alternatives…</p>;
  const alts = alternativesFor(db.data, muscles, excludeId, profile);
  if (!alts.length) return null;
  return (
    <div className="grid gap-1.5">
      <span className="text-xs font-semibold text-ink">Swap for a similar exercise</span>
      {alts.map(({ e, fit }) => (
        <button key={e.id} type="button" onClick={() => setShown({ e, why: fit.why })} className="flex items-center gap-2.5 rounded-xl border border-[#d8e2d9] p-1.5 text-left hover:border-brand-600">
          <ExercisePhoto path={e.images[0]} alt="" className="h-10 w-12 shrink-0 rounded-lg" />
          <span className="flex-1 text-[13px] font-semibold">{e.name}</span>
          <ChevronRight className="h-4 w-4 text-ink-muted" />
        </button>
      ))}
      {shown && <ExerciseSheet exercise={shown.e} why={shown.why} onClose={() => setShown(null)} />}
    </div>
  );
}
