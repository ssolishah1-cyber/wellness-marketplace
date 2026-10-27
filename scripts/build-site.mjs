// Builds the Vercel site:
//   /app           the app (Vite build). "/" redirects here (vercel.json).
//   /preview       the approval mockup (deploy/index.html), not indexed
//   /preview/demo  the one-file Market demo (deploy/demo)
// The app runs in demo mode unless the Supabase URL and public key are set.
import { execSync } from "child_process";
import { cpSync, rmSync } from "fs";
import path from "path";

const root = path.resolve(import.meta.dirname, "..");
const out = path.join(root, "dist-site");
rmSync(out, { recursive: true, force: true });
execSync("npx tsc -b", { cwd: root, stdio: "inherit" });
execSync(`npx vite build --base=/app/ --outDir ${path.join(out, "app")} --emptyOutDir`, { cwd: root, stdio: "inherit" });
cpSync(path.join(root, "deploy"), path.join(out, "preview"), { recursive: true, filter: (src) => !src.endsWith("vercel.json") && !src.endsWith("README.md") });
console.log("Site ready in dist-site/");
