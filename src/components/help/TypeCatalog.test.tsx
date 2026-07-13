/**
 * Catalogue-renderer contract: every type slug renders as an anchor id
 * (asserted against EntryType via ENTRY_TYPE_ORDER, never a hand-written
 * list — the connect area deep-links to /help/types#<type-slug>), rows
 * are collapsed until toggled, and the row a hash names opens on load.
 */
import { describe, expect, it, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import de from "@/i18n/messages/de.json";
import { ENTRY_TYPE_ORDER } from "@/lib/api/types";
import { HELP_TYPES, TYPE_TEACHING_ORDER } from "@/help/types-manifest";
import { TypeCatalog } from "./TypeCatalog";

function renderCatalog() {
  return render(
    <NextIntlClientProvider locale="de" messages={de}>
      <TypeCatalog locale="de" />
    </NextIntlClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  window.location.hash = "";
});

describe("TypeCatalog", () => {
  it("renders every entry type as an anchor id — the deep-link target", () => {
    const { container } = renderCatalog();
    for (const type of ENTRY_TYPE_ORDER) {
      expect(container.querySelector(`#${type}`), `missing anchor id ${type}`).not.toBeNull();
    }
  });

  it("lists the rows in teaching order, one collapsed head per type", () => {
    const { container } = renderCatalog();
    const ids = [...container.querySelectorAll(".hd-cat-row")].map((r) => r.id);
    expect(ids).toEqual(TYPE_TEACHING_ORDER);
    for (const head of screen.getAllByRole("button")) {
      expect(head.getAttribute("aria-expanded")).toBe("false");
    }
  });

  it("expands on toggle: the example sentence and the resulting entry appear", () => {
    renderCatalog();
    const heads = screen.getAllByRole("button");
    fireEvent.click(heads[0]); // teaching order: constraint first
    expect(screen.getByText(new RegExp(HELP_TYPES.constraint.result.key))).toBeTruthy();
    expect(
      screen.getByText((t) => t.includes("Merk dir als Constraint")),
    ).toBeTruthy();
  });

  it("opens the row a deep-link hash names on load", () => {
    window.location.hash = "#decision";
    const { container } = renderCatalog();
    const head = container.querySelector("#decision .hd-cat-head");
    expect(head?.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText(new RegExp(HELP_TYPES.decision.result.key))).toBeTruthy();
  });
});
