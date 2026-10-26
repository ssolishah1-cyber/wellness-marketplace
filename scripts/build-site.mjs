// Builds the Vercel site:
//   /      the approval mockup (deploy/index.html)
//   /demo  the one-file Market demo (deploy/demo)
//   /app   the full app (Vite build). Runs in demo mode unless
//          VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in Vercel.
import { execSync } from "child_process";
import { cpSync, rmSync } from "fs";
import path from "path";

const root = path.resolve(import.meta.dirname, "..");
const out = path.join(root, "dist-site");
rmSync(out, { recursive: true, force: true });
execSync("npx tsc -b", { cwd: root, stdio: "inherit" });
execSync(`npx vite build --base=/app/ --outDir ${path.join(out, "app")} --emptyOutDir`, { cwd: root, stdio: "inherit" });
cpSync(path.join(root, "deploy"), out, { recursive: true, filter: (src) => !src.endsWith("vercel.json") && !src.endsWith("README.md") });
console.log("Site ready in dist-site/");
