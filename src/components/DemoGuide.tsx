import { useState } from "react";
import { X } from "lucide-react";
import { isDemoMode } from "@/integrations/supabase/client";

const KEY = "market-demo-guide-hidden";

// Shown only in demo mode: a short walkthrough for people previewing the module.
export default function DemoGuide() {
  const [hidden, setHidden] = useState(() => {
    try { return localStorage.getItem(KEY) === "1"; } catch { return false; }
  });
  if (!isDemoMode || hidden) return null;
  const hide = () => {
    setHidden(true);
    try { localStorage.setItem(KEY, "1"); } catch { /* ignore */ }
  };
  return (
    <section className="card relative border-amber-200 bg-amber-50 p-4 text-sm">
      <button onClick={hide} aria-label="Hide guide" className="absolute right-3 top-3 text-amber-800 hover:text-amber-950"><X className="h-4 w-4" /></button>
      <h2 className="mb-1 font-semibold text-amber-950">Try the whole flow in about two minutes</h2>
      <ol className="list-decimal space-y-1 pl-5 text-amber-950">
        <li><b>App user:</b> browse, open TriggerMD or XIMMD, and send a question from a listing.</li>
        <li><b>Vendor</b> (bar at the top): open <i>Vendor portal</i>, create a listing, add an image, and <i>Submit for review</i>.</li>
        <li><b>Visitor:</b> the new listing isn't visible yet.</li>
        <li><b>Admin:</b> open <i>Review console</i>, tick the checklist, and <i>Publish</i>. Also see Vendors, Brands and Analytics.</li>
        <li><b>Vendor</b> again: edit the live listing and it goes back to review automatically.</li>
      </ol>
      <p className="mt-2 text-xs text-amber-900">Sample data only. TriggerMD and XIMMD text is placeholder until verified content is supplied. Changes reset when the page reloads.</p>
    </section>
  );
}
