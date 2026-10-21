import "server-only";
import { prisma } from "@/lib/prisma";

/** Everything a customer-facing order page shows, in one query. */
export async function getOrderView(orderNumber: string) {
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: {
      items: { include: { product: { select: { images: true, slug: true, isActive: true } }, variant: { select: { imageUrl: true } } } },
      statusHistory: { orderBy: { createdAt: "asc" }, select: { status: true, note: true, createdAt: true } },
      coupon: { select: { code: true } },
    },
  });
  if (!order) return null;
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    userId: order.userId,
    createdAt: order.createdAt,
    status: order.status,
    paymentStatus: order.paymentStatus,
    guestName: order.guestName,
    guestEmail: order.guestEmail,
    guestPhone: order.guestPhone,
    deliveryCity: order.deliveryCity,
    deliveryArea: order.deliveryArea,
    deliveryLandmark: order.deliveryLandmark,
    pickup: order.deliveryArea === "Free pickup",
    subtotal: order.subtotal.toNumber(),
    deliveryFee: order.deliveryFee.toNumber(),
    discount: order.discountAmount.toNumber(),
    couponCode: order.coupon?.code ?? null,
    total: order.total.toNumber(),
    history: order.statusHistory,
    items: order.items.map((i) => ({
      id: i.id,
      name: i.productName, // snapshot — never changes
      option: i.variantName,
      price: i.price.toNumber(),
      quantity: i.quantity,
      image: i.variant?.imageUrl ?? i.product?.images[0] ?? null,
      // Link back only while the product is still on sale
      slug: i.product?.isActive ? i.product.slug : null,
    })),
  };
}

export type OrderView = NonNullable<Awaited<ReturnType<typeof getOrderView>>>;

/** A customer's orders, newest first, with a few photos for the list. */
export async function getCustomerOrders(userId: string) {
  const orders = await prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      orderNumber: true,
      createdAt: true,
      status: true,
      paymentStatus: true,
      total: true,
      items: { select: { quantity: true, productName: true, product: { select: { images: true } } } },
    },
  });
  return orders.map((o) => ({
    orderNumber: o.orderNumber,
    createdAt: o.createdAt,
    status: o.status,
    paymentStatus: o.paymentStatus,
    total: o.total.toNumber(),
    lineCount: o.items.length,
    firstQty: o.items[0]?.quantity ?? 1,
    firstItem: o.items[0]?.productName ?? "",
    images: o.items.flatMap((i) => (i.product?.images[0] ? [i.product.images[0]] : [])).slice(0, 3),
  }));
}
