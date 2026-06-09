import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Avatar } from "./Avatar";

describe("Avatar", () => {
  it("renders initials when not in agent mode", () => {
    const { container } = render(<Avatar initials="AS" />);
    // The initials end up as text content; aria-hidden so screen readers
    // skip — verify via container.textContent (no a11y query).
    expect(container.textContent).toContain("AS");
    expect(container.querySelector('.avatar')?.getAttribute('aria-hidden')).not.toBeNull();
  });

  it("falls back to em-dash when no initials supplied (the table never shows '' or 'undefined')", () => {
    const { container } = render(<Avatar />);
    expect(container.textContent).toContain("—");
  });

  it("renders the bot icon and aria-label='agent' in agent mode (ADR-0008 trust marker)", () => {
    render(<Avatar isAgent initials="ignored" />);
    expect(screen.getByLabelText("agent")).toBeTruthy();
    // Default title is 'via assistant' — the recurring trust phrase.
    expect(screen.getByLabelText("agent").getAttribute("title")).toBe("via assistant");
  });

  it("respects an explicit title override (used by tooltip rows)", () => {
    render(<Avatar isAgent title="MCP via opus-4.7" />);
    expect(screen.getByLabelText("agent").getAttribute("title")).toBe("MCP via opus-4.7");
  });

  it("applies the size class — 'avatar xs' / 'avatar' / 'avatar lg'", () => {
    const { container, rerender } = render(<Avatar size="xs" initials="X" />);
    expect(container.querySelector(".avatar")?.className).toMatch(/\bxs\b/);

    rerender(<Avatar size="md" initials="M" />);
    // md is the default — no extra size class.
    expect(container.querySelector(".avatar")?.className).not.toMatch(/\bxs\b/);
    expect(container.querySelector(".avatar")?.className).not.toMatch(/\blg\b/);

    rerender(<Avatar size="lg" initials="L" />);
    expect(container.querySelector(".avatar")?.className).toMatch(/\blg\b/);
  });

  it("appends caller className", () => {
    const { container } = render(<Avatar initials="A" className="extra" />);
    expect(container.querySelector(".avatar")?.className).toContain("extra");
  });
});
