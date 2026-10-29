# Handover: source code, accounts and access

For Dr. Ben Israel (owner). Soli keeps access as a team member only.

## 1. What exists and where

| Piece | Where | Owner after handover |
|---|---|---|
| Source code | GitHub `ssolishah1-cyber/wellness-marketplace` | Dr. Ben's GitHub account or organization |
| Website + web app | Vercel team `wellness-jumpstart`, project `wellness-marketplace`, live at https://wellness-marketplace-wellness-jumpstart.vercel.app/app | Dr. Ben (Owner) |
| Database, sign-in, image storage | Supabase organization **POWERVATE LLC** (Pro), project `wellness-jumpstart` (`jtcyamvlxwotatgcrozj`, US East) | Dr. Ben (Owner) |
| iPhone and Android builds | Codemagic (to be set up, see `docs/APP_STORE_LAUNCH.md`) | Dr. Ben (Owner) |
| App Store and Google Play listings | Apple Developer and Google Play Console accounts under the publishing company | Dr. Ben (Account Holder) |
| Exercise library | Open-source Free Exercise DB, public domain, copied into the app (`public/exercises.json`) | No account needed |

## 2. Transfer ownership (do these in order)

Use invitations, never shared passwords. Each step takes a few minutes.

1. **GitHub.** Soli: repository → Settings → General → Danger Zone → **Transfer ownership** → Dr. Ben's username or organization. Dr. Ben then adds Soli under Settings → Collaborators with the **Write** role.
2. **Vercel.** Soli: Team Settings → Members → invite Dr. Ben as **Owner**. After he accepts, Dr. Ben changes Soli to **Member**. Reconnect the Git repository under Project → Settings → Git if Vercel asks after the GitHub transfer.
3. **Supabase.** Organization POWERVATE LLC → Team → invite Dr. Ben as **Owner** (if he isn't already). Dr. Ben changes Soli to **Developer**. Billing stays with the organization.
4. **Codemagic.** Create the team under Dr. Ben's account and invite Soli as **Developer**.
5. **Apple.** App Store Connect → Users and Access → add Soli as **App Manager** (no Account Holder or Admin rights).
6. **Google Play.** Play Console → Users and permissions → invite Soli with app-level permissions (release management, store listing). Dr. Ben stays the account owner.

## 3. Secrets and keys

- The app only contains the **public** Supabase URL and publishable key. The build stops if a secret key is put there.
- Secret keys live only in Supabase, Vercel environment variables and Codemagic environment groups. They are never sent by chat or email.
- After the transfer, Dr. Ben can rotate keys in Supabase → Project Settings → API Keys, then update `SUPABASE_ANON_KEY` in Vercel and the `supabase` group in Codemagic, and redeploy.
- Signing keys for Android (keystore) and Apple certificates are created in Codemagic and owned by the Codemagic team. Keep a backup of the Android keystore: the same key is needed for every future update.

## 4. How the system fits together

```
Phone app (Capacitor: iPhone + Android)  ┐
Web app (/app on Vercel)                 ├─► Supabase: sign-in, Postgres with row-level security, image storage
                                         ┘
Exercise library and photos ─► Free Exercise DB (public domain, pinned version)
Market listings ─► partner websites (TriggerMD, XIMMD, approved vendors) with utm tags, never personal data
```

- **Privacy model:** each person's meals, water, weight, workouts and health focus are readable by that person (database row-level security) and by **admins**, who open a client's record from Admin → Clients & roles. Every admin view is written to the activity log. Reviewers (Market only) can't see client data. Users agree to care-team access at sign-up, and the Privacy Policy explains it. Health data is never used for ads or Market ranking.
- **Market rules** are enforced in the database: only approved listings are public, vendors can't approve themselves, every status change is logged.
- **Admin panel** (`/admin`): overview totals, users and roles (with a log of role changes), review queue, listings, vendors, brands, Market analytics.

## 5. Documentation index

| File | What it covers |
|---|---|
| `README.md` | Features, running locally, tests, how the rules are enforced |
| `docs/APP_STORE_LAUNCH.md` | Store accounts, Codemagic builds, listing text, privacy answers, review notes, final checklist |
| `docs/ADMIN_GUIDE.md` | Using the admin panel: clients, listings, brands, categories, ads, roles |
| `docs/EXTENDING.md` | How to add features without breaking anything |
| `docs/WHITE_LABEL.md` | Duplicating the app for another client |
| `docs/WALKTHROUGH_VIDEO.md` | Outline for the infrastructure walkthrough video |
| `supabase/migrations/001…008` | Database, in order (`supabase/setup_all.sql` = all of them in one paste) |
| `Wellness-Marketplace-Blueprint.pdf` | Original 4-week plan |

## 6. Routine tasks

- **Make someone an admin or reviewer:** Admin panel → Users & roles.
- **Approve a business or listing:** Admin panel → Review queue / Vendors.
- **Edit TriggerMD or XIMMD details:** Admin panel → Brands.
- **Release an app update:** push to `main`, then start the `ios-release` and `android-release` workflows in Codemagic.
- **Refresh the exercise library:** update the commit in `scripts/fetch-exercises.mjs` and `src/lib/exerciseDb.ts`, run `node scripts/fetch-exercises.mjs`, commit.
