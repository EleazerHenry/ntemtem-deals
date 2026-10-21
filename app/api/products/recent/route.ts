import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getProductsBySlugs } from "@/lib/storefront";

const slugs = z.array(z.string().regex(/^[a-z0-9-]{1,120}$/)).max(12);

// "Recently viewed": the list lives in the visitor's browser; this returns live card data for it.
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("slugs")?.split(",").filter(Boolean) ?? [];
  const parsed = slugs.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  try {
    const products = await getProductsBySlugs(parsed.data);
    // Prices change rarely; a minute at the edge keeps this cheap
    return NextResponse.json(products, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
  } catch (error) {
    console.error("GET /api/products/recent failed", error);
    return NextResponse.json({ error: "Couldn't load products." }, { status: 500 });
  }
}
