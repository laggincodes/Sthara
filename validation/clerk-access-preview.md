# Clerk access preview findings

The local `/access` route was verified on 2026-08-25 after the Clerk migration. Clerk’s hosted sign-in interface rendered successfully with Google and email/password options, while the page retained the platform’s source-aware access messaging. The access portal states that new accounts default to Citizen and that privileged roles are assigned only through backend Administrator actions. No application-managed password form or Neon password storage is present in this flow.
