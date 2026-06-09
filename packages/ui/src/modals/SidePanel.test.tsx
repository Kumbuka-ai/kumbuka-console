import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { Field, SidePanel } from "./SidePanel";

describe("SidePanel", () => {
  it("renders eyebrow + title + body + footer in a labelled dialog", () => {
    render(
      <SidePanel
        ariaLabel="Edit scope"
        eyebrow="edit"
        title="Edit scope"
        footer={<button>Save</button>}
        onClose={() => {}}
      >
        <div data-testid="body">body content</div>
      </SidePanel>,
    );
    expect(screen.getByRole("dialog", { name: "Edit scope" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Edit scope" })).toBeTruthy();
    expect(screen.getByTestId("body").textContent).toBe("body content");
    expect(screen.getByRole("button", { name: "Save" })).toBeTruthy();
  });

  it("prefixes the eyebrow with '// ' (brand stylistic element)", () => {
    const { container } = render(
      <SidePanel
        ariaLabel="x"
        eyebrow="edit"
        title="t"
        footer={null}
        onClose={() => {}}
      >
        <div />
      </SidePanel>,
    );
    expect(container.querySelector(".eyebrow")?.textContent).toBe("// edit");
  });

  it("applies an explicit width as inline style (caller-controlled panel size)", () => {
    const { container } = render(
      <SidePanel
        ariaLabel="x"
        eyebrow="x"
        title="t"
        width={520}
        footer={null}
        onClose={() => {}}
      >
        <div />
      </SidePanel>,
    );
    expect((container.querySelector(".sidepanel") as HTMLElement).style.width).toBe("520px");
  });

  it("Close button fires onClose", () => {
    const onClose = vi.fn();
    render(
      <SidePanel
        ariaLabel="x"
        eyebrow="x"
        title="t"
        footer={null}
        onClose={onClose}
      >
        <div />
      </SidePanel>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("clicking the scrim fires onClose (outside-tap dismiss)", () => {
    const onClose = vi.fn();
    const { container } = render(
      <SidePanel
        ariaLabel="x"
        eyebrow="x"
        title="t"
        footer={null}
        onClose={onClose}
      >
        <div />
      </SidePanel>,
    );
    fireEvent.click(container.querySelector(".scrim")!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("Escape key fires onClose", () => {
    const onClose = vi.fn();
    render(
      <SidePanel
        ariaLabel="x"
        eyebrow="x"
        title="t"
        footer={null}
        onClose={onClose}
      >
        <div />
      </SidePanel>,
    );
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("auto-focuses the first focusable element on mount (caret lands somewhere — Close button or the first body input — never the page background)", () => {
    const { container } = render(
      <SidePanel
        ariaLabel="x"
        eyebrow="x"
        title="t"
        footer={null}
        onClose={() => {}}
      >
        <input data-testid="first" />
      </SidePanel>,
    );
    // The selector matches input/textarea/button order-of-appearance —
    // the Close icon-button is the first match in the DOM, so it gets
    // focus. The contract that matters: focus moved INTO the panel.
    expect(container.querySelector(".sidepanel")?.contains(document.activeElement)).toBe(true);
  });
});

describe("Field", () => {
  it("renders the label + the wrapped input", () => {
    render(
      <Field label="Name">
        <input />
      </Field>,
    );
    expect(screen.getByText("Name")).toBeTruthy();
  });

  it("adds the required asterisk when required=true", () => {
    const { container } = render(
      <Field label="Email" required>
        <input />
      </Field>,
    );
    expect(container.querySelector(".req")).not.toBeNull();
  });

  it("omits the asterisk by default", () => {
    const { container } = render(
      <Field label="Name">
        <input />
      </Field>,
    );
    expect(container.querySelector(".req")).toBeNull();
  });

  it("renders hint when supplied", () => {
    render(
      <Field label="x" hint="lowercase-only">
        <input />
      </Field>,
    );
    expect(screen.getByText("lowercase-only")).toBeTruthy();
  });

  it("omits the hint span when no hint is supplied", () => {
    const { container } = render(
      <Field label="x">
        <input />
      </Field>,
    );
    expect(container.querySelector(".hint")).toBeNull();
  });
});
