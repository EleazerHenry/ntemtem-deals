import "server-only";
import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const CART_COOKIE = "ntd_cart";
export const MAX_QTY = 10;
const MAX_LINES = 50;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type CartLine = {
  id: string;
  productId: string;
  slug: string;
  name: string;
  variantId: string | null;
  variantName: string | null;
  image: string | null;
  unitPrice: number;
  /** The real "was" price per unit when on sale, else null */
  compareAtUnit: number | null;
  /** e.g. "10-12 days" */
  deliveryEstimate: string;
  quantity: number;
  lineTotal: number;
  /** Set when the product/option was hidden since it was added — excluded from the subtotal */
  unavailable: boolean;
};

export type CartView = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  /** Total saved against compare-at prices */
  savings: number;
  /** The longest delivery time in the cart, e.g. "10-12 days" — null when empty */
  deliveryEstimate: string | null;
};

export const EMPTY_CART: CartView = { lines: [], count: 0, subtotal: 0, savings: 0, deliveryEstimate: null };

const round2 = (n: number) => Math.round(n * 100) / 100;

async function signedInUserId() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  // The token could outlive a deleted account
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true } });
  return user?.id ?? null;
}

/** Add `quantity` of product+option to a cart, merging with an existing line (capped). */
async function addToLine(cartId: string, productId: string, variantId: string | null, quantity: number) {
  const existing = await prisma.cartItem.findFirst({ where: { cartId, productId, variantId } });
  if (existing) {
    const next = Math.min(MAX_QTY, existing.quantity + quantity);
    await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: next } });
    return { capped: existing.quantity + quantity > MAX_QTY };
  }
  await prisma.cartItem.create({ data: { cartId, productId, variantId, quantity: Math.min(MAX_QTY, quantity) } });
  return { capped: quantity > MAX_QTY };
}

/**
 * The visitor's cart. Guests are identified by an httpOnly cookie; signed-in
 * customers by their account. The first time a signed-in visitor still has a
 * guest cart, it's merged into their account cart and the cookie is dropped.
 * Must only be called from a Server Action or Route Handler (it may set cookies).
 */
export async function resolveCart({ create }: { create: boolean }) {
  const jar = await cookies();
  const raw = jar.get(CART_COOKIE)?.value;
  const sessionId = raw && UUID.test(raw) ? raw : null;
  const userId = await signedInUserId();

  if (userId) {
    let cart = await prisma.cart.findUnique({ where: { userId }, select: { id: true } });
    if (sessionId) {
      const guest = await prisma.cart.findUnique({ where: { sessionId }, include: { items: true } });
      if (guest && !guest.userId) {
        if (!cart) {
          // No account cart yet: the guest cart simply becomes it
          cart = await prisma.cart.update({ where: { id: guest.id }, data: { userId, sessionId: null }, select: { id: true } });
        } else {
          for (const item of guest.items) await addToLine(cart.id, item.productId, item.variantId, item.quantity);
          await prisma.cart.delete({ where: { id: guest.id } });
        }
      }
      jar.delete(CART_COOKIE);
    }
    if (!cart && create) cart = await prisma.cart.create({ data: { userId }, select: { id: true } });
    return cart;
  }

  if (sessionId) {
    const cart = await prisma.cart.findUnique({ where: { sessionId }, select: { id: true, userId: true } });
    if (cart && !cart.userId) return { id: cart.id };
  }
  if (!create) return null;
  const id = randomUUID();
  const cart = await prisma.cart.create({ data: { sessionId: id }, select: { id: true } });
  jar.set(CART_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 60, // 60 days
  });
  return cart;
}

/** Prices always come from the live product — never stored in the cart. */
export async function loadCartView(cartId: string): Promise<CartView> {
  const items = await prisma.cartItem.findMany({
    where: { cartId },
    orderBy: { id: "asc" },
    select: {
      id: true,
      quantity: true,
      productId: true,
      variantId: true,
      product: {
        select: { slug: true, name: true, images: true, price: true, compareAtPrice: true, deliveryEstimate: true, isActive: true, hasVariants: true },
      },
      variant: { select: { name: true, priceAdjustment: true, isActive: true, imageUrl: true } },
    },
  });

  const lines = items.map((item): CartLine => {
    const { product, variant } = item;
    const adjustment = variant?.priceAdjustment.toNumber() ?? 0;
    const unitPrice = round2(product.price.toNumber() + adjustment);
    // Same rule as the product page: on sale only when compare-at beats the base price
    const was = product.compareAtPrice?.toNumber() ?? null;
    const compareAtUnit = was !== null && was > product.price.toNumber() ? round2(was + adjustment) : null;
    const unavailable =
      !product.isActive || (product.hasVariants ? !variant || !variant.isActive : item.variantId !== null);
    return {
      id: item.id,
      productId: item.productId,
      slug: product.slug,
      name: product.name,
      variantId: item.variantId,
      variantName: variant?.name ?? null,
      image: variant?.imageUrl ?? product.images[0] ?? null,
      unitPrice,
      compareAtUnit,
      deliveryEstimate: product.deliveryEstimate,
      quantity: item.quantity,
      lineTotal: round2(unitPrice * item.quantity),
      unavailable,
    };
  });

  const ok = lines.filter((l) => !l.unavailable);
  return {
    lines,
    count: ok.reduce((n, l) => n + l.quantity, 0),
    subtotal: round2(ok.reduce((sum, l) => sum + l.lineTotal, 0)),
    savings: round2(ok.reduce((sum, l) => sum + (l.compareAtUnit ? (l.compareAtUnit - l.unitPrice) * l.quantity : 0), 0)),
    deliveryEstimate: longestEstimate(ok.map((l) => l.deliveryEstimate)),
  };
}

/** The estimate with the latest upper bound — "10-12 days" beats "7-10 days". */
function longestEstimate(estimates: string[]) {
  const upper = (e: string) => Math.max(...(e.match(/d+/g)?.map(Number) ?? [0]));
  return estimates.reduce<string | null>((best, e) => (best === null || upper(e) > upper(best) ? e : best), null);
}

export type AddResult = { ok: true; cart: CartView; lineId: string; capped: boolean } | { ok: false; error: string };

export async function addItem(productId: string, variantId: string | null, quantity: number): Promise<AddResult> {
  const product = await prisma.product.findFirst({
    where: { id: productId, isActive: true },
    select: { hasVariants: true, variants: { where: { isActive: true }, select: { id: true } } },
  });
  if (!product) return { ok: false, error: "Sorry — this product isn't available any more." };
  if (product.hasVariants) {
    if (!variantId) return { ok: false, error: "Please choose an option first." };
    if (!product.variants.some((v) => v.id === variantId)) return { ok: false, error: "That option isn't available any more." };
  } else if (variantId) {
    return { ok: false, error: "That option isn't available any more." };
  }

  const cart = await resolveCart({ create: true });
  if (!cart) return { ok: false, error: "Couldn't open your cart. Please try again." };

  const lineCount = await prisma.cartItem.count({ where: { cartId: cart.id } });
  const existing = await prisma.cartItem.findFirst({ where: { cartId: cart.id, productId, variantId }, select: { id: true } });
  if (!existing && lineCount >= MAX_LINES) return { ok: false, error: "Your cart is full. Check out or remove something first." };

  const { capped } = await addToLine(cart.id, productId, variantId, quantity);
  const line = await prisma.cartItem.findFirst({ where: { cartId: cart.id, productId, variantId }, select: { id: true } });
  return { ok: true, cart: await loadCartView(cart.id), lineId: line!.id, capped };
}

/** 0 removes the line. Only lines in the visitor's own cart can be touched. */
export async function setLineQuantity(lineId: string, quantity: number): Promise<CartView> {
  const cart = await resolveCart({ create: false });
  if (!cart) return EMPTY_CART;
  if (quantity <= 0) {
    await prisma.cartItem.deleteMany({ where: { id: lineId, cartId: cart.id } });
  } else {
    await prisma.cartItem.updateMany({ where: { id: lineId, cartId: cart.id }, data: { quantity: Math.min(MAX_QTY, quantity) } });
  }
  return loadCartView(cart.id);
}

export async function currentCartView(): Promise<CartView> {
  const cart = await resolveCart({ create: false });
  return cart ? loadCartView(cart.id) : EMPTY_CART;
}
