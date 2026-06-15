import { useState } from "react";
import { LogIn, MonitorSmartphone } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { BrandMark } from "../components/BrandMark";
import { VersionFooter } from "../components/VersionFooter";
import { Button } from "@/components/ui/button";
import { Onboarding } from "./Onboarding";

/**
 * Shown in multi-user (OIDC) mode until a user is signed in. The button does a
 * full-page redirect to the hub's /auth/login. Devices that can't do SSO (a
 * shared display, an intranet box) fall back to the token/pairing-code flow.
 */
export function SignIn() {
  const { signIn, oidc } = useAuth();
  const [device, setDevice] = useState(false);
  let issuerHost = "";
  try {
    issuerHost = oidc?.issuer ? new URL(oidc.issuer).host : "";
  } catch {
    /* ignore */
  }

  // The device fallback reuses the token onboarding (pairing code / QR / token);
  // redeeming stores a token, which the Gate then connects with.
  if (device) return <Onboarding onBack={() => setDevice(false)} />;

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

        <div className="bg-card rounded-2xl border p-5">
          <Button type="button" onClick={signIn} className="w-full">
            <LogIn className="size-4" /> Sign in
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setDevice(true)}
          className="text-muted-foreground hover:text-foreground mx-auto mt-4 flex items-center gap-1.5 text-xs"
        >
          <MonitorSmartphone className="size-3.5" />
          Set up a device that can’t sign in (pairing code)
        </button>

        <VersionFooter />
      </div>
    </div>
  );
}
