# Infrastructure walkthrough video: outline

For Soli to record and Dr. Ben to share with the TriggerMD provider network before the API integration. Aim for 12–15 minutes. Record the screen with voice-over; keep personal data out of shot (use test accounts only).

Fill in the parts marked **[fill in]** with the actual CRM and clinic workflow. This outline only knows the app side.

## 1. Introduction (1 min)
- Who we are, what the provider network will connect to, and what this video covers.
- One sentence on privacy: health data stays with the patient's account and is only shared when the patient chooses to contact a provider.

## 2. The patient journey, end to end (3 min)
Show one test patient going through each step:
1. Finds us: website / ads / referral **[fill in]**.
2. Signs up in the app, completes setup (goals, health focus with consent, food preferences, fitness).
3. Uses daily features: meal log, condition guidance, workouts.
4. Opens the Market → TriggerMD (labelled Sponsored/Affiliated) → taps through to TriggerMD or sends a question.
5. Lead/booking lands in the CRM **[fill in: which pipeline, which stage]**.
6. Provider consult happens on TriggerMD **[fill in]**.
7. Follow-up back to the patient **[fill in: email/SMS automations]**.

## 3. The CRM (4 min) **[fill in]**
- Pipelines and stages, and what moves a patient from one stage to the next.
- Automations: confirmations, reminders, no-show follow-ups.
- Who on the team sees what (roles), and where consent is recorded.
- Reporting: what the provider network will see.

## 4. Data flow and transitions (3 min)
- App → Market click: only anonymous daily click totals are stored; partner links carry utm tags, never names or health data.
- App → question to a provider: the patient types their own name, email and message and ticks consent; it goes to the provider's inbox **[fill in: and/or CRM]**.
- CRM ↔ TriggerMD: what is passed today and what the API integration will add **[fill in]**.
- Where each piece of data is stored (Supabase for the app, CRM, TriggerMD) and who owns it.

## 5. Admin and quality control (2 min)
- Admin panel: totals, users and roles, review queue for new listings and businesses.
- Every listing change is reviewed; every status change is logged.

## 6. What we need from the provider network (1 min)
- API documentation and sandbox credentials.
- Licensing coverage by state.
- Their requirements for consent, data handling and reporting.

## Before recording
- [ ] Test accounts only; no real patient names, emails or health data on screen
- [ ] Close other tabs and notifications
- [ ] Demo data ready in the CRM **[fill in]**
