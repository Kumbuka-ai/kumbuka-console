/**
 * @vitest-environment jsdom
 *
 * Behaviour tests for the (app) error boundary.
 *
 * The boundary's job is to keep the operator inside the console when a
 * transient backend hiccup throws during layout render — instead of the
 * generic 500 page, they see an actionable surface with a Retry that
 * calls Next.js' segment reset(). These tests pin that contract.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// The ErrorState primitive renders an <Icon /> — stub it so the test
// doesn't drag in the SVG sprite resolution.
vi.mock("@/components/ui/Icon", () => ({
  Icon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

import AppErrorBoundary from "./error";

function fakeError(opts: { digest?: string; message?: string } = {}) {
  const e = new Error(opts.message ?? "boom") as Error & { digest?: string };
  if (opts.digest) e.digest = opts.digest;
  return e;
}

describe("(app) AppErrorBoundary", () => {
  it("renders the polite 'backend temporarily unreachable' headline", () => {
    render(<AppErrorBoundary error={fakeError()} reset={vi.fn()} />);
    expect(screen.getByText(/Backend temporarily unreachable/i)).toBeTruthy();
  });

  it("surfaces the digest when Next.js provides one — so a screenshot maps to server logs", () => {
    render(<AppErrorBoundary error={fakeError({ digest: "486888060" })} reset={vi.fn()} />);
    expect(screen.getByText(/digest · 486888060/)).toBeTruthy();
  });

  it("omits the digest line when none was attached (synthetic test errors etc.)", () => {
    const { container } = render(
      <AppErrorBoundary error={fakeError()} reset={vi.fn()} />,
    );
    // The .err-code element is the digest line; absent means no digest leaked.
    expect(container.querySelector(".err-code")).toBeNull();
  });

  it("Retry calls Next.js' reset() so the segment re-renders without a navigation", () => {
    const reset = vi.fn();
    render(<AppErrorBoundary error={fakeError()} reset={reset} />);
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("offers a 'Sign in again' escape hatch pointing at /signin — recovers if the error is really an auth one", () => {
    render(<AppErrorBoundary error={fakeError()} reset={vi.fn()} />);
    const link = screen.getByText("Sign in again").closest("a") as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("/signin");
  });

  it("does NOT surface the raw error.message in the UI (could leak internals)", () => {
    render(<AppErrorBoundary error={fakeError({ message: "ECONNREFUSED kumbuka-backend:8080" })} reset={vi.fn()} />);
    expect(screen.queryByText(/ECONNREFUSED/)).toBeNull();
  });
});
