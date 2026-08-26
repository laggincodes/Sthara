# Clerk Entry Route Check

| Route and build state | Observed result |
|---|---|
| Published root before this change | The dashboard home rendered directly at `/`. |
| Local root after this change | The secure-access screen rendered at `/` with the fully loaded Clerk email/password and Google sign-in options, plus **Create account** and **View public project overview** controls. |
| Local public-overview route | Selecting **View public project overview** opened the intact dashboard home at `/overview`. |

The entry route now presents Clerk-managed access first. The original public project overview remains available at `/overview`; successful Clerk sign-in retains the existing safe return default to `/dashboard`.

## Production propagation observation

Immediately after publishing checkpoint `5680ff8b`, two cache-busted requests to the production domain still returned the prior dashboard at `/`. The local preview served the corrected Clerk-first entry route. A follow-up production checkpoint (`5c73792a`) and repository synchronization were completed. After the deployment-success notification, the public root displayed the Clerk-first access page; the loaded Clerk component exposed Google and email/password sign-in controls. The original dashboard is available only through the explicit `/overview` route.

## Branded Clerk follow-up

The local updated entry route retained the secure-access shell and sign-in/create-account controls during two browser checks. A subsequent browser check confirmed that the mounted Clerk form uses the dark application palette with cyan primary controls. The unauthenticated dashboard profile control redirects to `/access?returnTo=/overview` rather than exposing session options or protected settings.

## Vercel public-access verification

Vercel SSO protection was disabled only after explicit user authorization. Password protection and trusted-IP protections remain disabled as before; the application-owned Clerk, server-side RBAC, API authentication, and evidence safeguards were not changed. The ready production deployment at `sih-2026-bjpc802x4-gautam-kumar01s-projects.vercel.app` now reaches the 3D ULPIN-VPM secure-access shell rather than redirecting to Vercel login. The hosted Clerk component was still mounting in the fresh Vercel snapshot and must be rechecked after its remote script completes.

After the user confirmed the Vercel environment variables and a new GitHub-triggered production deployment (`247c20f6`) reached READY, two fresh checks of `sih-2026-1mrusyr2q-gautam-kumar01s-projects.vercel.app` still showed only the secure-access shell. The next check must inspect Clerk runtime state and Vercel build/runtime configuration rather than treating the variable names alone as confirmation of a browser-visible value.

After adding safe support for the user-configured public `CLERK_PUBLISH_KEY` alias and pushing checkpoint `414dcc72`, the Vercel main-branch alias was checked twice. It still displayed the secure-access shell without a mounted Clerk form. The next diagnostic step must distinguish a delayed/stale deployment from an actual build-time environment injection issue.

The Vercel main-branch bundle now contains a valid redacted `pk_test_…` Clerk public key resolving to the configured Clerk development frontend API, so the browser-key injection issue is corrected. In contrast, the Vercel page still does not load any Clerk resources or mount the hosted form, while the same application opens a fully mounted Clerk form in the local Manus preview. This isolates the remaining blocker to the Clerk instance’s allowed-origin/redirect configuration for the Vercel domain, rather than a missing Vercel environment variable.

## Vercel API recovery follow-up

After isolating local Vite startup code from the serverless bundle and adding a server-side compatibility fallback for the existing public Clerk key name, the Vercel `/api/trpc/auth.me` endpoint returned HTTP 200 with `x-clerk-auth-status: signed-out`, confirming that the Express, tRPC, and Clerk middleware path is live. A subsequent public-root snapshot remained blank with no browser-console output, so client asset routing and client initialization must be verified separately before declaring the end-user sign-in loop resolved.

After restoring Vercel filesystem handling ahead of the API and SPA fallback rules, the current main-branch root served a real JavaScript bundle and the public secure-access page rendered. The Clerk runtime reported `loaded: true` with no error, and the mounted sign-in root/card measured 400×556/400×412 pixels. The access card is intentionally taller than the first viewport; its form is below the introductory copy and available by scrolling, not missing or clipped.

The browser console subsequently exposed an unrelated failed request to the literal URL `%VITE_ANALYTICS_ENDPOINT%/umami`. Its source was an unconditional analytics script in `client/index.html`; Vite preserves missing HTML substitutions literally. The script was removed rather than pointing telemetry at an unknown endpoint. A dedicated template regression test, TypeScript check, and production build passed. This correction does not alter Clerk, API authentication, RBAC, or evidence controls.

Vercel deployed GitHub commit `836c35fe` successfully as production deployment `dpl_4QQrab4qks4snY8bHp6z51FjucPm`. Its immutable deployment URL reached the access shell during the initial browser check. The hosted Clerk form had not yet appeared in the sandbox accessibility snapshot after a short wait, so client runtime and console checks remain required before treating that separate mounting observation as resolved.

The ready deployment’s browser console then returned no messages, confirming the failed literal analytics request is gone. Runtime inspection confirmed `window.Clerk.loaded === true`, Clerk status `ready`, one mounted `.cl-rootBox`, one `.cl-card`, and no `%VITE_ANALYTICS_ENDPOINT%` text in the loaded document. The remaining shell-only accessibility snapshot is therefore a snapshot-timing/rendering artifact, not a failed Clerk initialization.

A final rendered browser check displayed the complete Clerk sign-in interface with Google, email, password, continue, and sign-up controls. The same immutable deployment retained a `200 application/json` response from `/api/trpc/auth.me` with `x-clerk-auth-status: signed-out`, which is the expected unauthenticated state. An end-user signed-in redirect to `/dashboard` still requires a real account session and is not inferred from this unauthenticated validation.

The Clerk structural-CSS warning was traced to `.access-portal__clerk .cl-card`, which targets an internal Clerk DOM class. The stylesheet selector was removed. The width and dashboard palette continue to be supplied through the supported `ClerkProvider` appearance `elements.card` configuration. The focused platform and analytics tests, TypeScript check, and production build passed before release.

After synchronizing the selector-removal release to GitHub `main`, the Vercel main-branch alias again rendered the full branded Clerk sign-in interface. Console verification is the remaining production check for the absence of the structural-CSS warning.

The production console check returned no messages. The unsupported structural-CSS warning is resolved, while the branded form remains mounted and visible.

The `unload is not allowed` violation was traced to the project’s Manus development debug collector, whose browser script registers `beforeunload` to report logs. The collector plugin was previously enabled during a build whenever `NODE_ENV` was not explicitly set. It is now Vite `serve`-only, so it still supports local debugging but cannot inject the unload listener into Vercel production HTML. Focused regression tests, TypeScript, and a production build check that asserts the collector script is absent from `dist/public/index.html` passed.

The Vercel main-branch alias for the unload-policy release renders the complete branded Clerk sign-in form after the normal hosted-component load delay. The remaining production verification is its console output and authenticated API continuity.

The production console check returned no messages, so the unload permission-policy violation is gone. The same Vercel alias retained `200 application/json` from `/api/trpc/auth.me` with `x-clerk-auth-status: signed-out`, confirming that public Clerk access and the signed-out API path remain intact.

The reported post-sign-in dashboard loop has a separate backend cause. The deployed `DATABASE_URL` target is MySQL, while the configured `POSTGIS_DATABASE_URL` is the existing Neon PostgreSQL database. The former MySQL Drizzle template could not map a Clerk identity to an application user after sign-in, which left `/dashboard` rendering the access component again. The code now uses PostgreSQL/Neon for server-side Clerk profile and role storage, and a signed-in user with an unavailable profile sees a stable retry/sign-out state rather than a sign-in loop. The reviewed migration adds only application tables and enum types; it does not modify the existing spatial tables. The initial user record will be created only after that migration is applied to Neon.

The user confirmed the Neon migration was applied. A read-only PostgreSQL schema check confirmed all required application tables are present: `users`, `cadastreRecords`, `evidenceFiles`, `issueReports`, `verificationSubmissions`, and `auditLogs`. Existing spatial tables were not queried or changed. The remaining confirmation is a real signed-in retry so the backend can create the user’s server-assigned Citizen profile and open `/dashboard`.

The final sidebar issue was caused by legacy workspace buttons that still routed to `/`, which is now the Clerk access page. A signed-in Clerk session then correctly resumed at `/dashboard`, making the intended Parcels, Buildings, Command Home, and registry actions appear to fail. The navigation now uses explicit destinations: Parcels and Buildings retain `/workspace` segment routes, Command Home uses `/overview`, ULPIN Registry uses `/ulpin-registry`, and dashboard-return controls use `/dashboard`. Focused routing regressions, TypeScript, production build, and local visual checks of all four destinations passed.
