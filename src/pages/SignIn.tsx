import { LogIn, TriangleAlert } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { BrandMark } from "../components/BrandMark";
import { VersionFooter } from "../components/VersionFooter";
import { Button } from "@/components/ui/button";

/**
 * Shown in multi-user (OIDC) mode until a user is signed in. Kicks off the
 * Authorization Code + PKCE redirect to the configured issuer.
 */
export function SignIn() {
  const { signIn, oidc, error } = useAuth();
  let issuerHost = "";
  try {
    issuerHost = oidc?.issuer ? new URL(oidc.issuer).host : "";
  } catch {
    /* ignore */
  }

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="bg-primary/10 text-primary ring-primary/25 mb-4 flex size-12 items-center justify-center rounded-2xl ring-1">
            <BrandMark className="size-6" />
          </span>
          <h1 className="text-xl font-semibold tracking-tight">Sign in to continue</h1>
          <p className="text-muted-foreground mt-1.5 text-sm">
            This dashboard uses single sign-on{issuerHost ? ` via ${issuerHost}` : ""}.
          </p>
        </div>

        <div className="bg-card space-y-4 rounded-2xl border p-5">
          {error && (
            <p className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-500">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
              {error}
            </p>
          )}
          <Button type="button" onClick={signIn} className="w-full">
            <LogIn className="size-4" /> Sign in
          </Button>
        </div>

        <VersionFooter />
      </div>
    </div>
  );
}
