import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState, ErrorState, TableSkeleton } from "./State";

describe("EmptyState", () => {
  it("renders title + body", () => {
    render(<EmptyState title="No entries" body="Add one to get started" />);
    expect(screen.getByRole("heading", { name: "No entries" })).toBeTruthy();
    expect(screen.getByText("Add one to get started")).toBeTruthy();
  });

  it("omits the state-actions wrapper when no children are passed", () => {
    const { container } = render(<EmptyState title="t" body="b" />);
    expect(container.querySelector(".state-actions")).toBeNull();
  });

  it("renders actions when children are supplied", () => {
    render(
      <EmptyState title="t" body="b">
        <button>Add</button>
      </EmptyState>,
    );
    expect(screen.getByRole("button", { name: "Add" })).toBeTruthy();
  });
});

describe("ErrorState", () => {
  it("renders title + body + the 'err' modifier", () => {
    const { container } = render(<ErrorState title="Down" body="Try again" />);
    expect(container.querySelector(".state")?.className).toContain("err");
    expect(screen.getByText("Try again")).toBeTruthy();
  });

  it("renders code when supplied", () => {
    render(<ErrorState title="x" body="y" code="E_DB" />);
    expect(screen.getByText("E_DB")).toBeTruthy();
  });

  it("omits err-code wrapper when no code is supplied", () => {
    const { container } = render(<ErrorState title="x" body="y" />);
    expect(container.querySelector(".err-code")).toBeNull();
  });
});

describe("TableSkeleton", () => {
  it("renders the default 6 rows when no count given (matches the typical table window)", () => {
    const { container } = render(<TableSkeleton />);
    expect(container.querySelectorAll(".skel-row").length).toBe(6);
  });

  it("renders an arbitrary row count", () => {
    const { container } = render(<TableSkeleton rows={3} />);
    expect(container.querySelectorAll(".skel-row").length).toBe(3);
  });

  it("renders zero rows when explicitly asked (no stray DOM)", () => {
    const { container } = render(<TableSkeleton rows={0} />);
    expect(container.querySelectorAll(".skel-row").length).toBe(0);
  });
});
