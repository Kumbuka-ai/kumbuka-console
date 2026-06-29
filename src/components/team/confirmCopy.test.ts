import { describe, expect, it, vi } from "vitest";
import { createTranslator } from "next-intl";
import en from "@/i18n/messages/en.json";

// TeamTable is a client module importing server actions; stub the chain.
vi.mock("server-only", () => ({}));
vi.mock("@/app/(app)/actions", () => ({ updateUserAction: vi.fn() }));

import { confirmCopy } from "./TeamTable";

// confirmCopy now resolves its copy via a next-intl translator; build one over
// the real en messages so these assertions stay in English. The explicit
// generics widen the message type to `Record<string, any>` so this translator
// matches the loose type production passes (`useTranslations("team.confirm")`,
// unaugmented messages) — next-intl v4 tightened the generics so a translator
// inferred over the concrete `typeof en` no longer fits that contract. Runtime
// is unchanged: the real `en` messages still back the assertions.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- deliberate: widens to the loose message type next-intl v4 production passes (see comment above)
const t = createTranslator<Record<string, any>, "team.confirm">({
  locale: "en",
  messages: en,
  namespace: "team.confirm",
});

describe("confirmCopy (D-CORE-2 + account actions)", () => {
  it("mute: calm + non-danger, names the member, spells out the scope", () => {
    const c = confirmCopy("mute", "Tobias", t);
    expect(c.eyebrow).toBe("mute member");
    expect(c.title).toContain("Tobias");
    expect(c.danger).toBe(false);
    expect(c.body).toMatch(/shared writes are suspended/i);
    expect(c.body).toMatch(/private memory/i);
  });

  it("unmute: shared writes resume", () => {
    expect(confirmCopy("unmute", "X", t).body).toMatch(/resume/i);
  });

  it("disable is the only danger action; enable is not", () => {
    expect(confirmCopy("disable", "X", t).danger).toBe(true);
    expect(confirmCopy("enable", "X", t).danger).toBe(false);
  });
});
