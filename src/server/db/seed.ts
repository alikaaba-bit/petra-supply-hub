import { db } from "./index";
import { users } from "./schema";
import { sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { readFileSync } from "fs";
import { join } from "path";

async function seed() {
  console.log("🌱 Seeding database...");

  try {
    // 1. Create CEO user
    console.log("Creating CEO user...");
    const passwordHash = await bcrypt.hash("admin123", 10);

    await db.insert(users).values({
      id: "ceo-kaaba",
      name: "Kaaba",
      email: "kaaba@petrograms.com",
      passwordHash,
      role: "ceo",
      active: true,
    });

    console.log("✓ CEO user created (kaaba@petrograms.com / admin123)");

    // 2. Install audit triggers
    console.log("Installing audit triggers...");
    const triggersSQL = readFileSync(
      join(__dirname, "triggers.sql"),
      "utf-8"
    );

    await db.execute(sql.raw(triggersSQL));

    console.log("✓ Audit triggers installed on 9 tables");

    console.log("🎉 Database seeded successfully!");
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
