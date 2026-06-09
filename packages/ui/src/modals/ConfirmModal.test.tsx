import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ConfirmModal } from "./ConfirmModal";

describe("ConfirmModal — friction-ladder confirmation surface", () => {
  it("medium variant: title + body + confirm enabled immediately (no gates)", () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmModal
        eyebrow="confirm"
        title="Archive scope"
        body="This hides the scope from new writes."
        confirmLabel="Archive"
        onCancel={() => {}}
        onConfirm={onConfirm}
      />,
    );
    const confirm = screen.getByRole("button", { name: /Archive/ });
    expect((confirm as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("loud variant (typedConfirm): confirm stays disabled until the operator types the exact target", () => {
    render(
      <ConfirmModal
        eyebrow="confirm"
        title="Delete scope"
        typedConfirm="alpha"
        confirmLabel="Delete"
        danger
        onCancel={() => {}}
        onConfirm={() => {}}
      />,
    );
    const confirm = screen.getByRole("button", { name: /Delete/ });
    expect((confirm as HTMLButtonElement).disabled).toBe(true);

    const input = screen.getByLabelText(/Type/);
    fireEvent.change(input, { target: { value: "alp" } });
    expect((confirm as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(input, { target: { value: "alpha" } });
    expect((confirm as HTMLButtonElement).disabled).toBe(false);
  });

  it("high variant: typed + each ack must be checked before confirm enables", () => {
    render(
      <ConfirmModal
        eyebrow="confirm"
        title="Erase member"
        typedConfirm="alice@x"
        acks={[
          { id: "ack-irreversible", label: "I understand this is irreversible." },
          { id: "ack-audit", label: "An audit entry will be written." },
        ]}
        confirmLabel="Erase"
        danger
        onCancel={() => {}}
        onConfirm={() => {}}
      />,
    );

    const confirm = screen.getByRole("button", { name: /Erase/ }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);

    // Type the target.
    fireEvent.change(screen.getByLabelText(/Type/), { target: { value: "alice@x" } });
    expect(confirm.disabled).toBe(true); // still — acks unchecked

    // Tick first ack.
    const acks = screen.getAllByRole("checkbox");
    fireEvent.click(acks[0]!);
    expect(confirm.disabled).toBe(true); // still — second ack unchecked

    // Tick second ack.
    fireEvent.click(acks[1]!);
    expect(confirm.disabled).toBe(false);
  });

  it("Cancel button fires onCancel exactly once", () => {
    const onCancel = vi.fn();
    render(
      <ConfirmModal
        eyebrow="x"
        title="x"
        confirmLabel="OK"
        onCancel={onCancel}
        onConfirm={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("clicking the scrim fires onCancel (outside-tap dismissal)", () => {
    const onCancel = vi.fn();
    const { container } = render(
      <ConfirmModal
        eyebrow="x"
        title="x"
        confirmLabel="OK"
        onCancel={onCancel}
        onConfirm={() => {}}
      />,
    );
    fireEvent.click(container.querySelector(".scrim")!);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("Escape key fires onCancel (the kbd dismissal)", () => {
    const onCancel = vi.fn();
    render(
      <ConfirmModal
        eyebrow="x"
        title="x"
        confirmLabel="OK"
        onCancel={onCancel}
        onConfirm={() => {}}
      />,
    );
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("renders context restatement at the top when supplied (ops-console 'operating on …' affordance)", () => {
    render(
      <ConfirmModal
        eyebrow="x"
        title="x"
        context={<span>Provider action on tenant acme</span>}
        confirmLabel="OK"
        onCancel={() => {}}
        onConfirm={() => {}}
      />,
    );
    expect(screen.getByText(/Provider action on tenant acme/)).toBeTruthy();
  });

  it("'wide' adds the modal-wide modifier (richer flows like member erasure)", () => {
    const { container } = render(
      <ConfirmModal
        eyebrow="x"
        title="x"
        wide
        confirmLabel="OK"
        onCancel={() => {}}
        onConfirm={() => {}}
      />,
    );
    expect(container.querySelector(".modal")?.className).toContain("modal-wide");
  });
});
