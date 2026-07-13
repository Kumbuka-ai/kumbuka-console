/**
 * Document-renderer contract: every block kind of the help-doc format
 * renders as its intended element, heading anchors become element ids
 * (the deep-link surface), internal links stay in-app while external
 * links open in a new tab, and the [type-catalog] block mounts the
 * catalogue rows.
 */
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import de from "@/i18n/messages/de.json";
import { parseHelpDoc } from "@/help/doc";
import { HelpDocView } from "./HelpDocView";

const SOURCE = [
  "---",
  "updated: 2026-07-13",
  "---",
  "",
  "# Title",
  "",
  "Intro with **bold**, `code`, [inside](/scopes) and [outside](https://example.org).",
  "",
  "## First section {#first}",
  "",
  "- item one",
  "- item two",
  "",
  "> A callout.",
  "",
  "[type-catalog]",
].join("\n");

function renderDoc() {
  return render(
    <NextIntlClientProvider locale="de" messages={de}>
      <HelpDocView doc={parseHelpDoc(SOURCE)} locale="de" />
    </NextIntlClientProvider>,
  );
}

describe("HelpDocView", () => {
  it("renders the title and every block kind as its intended element", () => {
    const { container } = renderDoc();
    expect(container.querySelector("h2")?.textContent).toBe("Title");
    expect(container.querySelector("b")?.textContent).toBe("bold");
    expect(container.querySelector("p.hd-p code")?.textContent).toBe("code");
    expect([...container.querySelectorAll(".hd-list li")].map((li) => li.textContent)).toEqual([
      "item one",
      "item two",
    ]);
    expect(container.querySelector("aside.hd-callout")?.textContent).toBe("A callout.");
  });

  it("renders heading anchors as element ids — the deep-link surface", () => {
    const { container } = renderDoc();
    const heading = container.querySelector("h3.hd-h");
    expect(heading?.id).toBe("first");
    expect(heading?.textContent).toBe("First section");
  });

  it("keeps internal links in-app and opens external links in a new tab", () => {
    const { container } = renderDoc();
    const internal = container.querySelector('a[href="/scopes"]');
    expect(internal?.getAttribute("target")).toBeNull();
    const external = container.querySelector('a[href="https://example.org"]');
    expect(external?.getAttribute("target")).toBe("_blank");
    expect(external?.getAttribute("rel")).toBe("noreferrer");
  });

  it("mounts the type catalogue for the [type-catalog] block", () => {
    const { container } = renderDoc();
    expect(container.querySelector(".hd-cat #decision")).not.toBeNull();
  });
});
