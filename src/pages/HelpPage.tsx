import { Link } from "react-router-dom";
import { LifeBuoy, Trash2 } from "lucide-react";

// Public support page. The app stores require a support URL and (Google Play)
// a web page explaining how to delete an account without the app installed.
const EMAIL = (import.meta.env.VITE_SUPPORT_EMAIL as string | undefined) || "[support email]";
const APP = (import.meta.env.VITE_APP_NAME as string | undefined) || "the app";

export default function HelpPage() {
  return (
    <article className="mx-auto grid max-w-2xl gap-5 pb-10 text-[15px] leading-relaxed text-ink-2">
      <h1 className="text-[28px] font-extrabold text-ink">Help &amp; support</h1>

      <section className="card grid gap-2 p-5" id="support">
        <h2 className="flex items-center gap-2 text-lg font-bold text-ink"><LifeBuoy className="h-5 w-5 text-brand-700" /> Contact us</h2>
        <p>Email <b className="select-all text-ink">{EMAIL}</b>. We reply within two business days.</p>
        <p>Common questions:</p>
        <ul className="ml-5 list-disc space-y-1">
          <li><b>Forgot your password?</b> On the sign-in screen, tap “Forgot password?” and follow the email link.</li>
          <li><b>Change your calorie or weight goals?</b> Profile → Goals → Edit, or Recalculate.</li>
          <li><b>Switch between lb and kg?</b> Profile → Units.</li>
          <li><b>Reminders not arriving?</b> Allow notifications for {APP} in your phone's Settings, then turn reminders on in Profile.</li>
        </ul>
      </section>

      <section className="card grid gap-2 p-5" id="delete-account">
        <h2 className="flex items-center gap-2 text-lg font-bold text-ink"><Trash2 className="h-5 w-5 text-rose-600" /> Delete your account and data</h2>
        <p><b>In the app:</b> Profile → Your data → <b>Delete my account</b>, type DELETE and confirm. Deletion is immediate.</p>
        <p><b>Without the app:</b> email <b className="select-all text-ink">{EMAIL}</b> from the address you signed up with, with the subject “Delete my account”. We delete it within 7 days and confirm by email.</p>
        <p><b>What is deleted:</b> your account and sign-in details, profile and goals, food log, water, weigh-ins, and any questions you sent to providers.</p>
        <p><b>What is kept:</b> anonymous daily click counts on marketplace listings, which never contain personal information. If you also ran a vendor account, your published business listings stay up without your personal details until removed by our team.</p>
      </section>

      <p className="text-sm">See also our <Link className="font-semibold text-brand-700" to="/privacy">Privacy Policy</Link> and <Link className="font-semibold text-brand-700" to="/terms">Terms of Use</Link>.</p>
    </article>
  );
}
