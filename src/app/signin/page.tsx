/**
 * /signin — the only public route. Triggers the BFF auth flow via a
 * top-level navigation to GET /api/auth/login (ADR-0009).
 */
import { Icon } from "@/components/ui/Icon";

const ALLOWED_PATH = /^\/[A-Za-z0-9_\-/?&=.%]*$/;

function safeReturnTo(raw: string | undefined): string {
  if (!raw) return "/overview";
  if (raw.startsWith("/signin")) return "/overview";
  return ALLOWED_PATH.test(raw) ? raw : "/overview";
}

export default async function SignInPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ return_to?: string }>;
}>) {
  const sp = await searchParams;
  const returnTo = safeReturnTo(sp.return_to);
  const loginHref = `/api/auth/login?return_to=${encodeURIComponent(returnTo)}`;
  return (
    <main
      style={{
        display: "grid",
        placeItems: "center",
        minHeight: "100vh",
        padding: "var(--s32)",
      }}
    >
      <div
        style={{
          maxWidth: 460,
          border: "1px solid var(--c-border)",
          padding: "var(--s40)",
          background: "var(--c-panel)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "var(--s24)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/kumbuka-mark-orange.svg" alt="" style={{ height: 36 }} />
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: "-0.02em",
            }}
          >
            kumbuka<span style={{ color: "var(--accent)" }}>.ai</span>
          </div>
        </div>
        <span className="eyebrow">{"// "}memory console</span>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 28,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            margin: "var(--s12) 0 var(--s12)",
          }}
        >
          Sign in to your team
        </h1>
        <p style={{ color: "var(--c-muted)", fontSize: 14, lineHeight: 1.55, margin: 0 }}>
          Authentication is handled by your identity provider. You&apos;ll be redirected, sign in there,
          and land back here.
        </p>
        <div style={{ marginTop: "var(--s24)" }}>
          <a className="btn primary" href={loginHref} style={{ width: "100%", justifyContent: "center" }}>
            <Icon name="key" />
            <span>Sign in with Keycloak</span>
          </a>
        </div>
        <div
          style={{
            marginTop: "var(--s24)",
            padding: "var(--s16)",
            border: "1px dashed var(--c-border)",
            background: "var(--c-inset)",
            display: "flex",
            gap: 12,
          }}
        >
          <Icon name="lock" />
          <div style={{ fontSize: 12.5, color: "var(--c-muted)", lineHeight: 1.5 }}>
            Your private memory is never shared and never visible in this console — that&apos;s a
            guarantee enforced by the backend, not by configuration.
          </div>
        </div>
      </div>
    </main>
  );
}
