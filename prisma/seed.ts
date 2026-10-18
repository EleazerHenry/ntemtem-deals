// ============================================================
// NTEMTEM DEALS — Database Seed
// Run with: npx prisma db seed
// Sets up: admin user, categories, delivery zones
// (Products are added by the client himself via the admin panel)
// ============================================================

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Ntemtem Deals...");

  // ---- Admin user ----
  const adminPassword = await bcrypt.hash("Admin@1234", 12);
  await prisma.user.upsert({
    where: { email: "admin@ntemtemdeals.com" },
    update: {},
    create: {
      name: "Ntemtem Admin",
      email: "admin@ntemtemdeals.com",
      phone: "+233000000000",
      passwordHash: adminPassword,
      role: "ADMIN",
    },
  });
  console.log("  ✓ Admin user");

  // ---- Categories (client can add/edit more in the admin) ----
  const categories = [
    { name: "Phone Accessories", slug: "phone-accessories", displayOrder: 1 },
    { name: "Car Accessories", slug: "car-accessories", displayOrder: 2 },
    { name: "Home Gadgets", slug: "home-gadgets", displayOrder: 3 },
    { name: "Electronics", slug: "electronics", displayOrder: 4 },
    { name: "Fashion", slug: "fashion", displayOrder: 5 },
    { name: "Home Essentials", slug: "home-essentials", displayOrder: 6 },
  ];
  for (const c of categories) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: c,
    });
  }
  console.log(`  ✓ ${categories.length} categories`);

  // ---- Delivery zones (PLACEHOLDER fees — client to confirm) ----
  const zones = [
    { city: "Accra", deliveryFee: 30, estimatedDays: "1-2 days", isPickup: false },
    { city: "Kumasi", deliveryFee: 35, estimatedDays: "2-3 days", isPickup: false },
    { city: "Cape Coast", deliveryFee: 20, estimatedDays: "1-2 days", isPickup: true },
    { city: "Takoradi", deliveryFee: 35, estimatedDays: "2-3 days", isPickup: false },
  ];
  for (const z of zones) {
    await prisma.deliveryZone.upsert({
      where: { city: z.city },
      update: {},
      create: z,
    });
  }
  console.log(`  ✓ ${zones.length} delivery zones (PLACEHOLDER fees)`);

  // ---- A sample coupon (client can create more) ----
  await prisma.coupon.upsert({
    where: { code: "WELCOME10" },
    update: {},
    create: {
      code: "WELCOME10",
      type: "PERCENTAGE",
      value: 10,
      minOrderAmount: 100,
      maxUses: 500,
      isActive: true,
    },
  });
  console.log("  ✓ Sample coupon WELCOME10");

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
