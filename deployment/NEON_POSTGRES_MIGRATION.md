# Neon Application Profile Migration

The Vercel application now stores Clerk-linked application users and backend-assigned roles in the existing PostgreSQL deployment database selected by `POSTGIS_DATABASE_URL`. This aligns the dashboard role lookup with the configured Neon/PostGIS architecture instead of using the local MySQL template URL.

The reviewed, non-destructive initial PostgreSQL schema is in `drizzle/postgres/0000_vengeful_wallflower.sql`. It creates only the application tables and enum types required by the dashboard; it does not modify the existing spatial tables.

Run that SQL once in the Neon SQL Editor connected to the database used by `POSTGIS_DATABASE_URL`. After it succeeds, redeploy Vercel or refresh the dashboard. The first authenticated Clerk request creates the user as a server-side `citizen`, unless the Clerk ID appears in the server-only `CLERK_BOOTSTRAP_ADMIN_USER_IDS` configuration.

Do not put the Neon connection string in client code. Keep `POSTGIS_DATABASE_URL` and `CLERK_SECRET_KEY` server-side only. The browser continues to use only the Clerk publishable key.
