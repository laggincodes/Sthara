# Clerk Entry Route Check

| Route and build state | Observed result |
|---|---|
| Published root before this change | The dashboard home rendered directly at `/`. |
| Local root after this change | The secure-access screen rendered at `/` with the fully loaded Clerk email/password and Google sign-in options, plus **Create account** and **View public project overview** controls. |
| Local public-overview route | Selecting **View public project overview** opened the intact dashboard home at `/overview`. |

The entry route now presents Clerk-managed access first. The original public project overview remains available at `/overview`; successful Clerk sign-in retains the existing safe return default to `/dashboard`.
