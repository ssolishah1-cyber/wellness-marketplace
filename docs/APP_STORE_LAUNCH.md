# Launching in the App Store and Google Play

The iPhone and Android apps are in `ios/` and `android/` (Capacitor). They run the same
app code as the website, with phone features added: daily reminders, haptics, launch
screen, Android back button, share sheet, and sign-in links that open the app.

## 1. Decide the permanent app ID (do this first)

Edit `app.config.json`:

```json
{ "appName": "Wellness Jumpstart", "appId": "com.yourcompany.app" }
```

`appId` is your website domain written backwards plus an app name, and it **can never change
after the first upload**. Then run `npm run native:sync` to apply it everywhere.

## 2. Accounts you need

| Account | Cost | Notes |
|---|---|---|
| Apple Developer Program (Organization) | $99 / year | Needs a D-U-N-S number for your company (free, 1–2 weeks). https://developer.apple.com/programs/enroll/ |
| Google Play Console (Organization) | $25 once | Organization accounts skip the 12-tester / 14-day closed test that personal accounts require. https://play.google.com/console/signup |
| D-U-N-S number | Free | https://www.dnb.com/duns/get-a-duns.html |
| Codemagic (cloud builds; no Mac needed) | Free tier | https://codemagic.io, sign in with GitHub, add this repo |

## 3. Supabase settings for the phone app

- Authentication → URL Configuration → Redirect URLs: add `com.yourcompany.app://**`
  (your app ID). Sign-up confirmation and password-reset emails then open the app.
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

## 5. Store listing text (draft)

**Name:** Wellness Jumpstart
**Subtitle (iOS, 30 chars):** Nutrition tracker & wellness
**Short description (Google, 80 chars):** Track meals, water and weight, and discover reviewed wellness partners.

**Description:**
Wellness Jumpstart makes healthy eating simple.

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

Your health data is private to your account and is never used to choose or rank anything in the Market. Download or delete your data at any time.

Wellness Jumpstart provides general wellness information and is not medical advice.

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

**Health app notes for review:** The app is a wellness tracker; it does not diagnose or treat. Condition guides (blood sugar, blood pressure, IBS, focus, stress & sleep) are general education with cited public-health sources and a "not medical advice" notice; the optional health focus is stored only after explicit in-app consent, can be removed at any time, and is never used for ads or the Market. Workouts are general fitness plans with a "check with your doctor" notice. Telehealth listings link to licensed third-party providers (TriggerMD), are labelled Sponsored/Affiliated, and are never targeted using health data.

## 7. Review notes and demo account

Create a reviewer account (e.g. `appreview@yourcompany.com`), finish the setup screen,
log a few meals, and give the email/password in App Review Information. Add:
"Sign in with the demo account. Marketplace listings link to partner websites; no purchases happen in the app."

## 8. Screenshots

Needed: iPhone 6.9" (1320 × 2868) and Android phone. Suggested screens: Home, Meals, Progress, Market, a brand page, Profile/Reminders.

## 9. Before submitting

- [ ] App ID decided and applied (`npm run native:sync`)
- [ ] Supabase: Pro plan, custom SMTP, redirect URL for the app scheme
- [ ] Privacy Policy and Terms approved by a lawyer (`VITE_LEGAL_APPROVED=true`), support email set
- [ ] Real TriggerMD/XIMMD content and at least a few published listings
- [ ] Tested on a real iPhone (TestFlight) and Android phone (internal testing)
