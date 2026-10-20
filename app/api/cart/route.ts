import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { MAX_QTY, currentCartView, setLineQuantity } from "@/lib/cart";

const noStore = { "Cache-Control": "no-store" };

// The store pages are static; each visitor's cart is fetched from here.
export async function GET() {
  try {
    return NextResponse.json(await currentCartView(), { headers: noStore });
  } catch (error) {
    console.error("GET /api/cart failed", error);
    return NextResponse.json({ error: "Couldn't load your cart." }, { status: 500 });
  }
}

const patchSchema = z.object({
  lineId: z.string().min(1).max(64),
  quantity: z.number().int().min(0).max(MAX_QTY), // 0 removes the line
});

/**
 * Quantity changes. A plain fetch (not a Server Action) so the browser can send
 * it with `keepalive` — a change made just before leaving the page still lands.
 */
export async function PATCH(request: NextRequest) {
  // Same-site only (the cart cookie is SameSite=Lax too)
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== request.headers.get("host")) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Something went wrong — please refresh and try again." }, { status: 400 });
  try {
    return NextResponse.json(await setLineQuantity(parsed.data.lineId, parsed.data.quantity), { headers: noStore });
  } catch (error) {
    console.error("PATCH /api/cart failed", error);
    return NextResponse.json({ error: "Couldn't update your cart. Please try again." }, { status: 500 });
  }
}
