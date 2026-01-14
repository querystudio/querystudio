import { Outlet, createRootRoute } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { useUpdateChecker } from "@/hooks/use-update-checker";
import { useBetterAuthTauri } from "@daveyplate/better-auth-tauri/react";
import { authClient, AUTH_SCHEME } from "@/lib/auth-client";
import { toast } from "sonner";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      refetchOnWindowFocus: true,
    },
  },
});

export const Route = createRootRoute({
  component: RootComponent,
});

function UpdateChecker() {
  useUpdateChecker();
  return null;
}

function RootComponent() {
  // Initialize Better Auth Tauri integration
  useBetterAuthTauri({
    authClient,
    scheme: AUTH_SCHEME,
    debugLogs: import.meta.env.DEV,
    onRequest: (href) => {
      console.log("Auth request:", href);
      toast.info("Authentication request received");
    },
    onSuccess: (callbackURL) => {
      console.log("Auth successful, callback URL:", callbackURL);
      toast.success("Authentication successful!");
    },
    onError: (error) => {
      console.error("Auth error:", error);
      toast.error(`Authentication failed: ${error.message}`);
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <UpdateChecker />
      <Outlet />
    </QueryClientProvider>
  );
}
