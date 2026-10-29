# White-label: duplicating the app for a new client

Each client gets their **own copy**: their own code repository, database, website and store listings. Clients never share data with each other.

Rough effort once a client has their accounts ready: half a day of setup plus store review time.

## What the client provides

- App name, short description and support email
- Logo (1024 × 1024 PNG, no transparency for iOS) and brand colour
- Legal company name (shown in the Privacy Policy, Terms and as the store "seller")
- Their own Apple Developer and Google Play accounts (organization accounts with a D-U-N-S number), or permission to publish under ours
- Their partner brands for the Market (replacing or alongside TriggerMD / XIMMD)
- A lawyer-approved Privacy Policy and Terms, or approval to use ours with their company name

## Steps

1. **Code.** On GitHub, create a new private repository from this one (Use this template, or clone and push). Name it after the client.
2. **Database.** In Supabase, create a new project (Pro plan for production). SQL editor → paste `supabase/setup_all.sql` → Run.
   - Edit the partner brands at the end of `001_marketplace.sql` before running, or change them later in Admin → Brands.
   - Authentication → URL Configuration: Site URL `https://<client-site>/app`, Redirect URLs `https://<client-site>/app/**` and `<client-app-id>://**`.
3. **Branding in code.**
   - `app.config.json`: `appName` and `appId` (for example `com.clientbrand.app`; **permanent** after the first upload).
   - `public/manifest.webmanifest` and `index.html`: name and title.
   - `tailwind.config.js`: the `brand` colour scale.
   - `assets/`: replace the icon and splash images, then run `npx @capacitor/assets generate`.
   - `public/icons/`: web app icons.
   - Run `npm run native:sync`.
4. **Website.** In Vercel, import the new repository. Add environment variables:
   - `SUPABASE_URL` and `SUPABASE_ANON_KEY` (the client project's public values)
   - `VITE_COMPANY_NAME`, `VITE_SUPPORT_EMAIL`, and `VITE_LEGAL_APPROVED=true` once approved
5. **Phone apps.** In Codemagic, add the repository, create the `supabase` environment group with the same two values plus `VITE_COMPANY_NAME` and `VITE_SUPPORT_EMAIL`, and add the client's signing keys. Follow `docs/APP_STORE_LAUNCH.md`.
6. **Admin.** Sign up on the new site, then make that account admin in the Supabase SQL editor (the first admin only; later ones from Admin → Users & roles):
   ```sql
   insert into public.user_roles (user_id, role)
   select id, 'admin' from auth.users where email = 'owner@client.com';
   ```
7. **Check before handing over:** sign up, complete setup, log a meal, mark a workout done, open the Market, open the admin panel, download and delete a test account.

## Keep copies up to date

Fixes made in the main repository can be pulled into a client copy with `git remote add upstream <main repo>` and `git pull upstream main`. Database changes are new numbered files in `supabase/migrations/`: run only the new ones on each client project.
