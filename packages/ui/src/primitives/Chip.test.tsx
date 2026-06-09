import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { Chip, TypeChip } from "./Chip";

describe("Chip", () => {
  it("renders the label", () => {
    const { container } = render(<Chip label="decision" />);
    expect(container.textContent).toContain("decision");
  });

  it("does not render the swatch span when no colorVar is supplied (avoids a phantom empty dot)", () => {
    const { container } = render(<Chip label="x" />);
    expect(container.querySelector(".sw")).toBeNull();
  });

  it("renders the swatch span and applies --tc CSS var when colorVar is given", () => {
    const { container } = render(<Chip colorVar="--type-decision" label="x" />);
    const chip = container.querySelector(".tchip") as HTMLElement;
    expect(chip.style.getPropertyValue("--tc")).toBe("var(--type-decision)");
    expect(container.querySelector(".sw")).not.toBeNull();
  });

  it("adds the 'boxed' modifier when boxed=true", () => {
    const { container } = render(<Chip label="x" boxed />);
    expect(container.querySelector(".tchip")?.className).toContain("boxed");
  });

  it("omits the 'boxed' modifier by default", () => {
    const { container } = render(<Chip label="x" />);
    expect(container.querySelector(".tchip")?.className).not.toContain("boxed");
  });

  it("TypeChip is the same component (backwards-compat alias for the team console)", () => {
    expect(TypeChip).toBe(Chip);
  });
});
