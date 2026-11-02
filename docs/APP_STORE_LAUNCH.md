# Launching in the App Store and Google Play

The iPhone and Android apps are in `ios/` and `android/` (Capacitor). They run the same
app code as the website, with phone features added: daily reminders, haptics, launch
screen, Android back button, share sheet, and sign-in links that open the app.

## 1. App name and permanent app ID (done)

`app.config.json`: **Fitologika**, app ID **`com.fitologika.app`**, publisher **POWERVATE LLC**.
The app ID **can never change after the first upload**. To change anything before then, edit the
file and run `npm run native:sync`.

## 2. Accounts you need

| Account | Cost | Notes |
|---|---|---|
| Apple Developer Program (Organization) | $99 / year | Needs a D-U-N-S number for your company (free, 1–2 weeks). https://developer.apple.com/programs/enroll/ |
| Google Play Console (Organization) | $25 once | Organization accounts skip the 12-tester / 14-day closed test that personal accounts require. https://play.google.com/console/signup |
| D-U-N-S number | Free | https://www.dnb.com/duns/get-a-duns.html |
| Codemagic (cloud builds; no Mac needed) | Free tier | https://codemagic.io, sign in with GitHub, add this repo |

## 3. Supabase settings for the phone app

- Authentication → URL Configuration → Redirect URLs: add `com.fitologika.app://**`
  (the app ID). Sign-up confirmation and password-reset emails then open the app.
- Supabase Pro plan so the project never pauses, plus custom SMTP for sign-up emails.

## 4. Codemagic setup (once)

1. Add the repo. Codemagic reads `codemagic.yaml`.
2. Environment group `supabase`: `SUPABASE_URL`, `SUPABASE_ANON_KEY` (the public key).
3. Android: Code signing → generate an upload keystore named `upload_keystore`
   (Codemagic keeps it; back it up). Google Play → create a service account with
   release permissions, add its JSON as `GCLOUD_SERVICE_ACCOUNT_CREDENTIALS` in group `google_play`.
4. iOS: Integrations → App Store Connect API key named `app_store_connect`.
   Codemagic creates the signing certificate and profile automatically.
5. Create the app record first in App Store Connect and Play Console with the same app ID.
6. Run `android-release` (→ Play internal testing) and `ios-release` (→ TestFlight).
7. When subscriptions are ready, add `VITE_REVENUECAT_IOS_KEY` and `VITE_REVENUECAT_ANDROID_KEY`
   (RevenueCat's public SDK keys) to the `supabase` group and run a new build.

## 4b. Subscriptions (Starter / Visionary / Max)

Plans, prices and product IDs live in `src/lib/plans.ts`. Payments stay **off** until you switch
them on in Admin → Subscriptions, so the first version can go to review while this is set up.

1. **App Store Connect → Business:** sign the *Paid Applications* agreement and add bank and tax
   details (POWERVATE LLC). Nothing can be sold until Apple approves this (usually 1–3 days).
2. **App Store Connect → the app → Subscriptions:** create one subscription group "Fitologika"
   and these 16 auto-renewable products (Reference name = product ID):

   | Plan | 1 month | 3 months | 6 months | 12 months |
   |---|---|---|---|---|
   | Starter · Nutrition | `fitologika_starter_nutrition_1m` $9.99 | `…_3m` $23.99 | `…_6m` $35.99 | `…_12m` $59.99 |
   | Starter · Fitness | `fitologika_starter_fitness_1m` $9.99 | `…_3m` $23.99 | `…_6m` $35.99 | `…_12m` $59.99 |
   | Visionary | `fitologika_visionary_1m` $19.99 | `…_3m` $47.99 | `…_6m` $71.99 | `…_12m` $119.99 |
   | Max | `fitologika_max_1m` $29.99 | `…_3m` $71.99 | `…_6m` $107.99 | `…_12m` $179.99 |

   Rank them in the group with Max highest. On each, add an **Introductory Offer: Free, 1 week**.
3. **RevenueCat** (free to start, https://app.revenuecat.com): create a project, add the iOS app
   (bundle ID `com.fitologika.app`) with an App Store Connect API key, import the products, and
   create three **entitlements**: `nutrition`, `fitness`, `education`. Attach products:
   Starter Nutrition → nutrition; Starter Fitness → fitness; Visionary → nutrition + fitness;
   Max → all three. Copy the **public iOS SDK key** into Codemagic as `VITE_REVENUECAT_IOS_KEY`.
4. **Webhook:** deploy `supabase/functions/revenuecat-webhook` (`--no-verify-jwt`), set the secret
   `REVENUECAT_WEBHOOK_SECRET`, and in RevenueCat → Integrations → Webhooks use
   `https://jtcyamvlxwotatgcrozj.supabase.co/functions/v1/revenuecat-webhook` with the header
   `Authorization: Bearer <that secret>`.
5. Build, test a purchase with a **Sandbox tester** (App Store Connect → Users and Access → Sandbox),
   then switch payments on in Admin → Subscriptions.
6. Google Play: same products as subscriptions with base plans once the Play account exists.

The free physical book for Max is shipped by you: requests appear in Admin → Subscriptions.

## 5. Store listing text (draft)

**Name:** Fitologika
**Subtitle (iOS, 30 chars):** Nutrition tracker & wellness
**Short description (Google, 80 chars):** Track meals, water and weight, and discover reviewed wellness partners.

**Description:**
Fitologika makes healthy eating and staying active simple.

• Log meals in seconds with quick picks or your own foods
• See calories, protein, carbs and fat against your personal targets
• Get daily tips based only on what you've logged, with no sponsored advice
• Tailored guidance for blood sugar, blood pressure, IBS, focus, and stress & sleep
• Meal ideas that fit your food preferences and allergies, logged in one tap
• A weekly workout plan for home or gym, matched to your level and goals
• Track water with a tap and keep your streak going
• Follow your weight trend and progress toward your goal
• Gentle reminders to log meals and drink water
• Explore a Market of reviewed wellness partners, from telehealth to coaching and fitness

Your health data stays in your account, is visible only to you and our care team, and is never used for ads or to choose or rank anything in the Market. Download or delete your data at any time.

Fitologika provides general wellness information and is not medical advice.

**Keywords (iOS):** nutrition,calorie,macro,meal,diet,workout,diabetes,blood pressure,IBS,weight,tracker
**Category:** Health & Fitness
**Age rating:** 17+ / Mature (contains links to telehealth services) — or 12+ if Apple's questionnaire allows; app requires 18+ at sign-up.
**Support URL:** https://<your-site>/app/support
**Privacy Policy URL:** https://<your-site>/app/privacy
**Account deletion URL (Google):** https://<your-site>/app/delete-account

## 6. Privacy answers

**Apple App Privacy ("nutrition label")** — Data linked to the user, used for App Functionality only, not used for tracking:
- Contact Info: Email address; Name (only if entered, and when sending a provider a question)
- Health & Fitness: Health (weight; optional health focus such as diabetes, blood pressure or IBS, saved only with consent), Fitness (nutrition, water and workout logs)
- User Content: Other user content (questions sent to providers)
- Identifiers: User ID
Not collected: location, contacts, browsing history, advertising data. No tracking.

**Google Data safety:**
- Collected: Email address, Name, User IDs; Health info; Fitness info; Messages (provider questions)
- Purpose: App functionality, Account management. Not shared with third parties (hosting providers process on our behalf). Not used for ads.
- Encrypted in transit: Yes. Users can request deletion: Yes (in app and at the deletion URL).

**In-app purchases:** auto-renewable subscriptions (see 4b). The plans screen shows price, period,
free-trial length, auto-renewal terms and links to the Terms and Privacy Policy, and has
"Restore purchases", all required by Apple (guideline 3.1.2).

**Health app notes for review:** The app is a wellness tracker; it does not diagnose or treat. Condition guides (blood sugar, blood pressure, IBS, focus, stress & sleep) are general education with cited public-health sources and a "not medical advice" notice; the optional health focus is stored only after explicit in-app consent, can be removed at any time, and is never used for ads or the Market. Authorised care-team staff can view client records to support them (disclosed at sign-up and in the Privacy Policy; every view is logged). Market ads are labelled Sponsored and are placed by position and category only. Workouts are general fitness plans with a "check with your doctor" notice. Telehealth listings link to licensed third-party providers (TriggerMD), are labelled Sponsored/Affiliated, and are never targeted using health data.

## 7. Review notes and demo account

Create a reviewer account (e.g. `appreview@yourcompany.com`), finish the setup screen,
log a few meals, and give the email/password in App Review Information. Add:
"Sign in with the demo account. Marketplace listings link to partner websites; no purchases happen in the app. Health-focus guidance and workouts are general education with sources and 'not medical advice' notices; the optional health focus is saved only after consent. Exercise photos come from the public-domain Free Exercise DB. Sign-in is email and password only, so Sign in with Apple is not required."

## 8. Screenshots

Needed: iPhone 6.9" (1320 × 2868) and Android phone. Suggested screens: Home (For you + today's workout), a condition guide, Workouts, Exercise library, Meals, Progress, Market.

## 9. Before submitting

- [ ] App ID decided and applied (`npm run native:sync`)
- [ ] Supabase: Pro plan, custom SMTP, redirect URL for the app scheme
- [ ] Privacy Policy and Terms approved by a lawyer (`VITE_LEGAL_APPROVED=true`), support email set
- [ ] Real TriggerMD/XIMMD content and at least a few published listings
- [ ] Tested on a real iPhone (TestFlight) and Android phone (internal testing)
- [ ] Supabase migrations 001–008 run (`supabase/setup_all.sql` for a new project)
- [x] Publisher: **POWERVATE LLC** (`companyName` in `app.config.json`, shown in the Privacy Policy and Terms)
- [ ] App name trademark check (https://tmsearch.uspto.gov) if renaming, e.g. to Fitologika
- [ ] Every "Learn more" source link in the condition guides opened once
- [ ] Google Play: Health apps declaration completed (Policy → App content) and Data safety matches section 6
- [ ] Google Play (new personal accounts only): 12 testers for 14 days before production. Organization accounts skip this.
