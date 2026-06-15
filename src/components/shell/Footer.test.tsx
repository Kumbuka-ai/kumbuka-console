/**
 * Pin the Footer renders both versions when the backend probe succeeded,
 * and a placeholder when it returned null (the transient-error path).
 */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Footer } from "./Footer";
import { CONSOLE_VERSION } from "@/lib/version";

describe("Footer", () => {
  it("renders both versions on a successful backend probe", () => {
    render(<Footer backend={{ name: "kumbuka-server", version: "v0.6.13" }} />);
    expect(screen.getByText(CONSOLE_VERSION)).not.toBeNull();
    expect(screen.getByText("v0.6.13")).not.toBeNull();
    expect(screen.getByText("console")).not.toBeNull();
    expect(screen.getByText("backend")).not.toBeNull();
  });

  it("renders the placeholder when the backend probe returned null", () => {
    render(<Footer backend={null} />);
    expect(screen.getByText(CONSOLE_VERSION)).not.toBeNull();
    // `—` keeps the footer visible (and the layout stable) instead of
    // hiding it when the backend hiccuped.
    expect(screen.getByText("—")).not.toBeNull();
  });
});
