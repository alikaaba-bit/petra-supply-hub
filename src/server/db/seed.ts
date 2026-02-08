import { db } from "./index";
import { users, brands, skus, retailers, brandRetailers } from "./schema";
import { sql, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { readFileSync } from "fs";
import { join } from "path";

async function seed() {
  console.log("🌱 Seeding database...");

  try {
    // 1. Create users
    console.log("Creating users...");
    const passwordHash = await bcrypt.hash("admin123", 10);

    const usersList = [
      {
        id: "ceo-kaaba",
        name: "Kaaba",
        email: "kaaba@petrabrands.com",
        passwordHash,
        role: "ceo",
        active: true,
      },
      {
        id: "user-sales",
        name: "Sales Manager",
        email: "sales@petrabrands.com",
        passwordHash,
        role: "editor",
        active: true,
      },
      {
        id: "user-purchasing",
        name: "Purchasing Manager",
        email: "purchasing@petrabrands.com",
        passwordHash,
        role: "editor",
        active: true,
      },
      {
        id: "user-warehouse",
        name: "Warehouse Manager",
        email: "warehouse@petrabrands.com",
        passwordHash,
        role: "viewer",
        active: true,
      },
    ];

    for (const user of usersList) {
      const existing = await db.query.users.findFirst({
        where: eq(users.email, user.email),
      });
      if (!existing) {
        await db.insert(users).values(user);
      }
    }

    console.log("✓ 4 users created (password: admin123)");

    // 2. Create brands
    console.log("Creating brands...");
    const brandsList = [
      {
        name: "Fomin",
        description: "Eco-friendly home and personal care products",
        leadTimeDays: 45,
        active: true,
      },
      {
        name: "Luna Naturals",
        description: "Natural wellness and beauty products",
        leadTimeDays: 30,
        active: true,
      },
      {
        name: "EveryMood",
        description: "Mood-enhancing aromatherapy and wellness products",
        leadTimeDays: 35,
        active: true,
      },
      {
        name: "Roofus",
        description: "Premium pet care products",
        leadTimeDays: 40,
        active: true,
      },
      {
        name: "House of Party",
        description: "Party supplies and decorations",
        leadTimeDays: 25,
        active: true,
      },
    ];

    const brandIds: Record<string, number> = {};
    for (const brand of brandsList) {
      const existing = await db.query.brands.findFirst({
        where: eq(brands.name, brand.name),
      });
      if (existing) {
        brandIds[brand.name] = existing.id;
      } else {
        const [inserted] = await db.insert(brands).values(brand).returning();
        brandIds[brand.name] = inserted.id;
      }
    }

    console.log("✓ 5 brands created");

    // 3. Create SKUs programmatically
    console.log("Creating SKUs...");
    const skusList: Array<{
      brandId: number;
      sku: string;
      name: string;
      category: string;
      unitCost: string;
      unitPrice: string;
      active: boolean;
    }> = [];

    // Fomin SKUs (12 total)
    const fominCategories = [
      { prefix: "FOM-NT", name: "Natural Tabs", count: 2 },
      { prefix: "FOM-BT", name: "Bath Tabs", count: 2 },
      { prefix: "FOM-EX", name: "Exfoliating", count: 2 },
      { prefix: "FOM-GY", name: "Gym Essentials", count: 2 },
      { prefix: "FOM-HT", name: "Hand Towels", count: 2 },
      { prefix: "FOM-CP", name: "Cleaning Pods", count: 2 },
    ];
    fominCategories.forEach((cat) => {
      for (let i = 1; i <= cat.count; i++) {
        skusList.push({
          brandId: brandIds["Fomin"],
          sku: `${cat.prefix}-${String(i).padStart(2, "0")}`,
          name: `${cat.name} #${i}`,
          category: cat.name,
          unitCost: (2.5 + Math.random() * 2).toFixed(2),
          unitPrice: (5.99 + Math.random() * 4).toFixed(2),
          active: true,
        });
      }
    });

    // Luna Naturals SKUs (16 total)
    const lunaCategories = [
      { prefix: "LUN-WP", name: "Wellness Pods", count: 2 },
      { prefix: "LUN-RO", name: "Roller Oils", count: 2 },
      { prefix: "LUN-BR", name: "Bath Rituals", count: 2 },
      { prefix: "LUN-SP", name: "Sleep Products", count: 2 },
      { prefix: "LUN-BM", name: "Body Mist", count: 2 },
      { prefix: "LUN-CN", name: "Candles", count: 2 },
      { prefix: "LUN-ST", name: "Stress Relief", count: 2 },
      { prefix: "LUN-KT", name: "Kits", count: 2 },
    ];
    lunaCategories.forEach((cat) => {
      for (let i = 1; i <= cat.count; i++) {
        skusList.push({
          brandId: brandIds["Luna Naturals"],
          sku: `${cat.prefix}-${String(i).padStart(2, "0")}`,
          name: `${cat.name} #${i}`,
          category: cat.name,
          unitCost: (3.0 + Math.random() * 3).toFixed(2),
          unitPrice: (7.99 + Math.random() * 6).toFixed(2),
          active: true,
        });
      }
    });

    // EveryMood SKUs (34 total)
    const everyMoodCategories = [
      { prefix: "EMD-HS", name: "Happy Spray", count: 7 },
      { prefix: "EMD-BO", name: "Body Oil", count: 7 },
      { prefix: "EMD-BM", name: "Body Mist", count: 7 },
      { prefix: "EMD-HM", name: "Home Mist", count: 7 },
      { prefix: "EMD-GS", name: "Gift Sets", count: 6 },
    ];
    everyMoodCategories.forEach((cat) => {
      for (let i = 1; i <= cat.count; i++) {
        skusList.push({
          brandId: brandIds["EveryMood"],
          sku: `${cat.prefix}-${String(i).padStart(2, "0")}`,
          name: `${cat.name} #${i}`,
          category: cat.name,
          unitCost: (2.0 + Math.random() * 2.5).toFixed(2),
          unitPrice: (6.99 + Math.random() * 5).toFixed(2),
          active: true,
        });
      }
    });

    // Roofus SKUs (21 total)
    const roofusCategories = [
      { prefix: "ROO-PB", name: "Pet Bowls", count: 4 },
      { prefix: "ROO-PW", name: "Pet Wipes", count: 4 },
      { prefix: "ROO-PS", name: "Pet Shampoo", count: 4 },
      { prefix: "ROO-PC", name: "Pet Collars", count: 4 },
      { prefix: "ROO-DK", name: "Dog Kits", count: 3 },
      { prefix: "ROO-PP", name: "Pet Pads", count: 2 },
    ];
    roofusCategories.forEach((cat) => {
      for (let i = 1; i <= cat.count; i++) {
        skusList.push({
          brandId: brandIds["Roofus"],
          sku: `${cat.prefix}-${String(i).padStart(2, "0")}`,
          name: `${cat.name} #${i}`,
          category: cat.name,
          unitCost: (4.0 + Math.random() * 4).toFixed(2),
          unitPrice: (9.99 + Math.random() * 10).toFixed(2),
          active: true,
        });
      }
    });

    // House of Party SKUs (75 total)
    const hopCategories = [
      { prefix: "HOP-PP", name: "Party Packs", count: 25 },
      { prefix: "HOP-MD", name: "Mini Decor", count: 25 },
      { prefix: "HOP-TH", name: "Themed Sets", count: 25 },
    ];
    hopCategories.forEach((cat) => {
      for (let i = 1; i <= cat.count; i++) {
        skusList.push({
          brandId: brandIds["House of Party"],
          sku: `${cat.prefix}-${String(i).padStart(3, "0")}`,
          name: `${cat.name} #${i}`,
          category: cat.name,
          unitCost: (1.0 + Math.random() * 2).toFixed(2),
          unitPrice: (3.99 + Math.random() * 4).toFixed(2),
          active: true,
        });
      }
    });

    // Insert SKUs
    for (const sku of skusList) {
      const existing = await db.query.skus.findFirst({
        where: eq(skus.sku, sku.sku),
      });
      if (!existing) {
        await db.insert(skus).values(sku);
      }
    }

    console.log(`✓ ${skusList.length} SKUs created`);

    // 4. Create retailers
    console.log("Creating retailers...");
    const retailersList = [
      { name: "TJX - TJ Maxx", code: "TJX-TJM", parentGroup: "TJX Companies", channel: "Off-Price" },
      { name: "TJX - Marshalls", code: "TJX-MAR", parentGroup: "TJX Companies", channel: "Off-Price" },
      { name: "TJX - HomeGoods", code: "TJX-HG", parentGroup: "TJX Companies", channel: "Off-Price" },
      { name: "TJX - HomeSense", code: "TJX-HS", parentGroup: "TJX Companies", channel: "Off-Price" },
      { name: "Five Below", code: "FIVE", parentGroup: null, channel: "Value Retail" },
      { name: "Ollies Bargain Outlet", code: "OLLIES", parentGroup: null, channel: "Closeout" },
      { name: "Ross Dress for Less", code: "ROSS", parentGroup: null, channel: "Off-Price" },
      { name: "Burlington", code: "BURL", parentGroup: null, channel: "Off-Price" },
      { name: "Bealls Outlet", code: "BEALLS", parentGroup: null, channel: "Off-Price" },
      { name: "Kroger", code: "KROGER", parentGroup: null, channel: "Grocery" },
      { name: "Walmart Canada", code: "WALMCA", parentGroup: "Walmart", channel: "Mass Merchant" },
      { name: "CVS Pharmacy", code: "CVS", parentGroup: null, channel: "Drug Store" },
      { name: "Target Online", code: "TGT-ONL", parentGroup: "Target", channel: "E-commerce" },
      { name: "Whole Foods", code: "WFM", parentGroup: "Amazon", channel: "Grocery" },
      { name: "Barnes & Noble", code: "BN", parentGroup: null, channel: "Book Store" },
      { name: "Meijer", code: "MEIJER", parentGroup: null, channel: "Supercenter" },
    ];

    const retailerIds: Record<string, number> = {};
    for (const retailer of retailersList) {
      const existing = await db.query.retailers.findFirst({
        where: eq(retailers.code, retailer.code),
      });
      if (existing) {
        retailerIds[retailer.code] = existing.id;
      } else {
        const [inserted] = await db.insert(retailers).values(retailer).returning();
        retailerIds[retailer.code] = inserted.id;
      }
    }

    console.log("✓ 16 retailers created");

    // 5. Create brand-retailer mappings (all brands sell to all retailers for now)
    console.log("Creating brand-retailer mappings...");
    for (const brandName of Object.keys(brandIds)) {
      for (const retailerCode of Object.keys(retailerIds)) {
        const existing = await db.query.brandRetailers.findFirst({
          where: sql`brand_id = ${brandIds[brandName]} AND retailer_id = ${retailerIds[retailerCode]}`,
        });
        if (!existing) {
          await db.insert(brandRetailers).values({
            brandId: brandIds[brandName],
            retailerId: retailerIds[retailerCode],
            active: true,
          });
        }
      }
    }

    console.log("✓ Brand-retailer mappings created");

    // 6. Install audit triggers
    console.log("Installing audit triggers...");
    const triggersSQL = readFileSync(
      join(__dirname, "triggers.sql"),
      "utf-8"
    );

    await db.execute(sql.raw(triggersSQL));

    console.log("✓ Audit triggers installed on 9 tables");

    console.log("🎉 Database seeded successfully!");
    console.log("\nSummary:");
    console.log("- 4 users (kaaba@petrabrands.com, sales@, purchasing@, warehouse@)");
    console.log("- 5 brands (Fomin, Luna Naturals, EveryMood, Roofus, House of Party)");
    console.log(`- ${skusList.length} SKUs generated programmatically`);
    console.log("- 16 retailers");
    console.log("- Brand-retailer mappings");
    console.log("\nAll passwords: admin123");
  } catch (error) {
    console.error("❌ Seed failed:", error);
    throw error;
  }
}

seed()
  .catch((err) => {
    console.error("Seed error:", err);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
