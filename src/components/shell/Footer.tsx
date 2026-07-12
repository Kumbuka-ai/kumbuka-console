import type { BackendVersion } from "@/lib/version";
import { CONSOLE_VERSION, getBuildVersion } from "@/lib/version";
import { SupportEntry } from "@/components/feedback/SupportEntry";
import { Slot } from "@/slots/Slot";

/**
 * Layout footer — small, fixed at the bottom of the main area, showing
 * the running console + backend versions. Diagnostic affordance for
 * operators ("which build am I looking at?"); deliberately discreet so
 * it doesn't compete with content for attention.
 *
 * Each chip names the deployable that is actually running. When that
 * deployable is a composition around this package (KUMBUKA_BUILD_VERSION
 * set and differing) or around the backend (`backend.core` present and
 * differing), the core's version follows in a muted `(core …)` suffix and
 * the chip's `title` carries the full pair, so a copy-paste into a bug
 * report carries everything. With no separate deployable, exactly one
 * value is shown — a parenthesis repeating the same number is noise.
 *
 * Backend version comes from `/api/version` (kumbuka-server, @PermitAll);
 * a null `backend` (transport hiccup) renders a `—` placeholder rather
 * than hiding the footer altogether.
 *
 * The footer also carries the `footer.support` slot, unconditionally —
 * whether there is anything to show is the mounted component's own
 * decision. The default (SupportEntry) renders the feedback entry only
 * when its webhook sink is configured, so an unconfigured install shows
 * version chips and nothing else.
 */
export function Footer({ backend }: Readonly<{ backend: BackendVersion }>) {
  const build = getBuildVersion();
  const backendVer = backend?.version ?? "—";
  return (
    <footer className="app-footer" aria-label="Version info">
      {build && build !== CONSOLE_VERSION ? (
        <span title={`console ${build} (core ${CONSOLE_VERSION})`}>
          console <code>{build}</code> <span>(core {CONSOLE_VERSION})</span>
        </span>
      ) : (
        <span>
          console <code>{CONSOLE_VERSION}</code>
        </span>
      )}
      <span aria-hidden="true">·</span>
      {backend?.core && backend.core !== backend.version ? (
        <span title={`backend ${backend.version} (core ${backend.core})`}>
          backend <code>{backend.version}</code> <span>(core {backend.core})</span>
        </span>
      ) : (
        <span>
          backend <code>{backendVer}</code>
        </span>
      )}
      <Slot id="footer.support" fallback={<SupportEntry />} />
    </footer>
  );
}
