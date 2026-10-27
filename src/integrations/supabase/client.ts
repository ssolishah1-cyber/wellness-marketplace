import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const native = Capacitor.isNativePlatform();

// On phones, keep the session in the app's own storage and use the PKCE flow,
// so sign-in links that open the app are exchanged for a session in-app.
const nativeStorage = {
  getItem: async (k: string) => (await Preferences.get({ key: k })).value,
  setItem: async (k: string, v: string) => { await Preferences.set({ key: k, value: v }); },
  removeItem: async (k: string) => { await Preferences.remove({ key: k }); },
};

export const supabase: SupabaseClient | null = url && anonKey
  ? createClient(url, anonKey, native
    ? { auth: { storage: nativeStorage, flowType: "pkce", detectSessionInUrl: false, persistSession: true, autoRefreshToken: true } }
    : undefined)
  : null;

export const isDemoMode = supabase === null;
