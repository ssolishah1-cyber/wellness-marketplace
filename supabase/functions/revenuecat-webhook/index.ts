// Supabase Edge Function: keeps public.subscriptions in step with purchases.
//
// RevenueCat → Project settings → Integrations → Webhooks:
//   URL:    https://<project>.supabase.co/functions/v1/revenuecat-webhook
//   Authorization header value: Bearer <REVENUECAT_WEBHOOK_SECRET>
// Deploy with --no-verify-jwt (RevenueCat doesn't send a Supabase token):
//   supabase functions deploy revenuecat-webhook --no-verify-jwt
//   supabase secrets set REVENUECAT_WEBHOOK_SECRET=<long random string>
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.
//
// The app logs users in to RevenueCat with their Supabase user id, so
// event.app_user_id is the user id. Product ids follow
// fitologika_<plan>_<months>m, e.g. fitologika_max_12m (src/lib/plans.ts).

import { createClient } from "npm:@supabase/supabase-js@2";

const env = (k: string) => Deno.env.get(k) ?? "";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PRODUCT = /^fitologika_(starter_nutrition|starter_fitness|visionary|max)_(1|3|6|12)m$/;

interface RcEvent {
  type: string;
  app_user_id: string;
  original_app_user_id?: string;
  aliases?: string[];
  product_id: string;
  period_type?: "TRIAL" | "INTRO" | "NORMAL" | "PROMOTIONAL";
  expiration_at_ms?: number | null;
  store?: string;
}

const STORE: Record<string, string> = { APP_STORE: "app_store", MAC_APP_STORE: "app_store", PLAY_STORE: "play_store", STRIPE: "stripe" };

function statusFor(e: RcEvent): string | null {
  switch (e.type) {
    case "INITIAL_PURCHASE": case "RENEWAL": case "PRODUCT_CHANGE": case "UNCANCELLATION": case "SUBSCRIPTION_EXTENDED": case "TEMPORARY_ENTITLEMENT_GRANT":
      return e.period_type === "TRIAL" ? "trialing" : "active";
    case "CANCELLATION": return "canceled"; // keeps access until expiration
    case "BILLING_ISSUE": return "past_due";
    case "EXPIRATION": return "expired";
    default: return null; // TEST, TRANSFER, etc.: nothing to store
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const secret = env("REVENUECAT_WEBHOOK_SECRET");
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });

  const { event } = (await req.json()) as { event: RcEvent };
  const status = statusFor(event);
  if (!status) return new Response("ignored", { status: 200 });

  const userId = [event.app_user_id, event.original_app_user_id, ...(event.aliases ?? [])].find((id) => id && UUID.test(id));
  const m = PRODUCT.exec((event.product_id ?? "").split(":")[0]);
  if (!userId || !m) return new Response("unknown user or product", { status: 200 });

  const sb = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
  const { error } = await sb.from("subscriptions").upsert({
    user_id: userId,
    plan: m[1],
    term_months: Number(m[2]),
    status,
    store: STORE[event.store ?? ""] ?? "app_store",
    product_id: event.product_id,
    current_period_end: event.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (error) return new Response(error.message, { status: 500 }); // RevenueCat retries on 5xx
  return new Response("ok", { status: 200 });
});
