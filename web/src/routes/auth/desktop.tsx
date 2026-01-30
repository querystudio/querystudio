import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Spinner from "@/components/ui/spinner";
import { Github, CheckCircle2, XCircle } from "lucide-react";

const DEEP_LINK_SCHEME = "querystudio://";

export const Route = createFileRoute("/auth/desktop")({
  component: DesktopAuthPage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      callback: (search.callback as string) || "auth/callback",
      error: search.error as string | undefined,
    };
  },
});

function DesktopAuthPage() {
  const { callback, error: urlError } = Route.useSearch();
  const { data: session, isPending } = authClient.useSession();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(urlError || null);
  const [redirecting, setRedirecting] = useState(false);

  // If user is already logged in, generate token and redirect to deep-link
  useEffect(() => {
    if (session && !isPending && !redirecting) {
      handleRedirectToApp();
    }
  }, [session, isPending]);

  const handleRedirectToApp = async () => {
    setRedirecting(true);

    try {
      // Generate a one-time token that the desktop app can use to establish a session
      const result = await authClient.oneTimeToken.generate();

      if (result.error || !result.data?.token) {
        setError("Failed to generate authentication token");
        setRedirecting(false);
        return;
      }

      const token = result.data.token;

      // Small delay to show success state
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Redirect to deep-link with the one-time token
      // The desktop app will verify this token to establish its own session
      const deepLinkUrl = `${DEEP_LINK_SCHEME}${callback}?token=${encodeURIComponent(token)}`;
      window.location.href = deepLinkUrl;
    } catch (err) {
      console.error("Failed to generate token:", err);
      setError("Failed to generate authentication token");
      setRedirecting(false);
    }
  };

  const handleGithubLogin = async () => {
    setIsLoggingIn(true);
    setError(null);

    try {
      // Start OAuth flow - this will redirect to GitHub
      // After GitHub auth, it redirects back here with the session cookie set
      await authClient.signIn.social({
        provider: "github",
        callbackURL: `/auth/desktop?callback=${encodeURIComponent(callback)}`,
        errorCallbackURL: `/auth/desktop?callback=${encodeURIComponent(callback)}&error=auth_failed`,
      });
    } catch (err) {
      console.error("GitHub login error:", err);
      setError("Failed to start GitHub login");
      setIsLoggingIn(false);
    }
  };

  const handleOpenApp = () => {
    window.location.href = `${DEEP_LINK_SCHEME}${callback}?cancelled=true`;
  };

  if (isPending) {
    return (
      <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm shadow-md">
          <CardContent className="flex items-center justify-center py-8">
            <Spinner size={32} />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (session && redirecting) {
    return (
      <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm shadow-md">
          <CardHeader className="space-y-1 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
            <CardTitle className="text-2xl font-bold">Signed In!</CardTitle>
            <CardDescription>Redirecting you back to QueryStudio...</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center py-4">
            <Spinner size={24} />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm shadow-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Sign in to QueryStudio</CardTitle>
          <CardDescription>
            Sign in with your GitHub account to continue to the desktop app
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              <XCircle className="h-4 w-4 shrink-0" />
              <span>
                {error === "auth_failed" ? "Authentication failed. Please try again." : error}
              </span>
            </div>
          )}

          <Button onClick={handleGithubLogin} disabled={isLoggingIn} className="w-full">
            {isLoggingIn ? <Spinner size={16} /> : <Github className="mr-2 h-4 w-4" />}
            {isLoggingIn ? "Redirecting to GitHub..." : "Continue with GitHub"}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          <Button variant="outline" onClick={handleOpenApp} className="w-full">
            Cancel and return to app
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
