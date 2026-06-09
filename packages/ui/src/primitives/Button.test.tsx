import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button, IconButton } from "./Button";

describe("Button", () => {
  it("renders children and the base 'btn' class", () => {
    render(<Button>Save</Button>);
    const btn = screen.getByRole("button", { name: "Save" });
    expect(btn.className).toContain("btn");
  });

  it("adds variant class when variant is 'primary' / 'ghost' / 'danger'", () => {
    const { rerender } = render(<Button variant="primary">x</Button>);
    expect(screen.getByRole("button").className).toContain("primary");

    rerender(<Button variant="ghost">x</Button>);
    expect(screen.getByRole("button").className).toContain("ghost");

    rerender(<Button variant="danger">x</Button>);
    expect(screen.getByRole("button").className).toContain("danger");
  });

  it("does not add a variant class for the 'default' variant", () => {
    render(<Button>x</Button>);
    const cls = screen.getByRole("button").className;
    expect(cls).not.toContain("primary");
    expect(cls).not.toContain("ghost");
    expect(cls).not.toContain("danger");
  });

  it("adds 'sm' class when size='sm', omits it for size='md'", () => {
    const { rerender } = render(<Button size="sm">x</Button>);
    expect(screen.getByRole("button").className).toContain("sm");

    rerender(<Button>x</Button>);
    expect(screen.getByRole("button").className).not.toMatch(/\bsm\b/);
  });

  it("forwards arbitrary props (onClick, disabled, type) to the underlying button", () => {
    const handler = vi.fn();
    render(<Button onClick={handler} type="submit" disabled>x</Button>);
    const btn = screen.getByRole("button") as HTMLButtonElement;
    expect(btn.type).toBe("submit");
    expect(btn.disabled).toBe(true);
    fireEvent.click(btn);
    // Disabled buttons don't fire click in JSDOM either — still important to verify.
    expect(handler).not.toHaveBeenCalled();
  });

  it("appends caller className after the variant classes", () => {
    render(<Button variant="primary" className="custom-cls">x</Button>);
    const cls = screen.getByRole("button").className;
    expect(cls).toContain("primary");
    expect(cls).toContain("custom-cls");
  });
});

describe("IconButton", () => {
  it("renders with an icon-button base class and forwards aria-label", () => {
    render(<IconButton aria-label="Close"><span>x</span></IconButton>);
    const btn = screen.getByRole("button", { name: "Close" });
    expect(btn.className).toContain("iconbtn");
  });

  it("forwards onClick", () => {
    const onClick = vi.fn();
    render(<IconButton aria-label="A" onClick={onClick}><span>x</span></IconButton>);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalled();
  });
});
