import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Rail } from "./Rail";

describe("Rail", () => {
  it("renders aria-label='Primary' so SR users land on it as the main nav", () => {
    render(<Rail brand={<span>K</span>} nav={<span>n</span>} />);
    expect(screen.getByRole("navigation", { name: "Primary" })).toBeTruthy();
  });

  it("renders brand + nav slots", () => {
    const { container } = render(
      <Rail
        brand={<span data-testid="brand">Brand</span>}
        nav={<span data-testid="nav">Nav</span>}
      />,
    );
    expect(container.querySelector(".brand")?.textContent).toBe("Brand");
    expect(container.querySelector(".nav")?.textContent).toBe("Nav");
  });

  it("renders foot when supplied (user chip / account link)", () => {
    const { container } = render(
      <Rail
        brand={<span />}
        nav={<span />}
        foot={<span data-testid="foot">Foot</span>}
      />,
    );
    expect(container.querySelector(".rail-foot")?.textContent).toBe("Foot");
  });

  it("omits .rail-foot when no foot is supplied (no empty wrapper)", () => {
    const { container } = render(<Rail brand={<span />} nav={<span />} />);
    expect(container.querySelector(".rail-foot")).toBeNull();
  });

  it("applies railColor as a CSS variable (the chrome-only mode signal)", () => {
    const { container } = render(
      <Rail brand={<span />} nav={<span />} railColor="var(--navy)" />,
    );
    const rail = container.querySelector(".rail") as HTMLElement;
    expect(rail.style.getPropertyValue("--c-rail")).toBe("var(--navy)");
  });

  it("applies textOpacity as a CSS variable (rgba(244,241,234,<o>))", () => {
    const { container } = render(
      <Rail brand={<span />} nav={<span />} textOpacity={0.74} />,
    );
    const rail = container.querySelector(".rail") as HTMLElement;
    expect(rail.style.getPropertyValue("--c-rail-text")).toBe("rgba(244,241,234,0.74)");
  });

  it("sets no inline CSS vars when neither override is supplied", () => {
    const { container } = render(<Rail brand={<span />} nav={<span />} />);
    const rail = container.querySelector(".rail") as HTMLElement;
    expect(rail.style.getPropertyValue("--c-rail")).toBe("");
    expect(rail.style.getPropertyValue("--c-rail-text")).toBe("");
  });
});
