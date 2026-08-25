import { defineConfig } from "drizzle-kit";

const connectionString = process.env.POSTGIS_DATABASE_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "POSTGIS_DATABASE_URL or DATABASE_URL is required to run drizzle commands"
  );
}

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle/postgres",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
});
