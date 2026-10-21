import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { isValidOrderKey } from "@/lib/checkout";
import { initializeTransaction, newReference, paystackSecret } from "@/lib/paystack";
import { prisma } from "@/lib/prisma";

const schema = z.object({ orderNumber: z.string().regex(/^NTD-\d+$/), key: z.string().max(64).optional() });

/** "Proceed to payment": creates a Paystack transaction and returns where to send the customer. */
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== request.headers.get("host")) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Something went wrong — please refresh the page." }, { status: 400 });

  if (!paystackSecret()) {
    return NextResponse.json(
      { error: "Online payment isn't switched on yet. Your order is saved — we'll contact you about paying.", notConfigured: true },
      { status: 503 },
    );
  }

  try {
    const order = await prisma.order.findUnique({
      where: { orderNumber: parsed.data.orderNumber },
      select: { id: true, orderNumber: true, userId: true, guestEmail: true, total: true, status: true, paymentStatus: true },
    });
    const session = await getServerSession(authOptions);
    const allowed = order && ((order.userId && order.userId === session?.user?.id) || isValidOrderKey(order.id, parsed.data.key));
    if (!order || !allowed) return NextResponse.json({ error: "We couldn't find that order." }, { status: 404 });
    if (order.paymentStatus === "PAID") return NextResponse.json({ error: "This order is already paid. Thank you!" }, { status: 409 });
    if (order.status === "CANCELLED") return NextResponse.json({ error: "This order was cancelled." }, { status: 409 });
    if (!order.guestEmail) return NextResponse.json({ error: "This order has no email for the receipt — please contact us." }, { status: 409 });

    // A fresh reference every attempt (Paystack refuses to reuse one); the latest is what we track
    const reference = newReference(order.orderNumber);
    await prisma.payment.upsert({
      where: { orderId: order.id },
      create: { orderId: order.id, reference, amount: order.total, status: "PENDING" },
      update: { reference, amount: order.total, status: "PENDING", method: null },
    });

    const callback = new URL("/api/payments/callback", new URL(request.url).origin);
    const tx = await initializeTransaction({
      email: order.guestEmail,
      amount: order.total.toNumber(),
      reference,
      callbackUrl: callback.toString(),
      metadata: {
        order_id: order.id,
        order_number: order.orderNumber,
        custom_fields: [{ display_name: "Order", variable_name: "order_number", value: order.orderNumber }],
      },
    });
    return NextResponse.json({ authorizationUrl: tx.authorization_url }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("payments/initialize failed", error);
    return NextResponse.json({ error: "We couldn't start the payment. Please try again in a moment." }, { status: 502 });
  }
}
