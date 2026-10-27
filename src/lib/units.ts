import { useSyncExternalStore } from "react";

// Weights are always stored in kg and heights in cm; this only changes what
// people see and type. US units are the default.
export type UnitSystem = "imperial" | "metric";
const KEY = "unit-system";
const listeners = new Set<() => void>();

function read(): UnitSystem {
  try { return localStorage.getItem(KEY) === "metric" ? "metric" : "imperial"; } catch { return "imperial"; }
}
let current: UnitSystem = read();

export function setUnits(u: UnitSystem) {
  current = u;
  try { localStorage.setItem(KEY, u); } catch { /* storage unavailable */ }
  listeners.forEach((l) => l());
}
export function useUnits(): UnitSystem {
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, () => current, () => current);
}

const LB_PER_KG = 2.2046226218;
const round1 = (n: number) => Math.round(n * 10) / 10;

/** kg → number in the user's unit (1 decimal). */
export const toDisplayWeight = (kg: number, u: UnitSystem) => round1(u === "imperial" ? kg * LB_PER_KG : kg);
/** number typed in the user's unit → kg (stored with 1 decimal, matching the database). */
export const fromDisplayWeight = (v: number, u: UnitSystem) => round1(u === "imperial" ? v / LB_PER_KG : v);
export const weightUnit = (u: UnitSystem) => (u === "imperial" ? "lb" : "kg");
export const formatWeight = (kg: number, u: UnitSystem) => `${toDisplayWeight(kg, u)} ${weightUnit(u)}`;
/** Valid input range for a body weight in the user's unit. */
export const weightRange = (u: UnitSystem) => (u === "imperial" ? { min: 55, max: 880 } : { min: 25, max: 400 });

export const ftInToCm = (ft: number, inches: number) => Math.round((ft * 12 + inches) * 2.54);
export const cmToFtIn = (cm: number) => { const total = Math.round(cm / 2.54); return { ft: Math.floor(total / 12), in: total % 12 }; };
