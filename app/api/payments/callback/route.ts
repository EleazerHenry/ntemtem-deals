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

  // The reference names its order (NTD-0012-xxxxxxxx); an older attempt may no longer be the one on file
  const order = await prisma.order.findUnique({
    where: { orderNumber: reference.replace(/-[0-9a-f]{8}$/, "") },
    select: { id: true, orderNumber: true },
  });
  if (!order) return NextResponse.redirect(home);
  const orderUrl = new URL(orderPath(order), request.url);

  try {
    const result = await settleTransaction(await verifyTransaction(reference));
    const flag =
      result.outcome === "paid" || result.outcome === "already-paid"
        ? "success"
        : result.outcome === "pending" || result.outcome === "unknown-reference"
          ? "pending"
          : "failed";
    orderUrl.searchParams.set("payment", flag);
  } catch (error) {
    // Couldn't reach Paystack: the webhook will still settle it; tell the customer it's being checked
    console.error("payments/callback verify failed", error);
    orderUrl.searchParams.set("payment", "pending");
  }
  return NextResponse.redirect(orderUrl);
}
