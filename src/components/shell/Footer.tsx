import type { BackendVersion } from "@/lib/version";
import { CONSOLE_VERSION } from "@/lib/version";

/**
 * Layout footer — small, fixed at the bottom of the main area, showing
 * the running console + backend versions. Diagnostic affordance for
 * operators ("which build am I looking at?"); deliberately discreet so
 * it doesn't compete with content for attention.
 *
 * Backend version comes from `/api/version` (kumbuka-server, @PermitAll);
 * a null `backend` (transport hiccup) renders a `—` placeholder rather
 * than hiding the footer altogether.
 */
export function Footer({ backend }: Readonly<{ backend: BackendVersion }>) {
  const backendVer = backend?.version ?? "—";
  return (
    <footer className="app-footer" aria-label="Version info">
      <span>
        console <code>{CONSOLE_VERSION}</code>
      </span>
      <span aria-hidden="true">·</span>
      <span>
        backend <code>{backendVer}</code>
      </span>
    </footer>
  );
}
