import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Seg, SegButton } from "./Seg";

describe("Seg", () => {
  it("renders a role='group' with the ariaLabel for SR navigation", () => {
    render(<Seg ariaLabel="Theme"><span /></Seg>);
    expect(screen.getByRole("group", { name: "Theme" })).toBeTruthy();
  });

  it("adds the 'accent' modifier when accent=true", () => {
    const { container } = render(<Seg ariaLabel="x" accent><span /></Seg>);
    expect(container.querySelector(".seg")?.className).toContain("accent");
  });

  it("omits 'accent' by default", () => {
    const { container } = render(<Seg ariaLabel="x"><span /></Seg>);
    expect(container.querySelector(".seg")?.className).not.toContain("accent");
  });
});

describe("SegButton", () => {
  it("renders an aria-pressed reflecting the 'on' state", () => {
    const { rerender } = render(<SegButton on onClick={() => {}}>x</SegButton>);
    expect(screen.getByRole("button").getAttribute("aria-pressed")).toBe("true");

    rerender(<SegButton on={false} onClick={() => {}}>x</SegButton>);
    expect(screen.getByRole("button").getAttribute("aria-pressed")).toBe("false");
  });

  it("adds the 'on' class when active", () => {
    const { rerender } = render(<SegButton on onClick={() => {}}>x</SegButton>);
    expect(screen.getByRole("button").className).toContain("on");

    rerender(<SegButton on={false} onClick={() => {}}>x</SegButton>);
    expect(screen.getByRole("button").className).not.toContain("on");
  });

  it("forwards onClick", () => {
    const onClick = vi.fn();
    render(<SegButton on={false} onClick={onClick}>x</SegButton>);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders title attribute when supplied (tooltip on hover)", () => {
    render(<SegButton on={false} onClick={() => {}} title="Light theme">x</SegButton>);
    expect(screen.getByRole("button").getAttribute("title")).toBe("Light theme");
  });
});
