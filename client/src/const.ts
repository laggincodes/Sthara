/**
 * Compatibility helper for existing UI actions. Authentication is hosted by
 * Clerk at /access; this app never mints or stores password/session tokens.
 */
export const startLogin = () => {
  window.location.assign("/access");
};
