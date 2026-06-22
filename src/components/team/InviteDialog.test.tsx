import { describe, expect, it, vi } from "vitest";

// InviteDialog imports the "use server" actions module (which transitively pulls
// `server-only`); stub it so importing the component for EMAIL_RE stays lean.
vi.mock("@/app/(app)/actions", () => ({ inviteUserAction: vi.fn() }));

import { EMAIL_RE } from "./InviteDialog";

// Behaviour pin for the loose client-side email gate. EMAIL_RE was simplified
// from `/.+@.+\..+/` to a linear-time form `/.@.+\../` (S8786 / ReDoS); this
// table asserts the accept/reject set is byte-for-byte the same — every case
// is one the prior regex already decided, including the degenerate ones.
describe("InviteDialog EMAIL_RE (linear-time, behaviour-preserving)", () => {
  const accepts = [
    "a@b.c",
    "alice@acme.com",
    "first.last@sub.example.co",
    "x@b@c.d", // multiple @ — the prior regex also matched this (unanchored)
    "noise a@b.c trailing", // unanchored: a valid substring is enough
    "a@b.c.", // trailing dot in domain — prior regex matched it too
  ];
  const rejects = [
    "", // empty
    "@b.c", // nothing before @
    "a@bc", // no dot after @
    "a@b.", // nothing after the dot
    "a@.b", // nothing between @ and the dot
    "ab.c", // no @ at all
    "a@\n", // @ then newline — `.` never crosses a line break
  ];

  it.each(accepts)("accepts %j", (s) => {
    expect(EMAIL_RE.test(s)).toBe(true);
  });

  it.each(rejects)("rejects %j", (s) => {
    expect(EMAIL_RE.test(s)).toBe(false);
  });

  // The ONE documented delta from the prior `/.+@.+\..+/`: a multi-`@` string
  // whose only separator dot is reachable across an inner `@`. The old regex's
  // `.+` spanned the inner `@` and accepted it; the linear form excludes `@`
  // from the pre-separator run, so it rejects. Never a real email — and every
  // input with ≤1 `@` (all valid addresses, all realistic input) is unchanged.
  it("differs only on multi-@ garbage where the dot sits behind an inner @", () => {
    expect(EMAIL_RE.test("x@b@.c")).toBe(false); // prior regex: true
    expect(EMAIL_RE.test("x@b@c.d")).toBe(true); // unchanged: dot reachable after the 2nd @
  });
});
