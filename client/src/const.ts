/**
 * Compatibility helper for existing UI actions. Clerk hosts identity and never
 * hands application-managed password/session tokens to this client.
 */
export const startLogin = (returnTo = "/dashboard") => {
  const safeReturnTo =
    returnTo.startsWith("/") && !returnTo.startsWith("//")
      ? returnTo
      : "/dashboard";
  const accessUrl = new URL("/access", window.location.origin);
  accessUrl.searchParams.set("returnTo", safeReturnTo);
  window.location.assign(`${accessUrl.pathname}${accessUrl.search}`);
};
