/**
 * Guide-format parser guards. The two that matter most:
 *
 *  - an unknown or malformed placeholder token is a THROWN error, never a
 *    silent empty string — otherwise a user copies `{{ENDPOINT}}` into
 *    their client,
 *  - a guide without steps needs the explicit `authoring: pending`
 *    marker — an accidentally empty guide is an error, a skeleton is a
 *    declared state.
 */
import { describe, expect, it } from "vitest";
import { GUIDE_TOKENS, GuideFormatError, parseGuide, parseInline } from "./guide";

const VERIFIED_FIXTURE = `---
agent: claude
apparatus: web
---
# Connect the fixture

1. Open the connector settings of your client.
   [shot 1: The settings dialog]
2. Enter the \`Endpoint URL\` — the value {{ENDPOINT}} is already yours.
   {{ENDPOINT}}
3. Confirm with your kumbuka account and grant access.
   [shot 3: Grant screen]
`;

describe("guide parser", () => {
  it("parses a written guide: steps, boxes, shots, title", () => {
    const g = parseGuide(VERIFIED_FIXTURE);
    expect(g.title).toBe("Connect the fixture");
    expect(g.authoringPending).toBe(false);
    expect(g.steps).toHaveLength(3);
    expect(g.steps[0].shots).toEqual([{ id: "1", caption: "The settings dialog" }]);
    expect(g.steps[1].boxes).toEqual(["ENDPOINT"]);
    expect(g.steps[1].text).toContainEqual({ kind: "token", token: "ENDPOINT" });
    expect(g.steps[1].text).toContainEqual({ kind: "code", text: "Endpoint URL" });
    expect(g.steps[2].shots).toEqual([{ id: "3", caption: "Grant screen" }]);
  });

  it("the token allowlist is exactly ENDPOINT, SCOPE_SLUG, INSTRUCTION_BLOCK — the connector onboards by URL alone", () => {
    expect([...GUIDE_TOKENS]).toEqual(["ENDPOINT", "SCOPE_SLUG", "INSTRUCTION_BLOCK"]);
    // A client id has no place in a guide: there is nothing to enter it
    // into. It must FAIL, not silently blank.
    expect(() => parseInline("enter {{CLIENT_ID}} here")).toThrow(/unknown placeholder/);
    expect(() =>
      parseGuide(`---
a: b
---
# T

1. Step
   {{CLIENT_ID}}
`),
    ).toThrow(GuideFormatError);
  });

  it("parses a skeleton: authoring pending, zero steps, comments ignored", () => {
    const g = parseGuide(`---
agent: grok
apparatus: web
authoring: pending
---
# Skeleton title

<!-- multi-line
authoring notes with {{EXAMPLES}} that must not parse
-->
`);
    expect(g.authoringPending).toBe(true);
    expect(g.steps).toEqual([]);
  });

  it("throws on an unknown token — box line and inline alike", () => {
    expect(() =>
      parseGuide(`---
a: b
---
# T

1. Step
   {{SERVER_URL}}
`),
    ).toThrow(GuideFormatError);
    expect(() => parseInline("enter {{MEMORY_TOKEN}} here")).toThrow(/unknown placeholder/);
  });

  it("throws on a malformed token instead of passing it through as text", () => {
    expect(() => parseInline("enter {{ENDPOINT} here")).toThrow(GuideFormatError);
    expect(() => parseInline("enter {ENDPOINT}} here")).toThrow(GuideFormatError);
  });

  it("throws on an empty guide without the authoring marker", () => {
    expect(() =>
      parseGuide(`---
agent: claude
---
# Title only
`),
    ).toThrow(/authoring: pending/);
  });

  it("throws on content before the first step and on a missing title", () => {
    expect(() =>
      parseGuide(`---
a: b
---
# T

stray prose
`),
    ).toThrow(/before the first numbered step/);
    expect(() =>
      parseGuide(`---
a: b
authoring: pending
---
`),
    ).toThrow(/no # title/);
  });
});
