# Server-Controlled Role Assignment

Clerk manages identity, passwords, session recovery, and user-managed personal information. The application database stores only the Clerk user ID and a server-assigned role. A new authenticated user is created as a `citizen` by the backend unless their Clerk ID is present in the server-only bootstrap-administrator configuration.

| Role | How it is obtained | What the user can change from Profile Settings |
|---|---|---|
| Citizen | Default server-side role at first account mapping | Personal name and local appearance/motion preferences only |
| Authority | Assigned by an existing Administrator through the protected backend workflow | Personal name and local appearance/motion preferences only |
| Government Employee | Assigned by an existing Administrator through the protected backend workflow | Personal name and local appearance/motion preferences only |
| Administrator | Assigned by an existing Administrator, or configured through the server-only bootstrap ID list | Personal name and local appearance/motion preferences only |

The profile-settings page deliberately has no role selector and no client-accessible role mutation. Profile changes use Clerk’s account API, and the application role continues to be checked by protected backend procedures.
