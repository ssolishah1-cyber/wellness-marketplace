// Supabase Edge Function: emails the business when a user sends an inquiry.
//
// Trigger: Database Webhook on INSERT into public.marketplace_inquiries
//   (Dashboard → Database → Webhooks → type "Supabase Edge Functions",
//    add HTTP header  x-webhook-secret: <INQUIRY_WEBHOOK_SECRET>).
//
// Secrets (supabase secrets set ...):
//   RESEND_API_KEY          API key from resend.com
//   INQUIRY_FROM_EMAIL      verified sender, e.g. "Marketplace <market@yourdomain.com>"
//   MARKETPLACE_ADMIN_EMAIL receives inquiries for owned brands / listings without a vendor
//   INQUIRY_WEBHOOK_SECRET  shared secret checked on every call
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.

import { createClient } from "npm:@supabase/supabase-js@2";

interface InquiryRecord {
  id: string;
  listing_id: string;
  contact_name: string;
  contact_email: string;
  message: string;
  consent_to_share: boolean;
}

const env = (k: string) => Deno.env.get(k) ?? "";

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!env("INQUIRY_WEBHOOK_SECRET") || req.headers.get("x-webhook-secret") !== env("INQUIRY_WEBHOOK_SECRET")) {
    return new Response("Unauthorized", { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  const inquiry: InquiryRecord | undefined = payload?.record;
  if (payload?.type !== "INSERT" || !inquiry?.id || !inquiry.consent_to_share) {
    return new Response("Ignored", { status: 200 });
  }

  const sb = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
  const { data: listing, error } = await sb
    .from("marketplace_listings")
    .select("title, slug, vendor:marketplace_vendors(business_name, contact_email, status)")
    .eq("id", inquiry.listing_id)
    .single();
  if (error || !listing) return new Response("Listing not found", { status: 404 });

  const vendor = Array.isArray(listing.vendor) ? listing.vendor[0] : listing.vendor;
  const to = vendor?.status === "approved" && vendor.contact_email ? vendor.contact_email : env("MARKETPLACE_ADMIN_EMAIL");
  if (!to) return new Response("No recipient configured", { status: 500 });

  const html = `
    <p>You have a new question about <b>${escapeHtml(listing.title)}</b> from the Wellness Marketplace.</p>
    <p><b>From:</b> ${escapeHtml(inquiry.contact_name)} &lt;${escapeHtml(inquiry.contact_email)}&gt;</p>
    <blockquote style="border-left:3px solid #059669;padding-left:12px;white-space:pre-wrap">${escapeHtml(inquiry.message)}</blockquote>
    <p style="color:#64748b;font-size:12px">The user agreed to share their name, email and message with you. Reply directly to this email.
    Please don't ask for or store health information beyond what is needed to answer.</p>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env("RESEND_API_KEY")}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env("INQUIRY_FROM_EMAIL"),
      to: [to],
      reply_to: inquiry.contact_email,
      subject: `New inquiry: ${listing.title}`,
      html,
    }),
  });
  if (!res.ok) return new Response(`Email failed: ${await res.text()}`, { status: 502 });

  await sb.from("marketplace_inquiries").update({ status: "forwarded" }).eq("id", inquiry.id);
  return new Response("Sent", { status: 200 });
});
