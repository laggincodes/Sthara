# Vercel Deployment Handoff

This repository now includes a Vercel Node serverless entry at `api/[...path].ts`. It reuses the existing Express, Clerk middleware, tRPC, and PostGIS API wiring. The Vite application builds to `dist/public`; `vercel.json` serves that SPA and routes API requests through the serverless handler.

> **Compatibility note.** The existing Manus deployment remains the reference environment. Vercel does not supply Manus built-in Forge AI or storage services, so the AI-assisted extraction/search and evidence-file storage paths require portable replacements before they can be described as fully operational on Vercel.

## Deployment sequence

Connect the repository `Gautam-kumar01/SIH-2026` in Vercel. Set the project Root Directory to the repository root, select the default detected framework settings, and use the included `pnpm build` command. Vercel should use the `dist/public` output directory and the `api/[...path].ts` Node function.

## Required Vercel environment variables

| Variable | Exposure | Purpose |
|---|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | Public build variable | Loads the Clerk browser components. |
| `CLERK_SECRET_KEY` | Server secret | Verifies Clerk sessions in Express. |
| `POSTGIS_DATABASE_URL` | Server secret | Reads source-backed PostGIS geometry. |
| `POSTGIS_API_KEY` | Server secret | Protects the PostGIS GeoJSON endpoint. |
| `VITE_CESIUM_ION_ACCESS_TOKEN` | Public build variable | Enables Cesium visual context services. |
| `DATABASE_URL` | Server secret | Supports application workflow, roles, and audit records. |
| `CLERK_BOOTSTRAP_ADMIN_USER_IDS` | Server secret, optional | Comma-separated Clerk IDs used only to provision the initial Administrator. |

`CLERK_PUBLISHABLE_KEY`, `JWT_SECRET`, and any legacy `OAUTH_*` values should only be added if a configured integration in the deployment still consumes them. Do not commit values in this repository.

## Required Clerk dashboard updates

Add the final Vercel production URL and preview URL pattern to Clerk’s allowed origins, redirect URLs, and OAuth callback configuration. Clerk must receive the final Vercel domain before browser sign-in can complete on that domain.

## Portable replacements required for parity

The current project routes AI operations through `BUILT_IN_FORGE_API_URL` and `BUILT_IN_FORGE_API_KEY`, and evidence files through the existing Manus storage helper. Those services are not injected by Vercel. Before enabling those features in a Vercel production deployment, configure a provider-owned LLM secret and object storage provider, then update the corresponding server adapters. Do not copy Manus-internal Forge credentials to Vercel.

## Validation after deployment

Confirm that the root route displays the branded Clerk sign-in interface, that `/overview` presents the public dashboard, that `/api/trpc` answers authenticated requests, and that a Citizen account receives a server-side forbidden response from `platform.adminSettings`. Finally, confirm that an Administrator account can load the settings dialog while ordinary accounts cannot.
