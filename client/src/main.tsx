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
    colorInputBackground: "#11222b",
    colorInputText: "#ffffff",
    colorText: "#ffffff",
    colorTextSecondary: "#cbd5e1",
    colorTextOnPrimaryBackground: "#062126",
    colorDanger: "#f87171",
    colorSuccess: "#34d399",
    colorWarning: "#fbbf24",
    borderRadius: "0.75rem",
    fontFamily: "Space Grotesk, DM Sans, ui-sans-serif, system-ui, sans-serif",
    fontSize: "0.875rem",
  },
  elements: {
    rootBox: "w-full",
    card: "bg-transparent shadow-none border-0 w-full text-white",
    headerTitle: "text-white font-bold text-lg tracking-tight",
    headerSubtitle: "text-slate-300 font-normal text-xs leading-relaxed",
    socialButtonsBlockButton:
      "border border-cyan-500/40 bg-[#132530] text-white hover:bg-[#1b3442] hover:border-cyan-400 shadow-sm transition-all py-2.5",
    socialButtonsBlockButtonText: "text-white font-semibold text-sm",
    socialButtonsIconButton:
      "border border-cyan-500/40 bg-[#132530] text-white hover:bg-[#1b3442]",
    dividerLine: "bg-slate-700",
    dividerText: "text-slate-300 font-semibold text-xs tracking-wider",
    formFieldLabel: "text-slate-200 font-medium text-xs mb-1",
    formFieldLabelRow: "text-slate-200",
    formFieldInput:
      "border border-cyan-500/40 bg-[#11222b] text-white placeholder-slate-500 focus:border-[#2ad4d9] focus:ring-1 focus:ring-[#2ad4d9] focus:bg-[#152a35] rounded-xl text-sm font-medium py-2.5 px-3.5",
    otpCodeField: "gap-2 my-4 justify-center",
    otpCodeFieldInputs: "gap-2.5 justify-center",
    otpCodeFieldInput:
      "border-2 border-cyan-500/60 bg-[#132833] text-white text-xl font-bold text-center rounded-xl focus:border-[#2ad4d9] focus:bg-[#193442] focus:ring-2 focus:ring-[#2ad4d9]/50 shadow-md h-12 w-11",
    formButtonPrimary:
      "bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 hover:from-cyan-400 hover:to-blue-400 font-bold text-sm shadow-md shadow-cyan-500/20 py-2.5 rounded-xl transition-all",
    footerActionText: "text-slate-400 text-xs",
    footerActionLink: "text-cyan-400 hover:text-cyan-300 font-semibold text-xs",
    identityPreviewText: "text-white font-semibold text-sm",
    identityPreviewEditButton: "text-cyan-400 hover:text-cyan-300 font-medium",
    identityPreviewEditButtonIcon: "text-cyan-400",
    formResendCodeLink:
      "text-cyan-400 hover:text-cyan-300 font-semibold text-xs",
    alternativeMethodsLink:
      "text-cyan-400 hover:text-cyan-300 font-semibold text-xs",
    footerPagesLink: "text-cyan-400 hover:text-cyan-300 text-xs",
    formFieldSuccessText: "text-emerald-400 text-xs",
    formFieldErrorText: "text-rose-400 font-medium text-xs",
    formFieldWarningText: "text-amber-400 text-xs",
    formFieldInfoText: "text-slate-400 text-xs",
    formFieldAction: "text-cyan-400 hover:text-cyan-300 text-xs font-medium",
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
