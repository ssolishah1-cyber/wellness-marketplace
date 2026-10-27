import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";

// Plain-language drafts that describe what the app actually does with data.
// Set VITE_COMPANY_NAME, VITE_SUPPORT_EMAIL and, once a lawyer has approved the
// text, VITE_LEGAL_APPROVED=true in Vercel to remove the draft banner.
const COMPANY = (import.meta.env.VITE_COMPANY_NAME as string | undefined) || "[Company name]";
const EMAIL = (import.meta.env.VITE_SUPPORT_EMAIL as string | undefined) || "[support email]";
const APPROVED = import.meta.env.VITE_LEGAL_APPROVED === "true";
const UPDATED = "October 27, 2026";

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="mx-auto grid max-w-2xl gap-4 pb-10 text-[15px] leading-relaxed text-ink-2 [&_h2]:mt-3 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-ink [&_li]:ml-5 [&_li]:list-disc [&_ul]:grid [&_ul]:gap-1.5">
      {!APPROVED && (
        <p className="flex gap-2 rounded-xl bg-citrus-50 p-3 text-sm text-citrus-600">
          <AlertTriangle className="h-4 w-4 shrink-0" /> Draft for legal review. Not yet final.
        </p>
      )}
      <h1 className="text-[28px] font-extrabold text-ink">{title}</h1>
      <p className="text-sm text-ink-muted">Last updated {UPDATED}</p>
      {children}
      <p className="text-sm">Questions? Email <b className="select-all text-ink">{EMAIL}</b>.</p>
    </article>
  );
}

export function PrivacyPage() {
  return (
    <Shell title="Privacy Policy">
      <p>This policy explains what {COMPANY} ("we") collects when you use this nutrition app, why, and the choices you have.</p>

      <h2>What we collect</h2>
      <ul>
        <li><b>Account:</b> your email address and an encrypted password.</li>
        <li><b>Health and nutrition data you enter:</b> food you log, calories and nutrients, water, weigh-ins, and your goals. If you use the setup wizard, the age, height and sex you enter are used once to calculate suggested targets and are not stored.</li>
        <li><b>Health focus (optional):</b> if you choose one, such as blood sugar, blood pressure, IBS, focus or stress &amp; sleep, we store it only after you give consent, and use it only to tailor tips, meal ideas and workouts in the app. Remove it or withdraw consent at any time in Profile.</li>
        <li><b>Preferences and workouts:</b> food preferences and allergies, fitness level, where and how often you work out, and the workouts you mark as done.</li>
        <li><b>Questions you send to providers in the Market:</b> the name, email and message you choose to send, only after you tick the consent box.</li>
        <li><b>Marketplace clicks:</b> a daily count of how often each listing is opened. These counts contain no information about who clicked.</li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To run the app: show your log, progress, goals and coaching tips.</li>
        <li>To keep your account secure and to send account emails such as sign-up confirmation and password resets.</li>
        <li>To deliver a question to a provider when you ask us to.</li>
      </ul>

      <h2>What we never do</h2>
      <ul>
        <li>We never sell your personal or health data.</li>
        <li>We never use your meals, weight, goals, health focus or other health data to choose, rank or target marketplace listings or ads.</li>
        <li>We never share your health data with marketplace partners, including affiliated partners such as TriggerMD and XIMMD.</li>
      </ul>

      <h2>Who can see your data</h2>
      <p>Your health and nutrition data is visible only to you when signed in. It is stored with our hosting providers (Supabase for the database and sign-in, Vercel for the website), who process it on our behalf. A provider you contact sees only the details you chose to send.</p>

      <h2>Sponsored and affiliated listings</h2>
      <p>Some Market listings are sponsored or come from businesses affiliated with us. They are always labelled. Links to partner websites tell the partner the visit came from this app, but never include your name or health data. Purchases and services on partner sites are covered by their own privacy policies.</p>

      <h2>Your choices and rights</h2>
      <ul>
        <li><b>Download your data</b> at any time from Profile.</li>
        <li><b>Delete your account</b> from Profile. This permanently removes your account, food log, water, weight, workouts, goals, health focus and questions you sent.</li>
        <li>Correct your goals and entries in the app at any time.</li>
      </ul>

      <h2>Security</h2>
      <p>Data is encrypted in transit, and database rules ensure each person can only access their own health data. No system is perfectly secure; if a breach affects your data, we will notify you as required by law.</p>

      <h2>Children</h2>
      <p>The app is for adults 18 and over. We do not knowingly collect data from anyone under 18.</p>

      <h2>Not medical advice</h2>
      <p>Coaching tips, condition guides, meal ideas, workouts and suggested targets are general information, not medical advice or treatment. Talk to a qualified clinician about your health.</p>

      <h2>Changes</h2>
      <p>If we make material changes, we will tell you in the app before they take effect.</p>
    </Shell>
  );
}

export function TermsPage() {
  return (
    <Shell title="Terms of Use">
      <p>By creating an account or using this app, you agree to these terms with {COMPANY}.</p>

      <h2>Who can use the app</h2>
      <p>You must be 18 or older and provide accurate account information. Keep your password private; you are responsible for activity on your account.</p>

      <h2>Not medical advice</h2>
      <p>The app helps you track nutrition and progress. Its tips, calculations and targets are general information and are not a substitute for professional medical advice, diagnosis or treatment. If you have a medical condition, are pregnant or breastfeeding, or have a history of disordered eating, consult a clinician before changing your diet. In an emergency, call your local emergency number.</p>

      <h2>The Market</h2>
      <ul>
        <li>Listings are provided by third-party businesses, some of which are sponsored or affiliated with us and are labelled as such.</li>
        <li>We review listings before they appear but do not guarantee any product, service, price or outcome.</li>
        <li>Purchases, bookings and clinical services happen on the provider's own website and are governed by the provider's terms.</li>
        <li>Telehealth services are provided by licensed third parties; a clinician decides whether you are eligible.</li>
      </ul>

      <h2>Businesses listing in the Market</h2>
      <p>Vendors must provide accurate information, hold the licences their services require, and support any health claim with evidence. We may reject, remove or suspend listings or accounts that break these rules.</p>

      <h2>Acceptable use</h2>
      <p>Don't misuse the app: no attempts to access other people's data, disrupt the service, or post unlawful or misleading content.</p>

      <h2>Your content</h2>
      <p>You own the data you enter. You give us permission to store and process it only to provide the app to you, as described in the <Link className="font-semibold text-brand-700" to="/privacy">Privacy Policy</Link>.</p>

      <h2>Ending your account</h2>
      <p>You can delete your account at any time from Profile. We may suspend accounts that break these terms.</p>

      <h2>Liability</h2>
      <p>The app is provided "as is". To the extent the law allows, we are not liable for indirect or consequential losses, or for products and services provided by third parties.</p>

      <h2>Changes</h2>
      <p>We may update these terms. If changes are material, we will tell you in the app before they take effect.</p>
    </Shell>
  );
}
