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
