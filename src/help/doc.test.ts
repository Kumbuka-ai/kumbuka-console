/**
 * Help-doc format guards. The grammar is closed and every violation is a
 * thrown HelpDocFormatError — never a silent fallback: a malformed marker
 * must never reach the user as literal text, and a heading without an
 * explicit anchor would make every deep link language-dependent.
 */
import { describe, expect, it } from "vitest";
import { HelpDocFormatError, docAnchors, parseHelpDoc, parseInline } from "./doc";

const doc = (body: string, frontmatter = "updated: 2026-07-13") =>
  `---\n${frontmatter}\n---\n\n${body}`;

describe("parseHelpDoc", () => {
  it("parses the reference document shape", () => {
    const parsed = parseHelpDoc(
      doc(
        [
          "# Page title",
          "",
          "A paragraph with **bold**, `code` and [an internal link](/scopes).",
          "",
          "## Section heading {#stable-anchor}",
          "",
          "- list item",
          "- list item",
          "",
          "> A callout block.",
          "",
          "[type-catalog]",
        ].join("\n"),
      ),
    );
    expect(parsed.title).toBe("Page title");
    expect(parsed.frontmatter.updated).toBe("2026-07-13");
    expect(parsed.blocks.map((b) => b.kind)).toEqual([
      "paragraph",
      "heading",
      "list",
      "callout",
      "type-catalog",
    ]);
    expect(docAnchors(parsed)).toEqual(["stable-anchor"]);
  });

  it("joins continuation lines of paragraphs and list items", () => {
    const parsed = parseHelpDoc(
      doc(
        [
          "# T",
          "",
          "A paragraph broken",
          "across two lines.",
          "",
          "- an item broken",
          "  across two lines",
          "- second item",
        ].join("\n"),
      ),
    );
    const [para, list] = parsed.blocks;
    expect(para).toEqual({
      kind: "paragraph",
      segments: [{ kind: "text", text: "A paragraph broken across two lines." }],
    });
    if (list.kind !== "list") throw new Error("expected a list block");
    expect(list.items).toHaveLength(2);
    expect(list.items[0]).toEqual([{ kind: "text", text: "an item broken across two lines" }]);
  });

  it("rejects a document without a frontmatter block", () => {
    expect(() => parseHelpDoc("# Title\n")).toThrow(HelpDocFormatError);
  });

  it("rejects frontmatter without `updated`", () => {
    expect(() => parseHelpDoc(doc("# Title", "author: x"))).toThrow(/updated/);
  });

  it("rejects a document without a # title", () => {
    expect(() => parseHelpDoc(doc("Just a paragraph."))).toThrow(/no # title/);
  });

  it("rejects more than one # title", () => {
    expect(() => parseHelpDoc(doc("# One\n\n# Two"))).toThrow(/more than one/);
  });

  it("rejects a ## heading without an explicit {#anchor}", () => {
    expect(() => parseHelpDoc(doc("# T\n\n## Heading without anchor"))).toThrow(
      /explicit \{#anchor\}/,
    );
  });

  it("rejects a half-open {#anchor marker", () => {
    expect(() => parseHelpDoc(doc("# T\n\n## Heading {#broken"))).toThrow(/malformed/);
  });

  it("rejects an anchor outside lowercase/digits/hyphens", () => {
    expect(() => parseHelpDoc(doc("# T\n\n## Heading {#Not-Valid}"))).toThrow(/anchor/);
  });

  it("rejects duplicate anchors — the deep-link surface must be unambiguous", () => {
    expect(() =>
      parseHelpDoc(doc("# T\n\n## One {#a}\n\n## Two {#a}")),
    ).toThrow(/duplicate anchor/);
  });

  it("rejects heading levels the grammar does not know", () => {
    expect(() => parseHelpDoc(doc("# T\n\n### Deep {#a}"))).toThrow(/unsupported heading/);
  });

  it("rejects an unknown block token", () => {
    expect(() => parseHelpDoc(doc("# T\n\n[not-a-thing]"))).toThrow(/unknown block token/);
  });

  it("accepts [type-catalog] as the only block token", () => {
    const parsed = parseHelpDoc(doc("# T\n\n[type-catalog]"));
    expect(parsed.blocks).toEqual([{ kind: "type-catalog" }]);
  });

  it("rejects a callout line that lost its > marker", () => {
    expect(() => parseHelpDoc(doc("# T\n\n> callout line\nplain line"))).toThrow(/callout/);
  });
});

describe("parseInline", () => {
  it("splits text, bold, code and links into segments", () => {
    expect(parseInline("a **b** `c` [d](/scopes) e")).toEqual([
      { kind: "text", text: "a " },
      { kind: "bold", text: "b" },
      { kind: "text", text: " " },
      { kind: "code", text: "c" },
      { kind: "text", text: " " },
      { kind: "link", text: "d", href: "/scopes" },
      { kind: "text", text: " e" },
    ]);
  });

  it("accepts http(s) link targets", () => {
    expect(parseInline("[x](https://example.org)")).toEqual([
      { kind: "link", text: "x", href: "https://example.org" },
    ]);
  });

  it("rejects a link target that is neither in-app nor http(s)", () => {
    expect(() => parseInline("[x](mailto:a@b.c)")).toThrow(/link target/);
    expect(() => parseInline("[x](relative/path)")).toThrow(/link target/);
  });

  it("rejects half-open bold — it must never render as literal text", () => {
    expect(() => parseInline("a **broken run")).toThrow(HelpDocFormatError);
  });

  it("rejects a half-open code span", () => {
    expect(() => parseInline("a `broken span")).toThrow(HelpDocFormatError);
  });

  it("rejects a link without its target", () => {
    expect(() => parseInline("[text] without target")).toThrow(HelpDocFormatError);
  });
});
