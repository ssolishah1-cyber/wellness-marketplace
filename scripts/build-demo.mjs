// Builds the shareable demo (sample data, in-memory routing) as one
// self-contained HTML page in demo/wellness-marketplace-demo.html.
import { execSync } from "child_process";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "fs";
import path from "path";

const root = path.resolve(import.meta.dirname, "..");
const out = path.join(root, "dist-demo");
execSync(`npx vite build --outDir ${out} --emptyOutDir`, {
  cwd: root, stdio: "inherit",
  env: {
    ...Object.fromEntries(Object.entries(process.env).filter(([k]) => !/SUPABASE/.test(k))),
    VITE_ROUTER: "memory",
  },
});

const assets = path.join(out, "assets");
const files = readdirSync(assets);
const js = files.filter((f) => f.endsWith(".js")).map((f) => readFileSync(path.join(assets, f), "utf8")).join("\n");
const css = files.filter((f) => f.endsWith(".css")).map((f) => readFileSync(path.join(assets, f), "utf8")).join("\n");

const html = `<title>Wellness Marketplace</title>
<style>:root{color-scheme:light}body{background:#f8fafc}
${css.replace(/<\/style/gi, "<\\/style")}</style>
<div id="root"></div>
<script type="module">${js.replace(/<\/script/gi, "<\\/script")}</script>
`;
mkdirSync(path.join(root, "demo"), { recursive: true });
const file = path.join(root, "demo", "wellness-marketplace-demo.html");
writeFileSync(file, html);
console.log(`Wrote ${file} (${(html.length / 1024).toFixed(0)} KB)`);
