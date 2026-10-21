import { NextResponse, type NextRequest } from "next/server";
import { orderPath } from "@/lib/checkout";
import { settleTransaction, verifyTransaction } from "@/lib/paystack";
import { prisma } from "@/lib/prisma";

/**
 * Paystack sends the customer back here with ?reference=…. The query string is
 * never trusted: we ask Paystack what happened, then show the order page.
 */
export async function GET(request: NextRequest) {
  const reference = request.nextUrl.searchParams.get("reference") ?? request.nextUrl.searchParams.get("trxref");
  const home = new URL("/", request.url);
  if (!reference || !/^NTD-\d+-[0-9a-f]{8}$/.test(reference)) return NextResponse.redirect(home);

  const payment = await prisma.payment.findUnique({
    where: { reference },
    select: { order: { select: { id: true, orderNumber: true } } },
  });
  if (!payment) return NextResponse.redirect(home);
  const orderUrl = new URL(orderPath(payment.order), request.url);

  try {
    const result = await settleTransaction(await verifyTransaction(reference));
    const flag = result.outcome === "paid" || result.outcome === "already-paid" ? "success" : result.outcome === "pending" ? "pending" : "failed";
    orderUrl.searchParams.set("payment", flag);
  } catch (error) {
    // Couldn't reach Paystack: the webhook will still settle it; tell the customer it's being checked
    console.error("payments/callback verify failed", error);
    orderUrl.searchParams.set("payment", "pending");
  }
  return NextResponse.redirect(orderUrl);
}
