/**
 * Test database seed.
 *
 * WHY A SEPARATE SEED?
 * The main seed (seed.ts) creates 150 customers and randomized data. That's great
 * for manual testing but terrible for automated tests — tests need deterministic,
 * known data so assertions like "this order belongs to customer X" always hold.
 *
 * This seed creates the MINIMUM data needed to run all tests:
 *   - 1 PricingConfig
 *   - 1 DeliveryZone
 *   - 2 MenuItems (1 entree, 1 side)
 *   - 1 published WeeklyMenu with those items across Mon–Fri
 *   - 1 Admin user
 *   - 1 Customer user (with Customer record)
 *
 * The credentials match what's in .env.test → TEST_ADMIN_EMAIL / TEST_CUSTOMER_EMAIL
 *
 * Run with: npm run seed:test
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.test" });

import { PrismaClient, MenuItemType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding test database...");

  // ─── Cleanup: delete in reverse dependency order ──────────────────────────
  // This lets you re-run the seed safely without duplicate key errors.
  await prisma.orderItem.deleteMany();
  await prisma.orderDay.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartSession.deleteMany();
  await prisma.weeklyMenuItem.deleteMany();
  await prisma.weeklyMenu.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.address.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
  await prisma.pricingConfig.deleteMany();
  await prisma.deliveryZone.deleteMany();
  console.log("   ✓ Cleared existing test data");

  // ─── Pricing Config ───────────────────────────────────────────────────────
  await prisma.pricingConfig.create({
    data: {
      completaPrice: 12.0,
      extraEntreePrice: 6.0,
      extraSidePrice: 2.0,
      deliveryFeePerMeal: 1.5,
    },
  });
  console.log("   ✓ PricingConfig: completa=$12, delivery=$1.50/meal");

  // ─── Delivery Zone ────────────────────────────────────────────────────────
  await prisma.deliveryZone.create({
    data: { zipCode: "33101", city: "Miami", isActive: true },
  });
  console.log("   ✓ DeliveryZone: 33101 (Miami)");

  // ─── Menu Items ───────────────────────────────────────────────────────────
  const entree = await prisma.menuItem.create({
    data: {
      name: "Test Ropa Vieja",
      type: MenuItemType.ENTREE,
      isStaple: false,
      isActive: true,
    },
  });

  const side = await prisma.menuItem.create({
    data: {
      name: "Test Black Beans",
      type: MenuItemType.SIDE,
      isStaple: true,
      isActive: true,
    },
  });
  console.log("   ✓ MenuItems: Test Ropa Vieja (entree), Test Black Beans (side)");

  // ─── Weekly Menu ──────────────────────────────────────────────────────────
  // Use the Monday of the current week so the menu is "upcoming"
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...
  const daysToMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek; // next Monday
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + daysToMonday);
  nextMonday.setHours(0, 0, 0, 0);

  const weeklyMenu = await prisma.weeklyMenu.create({
    data: {
      weekStartDate: nextMonday,
      isPublished: true,
      publishedAt: new Date(),
      menuItems: {
        create: [1, 2, 3, 4, 5].flatMap((day) => [
          { menuItemId: entree.id, dayOfWeek: day, isSpecial: true },
          { menuItemId: side.id, dayOfWeek: day, isSpecial: false },
        ]),
      },
    },
  });
  console.log(`   ✓ WeeklyMenu (published): week of ${nextMonday.toDateString()}`);

  // ─── Admin User ───────────────────────────────────────────────────────────
  const adminEmail = process.env.TEST_ADMIN_EMAIL ?? "admin@test.latinlite.com";
  const adminPassword = process.env.TEST_ADMIN_PASSWORD ?? "TestAdmin123!";

  await prisma.user.create({
    data: {
      email: adminEmail,
      password: await bcrypt.hash(adminPassword, 10),
      firstName: "Test",
      lastName: "Admin",
      role: "ADMIN",
    },
  });
  console.log(`   ✓ Admin: ${adminEmail}`);

  // ─── Customer User ────────────────────────────────────────────────────────
  const customerEmail = process.env.TEST_CUSTOMER_EMAIL ?? "customer@test.latinlite.com";
  const customerPassword = process.env.TEST_CUSTOMER_PASSWORD ?? "TestCustomer123!";

  const customerUser = await prisma.user.create({
    data: {
      email: customerEmail,
      password: await bcrypt.hash(customerPassword, 10),
      firstName: "Test",
      lastName: "Customer",
      role: "CUSTOMER",
      customer: { create: {} },
    },
    include: { customer: true },
  });

  // Add a saved delivery address for the customer
  await prisma.address.create({
    data: {
      customerId: customerUser.customer!.id,
      street: "123 Test Street",
      city: "Miami",
      state: "FL",
      zipCode: "33101",
      isDefault: true,
    },
  });
  console.log(`   ✓ Customer: ${customerEmail} (with saved address)`);

  console.log("\n✅ Test database seeded successfully!");
  console.log(`   Weekly Menu ID: ${weeklyMenu.id}`);
  console.log(`   Entree ID: ${entree.id}`);
  console.log(`   Side ID: ${side.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
