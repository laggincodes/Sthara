import { useClerk, useUser } from "@clerk/react";
import { trpc } from "@/lib/trpc";
import { useCallback, useEffect, useMemo } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = "/access" } =
    options ?? {};
  const { isLoaded, isSignedIn, user: clerkUser } = useUser();
  const clerk = useClerk();
  const utils = trpc.useUtils();
  const meQuery = trpc.auth.me.useQuery(undefined, {
    enabled: Boolean(isLoaded && isSignedIn),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const logout = useCallback(async () => {
    await clerk.signOut({ redirectUrl: "/" });
    utils.auth.me.setData(undefined, null);
  }, [clerk, utils.auth.me]);

  const state = useMemo(
    () => ({
      user: meQuery.data ?? null,
      clerkUser,
      loading: !isLoaded || (Boolean(isSignedIn) && meQuery.isLoading),
      error: meQuery.error ?? null,
      isAuthenticated: Boolean(isSignedIn && meQuery.data),
    }),
    [clerkUser, isLoaded, isSignedIn, meQuery.data, meQuery.error, meQuery.isLoading]
  );

  useEffect(() => {
    if (!redirectOnUnauthenticated || !isLoaded || isSignedIn) return;
    if (window.location.pathname === redirectPath) return;
    window.location.assign(redirectPath);
  }, [isLoaded, isSignedIn, redirectOnUnauthenticated, redirectPath]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
