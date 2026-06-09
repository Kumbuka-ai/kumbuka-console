import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeToggle } from "./ThemeToggle";

describe("ThemeToggle", () => {
  beforeEach(() => {
    // Reset data-theme between cases — the component sets it as a side effect.
    document.documentElement.removeAttribute("data-theme");
  });

  it("renders both Light and Dark segment buttons inside a labeled group", () => {
    render(<ThemeToggle theme="light" onApply={() => {}} />);
    expect(screen.getByRole("group", { name: "Theme" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Light" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Dark" })).toBeTruthy();
  });

  it("marks the currently active theme button with aria-pressed=true", () => {
    const { rerender } = render(<ThemeToggle theme="light" onApply={() => {}} />);
    expect(screen.getByRole("button", { name: "Light" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Dark" }).getAttribute("aria-pressed")).toBe("false");

    rerender(<ThemeToggle theme="dark" onApply={() => {}} />);
    expect(screen.getByRole("button", { name: "Light" }).getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByRole("button", { name: "Dark" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("clicking the OTHER theme calls onApply with that theme AND flips data-theme on documentElement (no FOUC)", () => {
    const onApply = vi.fn();
    render(<ThemeToggle theme="light" onApply={onApply} />);
    fireEvent.click(screen.getByRole("button", { name: "Dark" }));
    expect(onApply).toHaveBeenCalledWith("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("clicking the ACTIVE theme is a no-op (no extra onApply call, no flicker)", () => {
    const onApply = vi.fn();
    render(<ThemeToggle theme="light" onApply={onApply} />);
    fireEvent.click(screen.getByRole("button", { name: "Light" }));
    expect(onApply).not.toHaveBeenCalled();
  });
});
