import "dotenv/config";
import { Pool } from "pg";
import * as fs from "fs";
import * as path from "path";
import { ensureMasterSeedData } from "../server/db";

async function runMigration() {
  const connectionString =
    process.env.POSTGIS_DATABASE_URL ?? process.env.DATABASE_URL;

  if (!connectionString) {
    console.error("❌ No POSTGIS_DATABASE_URL or DATABASE_URL found in environment.");
    process.exit(1);
  }

  console.log("🔗 Connecting to Neon PostgreSQL database...");
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const client = await pool.connect();
    console.log("✅ Connected to PostgreSQL database successfully.");

    // Check existing tables
    const tableRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public';
    `);
    const existingTables = tableRes.rows.map(r => r.table_name);
    console.log("📊 Existing tables:", existingTables);

    // Read and run migration 0000 if users table doesn't exist
    if (!existingTables.includes("users")) {
      console.log("⚡ Executing 0000_vengeful_wallflower.sql...");
      const sql0 = fs.readFileSync(
        path.join(process.cwd(), "drizzle/postgres/0000_vengeful_wallflower.sql"),
        "utf8"
      );
      const statements0 = sql0.split("--> statement-breakpoint");
      for (const stmt of statements0) {
        const trimmed = stmt.trim();
        if (trimmed) {
          try {
            await client.query(trimmed);
          } catch (err: any) {
            console.warn(`[0000 Notice] ${err.message}`);
          }
        }
      }
      console.log("✅ 0000 migration complete.");
    }

    // Ensure enum values exist in account_status
    console.log("⚡ Ensuring enum values exist in account_status...");
    try {
      await client.query(`ALTER TYPE account_status ADD VALUE IF NOT EXISTS 'ACTIVE';`);
      await client.query(`ALTER TYPE account_status ADD VALUE IF NOT EXISTS 'INVITED';`);
      await client.query(`ALTER TYPE account_status ADD VALUE IF NOT EXISTS 'SUSPENDED';`);
      await client.query(`ALTER TYPE account_status ADD VALUE IF NOT EXISTS 'DISABLED';`);
    } catch (e: any) {
      console.warn(`[account_status enum notice] ${e.message}`);
    }

    // Ensure timestamp columns exist on master tables
    console.log("⚡ Ensuring timestamp columns exist on master tables...");
    await client.query(`
      ALTER TABLE "departments" 
        ADD COLUMN IF NOT EXISTS "createdAt" timestamp DEFAULT now(),
        ADD COLUMN IF NOT EXISTS "updatedAt" timestamp DEFAULT now();
      ALTER TABLE "districts" 
        ADD COLUMN IF NOT EXISTS "createdAt" timestamp DEFAULT now(),
        ADD COLUMN IF NOT EXISTS "updatedAt" timestamp DEFAULT now();
      ALTER TABLE "organizations" 
        ADD COLUMN IF NOT EXISTS "createdAt" timestamp DEFAULT now(),
        ADD COLUMN IF NOT EXISTS "updatedAt" timestamp DEFAULT now();
    `);
    console.log("✅ Master table columns aligned.");

    // Create invitations table if not exists
    console.log("⚡ Ensuring invitations and password_reset_tokens tables exist...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS "invitations" (
        "id" serial PRIMARY KEY NOT NULL,
        "email" varchar(320) NOT NULL,
        "name" varchar(160),
        "phone" varchar(48),
        "assignedRole" "platform_role" NOT NULL,
        "tokenHash" varchar(128) NOT NULL UNIQUE,
        "status" varchar(32) DEFAULT 'PENDING' NOT NULL,
        "departmentId" integer,
        "districtId" integer,
        "organizationId" integer,
        "jurisdiction" text,
        "designation" varchar(160),
        "createdByClerkUserId" varchar(96),
        "createdByEmail" varchar(320),
        "expiresAt" timestamp NOT NULL,
        "acceptedAt" timestamp,
        "createdAt" timestamp DEFAULT now() NOT NULL,
        "updatedAt" timestamp DEFAULT now() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
        "id" serial PRIMARY KEY NOT NULL,
        "email" varchar(320) NOT NULL,
        "tokenHash" varchar(128) NOT NULL UNIQUE,
        "status" varchar(32) DEFAULT 'PENDING' NOT NULL,
        "expiresAt" timestamp NOT NULL,
        "usedAt" timestamp,
        "createdAt" timestamp DEFAULT now() NOT NULL
      );
    `);
    console.log("✅ Token & invitation tables verified.");

    client.release();

    // Now seed master reference data
    console.log("🌱 Running ensureMasterSeedData()...");
    await ensureMasterSeedData();
    console.log("✅ Master seed data verified/seeded successfully!");

    await pool.end();
    console.log("🎉 Database migration and initialization finished with 100% success!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

runMigration();
