import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Topbar } from "./Topbar";

describe("Topbar", () => {
  it("renders the title as an <h1>", () => {
    render(<Topbar title="Overview" />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Overview");
  });

  it("prefixes meta with '// ' as the brand-eyebrow string when supplied", () => {
    const { container } = render(<Topbar title="Scopes" meta="alpha" />);
    const cm = container.querySelector(".crumb-meta");
    expect(cm?.textContent).toBe("// alpha");
  });

  it("omits .crumb-meta when no meta is supplied (no phantom slashes)", () => {
    const { container } = render(<Topbar title="x" />);
    expect(container.querySelector(".crumb-meta")).toBeNull();
  });

  it("renders contextPin in its own slot when supplied (ops-console active-tenant indicator)", () => {
    const { container } = render(
      <Topbar title="x" contextPin={<span data-testid="ctx">on acme</span>} />,
    );
    expect(container.querySelector(".context-pin")).not.toBeNull();
    expect(screen.getByTestId("ctx").textContent).toBe("on acme");
  });

  it("omits .context-pin when not supplied (team console default)", () => {
    const { container } = render(<Topbar title="x" />);
    expect(container.querySelector(".context-pin")).toBeNull();
  });

  it("renders trailing actions at the end (theme toggle slot)", () => {
    render(<Topbar title="x" trailing={<button>Toggle</button>} />);
    expect(screen.getByRole("button", { name: "Toggle" })).toBeTruthy();
  });
});
