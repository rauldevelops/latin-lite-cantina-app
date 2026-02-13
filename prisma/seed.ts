/**
 * Prisma Seed Script for LatinLite Cantina staging database
 *
 * Run with: npx tsx prisma/seed.ts
 * Or via prisma: npx prisma db seed
 *
 * Creates: PricingConfig, MenuItems, DeliveryZones, Admin user,
 *          sample customers, a published WeeklyMenu, and sample orders.
 */

import dotenv from "dotenv";
dotenv.config();

import { PrismaClient, UserRole, MenuItemType, OrderStatus, PaymentStatus, PaymentMethod } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getNextMonday(): Date {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon, ...
  const daysUntilMonday = day === 0 ? 1 : day === 1 ? 0 : 8 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + daysUntilMonday);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function generateOrderNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 1000000)
    .toString()
    .padStart(6, "0");
  return `LL-${year}-${random}`;
}

// ---------------------------------------------------------------------------
// Seed Data
// ---------------------------------------------------------------------------

const PRICING = {
  completaPrice: 12.0,
  extraEntreePrice: 7.0,
  extraSidePrice: 4.0,
  deliveryFeePerMeal: 2.0,
};

const ENTREES = [
  // Staples (always available)
  { name: "Masitas de Pollo", description: "Crispy garlic-citrus marinated pork chunks", isStaple: true, calories: 320, protein: 28, carbs: 8, fat: 20, sodium: 480 },
  { name: "Turkey Picadillo", description: "Lean ground turkey in savory tomato sofrito", isStaple: true, calories: 250, protein: 26, carbs: 12, fat: 10, sodium: 520 },
  // Rotating specials
  { name: "Ropa Vieja", description: "Shredded flank steak braised in tomato-pepper sauce", isStaple: false, calories: 290, protein: 30, carbs: 10, fat: 14, sodium: 550 },
  { name: "Pollo a la Plancha", description: "Grilled herb-marinated chicken breast", isStaple: false, calories: 220, protein: 32, carbs: 4, fat: 8, sodium: 390 },
  { name: "Bistec de Palomilla", description: "Thin-cut sirloin steak with onions and lime", isStaple: false, calories: 280, protein: 30, carbs: 6, fat: 14, sodium: 460 },
  { name: "Lechón Asado", description: "Slow-roasted mojo pork shoulder", isStaple: false, calories: 310, protein: 28, carbs: 4, fat: 20, sodium: 500 },
  { name: "Camarones al Ajillo", description: "Garlic shrimp in white wine butter sauce", isStaple: false, calories: 200, protein: 24, carbs: 6, fat: 8, sodium: 440 },
  { name: "Pollo Asado", description: "Herb-roasted half chicken with citrus mojo", isStaple: false, calories: 260, protein: 30, carbs: 4, fat: 12, sodium: 420 },
];

const SIDES = [
  // Regular sides
  { name: "Arroz Blanco", description: "Fluffy white rice", isSoup: false, isDessert: false, calories: 180, protein: 3, carbs: 40, fat: 1, sodium: 200 },
  { name: "Arroz Congri", description: "Rice and black beans cooked together", isSoup: false, isDessert: false, calories: 220, protein: 7, carbs: 42, fat: 3, sodium: 350 },
  { name: "Frijoles Negros", description: "Slow-cooked Cuban black beans", isSoup: false, isDessert: false, calories: 180, protein: 10, carbs: 32, fat: 2, sodium: 380 },
  { name: "Maduros", description: "Sweet plantains fried to caramelized perfection", isSoup: false, isDessert: false, calories: 200, protein: 1, carbs: 36, fat: 8, sodium: 80 },
  { name: "Tostones", description: "Twice-fried green plantain discs", isSoup: false, isDessert: false, calories: 190, protein: 1, carbs: 34, fat: 7, sodium: 100 },
  { name: "Yuca con Mojo", description: "Boiled cassava with garlic-lime mojo", isSoup: false, isDessert: false, calories: 210, protein: 2, carbs: 44, fat: 4, sodium: 280 },
  { name: "Ensalada Mixta", description: "Fresh mixed green salad with lime vinaigrette", isSoup: false, isDessert: false, calories: 80, protein: 2, carbs: 10, fat: 4, sodium: 120 },
  { name: "Vegetales al Vapor", description: "Steamed seasonal vegetables with garlic", isSoup: false, isDessert: false, calories: 60, protein: 3, carbs: 10, fat: 1, sodium: 90 },
  // Soups
  { name: "Sopa de Pollo", description: "Hearty Cuban-style chicken soup", isSoup: true, isDessert: false, calories: 150, protein: 14, carbs: 16, fat: 4, sodium: 600 },
  { name: "Caldo de Frijoles", description: "Black bean soup with cumin and lime", isSoup: true, isDessert: false, calories: 170, protein: 10, carbs: 28, fat: 2, sodium: 520 },
  // Desserts
  { name: "Flan de Vainilla", description: "Classic vanilla custard with caramel", isSoup: false, isDessert: true, calories: 240, protein: 6, carbs: 34, fat: 10, sodium: 140 },
  { name: "Arroz con Leche", description: "Creamy cinnamon rice pudding", isSoup: false, isDessert: true, calories: 260, protein: 5, carbs: 42, fat: 8, sodium: 120 },
];

const DELIVERY_ZONES = [
  { zipCode: "33024", city: "Hollywood" },
  { zipCode: "33023", city: "Hollywood" },
  { zipCode: "33020", city: "Hollywood" },
  { zipCode: "33019", city: "Hollywood" },
  { zipCode: "33021", city: "Hollywood" },
  { zipCode: "33025", city: "Hollywood" },
  { zipCode: "33009", city: "Hallandale Beach" },
  { zipCode: "33160", city: "North Miami Beach" },
  { zipCode: "33180", city: "North Miami Beach" },
  { zipCode: "33027", city: "Hollywood" },
  { zipCode: "33028", city: "Pembroke Pines" },
  { zipCode: "33029", city: "Pembroke Pines" },
  { zipCode: "33026", city: "Pembroke Pines" },
  { zipCode: "33013", city: "Hialeah" },
  { zipCode: "33014", city: "Hialeah" },
];

const USERS = {
  admin: {
    email: "admin@latinlitecantina.com",
    firstName: "Admin",
    lastName: "LatinLite",
    password: "admin123!",
    role: UserRole.ADMIN,
  },
  customers: [
    {
      email: "maria@example.com",
      firstName: "Maria",
      lastName: "Garcia",
      password: "customer123!",
      phone: "305-555-0101",
      address: { street: "123 Ocean Dr", city: "Hollywood", state: "FL", zipCode: "33024" },
    },
    {
      email: "carlos@example.com",
      firstName: "Carlos",
      lastName: "Rodriguez",
      password: "customer123!",
      phone: "305-555-0102",
      address: { street: "456 Federal Hwy", city: "Hollywood", state: "FL", zipCode: "33020" },
    },
    {
      email: "ana@example.com",
      firstName: "Ana",
      lastName: "Martinez",
      password: "customer123!",
      phone: "305-555-0103",
      address: { street: "789 Hallandale Beach Blvd", city: "Hallandale Beach", state: "FL", zipCode: "33009" },
    },
  ],
};

// ---------------------------------------------------------------------------
// Main Seed Function
// ---------------------------------------------------------------------------

async function main() {
  console.log("🌱 Seeding LatinLite staging database...\n");

  // 1. Pricing Config
  console.log("💰 Creating pricing config...");
  const pricing = await prisma.pricingConfig.upsert({
    where: { id: "default-pricing" },
    update: PRICING,
    create: { id: "default-pricing", ...PRICING },
  });
  console.log(`   Completa: $${pricing.completaPrice}, Extra Entree: $${pricing.extraEntreePrice}, Extra Side: $${pricing.extraSidePrice}\n`);

  // 2. Menu Items
  console.log("🍽️  Creating menu items...");
  const entreeRecords = [];
  for (const entree of ENTREES) {
    const record = await prisma.menuItem.upsert({
      where: { id: `seed-entree-${entree.name.toLowerCase().replace(/\s+/g, "-")}` },
      update: { ...entree, type: MenuItemType.ENTREE },
      create: {
        id: `seed-entree-${entree.name.toLowerCase().replace(/\s+/g, "-")}`,
        ...entree,
        type: MenuItemType.ENTREE,
      },
    });
    entreeRecords.push(record);
    console.log(`   ✅ Entree: ${record.name}${record.isStaple ? " (staple)" : ""}`);
  }

  const sideRecords = [];
  for (const side of SIDES) {
    const record = await prisma.menuItem.upsert({
      where: { id: `seed-side-${side.name.toLowerCase().replace(/\s+/g, "-")}` },
      update: { ...side, type: MenuItemType.SIDE },
      create: {
        id: `seed-side-${side.name.toLowerCase().replace(/\s+/g, "-")}`,
        ...side,
        type: MenuItemType.SIDE,
      },
    });
    sideRecords.push(record);
    const tag = side.isSoup ? " (soup)" : side.isDessert ? " (dessert)" : "";
    console.log(`   ✅ Side: ${record.name}${tag}`);
  }
  console.log(`   Total: ${entreeRecords.length} entrees, ${sideRecords.length} sides\n`);

  // 3. Delivery Zones
  console.log("📍 Creating delivery zones...");
  for (const zone of DELIVERY_ZONES) {
    await prisma.deliveryZone.upsert({
      where: { zipCode: zone.zipCode },
      update: { city: zone.city, isActive: true },
      create: { ...zone, isActive: true },
    });
    console.log(`   ✅ ${zone.zipCode} - ${zone.city}`);
  }
  console.log();

  // 4. Driver
  console.log("🚗 Creating sample driver...");
  const driver = await prisma.driver.upsert({
    where: { id: "seed-driver-1" },
    update: { name: "Jose Fernandez", isActive: true },
    create: { id: "seed-driver-1", name: "Jose Fernandez", isActive: true },
  });
  console.log(`   ✅ Driver: ${driver.name}\n`);

  // 5. Users
  console.log("👤 Creating users...");

  // Admin
  const adminPassword = await bcrypt.hash(USERS.admin.password, 10);
  const adminUser = await prisma.user.upsert({
    where: { email: USERS.admin.email },
    update: { firstName: USERS.admin.firstName, lastName: USERS.admin.lastName, role: USERS.admin.role, password: adminPassword },
    create: {
      email: USERS.admin.email,
      firstName: USERS.admin.firstName,
      lastName: USERS.admin.lastName,
      password: adminPassword,
      role: USERS.admin.role,
    },
  });
  console.log(`   ✅ Admin: ${adminUser.email}`);

  // Customers
  const customerRecords = [];
  for (const cust of USERS.customers) {
    const hashedPassword = await bcrypt.hash(cust.password, 10);
    const user = await prisma.user.upsert({
      where: { email: cust.email },
      update: { firstName: cust.firstName, lastName: cust.lastName, phone: cust.phone, password: hashedPassword },
      create: {
        email: cust.email,
        firstName: cust.firstName,
        lastName: cust.lastName,
        password: hashedPassword,
        phone: cust.phone,
        role: UserRole.CUSTOMER,
      },
    });

    // Create Customer record (1:1 with User)
    const customer = await prisma.customer.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
    });

    // Create Address
    const address = await prisma.address.findFirst({
      where: { customerId: customer.id, street: cust.address.street },
    });
    const addr = address ?? await prisma.address.create({
      data: {
        customerId: customer.id,
        street: cust.address.street,
        city: cust.address.city,
        state: cust.address.state,
        zipCode: cust.address.zipCode,
        isDefault: true,
        driverId: driver.id,
      },
    });

    customerRecords.push({ user, customer, address: addr });
    console.log(`   ✅ Customer: ${user.firstName} ${user.lastName} (${user.email})`);
  }
  console.log();

  // 6. Weekly Menu (upcoming week)
  console.log("📋 Creating weekly menu...");
  const weekStart = getNextMonday();
  const weeklyMenu = await prisma.weeklyMenu.upsert({
    where: { weekStartDate: weekStart },
    update: { isPublished: true, publishedAt: new Date() },
    create: {
      weekStartDate: weekStart,
      isPublished: true,
      publishedAt: new Date(),
    },
  });
  console.log(`   Week starting: ${weekStart.toISOString().split("T")[0]}`);

  // Clear existing menu items for this week (in case of re-run)
  await prisma.weeklyMenuItem.deleteMany({ where: { weeklyMenuId: weeklyMenu.id } });

  // Assign rotating entrees to days (2 per day, cycling through non-staple entrees)
  const rotatingEntrees = entreeRecords.filter((e) => !e.isStaple);
  for (let day = 1; day <= 5; day++) {
    // Pick 2 rotating entrees per day
    const entree1 = rotatingEntrees[(day * 2 - 2) % rotatingEntrees.length];
    const entree2 = rotatingEntrees[(day * 2 - 1) % rotatingEntrees.length];

    await prisma.weeklyMenuItem.create({
      data: { weeklyMenuId: weeklyMenu.id, menuItemId: entree1.id, dayOfWeek: day, isSpecial: true },
    });
    await prisma.weeklyMenuItem.create({
      data: { weeklyMenuId: weeklyMenu.id, menuItemId: entree2.id, dayOfWeek: day, isSpecial: true },
    });
    console.log(`   Day ${day}: ${entree1.name} + ${entree2.name}`);
  }

  // Assign all sides as week-long (dayOfWeek = 0)
  for (const side of sideRecords) {
    await prisma.weeklyMenuItem.create({
      data: { weeklyMenuId: weeklyMenu.id, menuItemId: side.id, dayOfWeek: 0 },
    });
  }
  console.log(`   Sides (all week): ${sideRecords.length} sides assigned\n`);

  // 7. Sample Orders
  console.log("📦 Creating sample orders...");

  // Helper to pick sides for a completa (ensuring max 1 soup, max 1 dessert)
  const regularSides = sideRecords.filter((s) => !s.isSoup && !s.isDessert);
  const soups = sideRecords.filter((s) => s.isSoup);
  const desserts = sideRecords.filter((s) => s.isDessert);

  function pickThreeSides(includeSpecial: "soup" | "dessert" | "none" = "none") {
    const picked = [];
    if (includeSpecial === "soup" && soups.length > 0) {
      picked.push(soups[Math.floor(Math.random() * soups.length)]);
    } else if (includeSpecial === "dessert" && desserts.length > 0) {
      picked.push(desserts[Math.floor(Math.random() * desserts.length)]);
    }
    // Fill remaining with regular sides
    const shuffled = [...regularSides].sort(() => Math.random() - 0.5);
    while (picked.length < 3) {
      const next = shuffled.pop();
      if (next && !picked.find((p) => p.id === next.id)) {
        picked.push(next);
      }
    }
    return picked;
  }

  // Order 1: Maria - delivery, 3-day order with completas
  const order1Number = generateOrderNumber();
  const order1 = await prisma.order.create({
    data: {
      orderNumber: order1Number,
      customerId: customerRecords[0].customer.id,
      weeklyMenuId: weeklyMenu.id,
      status: OrderStatus.CONFIRMED,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: PaymentMethod.CARD,
      isPickup: false,
      addressId: customerRecords[0].address.id,
      subtotal: 36.0,
      deliveryFee: 6.0,
      totalAmount: 42.0,
      orderDays: {
        create: [1, 2, 3].map((day) => {
          const entree = rotatingEntrees[(day * 2 - 2) % rotatingEntrees.length];
          const sides = pickThreeSides(day === 1 ? "dessert" : day === 2 ? "soup" : "none");
          const groupId = `${Date.now()}-${day}-0`;
          return {
            dayOfWeek: day,
            deliveryFee: 2.0,
            orderItems: {
              create: [
                {
                  menuItemId: entree.id,
                  quantity: 1,
                  unitPrice: PRICING.completaPrice,
                  isCompleta: true,
                  completaGroupId: groupId,
                },
                ...sides.map((side) => ({
                  menuItemId: side.id,
                  quantity: 1,
                  unitPrice: 0,
                  isCompleta: true,
                  completaGroupId: groupId,
                })),
              ],
            },
          };
        }),
      },
    },
  });
  console.log(`   ✅ Order ${order1Number} - ${customerRecords[0].user.firstName} (delivery, 3 days, CONFIRMED)`);

  // Order 2: Carlos - pickup, 5-day order
  const order2Number = generateOrderNumber();
  const order2 = await prisma.order.create({
    data: {
      orderNumber: order2Number,
      customerId: customerRecords[1].customer.id,
      weeklyMenuId: weeklyMenu.id,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: PaymentMethod.CARD,
      isPickup: true,
      subtotal: 60.0,
      deliveryFee: 0,
      totalAmount: 60.0,
      orderDays: {
        create: [1, 2, 3, 4, 5].map((day) => {
          const entree = rotatingEntrees[(day * 2 - 1) % rotatingEntrees.length];
          const sides = pickThreeSides(day % 3 === 0 ? "soup" : "none");
          const groupId = `${Date.now()}-${day}-0`;
          return {
            dayOfWeek: day,
            deliveryFee: 0,
            orderItems: {
              create: [
                {
                  menuItemId: entree.id,
                  quantity: 1,
                  unitPrice: PRICING.completaPrice,
                  isCompleta: true,
                  completaGroupId: groupId,
                },
                ...sides.map((side) => ({
                  menuItemId: side.id,
                  quantity: 1,
                  unitPrice: 0,
                  isCompleta: true,
                  completaGroupId: groupId,
                })),
              ],
            },
          };
        }),
      },
    },
  });
  console.log(`   ✅ Order ${order2Number} - ${customerRecords[1].user.firstName} (pickup, 5 days, DELIVERED)`);

  // Order 3: Ana - delivery, 4-day order with an extra entree
  const order3Number = generateOrderNumber();
  const order3 = await prisma.order.create({
    data: {
      orderNumber: order3Number,
      customerId: customerRecords[2].customer.id,
      weeklyMenuId: weeklyMenu.id,
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: PaymentMethod.CARD,
      isPickup: false,
      addressId: customerRecords[2].address.id,
      subtotal: 55.0,
      deliveryFee: 8.0,
      totalAmount: 63.0,
      orderDays: {
        create: [1, 2, 3, 4].map((day) => {
          const entree = rotatingEntrees[(day * 2 - 2) % rotatingEntrees.length];
          const sides = pickThreeSides(day === 4 ? "dessert" : "none");
          const groupId = `${Date.now()}-${day}-0`;

          const items = [
            {
              menuItemId: entree.id,
              quantity: 1,
              unitPrice: PRICING.completaPrice,
              isCompleta: true,
              completaGroupId: groupId,
            },
            ...sides.map((side) => ({
              menuItemId: side.id,
              quantity: 1,
              unitPrice: 0,
              isCompleta: true,
              completaGroupId: groupId,
            })),
          ];

          // Add an extra entree on day 1
          if (day === 1) {
            const extraEntree = rotatingEntrees[(day * 2) % rotatingEntrees.length];
            items.push({
              menuItemId: extraEntree.id,
              quantity: 1,
              unitPrice: PRICING.extraEntreePrice,
              isCompleta: false,
              completaGroupId: null as unknown as string,
            });
          }

          return {
            dayOfWeek: day,
            deliveryFee: 2.0,
            orderItems: { create: items },
          };
        }),
      },
    },
  });
  console.log(`   ✅ Order ${order3Number} - ${customerRecords[2].user.firstName} (delivery, 4 days + extra entree, PENDING)`);

  // Update user order stats
  await prisma.user.update({
    where: { id: customerRecords[0].user.id },
    data: { orderCount: 1, firstOrderAt: new Date(), lastOrderAt: new Date() },
  });
  await prisma.user.update({
    where: { id: customerRecords[1].user.id },
    data: { orderCount: 1, firstOrderAt: new Date(), lastOrderAt: new Date() },
  });
  await prisma.user.update({
    where: { id: customerRecords[2].user.id },
    data: { orderCount: 1, firstOrderAt: new Date(), lastOrderAt: new Date() },
  });

  console.log("\n✅ Seed complete!\n");
  console.log("📝 Login credentials:");
  console.log(`   Admin:    ${USERS.admin.email} / ${USERS.admin.password}`);
  console.log(`   Customer: ${USERS.customers[0].email} / ${USERS.customers[0].password}`);
  console.log(`   Customer: ${USERS.customers[1].email} / ${USERS.customers[1].password}`);
  console.log(`   Customer: ${USERS.customers[2].email} / ${USERS.customers[2].password}`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
