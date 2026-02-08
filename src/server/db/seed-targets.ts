import { db } from "./index";
import { revenueTargets, brands } from "./schema";
import { eq } from "drizzle-orm";

const targets = [
  // Jan 2026
  { brand: "Fomin", month: "2026-01-01", total: 648435, amazon: 288435, retail: 344000 },
  { brand: "House of Party", month: "2026-01-01", total: 194000, amazon: 0, retail: 184000 },
  { brand: "EveryMood", month: "2026-01-01", total: 114091, amazon: 0, retail: 114091 },
  { brand: "Roofus", month: "2026-01-01", total: 198000, amazon: 12000, retail: 152000 },
  { brand: "Luna Naturals", month: "2026-01-01", total: 7000, amazon: 0, retail: 4000 },
  // Feb 2026
  { brand: "Fomin", month: "2026-02-01", total: 637994, amazon: 276994, retail: 337000 },
  { brand: "House of Party", month: "2026-02-01", total: 265000, amazon: 45000, retail: 220000 },
  { brand: "EveryMood", month: "2026-02-01", total: 163000, amazon: 25000, retail: 136000 },
  { brand: "Roofus", month: "2026-02-01", total: 166000, amazon: 15000, retail: 95000 },
  { brand: "Luna Naturals", month: "2026-02-01", total: 88900, amazon: 0, retail: 83900 },
  // Mar 2026
  { brand: "Fomin", month: "2026-03-01", total: 768035, amazon: 369535, retail: 370000 },
  { brand: "House of Party", month: "2026-03-01", total: 253000, amazon: 0, retail: 253000 },
  { brand: "EveryMood", month: "2026-03-01", total: 291000, amazon: 25000, retail: 266000 },
  { brand: "Roofus", month: "2026-03-01", total: 234000, amazon: 20000, retail: 177000 },
  { brand: "Luna Naturals", month: "2026-03-01", total: 313582, amazon: 0, retail: 300582 },
];

async function seedTargets() {
  console.log("Seeding revenue targets...");

  const allBrands = await db.query.brands.findMany();
  const brandMap = new Map(allBrands.map((b) => [b.name, b.id]));

  let inserted = 0;

  for (const t of targets) {
    const brandId = brandMap.get(t.brand);
    if (!brandId) {
      console.warn(`Brand not found: ${t.brand}`);
      continue;
    }

    const rows = [
      { brandId, month: new Date(t.month), revenueTarget: String(t.total), channel: "all" },
      { brandId, month: new Date(t.month), revenueTarget: String(t.amazon), channel: "amazon" },
      { brandId, month: new Date(t.month), revenueTarget: String(t.retail), channel: "retail" },
    ];

    for (const row of rows) {
      try {
        await db
          .insert(revenueTargets)
          .values(row)
          .onConflictDoUpdate({
            target: [revenueTargets.brandId, revenueTargets.month, revenueTargets.channel],
            set: {
              revenueTarget: row.revenueTarget,
              updatedAt: new Date(),
            },
          });
        inserted++;
      } catch (err) {
        console.warn(`Failed to insert target for ${t.brand} ${t.month} ${row.channel}:`, err);
      }
    }
  }

  console.log(`Inserted/updated ${inserted} revenue targets`);
  console.log("Done!");
}

seedTargets()
  .catch((err) => {
    console.error("Seed targets error:", err);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
