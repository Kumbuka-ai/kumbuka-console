import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { useMenu } from "./Menu";

function MenuHarness({ items }: { items: Parameters<ReturnType<typeof useMenu>["open"]>[1] }) {
  const m = useMenu();
  return (
    <div>
      <button onClick={(e) => m.open({ clientX: e.clientX, clientY: e.clientY }, items)}>
        anchor
      </button>
      {m.node}
    </div>
  );
}

describe("Menu / useMenu", () => {
  it("opens at the click coordinates and renders item labels", () => {
    render(
      <MenuHarness
        items={[
          { label: "Rename", onSelect: () => {} },
          { label: "Archive", onSelect: () => {} },
        ]}
      />,
    );

    fireEvent.click(screen.getByText("anchor"));
    expect(screen.getByRole("menu")).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "Rename" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "Archive" })).toBeTruthy();
  });

  it("renders a separator for items with kind='sep'", () => {
    render(
      <MenuHarness
        items={[
          { label: "A", onSelect: () => {} },
          { kind: "sep" },
          { label: "B", onSelect: () => {} },
        ]}
      />,
    );
    fireEvent.click(screen.getByText("anchor"));
    expect(screen.getByRole("menu").querySelector(".sep")).not.toBeNull();
  });

  it("danger items get the 'danger' class (destructive-action visual)", () => {
    render(
      <MenuHarness
        items={[
          { label: "Delete", onSelect: () => {}, danger: true },
          { label: "Rename", onSelect: () => {} },
        ]}
      />,
    );
    fireEvent.click(screen.getByText("anchor"));
    expect(screen.getByRole("menuitem", { name: "Delete" }).className).toContain("danger");
    expect(screen.getByRole("menuitem", { name: "Rename" }).className ?? "").not.toContain("danger");
  });

  it("disabled items render with the disabled attribute (browser blocks the click)", () => {
    render(
      <MenuHarness
        items={[{ label: "Locked", onSelect: () => {}, disabled: true }]}
      />,
    );
    fireEvent.click(screen.getByText("anchor"));
    expect((screen.getByRole("menuitem", { name: "Locked" }) as HTMLButtonElement).disabled)
      .toBe(true);
  });

  it("clicking an item runs onSelect AND closes the menu", () => {
    const onSelect = vi.fn();
    render(<MenuHarness items={[{ label: "Run", onSelect }]} />);

    fireEvent.click(screen.getByText("anchor"));
    fireEvent.click(screen.getByRole("menuitem", { name: "Run" }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("clicks outside the menu close it (mousedown on document)", () => {
    render(<MenuHarness items={[{ label: "x", onSelect: () => {} }]} />);
    fireEvent.click(screen.getByText("anchor"));
    expect(screen.getByRole("menu")).toBeTruthy();

    act(() => {
      document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    });
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("Escape key closes the menu", () => {
    render(<MenuHarness items={[{ label: "x", onSelect: () => {} }]} />);
    fireEvent.click(screen.getByText("anchor"));

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("non-Escape keys do not close the menu", () => {
    render(<MenuHarness items={[{ label: "x", onSelect: () => {} }]} />);
    fireEvent.click(screen.getByText("anchor"));

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown" }));
    });
    expect(screen.queryByRole("menu")).not.toBeNull();
  });
});
