"use server";

import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { sendVerificationEmail } from "@/lib/account";
import { authOptions } from "@/lib/auth";
import { loadCartView, resolveCart } from "@/lib/cart";
import { checkCoupon, deliveryFeeFor, getDeliveryZones, isValidOrderKey, nextOrderNumber, orderPath, orderTotal } from "@/lib/checkout";
import { prisma } from "@/lib/prisma";
import {
  accountPasswordSchema,
  checkoutFieldErrors,
  checkoutSchema,
  type CheckoutFieldErrors,
  type CheckoutInput,
} from "@/lib/validations/checkout";

export type CouponResult = { ok: true; code: string; discount: number; label: string } | { ok: false; error: string };

/** "Apply" button: checks the code against the visitor's real cart subtotal. */
export async function applyCoupon(code: string): Promise<CouponResult> {
  try {
    const cart = await resolveCart({ create: false });
    const view = cart ? await loadCartView(cart.id) : null;
    if (!view?.count) return { ok: false, error: "Your cart is empty." };
    const result = await checkCoupon(String(code).slice(0, 30), view.subtotal);
    return result.ok ? { ok: true, code: result.code, discount: result.discount, label: result.label } : result;
  } catch (error) {
    console.error("applyCoupon failed", error);
    return { ok: false, error: "Couldn't check that code. Please try again." };
  }
}

export type PlaceOrderResult =
  | { ok: true; redirectTo: string }
  | {
      ok: false;
      fieldErrors?: CheckoutFieldErrors;
      formError?: string;
      /** Prices, fees or the coupon changed since the page loaded */
      updatedTotal?: number;
      cartChanged?: boolean;
    };

class CouponUsedUp extends Error {}

export async function placeOrder(input: CheckoutInput): Promise<PlaceOrderResult> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: checkoutFieldErrors(parsed.error) };
  const data = parsed.data;

  try {
    const session = await getServerSession(authOptions);
    const user = session?.user?.id
      ? await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true } })
      : null;

    // Everything below is recomputed here — nothing about money comes from the browser
    const cart = await resolveCart({ create: false });
    const view = cart ? await loadCartView(cart.id) : null;
    if (!cart || !view || view.count === 0) return { ok: false, formError: "Your cart is empty.", cartChanged: true };
    if (view.lines.some((l) => l.unavailable)) {
      return { ok: false, formError: "Some items are no longer available. Remove them from your cart, then try again.", cartChanged: true };
    }

    const zones = await getDeliveryZones();
    const deliveryFee = deliveryFeeFor(zones, data.city, data.method);
    if (deliveryFee === null) {
      return { ok: false, fieldErrors: { city: data.method === "pickup" ? "Free pickup isn't available in that city." : "We don't deliver to that city yet." } };
    }

    let coupon: { id: string; discount: number; maxUses: number | null } | null = null;
    if (data.couponCode) {
      const check = await checkCoupon(data.couponCode, view.subtotal);
      if (!check.ok) return { ok: false, fieldErrors: { couponCode: check.error } };
      coupon = { id: check.id, discount: check.discount, maxUses: check.maxUses };
    }

    const total = orderTotal(view.subtotal, deliveryFee, coupon?.discount ?? 0);
    if (Math.abs(total - data.expectedTotal) > 0.009) {
      return {
        ok: false,
        updatedTotal: total,
        cartChanged: true,
        formError: "Your total changed (a price or fee was updated). Please check it and place your order again.",
      };
    }

    const lines = view.lines;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const order = await prisma.$transaction(
          async (tx) => {
            if (coupon) {
              // Count the use only if there's still one left (two shoppers can't take the last one)
              const used = await tx.coupon.updateMany({
                where: { id: coupon.id, isActive: true, ...(coupon.maxUses !== null && { usedCount: { lt: coupon.maxUses } }) },
                data: { usedCount: { increment: 1 } },
              });
              if (used.count === 0) throw new CouponUsedUp();
            }

            const address = await tx.address.create({
              data: {
                userId: user?.id ?? null,
                fullName: data.fullName,
                phone: data.phone,
                city: data.city,
                area: data.method === "pickup" ? "Free pickup" : data.area,
                landmark: data.landmark || null,
              },
              select: { id: true },
            });

            const created = await tx.order.create({
              data: {
                orderNumber: await nextOrderNumber(tx),
                userId: user?.id ?? null,
                // Contact details always kept on the order (guests and customers alike)
                guestName: data.fullName,
                guestEmail: data.email,
                guestPhone: data.phone,
                addressId: address.id,
                deliveryCity: data.city,
                deliveryArea: data.method === "pickup" ? "Free pickup" : data.area,
                deliveryLandmark: data.landmark || null,
                subtotal: view.subtotal,
                deliveryFee,
                discountAmount: coupon?.discount ?? 0,
                couponId: coupon?.id ?? null,
                total,
                status: "PENDING",
                paymentStatus: "UNPAID",
                items: {
                  create: lines.map((l) => ({
                    productId: l.productId,
                    variantId: l.variantId,
                    // Snapshots: the order never changes if the product is edited later
                    productName: l.name,
                    variantName: l.variantName,
                    price: l.unitPrice,
                    quantity: l.quantity,
                  })),
                },
                statusHistory: { create: { status: "PENDING", note: "Order placed — waiting for payment." } },
              },
              select: { id: true, orderNumber: true },
            });

            await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
            return created;
          },
          { timeout: 20_000, maxWait: 10_000 },
        );
        return { ok: true, redirectTo: orderPath(order) };
      } catch (error) {
        if (error instanceof CouponUsedUp) {
          return { ok: false, fieldErrors: { couponCode: "That code was just used up. Remove it to continue." } };
        }
        // Two orders took the same number at the same moment — try the next one
        const clash = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
        if (!clash || attempt === 2) throw error;
      }
    }
    throw new Error("unreachable");
  } catch (error) {
    console.error("placeOrder failed", error);
    return { ok: false, formError: "We couldn't place your order. Nothing was charged — please try again." };
  }
}

export type CreateAccountResult = { ok: true; email: string } | { ok: false; error: string };

/** "Save your details" on the order page: turns a guest order into an account. */
export async function createAccountForOrder(orderId: string, key: string, password: string): Promise<CreateAccountResult> {
  const pw = accountPasswordSchema.safeParse(password);
  if (!pw.success) return { ok: false, error: pw.error.issues[0].message };
  if (typeof orderId !== "string" || !isValidOrderKey(orderId, key)) return { ok: false, error: "This link isn't valid any more." };

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { userId: true, guestName: true, guestEmail: true, guestPhone: true, addressId: true },
    });
    if (!order?.guestEmail) return { ok: false, error: "This order can't be linked to an account." };
    if (order.userId) return { ok: false, error: "This order is already saved to an account." };
    const existing = await prisma.user.findUnique({ where: { email: order.guestEmail }, select: { id: true } });
    if (existing) {
      return { ok: false, error: `There's already an account for ${order.guestEmail}. Sign in to it to see your orders.` };
    }

    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: order.guestName ?? "Customer",
          email: order.guestEmail!,
          phone: order.guestPhone,
          passwordHash: await bcrypt.hash(pw.data, 12),
          role: "CUSTOMER",
        },
        select: { id: true },
      });
      // Only THIS order: the email isn't verified, so other guest orders with the same
      // address must not be handed to whoever typed it
      await tx.order.update({ where: { id: orderId }, data: { userId: user.id } });
      if (order.addressId) await tx.address.update({ where: { id: order.addressId }, data: { userId: user.id } });
      return user;
    });
    await sendVerificationEmail({ id: created.id, name: order.guestName ?? "there", email: order.guestEmail });
    return { ok: true, email: order.guestEmail };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, error: "An account with this email was just created. Sign in to it instead." };
    }
    console.error("createAccountForOrder failed", error);
    return { ok: false, error: "Couldn't create your account. Please try again." };
  }
}
