// Answers the content pages (About, Contact, FAQ, Delivery, Returns, Terms) are
// waiting on from the client. Each one is marked CLIENT TO CONFIRM — change the
// value here and every page that uses it updates. Customers never see brackets:
// unconfirmed values below are sensible defaults, and `null` hides the line.
// Contact details (WhatsApp, email, socials) live in lib/site.ts, from env.

export const content = {
  /**
   * CLIENT TO CONFIRM: is 10-12 days to the customer's door (true), or to Ghana
   * with local delivery on top (false)? The pages use the careful wording until
   * he answers.
   */
  doorToDoor: false,

  /** CLIENT TO CONFIRM: may we say we're the team behind Osika Express? */
  mentionOsika: false,

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
} as const;

/** The delivery promise in a sentence, worded for whichever answer the client gives. */
export function deliveryTimeSentence() {
  return content.doorToDoor
    ? "Your order arrives at your door in around 10–12 days."
    : "Your item takes around 10–12 days to reach Ghana, followed by a short local delivery to your city.";
}
