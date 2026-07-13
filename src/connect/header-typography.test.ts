/**
 * Recurrence guard for the connect section head's typography.
 *
 * These exact values were lost once already: in the design source the
 * head takes its final H1/lead treatment from LATER stylesheet rules
 * (shared with the setup wizard) rather than from the connect block
 * itself, so porting the block alone silently drops them and the head
 * falls back to the console's generic sizes — a ~20% smaller H1 that no
 * unit test noticed. jsdom does not compute real CSS, so this pins the
 * declarations in the stylesheet source: if they vanish again, CI goes
 * red instead of the operator.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const css = readFileSync(
  path.join(__dirname, "..", "styles", "console-tokens.css"),
  "utf8",
);

/** The declarations of one selector's (first) rule block. */
function ruleOf(selector: string): string {
  const start = css.indexOf(`${selector} {`);
  expect(start, `rule "${selector}" is missing from console-tokens.css`).toBeGreaterThan(-1);
  return css.slice(start, css.indexOf("}", start));
}

describe("connect section head typography (recurrence guard)", () => {
  it("H1 carries the design-source size, tracking and margin", () => {
    const rule = ruleOf(".cw-intro h2");
    expect(rule).toContain("font-size: 34.5px");
    expect(rule).toContain("letter-spacing: -0.025em");
    expect(rule).toContain("margin: 10px 0 0");
  });

  it("lead carries the design-source size and line-height", () => {
    const rule = ruleOf(".cw-lead");
    expect(rule).toContain("font-size: 17.25px");
    expect(rule).toContain("line-height: 1.55");
  });

  it("the head's eyebrow is scoped up to the design-source size", () => {
    const rule = ruleOf(".cw-intro .eyebrow");
    expect(rule).toContain("font-size: 12.65px");
  });

  it("the H1 steps down on phone widths (the source's narrow treatment)", () => {
    // Several 640px blocks exist (the wizard sheet has its own) — find
    // the one that addresses the connect head.
    const blocks = css.match(/@media \(max-width: 640px\) \{[\s\S]*?\n\}/g) ?? [];
    const connectBlock = blocks.find((b) => b.includes(".cw-intro h2"));
    expect(connectBlock, "no 640px rule for .cw-intro h2").toBeTruthy();
    expect(connectBlock).toContain("font-size: 26.45px");
  });

  it("the fix never touches the wizard's own classes", () => {
    // The wizard head keeps its rules — the connect head must not reach
    // into the wz- namespace again (that collision is what started this).
    expect(ruleOf(".wz-head h2")).toContain("font-size: 30px");
  });
});
