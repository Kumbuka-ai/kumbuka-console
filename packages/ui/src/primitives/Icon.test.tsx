import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { Icon } from "./Icon";

describe("Icon", () => {
  it("renders an SVG element for a known icon name", () => {
    const { container } = render(<Icon name="ok" />);
    // lucide-react renders an <svg>.
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("renders an SVG for each of the shell-vocabulary names (no missing mappings)", () => {
    const names = ["lock", "ok", "bot", "x", "settings", "search", "plus"] as const;
    for (const n of names) {
      const { container } = render(<Icon name={n} />);
      expect(container.querySelector("svg")).not.toBeNull();
    }
  });
});
