import { Capacitor } from "@capacitor/core";
import { ALL_PRODUCT_IDS, productId, type PlanId, type Term } from "./plans";

// In-app purchases through RevenueCat (App Store and Google Play). Only on
// the phone apps, and only once the public SDK keys are set at build time:
//   VITE_REVENUECAT_IOS_KEY, VITE_REVENUECAT_ANDROID_KEY (Codemagic "supabase" group)
// In RevenueCat, create entitlements named nutrition, fitness and education
// and attach each product to the entitlements its plan includes.

const platform = Capacitor.getPlatform();
const KEY = platform === "ios" ? (import.meta.env.VITE_REVENUECAT_IOS_KEY as string | undefined)
  : platform === "android" ? (import.meta.env.VITE_REVENUECAT_ANDROID_KEY as string | undefined) : undefined;

export const purchasesAvailable = Capacitor.isNativePlatform() && !!KEY;

type Rc = typeof import("@revenuecat/purchases-capacitor").Purchases;
let rc: Promise<Rc> | null = null;
let loggedIn: string | null = null;

async function client(userId: string): Promise<Rc> {
  if (!purchasesAvailable) throw new Error("Subscriptions are available in the Fitologika app for iPhone and Android.");
  rc ??= import("@revenuecat/purchases-capacitor").then(async ({ Purchases }) => {
    await Purchases.configure({ apiKey: KEY!, appUserID: userId });
    loggedIn = userId;
    return Purchases;
  });
  const p = await rc;
  if (loggedIn !== userId) { await p.logIn({ appUserID: userId }); loggedIn = userId; }
  return p;
}

const active = (info: { entitlements: { active: Record<string, unknown> } }) => Object.keys(info.entitlements.active);

/** Store prices for every product, keyed by product id (localised, e.g. "$9.99"). */
export async function storePrices(userId: string): Promise<Record<string, string>> {
  const p = await client(userId);
  const { products } = await p.getProducts({ productIdentifiers: ALL_PRODUCT_IDS });
  return Object.fromEntries(products.map((x) => [x.identifier.split(":")[0], x.priceString]));
}

/** Returns the active entitlements after purchase, or null if the person cancelled. */
export async function buy(userId: string, plan: PlanId, months: Term): Promise<string[] | null> {
  const p = await client(userId);
  const id = productId(plan, months);
  const { products } = await p.getProducts({ productIdentifiers: [id] });
  if (!products[0]) throw new Error("This plan isn't available in the store yet.");
  try {
    const { customerInfo } = await p.purchaseStoreProduct({ product: products[0] });
    return active(customerInfo);
  } catch (e) {
    if ((e as { userCancelled?: boolean }).userCancelled) return null;
    throw e;
  }
}

export async function restore(userId: string): Promise<string[]> {
  const p = await client(userId);
  return active((await p.restorePurchases()).customerInfo);
}

export async function storeEntitlements(userId: string): Promise<string[]> {
  if (!purchasesAvailable) return [];
  try { return active((await (await client(userId)).getCustomerInfo()).customerInfo); } catch { return []; }
}

export const manageSubscriptionsUrl = platform === "android"
  ? "https://play.google.com/store/account/subscriptions"
  : "https://apps.apple.com/account/subscriptions";
