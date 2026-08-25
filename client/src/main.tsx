import { ClerkProvider, useAuth as useClerkAuth } from "@clerk/react";
import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from "@shared/const";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { useMemo } from "react";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { startLogin } from "./const";
import "./index.css";

// Clerk publishable keys are designed for browser use. Prefer the standard Vite
// name, while accepting the existing Vercel project alias during migration.
const publishableKey =
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ??
  import.meta.env.CLERK_PUBLISH_KEY;
const queryClient = new QueryClient();
const clerkAppearance = {
  variables: {
    colorPrimary: "#2ad4d9",
    colorBackground: "#0b171d",
    colorInputBackground: "#071015",
    colorInputText: "#eafff9",
    colorText: "#eafff9",
    colorTextSecondary: "#9cbcb7",
    colorDanger: "#eba760",
    borderRadius: "0.75rem",
    fontFamily: "Space Grotesk, ui-sans-serif, system-ui, sans-serif",
  },
  elements: {
    rootBox: "w-full",
    card: "bg-transparent shadow-none border-0 w-full",
    headerTitle: "text-[#eafff9]",
    headerSubtitle: "text-[#9cbcb7]",
    socialButtonsBlockButton:
      "border-[#2a5559] bg-[#102129] text-[#eafff9] hover:bg-[#17323b]",
    dividerLine: "bg-[#2a5559]",
    dividerText: "text-[#7ea29d]",
    formFieldLabel: "text-[#b8d4cf]",
    formFieldInput:
      "border-[#2a5559] bg-[#071015] text-[#eafff9] focus:border-[#2ad4d9]",
    formButtonPrimary: "bg-[#2ad4d9] text-[#062126] hover:bg-[#74ebe9]",
    footerActionText: "text-[#9cbcb7]",
    footerActionLink: "text-[#75e7de] hover:text-[#b9fffa]",
    identityPreviewText: "text-[#eafff9]",
    identityPreviewEditButton: "text-[#75e7de]",
  },
};

const redirectToClerkSignIn = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (error.message !== UNAUTHED_ERR_MSG) return;
  startLogin();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    redirectToClerkSignIn(event.query.state.error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    redirectToClerkSignIn(event.mutation.state.error);
  }
});

function ClerkTrpcBridge() {
  const { getToken } = useClerkAuth();
  const trpcClient = useMemo(
    () =>
      trpc.createClient({
        links: [
          httpBatchLink({
            url: "/api/trpc",
            transformer: superjson,
            headers: async () => {
              const token = await getToken();
              return token ? { Authorization: `Bearer ${token}` } : {};
            },
            fetch(input, init) {
              return globalThis.fetch(input, {
                ...(init ?? {}),
                credentials: "include",
              });
            },
          }),
        ],
      }),
    [getToken]
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </trpc.Provider>
  );
}

createRoot(document.getElementById("root")!).render(
  <ClerkProvider
    publishableKey={publishableKey}
    signInFallbackRedirectUrl="/dashboard"
    signUpFallbackRedirectUrl="/dashboard"
    appearance={clerkAppearance}
  >
    <ClerkTrpcBridge />
  </ClerkProvider>
);
