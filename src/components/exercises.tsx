import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dumbbell } from "lucide-react";
import { EXERCISE_DB_CREDIT, loadExerciseDb, photoUrl, type DbExercise } from "@/lib/exerciseDb";
import { Sheet } from "./nutrition";

export const useExerciseDb = (enabled = true) =>
  useQuery({ queryKey: ["exercise-db"], queryFn: loadExerciseDb, staleTime: Infinity, enabled });

/** Exercise photo from the CDN, falling back to GitHub, then to an icon. */
export function ExercisePhoto({ path, alt, className = "" }: { path: string; alt: string; className?: string }) {
  const [attempt, setAttempt] = useState(0);
  if (attempt > 1) return <span className={`grid place-items-center bg-ground text-ink-muted ${className}`}><Dumbbell className="h-5 w-5" /></span>;
  return <img src={photoUrl(path, attempt === 1)} alt={alt} loading="lazy" decoding="async" onError={() => setAttempt(attempt + 1)} className={`bg-ground object-cover ${className}`} />;
}

export function ExercisePhotos({ images, name }: { images: string[]; name: string }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {images.slice(0, 2).map((img, i) => (
        <figure key={img} className="overflow-hidden rounded-xl border border-[#d8e2d9]">
          <ExercisePhoto path={img} alt={`${name}, ${i === 0 ? "start" : "finish"} position`} className="aspect-[4/3] w-full" />
          <figcaption className="px-2 py-1 text-[10.5px] text-ink-muted">{i === 0 ? "Start" : "Finish"}</figcaption>
        </figure>
      ))}
    </div>
  );
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function ExerciseSheet({ exercise: e, why, onClose }: { exercise: DbExercise; why?: string[]; onClose: () => void }) {
  return (
    <Sheet title={e.name} onClose={onClose}>
      <div className="grid gap-3 text-sm">
        <ExercisePhotos images={e.images} name={e.name} />
        <p className="text-xs text-ink-muted">{cap(e.level)} · {cap(e.category)} · {cap(e.equipment)} · {e.primaryMuscles.map(cap).join(", ")}</p>
        {why && why.length > 0 && <ul className="grid gap-1 rounded-xl bg-brand-50 p-3 text-xs text-brand-700">{why.map((w) => <li key={w}>{w}</li>)}</ul>}
        <ol className="list-decimal space-y-1.5 pl-5 text-ink-2">{e.instructions.map((s) => <li key={s}>{s}</li>)}</ol>
        <p className="text-[11px] text-ink-muted">Start light, breathe out on the effort and stop if anything hurts. From <a className="font-semibold text-brand-700" href={EXERCISE_DB_CREDIT.url} target="_blank" rel="noopener noreferrer">{EXERCISE_DB_CREDIT.label}</a>.</p>
      </div>
    </Sheet>
  );
}

export { cap };
