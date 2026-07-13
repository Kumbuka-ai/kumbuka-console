/**
 * Loader guard: a missing document for a manifest section is a thrown
 * error, never an empty page. The happy path resolves through the same
 * two-candidate-root probe a composition build uses at runtime.
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { helpDocumentPath, loadHelpDoc } = await import("./load");

describe("help-doc loader", () => {
  it("loads and parses an existing section document", () => {
    const doc = loadHelpDoc("types", "de");
    expect(doc.title).toBe("Speicherarten");
  });

  it("resolves the document path from the app root", () => {
    expect(helpDocumentPath("types", "en")).toMatch(/src\/help\/sections\/types\.en\.md$/);
  });

  it("throws on a missing document — never an empty page", () => {
    expect(() => loadHelpDoc("no-such-section", "de")).toThrow(
      /help section document not found: no-such-section\.de\.md/,
    );
  });
});
