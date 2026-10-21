import { NextResponse, type NextRequest } from "next/server";
import { isValidWebhookSignature, settleTransaction, verifyTransaction } from "@/lib/paystack";

/**
 * Paystack → us, server to server. Settles payments even if the customer closes
 * the browser before coming back. Only signed requests are accepted, and the
 * transaction is re-verified with Paystack before anything changes.
 */
export async function POST(request: NextRequest) {
  const raw = await request.text();
  if (!isValidWebhookSignature(raw, request.headers.get("x-paystack-signature"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  let event: { event?: string; data?: { reference?: string } };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Bad payload" }, { status: 400 });
  }

  const reference = event.data?.reference;
  if ((event.event === "charge.success" || event.event === "charge.failed") && reference) {
    try {
      const result = await settleTransaction(await verifyTransaction(reference));
      if (result.outcome === "unknown-reference") console.warn("Paystack webhook for an unknown reference", reference);
    } catch (error) {
      // 500 makes Paystack retry later
      console.error("payments/webhook failed", error);
      return NextResponse.json({ error: "Try again" }, { status: 500 });
    }
  }
  return NextResponse.json({ received: true });
}
