import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import appConfig from "./app.config.json";

// The app needs the Supabase project URL and its public (anon/publishable) key.
// Accept the names Vercel and Supabase commonly use, but only these two values
// are ever put into the browser bundle.
const URL_NAMES = ["VITE_SUPABASE_URL", "SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"];
const KEY_NAMES = ["VITE_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"];

function pick(env: Record<string, string>, names: string[]) {
  for (const n of names) if (env[n]?.trim()) return env[n].trim();
  return "";
}

/** Refuse to build if a secret key was put where the public key belongs. */
function assertPublicKey(key: string) {
  if (!key) return;
  if (key.startsWith("sb_secret_")) throw new Error("SUPABASE_ANON_KEY holds a secret key (sb_secret_…). Use the publishable/anon key instead.");
  const parts = key.split(".");
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
      if (payload.role === "service_role") throw new Error("SUPABASE_ANON_KEY holds the service_role key. Use the anon/publishable key instead.");
    } catch (e) {
      if (e instanceof Error && e.message.includes("service_role")) throw e;
    }
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const url = pick(env, URL_NAMES);
  const key = pick(env, KEY_NAMES);
  assertPublicKey(key);
  return {
    plugins: [react()],
    resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
    server: { port: 8080 },
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(url),
      "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(key),
      // Native builds: deep links back into the app use the app ID as URL scheme.
      "import.meta.env.VITE_APP_ID": JSON.stringify(appConfig.appId),
      "import.meta.env.VITE_APP_NAME": JSON.stringify(env.VITE_APP_NAME || appConfig.appName),
    },
  };
});
