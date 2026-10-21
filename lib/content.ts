// Answers the content pages (About, Contact, FAQ, Delivery, Returns, Terms, Privacy) are
// waiting on from the client. Each one is marked CLIENT TO CONFIRM — change the
// value here and every page that uses it updates. Customers never see brackets:
// unconfirmed values below are sensible defaults, and `null` hides the line.
// lib/site.ts reads the WhatsApp number and email from here (env can override).

export const content = {
  /** Client confirmed. The shop's WhatsApp — shown on Contact, the green button and "order on WhatsApp" links. */
  whatsapp: "+86 19835265530",

  /** Client confirmed. Support email. */
  email: "Ntemtemdeals@gmail.com",

  /** Social links stay off until the client opens the accounts (lib/site.ts, from env). */

  /** Client confirmed: say we're the team behind Osika Express. */
  mentionOsika: true,

  /** CLIENT TO CONFIRM: phone number for calls, e.g. "024 123 4567". */
  phone: null as string | null,

  /** CLIENT TO CONFIRM: opening hours, e.g. "Mon–Sat, 8am–7pm". */
  hours: null as string | null,

  /** CLIENT TO CONFIRM: how soon after delivery a problem must be reported. */
  claimWindow: "48 hours",

  /** CLIENT TO CONFIRM: how long an approved refund takes to arrive. */
  refundTime: "5–10 working days",

  /** CLIENT TO CONFIRM: registered business name/number for the Terms, if any. */
  registration: null as string | null,

  /** Set when the Terms are published or changed. */
  termsUpdated: "21 October 2026",

  /**
   * Business name — the "data controller" on the Privacy Policy. Client: "Ntemtem
   * Deals" for now; update if the business is registered under another name.
   */
  legalName: "Ntemtem Deals" as string | null,

  /** CLIENT TO CONFIRM: business address for the Privacy Policy, e.g. "Oxford Street, Osu, Accra". */
  address: null as string | null,

  /** CLIENT TO CONFIRM: how long order records are kept (legal/tax). */
  recordsKept: "up to 6 years",

  /** CLIENT TO CONFIRM if analytics are ever added — then also add a consent notice. */
  usesAnalytics: false,

  /** Set when the Privacy Policy is published or changed. */
  privacyUpdated: "21 October 2026",
} as const;

/**
 * The delivery promise (client confirmed): 10–12 days is the total, to Accra —
 * no separate local-delivery leg on top.
 */
export function deliveryTimeSentence() {
  return "Your order arrives in Accra around 10–12 days after you pay. That's the whole wait — there's no extra local-delivery time on top.";
}
