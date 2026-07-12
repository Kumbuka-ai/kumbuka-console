/**
 * @vitest-environment jsdom
 *
 * Pins the <Slot> contract (see docs/extension-points.md): with the
 * default registry (empty) the mandatory fallback renders; with a bound
 * override the override renders and the fallback does not. The registry
 * is reached through the overridable specifier
 * `@kumbuka-ai/console/slots`, so the second case mocks exactly the
 * module a downstream build would rebind.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

afterEach(() => {
  vi.doUnmock("@kumbuka-ai/console/slots");
  vi.resetModules();
});

async function loadSlot() {
  const { Slot } = await import("./Slot");
  return Slot;
}

describe("Slot", () => {
  it("renders the fallback when no override is registered (default registry)", async () => {
    const Slot = await loadSlot();
    render(<Slot id="footer.support" fallback={<span>plain-default</span>} />);
    expect(screen.getByText("plain-default")).not.toBeNull();
  });

  it("renders a bound override instead of the fallback", async () => {
    vi.doMock("@kumbuka-ai/console/slots", () => ({
      slots: { "footer.support": () => <span>bound-override</span> },
      getNavExtensions: () => [],
    }));
    const Slot = await loadSlot();
    render(<Slot id="footer.support" fallback={<span>plain-default</span>} />);
    expect(screen.getByText("bound-override")).not.toBeNull();
    expect(screen.queryByText("plain-default")).toBeNull();
  });
});
