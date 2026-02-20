/**
 * Prisma Seed Script for LatinLite Cantina staging database
 *
 * Run with: npx tsx prisma/seed.ts
 * Or via prisma: npx prisma db seed
 *
 * Creates: PricingConfig, 48 entrees, 48 sides, DeliveryZones, 1 Admin,
 *          3 Drivers, 4 WeeklyMenus, 150 Customers, 150 delivery Orders.
 */

import dotenv from "dotenv";
dotenv.config();

import {
  PrismaClient,
  UserRole,
  MenuItemType,
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
} from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// ─── Helpers ─────────────────────────────────────────────────────────────────

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Returns the Monday of the week that is `n` weeks before the current week. */
function getMondayNWeeksAgo(n: number): Date {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday - n * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

let _orderNum = 1;
function generateOrderNumber(): string {
  return `LL-${new Date().getFullYear()}-${String(_orderNum++).padStart(6, "0")}`;
}

let _groupCounter = 0;
function nextGroupId(): string {
  return `seed-grp-${++_groupCounter}`;
}

function pickSides(
  regular: { id: string }[],
  soups: { id: string }[],
  desserts: { id: string }[]
): { id: string }[] {
  const pool = [...regular];
  const picked: { id: string }[] = [];
  // Occasionally include a soup or dessert as one of the 3 sides
  const roll = Math.random();
  if (roll < 0.2 && soups.length > 0) picked.push(randomFrom(soups));
  else if (roll < 0.35 && desserts.length > 0) picked.push(randomFrom(desserts));
  const shuffled = shuffle(pool);
  for (const s of shuffled) {
    if (picked.length >= 3) break;
    if (!picked.find((p) => p.id === s.id)) picked.push(s);
  }
  return picked.slice(0, 3);
}

// ─── Pricing ─────────────────────────────────────────────────────────────────

const PRICING = {
  completaPrice: 12.0,
  extraEntreePrice: 7.0,
  extraSidePrice: 4.0,
  deliveryFeePerMeal: 2.0,
};

// ─── Delivery Zones ───────────────────────────────────────────────────────────

const DELIVERY_ZONES = [
  { zipCode: "33024", city: "Hollywood" },
  { zipCode: "33023", city: "Hollywood" },
  { zipCode: "33020", city: "Hollywood" },
  { zipCode: "33019", city: "Hollywood" },
  { zipCode: "33021", city: "Hollywood" },
  { zipCode: "33025", city: "Hollywood" },
  { zipCode: "33027", city: "Hollywood" },
  { zipCode: "33009", city: "Hallandale Beach" },
  { zipCode: "33160", city: "North Miami Beach" },
  { zipCode: "33180", city: "North Miami Beach" },
  { zipCode: "33028", city: "Pembroke Pines" },
  { zipCode: "33029", city: "Pembroke Pines" },
  { zipCode: "33026", city: "Pembroke Pines" },
  { zipCode: "33013", city: "Hialeah" },
  { zipCode: "33014", city: "Hialeah" },
];

// ─── 48 Entrees ───────────────────────────────────────────────────────────────

const ENTREES_DATA = [
  // 2 Staples
  { name: "Masitas de Pollo", description: "Crispy garlic-citrus marinated chicken chunks", isStaple: true, calories: 320, protein: 28, carbs: 8, fat: 20, sodium: 480 },
  { name: "Turkey Picadillo", description: "Lean ground turkey in savory tomato sofrito", isStaple: true, calories: 250, protein: 26, carbs: 12, fat: 10, sodium: 520 },
  // 46 Rotating
  { name: "Ropa Vieja", description: "Shredded flank steak braised in tomato-pepper sauce", isStaple: false, calories: 290, protein: 30, carbs: 10, fat: 14, sodium: 550 },
  { name: "Pollo a la Plancha", description: "Grilled herb-marinated chicken breast", isStaple: false, calories: 220, protein: 32, carbs: 4, fat: 8, sodium: 390 },
  { name: "Bistec de Palomilla", description: "Thin-cut sirloin steak with onions and lime", isStaple: false, calories: 280, protein: 30, carbs: 6, fat: 14, sodium: 460 },
  { name: "Lechón Asado", description: "Slow-roasted mojo pork shoulder", isStaple: false, calories: 310, protein: 28, carbs: 4, fat: 20, sodium: 500 },
  { name: "Camarones al Ajillo", description: "Garlic shrimp in white wine butter sauce", isStaple: false, calories: 200, protein: 24, carbs: 6, fat: 8, sodium: 440 },
  { name: "Pollo Asado", description: "Herb-roasted half chicken with citrus mojo", isStaple: false, calories: 260, protein: 30, carbs: 4, fat: 12, sodium: 420 },
  { name: "Bistec Empanizado", description: "Breaded sirloin steak pan-fried to a golden crust", isStaple: false, calories: 330, protein: 28, carbs: 18, fat: 16, sodium: 510 },
  { name: "Pernil Asado", description: "Slow-roasted seasoned pork leg with crispy skin", isStaple: false, calories: 340, protein: 32, carbs: 3, fat: 22, sodium: 530 },
  { name: "Carne con Papas", description: "Cuban-style beef stew with potatoes in tomato sauce", isStaple: false, calories: 300, protein: 26, carbs: 22, fat: 12, sodium: 580 },
  { name: "Vaca Frita", description: "Pan-fried shredded flank steak with onions and lime", isStaple: false, calories: 270, protein: 29, carbs: 5, fat: 15, sodium: 470 },
  { name: "Fricase de Pollo", description: "Chicken fricassee stewed in tomato wine sauce", isStaple: false, calories: 255, protein: 28, carbs: 14, fat: 10, sodium: 495 },
  { name: "Picadillo Cubano", description: "Ground beef with olives, capers, and raisins", isStaple: false, calories: 265, protein: 24, carbs: 16, fat: 12, sodium: 540 },
  { name: "Cerdo en Salsa", description: "Braised pork in a rich tomato-herb sauce", isStaple: false, calories: 295, protein: 26, carbs: 10, fat: 18, sodium: 515 },
  { name: "Chuletas de Cerdo", description: "Pan-seared pork chops with mojo marinade", isStaple: false, calories: 305, protein: 30, carbs: 4, fat: 18, sodium: 490 },
  { name: "Albóndigas en Salsa", description: "Beef and pork meatballs in savory tomato sauce", isStaple: false, calories: 285, protein: 25, carbs: 14, fat: 14, sodium: 560 },
  { name: "Pescado a la Plancha", description: "Grilled fresh fish fillet with garlic lime sauce", isStaple: false, calories: 190, protein: 28, carbs: 3, fat: 7, sodium: 360 },
  { name: "Arroz con Pollo", description: "Classic Cuban chicken and rice with saffron", isStaple: false, calories: 320, protein: 26, carbs: 34, fat: 8, sodium: 530 },
  { name: "Boliche Mechado", description: "Pot roast stuffed with chorizo and olives", isStaple: false, calories: 350, protein: 34, carbs: 8, fat: 20, sodium: 570 },
  { name: "Tasajo Cubano", description: "Cuban-style dried beef sautéed with onions", isStaple: false, calories: 275, protein: 32, carbs: 4, fat: 14, sodium: 600 },
  { name: "Camarones Enchilados", description: "Shrimp in spiced Creole tomato sauce", isStaple: false, calories: 185, protein: 22, carbs: 10, fat: 6, sodium: 430 },
  { name: "Carne Asada", description: "Grilled marinated flank steak with chimichurri", isStaple: false, calories: 290, protein: 31, carbs: 3, fat: 17, sodium: 445 },
  { name: "Tilapia en Salsa Verde", description: "Tilapia braised in a Cuban green herb sauce", isStaple: false, calories: 195, protein: 26, carbs: 7, fat: 7, sodium: 380 },
  { name: "Costillas de Cerdo", description: "Slow-braised pork ribs in guava glaze", isStaple: false, calories: 370, protein: 28, carbs: 20, fat: 22, sodium: 545 },
  { name: "Rabo Encendido", description: "Fiery braised oxtail stew with vegetables", isStaple: false, calories: 380, protein: 32, carbs: 16, fat: 22, sodium: 590 },
  { name: "Pollo Guisado", description: "Stewed chicken in savory sofrito sauce", isStaple: false, calories: 245, protein: 28, carbs: 12, fat: 9, sodium: 480 },
  { name: "Lomo de Cerdo", description: "Herb-crusted pork loin with citrus glaze", isStaple: false, calories: 290, protein: 32, carbs: 6, fat: 15, sodium: 460 },
  { name: "Carne Mechada", description: "Slow-braised beef stuffed with vegetables", isStaple: false, calories: 310, protein: 30, carbs: 10, fat: 17, sodium: 555 },
  { name: "Salmón con Mojo", description: "Baked salmon fillet with Cuban mojo sauce", isStaple: false, calories: 270, protein: 30, carbs: 4, fat: 15, sodium: 400 },
  { name: "Pechuga a la Cubana", description: "Chicken breast stuffed with ham and cheese", isStaple: false, calories: 305, protein: 34, carbs: 6, fat: 16, sodium: 520 },
  { name: "Pargo al Horno", description: "Whole baked red snapper with Creole seasoning", isStaple: false, calories: 210, protein: 30, carbs: 5, fat: 9, sodium: 390 },
  { name: "Pollo Fricasé", description: "Classic Cuban chicken in wine and tomato", isStaple: false, calories: 250, protein: 27, carbs: 15, fat: 9, sodium: 500 },
  { name: "Cerdo Frito", description: "Cuban-style deep-fried marinated pork", isStaple: false, calories: 360, protein: 30, carbs: 5, fat: 25, sodium: 510 },
  { name: "Croquetas de Pollo", description: "Golden chicken croquettes with creamy filling", isStaple: false, calories: 290, protein: 18, carbs: 22, fat: 16, sodium: 480 },
  { name: "Tamales Cubanos", description: "Corn masa tamales stuffed with seasoned pork", isStaple: false, calories: 330, protein: 16, carbs: 38, fat: 14, sodium: 530 },
  { name: "Ajiaco Cubano", description: "Hearty Cuban root vegetable and meat stew", isStaple: false, calories: 295, protein: 22, carbs: 30, fat: 10, sodium: 540 },
  { name: "Bistec a la Criolla", description: "Creole-style steak with peppers and tomatoes", isStaple: false, calories: 275, protein: 29, carbs: 8, fat: 14, sodium: 475 },
  { name: "Cordero Guisado", description: "Slow-simmered lamb with sofrito and herbs", isStaple: false, calories: 320, protein: 30, carbs: 12, fat: 18, sodium: 560 },
  { name: "Pato en Salsa Criolla", description: "Duck leg braised in Creole tomato sauce", isStaple: false, calories: 340, protein: 28, carbs: 10, fat: 22, sodium: 545 },
  { name: "Pulpo a la Gallega", description: "Tender octopus with paprika and olive oil", isStaple: false, calories: 185, protein: 22, carbs: 8, fat: 8, sodium: 430 },
  { name: "Bacalao a la Vizcaína", description: "Salt cod in Basque-Cuban tomato pepper sauce", isStaple: false, calories: 220, protein: 26, carbs: 12, fat: 8, sodium: 580 },
  { name: "Enchilada de Camarones", description: "Shrimp enchilada in smoky Creole sauce", isStaple: false, calories: 195, protein: 23, carbs: 11, fat: 7, sodium: 450 },
  { name: "Pollo al Vino", description: "Chicken braised in red wine with herbs", isStaple: false, calories: 255, protein: 29, carbs: 8, fat: 11, sodium: 470 },
  { name: "Cerdo al Ajillo", description: "Garlic pork bites sautéed with herbs", isStaple: false, calories: 305, protein: 28, carbs: 5, fat: 20, sodium: 490 },
  { name: "Carne de Puerco con Papas", description: "Pork and potato stew Cuban-style", isStaple: false, calories: 315, protein: 25, carbs: 24, fat: 14, sodium: 555 },
  { name: "Chilindrón de Cordero", description: "Lamb braised with tomatoes and roasted peppers", isStaple: false, calories: 335, protein: 30, carbs: 13, fat: 19, sodium: 570 },
  { name: "Pollo a la Criolla", description: "Chicken simmered in savory Creole sofrito", isStaple: false, calories: 245, protein: 28, carbs: 10, fat: 10, sodium: 490 },
];

// ─── 48 Sides ────────────────────────────────────────────────────────────────

const SIDES_DATA = [
  // 40 Regular sides
  { name: "Arroz Blanco", description: "Fluffy steamed white rice", isSoup: false, isDessert: false, calories: 180, protein: 3, carbs: 40, fat: 1, sodium: 200 },
  { name: "Arroz Congri", description: "Rice and black beans cooked together", isSoup: false, isDessert: false, calories: 220, protein: 7, carbs: 42, fat: 3, sodium: 350 },
  { name: "Frijoles Negros", description: "Slow-cooked Cuban black beans", isSoup: false, isDessert: false, calories: 180, protein: 10, carbs: 32, fat: 2, sodium: 380 },
  { name: "Maduros", description: "Sweet plantains fried to caramelized perfection", isSoup: false, isDessert: false, calories: 200, protein: 1, carbs: 36, fat: 8, sodium: 80 },
  { name: "Tostones", description: "Twice-fried green plantain discs", isSoup: false, isDessert: false, calories: 190, protein: 1, carbs: 34, fat: 7, sodium: 100 },
  { name: "Yuca con Mojo", description: "Boiled cassava with garlic-lime mojo", isSoup: false, isDessert: false, calories: 210, protein: 2, carbs: 44, fat: 4, sodium: 280 },
  { name: "Ensalada Mixta", description: "Fresh mixed green salad with lime vinaigrette", isSoup: false, isDessert: false, calories: 80, protein: 2, carbs: 10, fat: 4, sodium: 120 },
  { name: "Vegetales al Vapor", description: "Steamed seasonal vegetables with garlic", isSoup: false, isDessert: false, calories: 60, protein: 3, carbs: 10, fat: 1, sodium: 90 },
  { name: "Arroz Amarillo", description: "Saffron-seasoned Cuban yellow rice", isSoup: false, isDessert: false, calories: 195, protein: 4, carbs: 41, fat: 2, sodium: 310 },
  { name: "Frijoles Colorados", description: "Slow-simmered red kidney beans with sofrito", isSoup: false, isDessert: false, calories: 175, protein: 9, carbs: 30, fat: 2, sodium: 360 },
  { name: "Plátano Hervido", description: "Boiled green plantain with garlic butter", isSoup: false, isDessert: false, calories: 165, protein: 1, carbs: 38, fat: 2, sodium: 70 },
  { name: "Yuca Frita", description: "Golden crispy fried cassava sticks", isSoup: false, isDessert: false, calories: 230, protein: 2, carbs: 46, fat: 6, sodium: 150 },
  { name: "Papa a la Francesa", description: "Crispy golden french fries", isSoup: false, isDessert: false, calories: 250, protein: 3, carbs: 38, fat: 11, sodium: 280 },
  { name: "Papa Rellena", description: "Stuffed potato ball filled with seasoned ground beef", isSoup: false, isDessert: false, calories: 280, protein: 10, carbs: 34, fat: 12, sodium: 420 },
  { name: "Ensalada de Tomate", description: "Ripe tomato salad with onion and cilantro", isSoup: false, isDessert: false, calories: 55, protein: 2, carbs: 9, fat: 2, sodium: 90 },
  { name: "Ensalada de Aguacate", description: "Creamy avocado salad with lime dressing", isSoup: false, isDessert: false, calories: 140, protein: 2, carbs: 8, fat: 12, sodium: 110 },
  { name: "Ensalada Rusa", description: "Cuban Russian salad with potatoes and mayo", isSoup: false, isDessert: false, calories: 190, protein: 4, carbs: 22, fat: 10, sodium: 340 },
  { name: "Chayote Guisado", description: "Stewed chayote squash with sofrito", isSoup: false, isDessert: false, calories: 70, protein: 2, carbs: 12, fat: 2, sodium: 180 },
  { name: "Espinacas Salteadas", description: "Sautéed spinach with garlic and olive oil", isSoup: false, isDessert: false, calories: 65, protein: 4, carbs: 6, fat: 4, sodium: 140 },
  { name: "Brócoli al Ajillo", description: "Broccoli florets sautéed with garlic", isSoup: false, isDessert: false, calories: 70, protein: 4, carbs: 8, fat: 3, sodium: 130 },
  { name: "Zanahorias Glaseadas", description: "Honey-glazed carrots with fresh herbs", isSoup: false, isDessert: false, calories: 95, protein: 1, carbs: 18, fat: 3, sodium: 160 },
  { name: "Habichuelas Guisadas", description: "Stewed green beans with tomato and ham", isSoup: false, isDessert: false, calories: 80, protein: 3, carbs: 12, fat: 2, sodium: 230 },
  { name: "Elote Asado", description: "Grilled corn cob with lime and butter", isSoup: false, isDessert: false, calories: 160, protein: 4, carbs: 28, fat: 5, sodium: 120 },
  { name: "Fufu de Plátano", description: "Mashed green plantain with pork cracklings", isSoup: false, isDessert: false, calories: 210, protein: 4, carbs: 36, fat: 7, sodium: 190 },
  { name: "Arroz con Fideos", description: "Rice toasted with thin vermicelli noodles", isSoup: false, isDessert: false, calories: 200, protein: 5, carbs: 40, fat: 3, sodium: 260 },
  { name: "Frijoles Pintos", description: "Pinto beans slow-cooked with Cuban spices", isSoup: false, isDessert: false, calories: 170, protein: 9, carbs: 29, fat: 2, sodium: 340 },
  { name: "Quimbombó Guisado", description: "Okra stewed with tomatoes and sofrito", isSoup: false, isDessert: false, calories: 75, protein: 3, carbs: 14, fat: 2, sodium: 210 },
  { name: "Ñame con Mojo", description: "Boiled Cuban yam with citrus garlic mojo", isSoup: false, isDessert: false, calories: 195, protein: 2, carbs: 44, fat: 2, sodium: 240 },
  { name: "Malanga Hervida", description: "Boiled taro root with olive oil and garlic", isSoup: false, isDessert: false, calories: 175, protein: 2, carbs: 40, fat: 2, sodium: 170 },
  { name: "Boniato Asado", description: "Roasted Cuban sweet potato with cinnamon", isSoup: false, isDessert: false, calories: 185, protein: 2, carbs: 42, fat: 1, sodium: 100 },
  { name: "Coles de Bruselas", description: "Roasted Brussels sprouts with garlic", isSoup: false, isDessert: false, calories: 75, protein: 4, carbs: 10, fat: 3, sodium: 130 },
  { name: "Col Guisada", description: "Braised cabbage with bacon and onions", isSoup: false, isDessert: false, calories: 90, protein: 3, carbs: 12, fat: 4, sodium: 220 },
  { name: "Ensalada de Repollo", description: "Creamy coleslaw with lime dressing", isSoup: false, isDessert: false, calories: 110, protein: 2, carbs: 14, fat: 6, sodium: 180 },
  { name: "Mariquitas", description: "Thin crispy plantain chips with mojo dipping sauce", isSoup: false, isDessert: false, calories: 145, protein: 1, carbs: 22, fat: 6, sodium: 140 },
  { name: "Papas al Mojo", description: "Boiled potatoes tossed in garlic mojo sauce", isSoup: false, isDessert: false, calories: 180, protein: 3, carbs: 36, fat: 4, sodium: 230 },
  { name: "Moros y Cristianos", description: "White rice cooked with black beans", isSoup: false, isDessert: false, calories: 215, protein: 7, carbs: 42, fat: 2, sodium: 330 },
  { name: "Congrí Oriental", description: "Rice cooked with red beans and chorizo", isSoup: false, isDessert: false, calories: 240, protein: 9, carbs: 42, fat: 5, sodium: 390 },
  { name: "Picadillo de Papa", description: "Seasoned ground potato hash with sofrito", isSoup: false, isDessert: false, calories: 165, protein: 4, carbs: 30, fat: 4, sodium: 280 },
  { name: "Calabaza en Cazuela", description: "Cuban pumpkin stew with brown sugar", isSoup: false, isDessert: false, calories: 115, protein: 2, carbs: 24, fat: 2, sodium: 160 },
  { name: "Bacalaítos", description: "Crispy salt cod fritters with herbs", isSoup: false, isDessert: false, calories: 195, protein: 14, carbs: 18, fat: 7, sodium: 480 },
  // 4 Soups
  { name: "Sopa de Pollo", description: "Hearty Cuban-style chicken soup with vegetables", isSoup: true, isDessert: false, calories: 150, protein: 14, carbs: 16, fat: 4, sodium: 600 },
  { name: "Caldo de Frijoles", description: "Black bean soup with cumin and lime", isSoup: true, isDessert: false, calories: 170, protein: 10, carbs: 28, fat: 2, sodium: 520 },
  { name: "Caldo Gallego", description: "White bean and turnip green soup with ham hock", isSoup: true, isDessert: false, calories: 160, protein: 12, carbs: 22, fat: 4, sodium: 580 },
  { name: "Sopa de Plátano", description: "Creamy roasted plantain soup with garlic", isSoup: true, isDessert: false, calories: 145, protein: 4, carbs: 28, fat: 4, sodium: 490 },
  // 4 Desserts
  { name: "Flan de Vainilla", description: "Classic vanilla custard with caramel sauce", isSoup: false, isDessert: true, calories: 240, protein: 6, carbs: 34, fat: 10, sodium: 140 },
  { name: "Arroz con Leche", description: "Creamy cinnamon rice pudding", isSoup: false, isDessert: true, calories: 260, protein: 5, carbs: 42, fat: 8, sodium: 120 },
  { name: "Pudin de Pan", description: "Cuban bread pudding with vanilla cream", isSoup: false, isDessert: true, calories: 300, protein: 7, carbs: 48, fat: 10, sodium: 180 },
  { name: "Natilla Cubana", description: "Traditional Cuban vanilla custard with cinnamon", isSoup: false, isDessert: true, calories: 230, protein: 5, carbs: 36, fat: 8, sodium: 130 },
];

// ─── Customer Name Pools ──────────────────────────────────────────────────────

const FIRST_NAMES = [
  "Maria", "Carlos", "Ana", "Jose", "Isabella", "Miguel", "Sofia", "Diego",
  "Valentina", "Alejandro", "Camila", "Luis", "Gabriela", "Roberto", "Natalia",
  "Fernando", "Daniela", "Ricardo", "Paula", "Eduardo", "Andrea", "Manuel",
  "Claudia", "Antonio", "Patricia", "Jorge", "Monica", "Rafael", "Veronica",
  "Sergio", "Laura", "Oscar", "Elena", "David", "Carmen", "Jesus", "Lorena",
  "Marco", "Beatriz", "Andres", "Adriana", "Pablo", "Silvia", "Hector",
  "Rosa", "Victor", "Angela", "Julian", "Marisol", "Ernesto", "Sandra",
  "Alberto", "Teresa", "Raul", "Alicia", "Enrique", "Gloria", "Marcos",
  "Lourdes", "Cesar", "Liliana", "Ramon", "Margarita", "Alvaro", "Esperanza",
  "Hugo", "Graciela", "Emilio", "Norma", "Benjamin", "Ines", "Gustavo",
  "Dolores", "Arturo", "Pilar", "Rolando", "Irene", "Gonzalo", "Miriam",
];

const LAST_NAMES = [
  "Garcia", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Perez",
  "Sanchez", "Ramirez", "Torres", "Flores", "Rivera", "Gomez", "Diaz", "Cruz",
  "Morales", "Ortiz", "Gutierrez", "Chavez", "Ramos", "Mendez", "Castillo",
  "Vargas", "Jimenez", "Moreno", "Munoz", "Alvarez", "Romero", "Soto", "Herrera",
  "Medina", "Aguilar", "Reyes", "Vega", "Campos", "Miranda", "Rios", "Fuentes",
  "Guerrero", "Padilla", "Navarro", "Suarez", "Espinoza", "Salazar", "Castro",
  "Ibarra", "Montoya", "Rojas", "Contreras", "Delgado",
];

const STREET_NAMES = [
  "N 56th Ave", "SW 15th St", "NE 8th Ct", "Palm Ave", "Ocean Dr", "Pine St",
  "Maple Ave", "Oak Blvd", "Elm St", "Cedar Ln", "Birch Rd", "Willow Way",
  "Sunset Blvd", "Hollywood Blvd", "Pines Blvd", "Sheridan St",
  "Hallandale Beach Blvd", "Collins Ave", "Taft St", "Johnson St",
  "Washington St", "Lincoln Rd", "Adams Ct", "Jefferson Ave", "Monroe Blvd",
  "Grant Ave", "Wilson Blvd", "Hayes St", "Polk St", "Taylor Ave",
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Seeding LatinLite staging database...\n");

  // ── 1. Clean existing data ─────────────────────────────────────────────────
  console.log("🧹 Cleaning existing data...");
  await prisma.cartSession.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.orderDay.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.order.deleteMany();
  await prisma.address.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.weeklyMenuItem.deleteMany();
  await prisma.weeklyMenu.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
  await prisma.deliveryZone.deleteMany();
  await prisma.dashboardSnapshot.deleteMany();
  console.log("   ✅ Done\n");

  // ── 2. Pricing Config ──────────────────────────────────────────────────────
  console.log("💰 Creating pricing config...");
  await prisma.pricingConfig.upsert({
    where: { id: "default-pricing" },
    update: PRICING,
    create: { id: "default-pricing", ...PRICING },
  });
  console.log(`   Completa $${PRICING.completaPrice} · Extra Entree $${PRICING.extraEntreePrice} · Extra Side $${PRICING.extraSidePrice} · Delivery $${PRICING.deliveryFeePerMeal}/meal\n`);

  // ── 3. Delivery Zones ──────────────────────────────────────────────────────
  console.log("📍 Creating delivery zones...");
  for (const zone of DELIVERY_ZONES) {
    await prisma.deliveryZone.create({ data: { ...zone, isActive: true } });
  }
  console.log(`   ✅ ${DELIVERY_ZONES.length} zones\n`);

  // ── 4. Menu Items ──────────────────────────────────────────────────────────
  console.log("🍽️  Creating menu items...");
  const entreeRecords = [];
  for (const e of ENTREES_DATA) {
    const slug = e.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const record = await prisma.menuItem.create({
      data: { id: `seed-entree-${slug}`, ...e, type: MenuItemType.ENTREE },
    });
    entreeRecords.push(record);
  }
  console.log(`   ✅ ${entreeRecords.length} entrees`);

  const sideRecords = [];
  for (const s of SIDES_DATA) {
    const slug = s.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const record = await prisma.menuItem.create({
      data: { id: `seed-side-${slug}`, ...s, type: MenuItemType.SIDE },
    });
    sideRecords.push(record);
  }
  console.log(`   ✅ ${sideRecords.length} sides\n`);

  const regularSides = sideRecords.filter((s) => !s.isSoup && !s.isDessert);
  const soupSides = sideRecords.filter((s) => s.isSoup);
  const dessertSides = sideRecords.filter((s) => s.isDessert);
  const rotatingEntrees = entreeRecords.filter((e) => !e.isStaple);

  // ── 5. Admin User ──────────────────────────────────────────────────────────
  console.log("👑 Creating admin user...");
  const adminPassword = await bcrypt.hash("admin123!", 10);
  await prisma.user.create({
    data: {
      email: "admin@latinlitecantina.com",
      firstName: "Admin",
      lastName: "LatinLite",
      password: adminPassword,
      role: UserRole.ADMIN,
    },
  });
  console.log("   ✅ admin@latinlitecantina.com / admin123!\n");

  // ── 6. Drivers ─────────────────────────────────────────────────────────────
  console.log("🚗 Creating drivers...");
  const DRIVER_DATA = [
    { id: "seed-driver-1", name: "Jose Fernandez" },
    { id: "seed-driver-2", name: "Maria Lopez" },
    { id: "seed-driver-3", name: "Carlos Vega" },
  ];
  const driverRecords = [];
  for (const d of DRIVER_DATA) {
    const driver = await prisma.driver.create({ data: { ...d, isActive: true } });
    driverRecords.push(driver);
    console.log(`   ✅ ${driver.name}`);
  }
  console.log();

  // ── 7. Weekly Menus ────────────────────────────────────────────────────────
  console.log("📋 Creating 4 weekly menus...");
  // Index 0 = 3 weeks ago (oldest), index 3 = current week
  const weeklyMenus = [];
  // entreesByMenu[menuIdx][dayOfWeek 1-5] = [entree, entree]
  const entreesByMenu: Array<Record<number, typeof entreeRecords>> = [];

  for (let w = 0; w < 4; w++) {
    const weeksAgo = 3 - w; // 3, 2, 1, 0
    const weekStart = getMondayNWeeksAgo(weeksAgo);
    const isCurrentOrFuture = weeksAgo === 0;

    const menu = await prisma.weeklyMenu.create({
      data: {
        weekStartDate: weekStart,
        isPublished: true,
        publishedAt: new Date(weekStart.getTime() - 2 * 24 * 60 * 60 * 1000), // published 2 days before
      },
    });
    weeklyMenus.push(menu);

    const dayEntrees: Record<number, typeof entreeRecords> = {};
    for (let day = 1; day <= 5; day++) {
      const base = w * 10 + (day - 1) * 2;
      const e1 = rotatingEntrees[base % rotatingEntrees.length];
      const e2 = rotatingEntrees[(base + 1) % rotatingEntrees.length];
      dayEntrees[day] = [e1, e2];
      await prisma.weeklyMenuItem.create({
        data: { weeklyMenuId: menu.id, menuItemId: e1.id, dayOfWeek: day, isSpecial: true },
      });
      await prisma.weeklyMenuItem.create({
        data: { weeklyMenuId: menu.id, menuItemId: e2.id, dayOfWeek: day, isSpecial: true },
      });
    }
    entreesByMenu.push(dayEntrees);

    // All sides available all week (dayOfWeek = 0)
    for (const side of sideRecords) {
      await prisma.weeklyMenuItem.create({
        data: { weeklyMenuId: menu.id, menuItemId: side.id, dayOfWeek: 0 },
      });
    }

    const dateStr = weekStart.toISOString().split("T")[0];
    console.log(`   ✅ Week ${w + 1}: ${dateStr} (${weeksAgo === 0 ? "current" : `${weeksAgo}w ago`})`);
  }
  console.log();

  // ── 8. 150 Customers ───────────────────────────────────────────────────────
  console.log("👥 Creating 150 customers...");
  const customerRecords: { user: { id: string }; customer: { id: string }; address: { id: string } }[] = [];
  const customerPassword = await bcrypt.hash("customer123!", 10);

  for (let i = 0; i < 150; i++) {
    const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
    const lastName = LAST_NAMES[i % LAST_NAMES.length];
    const email = `${firstName.toLowerCase()}${i + 1}@example.com`;
    const phone = `305-${String(500 + Math.floor(i / 100)).padStart(3, "0")}-${String(1000 + i).padStart(4, "0")}`;
    const zone = DELIVERY_ZONES[i % DELIVERY_ZONES.length];
    const streetNum = 100 + (i * 7) % 9900;
    const streetName = STREET_NAMES[i % STREET_NAMES.length];
    const driver = driverRecords[i % driverRecords.length];

    const user = await prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        password: customerPassword,
        phone,
        role: UserRole.CUSTOMER,
      },
    });

    const customer = await prisma.customer.create({
      data: { userId: user.id },
    });

    const address = await prisma.address.create({
      data: {
        customerId: customer.id,
        street: `${streetNum} ${streetName}`,
        city: zone.city,
        state: "FL",
        zipCode: zone.zipCode,
        isDefault: true,
        driverId: driver.id,
      },
    });

    customerRecords.push({ user, customer, address });
  }
  console.log(`   ✅ 150 customers created (customer123!)\n`);

  // ── 9. 150 Orders ──────────────────────────────────────────────────────────
  console.log("📦 Creating 150 delivery orders...");

  // Status helpers based on which week the order belongs to
  function getStatus(menuIdx: number): OrderStatus {
    if (menuIdx < 2) return OrderStatus.DELIVERED;
    if (menuIdx === 2) return randomFrom([OrderStatus.DELIVERED, OrderStatus.DELIVERED, OrderStatus.CANCELLED]);
    return randomFrom([OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PREPARING, OrderStatus.OUT_FOR_DELIVERY]);
  }

  function getPaymentStatus(menuIdx: number, status: OrderStatus): PaymentStatus {
    if (status === OrderStatus.CANCELLED) return PaymentStatus.REFUNDED;
    if (menuIdx < 3) return PaymentStatus.PAID;
    return randomFrom([PaymentStatus.PAID, PaymentStatus.PAID, PaymentStatus.PENDING]);
  }

  for (let i = 0; i < 150; i++) {
    const menuIdx = i % 4;
    const menu = weeklyMenus[menuIdx];
    const { customer, address } = customerRecords[i];

    // Random days (1-5), randomly choosing 1-5 of Mon-Fri
    const numDays = randomInt(1, 5);
    const days = shuffle([1, 2, 3, 4, 5]).slice(0, numDays).sort((a, b) => a - b);

    // Random meals per day: 1-3 completas
    const mealsPerDay = randomInt(1, 3);

    const status = getStatus(menuIdx);
    const paymentStatus = getPaymentStatus(menuIdx, status);

    // Build totals
    let subtotal = 0;
    let orderDeliveryFee = 0;

    const orderDaysCreate = days.map((day) => {
      const availableEntrees = entreesByMenu[menuIdx][day];
      const dayItems: {
        menuItemId: string;
        quantity: number;
        unitPrice: number;
        isCompleta: boolean;
        completaGroupId: string | null;
      }[] = [];

      for (let m = 0; m < mealsPerDay; m++) {
        const groupId = nextGroupId();
        const entree = availableEntrees[m % availableEntrees.length];
        const sides = pickSides(regularSides, soupSides, dessertSides);

        subtotal += PRICING.completaPrice;
        dayItems.push({
          menuItemId: entree.id,
          quantity: 1,
          unitPrice: PRICING.completaPrice,
          isCompleta: true,
          completaGroupId: groupId,
        });
        for (const side of sides) {
          dayItems.push({
            menuItemId: side.id,
            quantity: 1,
            unitPrice: 0,
            isCompleta: true,
            completaGroupId: groupId,
          });
        }
      }

      const dayFee = mealsPerDay * PRICING.deliveryFeePerMeal;
      orderDeliveryFee += dayFee;

      return {
        dayOfWeek: day,
        deliveryFee: dayFee,
        orderItems: { create: dayItems },
      };
    });

    const totalAmount = subtotal + orderDeliveryFee;

    await prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        customerId: customer.id,
        weeklyMenuId: menu.id,
        status,
        paymentStatus,
        paymentMethod: PaymentMethod.CARD,
        isPickup: false,
        addressId: address.id,
        subtotal,
        deliveryFee: orderDeliveryFee,
        totalAmount,
        orderDays: { create: orderDaysCreate },
      },
    });

    if ((i + 1) % 30 === 0) console.log(`   ... ${i + 1}/150 orders created`);
  }

  // ── 10. Update user order stats ────────────────────────────────────────────
  console.log("\n📊 Updating user order stats...");
  for (const { user } of customerRecords) {
    await prisma.user.update({
      where: { id: user.id },
      data: { orderCount: 1, firstOrderAt: new Date(), lastOrderAt: new Date() },
    });
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log("\n✅ Seed complete!\n");
  console.log("📝 Credentials:");
  console.log("   Admin:    admin@latinlitecantina.com / admin123!");
  console.log("   Customer: maria1@example.com / customer123!");
  console.log("   Customer: carlos2@example.com / customer123!");
  console.log("\n📊 Summary:");
  console.log(`   ${entreeRecords.length} entrees (2 staples + ${entreeRecords.length - 2} rotating)`);
  console.log(`   ${sideRecords.length} sides (${regularSides.length} regular + ${soupSides.length} soups + ${dessertSides.length} desserts)`);
  console.log(`   4 weekly menus (3 past + 1 current)`);
  console.log(`   3 drivers`);
  console.log(`   150 customers`);
  console.log(`   150 delivery orders (varying days & meals per day)`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
