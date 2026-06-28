import { describe, expect, it } from "vitest";
import { entryWriteErrorMessage } from "./entryWriteError";
import type { EntryActionResult } from "@/lib/api/types";

// A translate stub that echoes the key (+ values) so we assert the mapping,
// not the copy — the real strings live in the i18n message files.
const t = (key: string, values?: Record<string, string>) =>
  values ? `${key}:${JSON.stringify(values)}` : key;

type Fail = Extract<EntryActionResult, { ok: false }>;
const fail = (reason: Fail["reason"], detail?: string): Fail => ({ ok: false, reason, detail });

describe("entryWriteErrorMessage", () => {
  it("maps readOnly (FEAT-19 locked scope) to the readOnly message", () => {
    expect(entryWriteErrorMessage(fail("readOnly"), t)).toBe("readOnly");
  });

  it("maps each typed reason to its own key", () => {
    expect(entryWriteErrorMessage(fail("muted"), t)).toBe("muted");
    expect(entryWriteErrorMessage(fail("forbidden"), t)).toBe("onlyAdmins");
    expect(entryWriteErrorMessage(fail("protected"), t)).toBe("protected");
    expect(entryWriteErrorMessage(fail("exists"), t)).toBe("exists");
    expect(entryWriteErrorMessage(fail("stale"), t)).toBe("stale");
    expect(entryWriteErrorMessage(fail("generic"), t)).toBe("generic");
  });

  it("threads the backend reason into the validation message, with a fallback", () => {
    expect(entryWriteErrorMessage(fail("validation", "too long"), t)).toBe(
      'validation:{"reason":"too long"}',
    );
    expect(entryWriteErrorMessage(fail("validation"), t)).toBe(
      'validation:{"reason":"validationFallback"}',
    );
  });
});
