import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/i18n/messages/en.json";
import { ToastHost } from "@/components/ui/Toast";
import { OnboardingProvider } from "./OnboardingProvider";
import { parseInviteLines } from "./WizardInvite";
import { wzSlug } from "./WizardScopes";
import { clampStep, WZ_STEP_COUNT } from "./steps";
import type { OnboardingState } from "@/lib/api/types";

// The wizard + provider import server actions; in jsdom they must be stubbed
// (a real "use server" call would try to reach the BFF).
const { setOnboardingMock, inviteMock, createScopeMock } = vi.hoisted(() => ({
  setOnboardingMock: vi.fn(),
  inviteMock: vi.fn(),
  createScopeMock: vi.fn(),
}));
vi.mock("@/app/(app)/actions", () => ({
  setOnboardingAction: (s: unknown) => setOnboardingMock(s),
  inviteUserAction: (r: unknown) => inviteMock(r),
  createScopeAction: (r: unknown) => createScopeMock(r),
}));

function renderProvider(opts: {
  enabled?: boolean;
  initial?: OnboardingState;
  emails?: string[];
  slugs?: string[];
} = {}) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ToastHost>
        <OnboardingProvider
          enabled={opts.enabled ?? true}
          initial={opts.initial}
          existingEmails={opts.emails ?? ["priya@acme.com"]}
          existingSlugs={opts.slugs ?? ["global", "billing-platform"]}
        >
          <div>app</div>
        </OnboardingProvider>
      </ToastHost>
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  setOnboardingMock.mockReset();
  inviteMock.mockReset().mockResolvedValue(undefined);
  createScopeMock.mockReset().mockResolvedValue(undefined);
});

describe("OnboardingProvider — lifecycle", () => {
  it("first login (no state) auto-opens the wizard at step 1", () => {
    renderProvider({ initial: undefined });
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "How kumbuka works" })).toBeTruthy();
  });

  it("dismissed state does NOT auto-open", () => {
    renderProvider({ initial: { dismissed: true, lastStep: 0 } });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("does not open for non-owners (enabled=false), even when not dismissed", () => {
    renderProvider({ enabled: false, initial: undefined });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("resumes at the persisted step (lastStep=1 → Invite step)", () => {
    renderProvider({ initial: { dismissed: false, lastStep: 1 } });
    expect(screen.getByRole("heading", { name: "Invite your team" })).toBeTruthy();
  });

  it("close via X is resumable: persists dismissed=false at the current step", async () => {
    renderProvider({ initial: { dismissed: false, lastStep: 1 } });
    fireEvent.click(screen.getByRole("button", { name: /close setup/i }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(setOnboardingMock).toHaveBeenCalledWith({ dismissed: false, lastStep: 1 });
  });

  it("'don't show again' + close reaches the dismissed state", async () => {
    renderProvider({ initial: undefined });
    fireEvent.click(screen.getByRole("switch", { name: /don't show this again/i }));
    fireEvent.click(screen.getByRole("button", { name: /close setup/i }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(setOnboardingMock).toHaveBeenCalledWith({ dismissed: true, lastStep: 0 });
  });

  it("Finish reaches the same dismissed state", async () => {
    renderProvider({ initial: { dismissed: false, lastStep: 2 } });
    fireEvent.click(screen.getByRole("button", { name: /finish/i }));
    await waitFor(() =>
      expect(setOnboardingMock).toHaveBeenCalledWith({ dismissed: true, lastStep: 2 }),
    );
  });
});

describe("parseInviteLines — per-line status", () => {
  it("classifies valid / invalid / already-member / duplicate-in-list", () => {
    const parsed = parseInviteLines(
      ["new@acme.com", "not-an-email", "priya@acme.com", "dup@acme.com", "dup@acme.com", "  "].join("\n"),
      ["priya@acme.com"],
    );
    // blank line is skipped → 5 parsed
    expect(parsed.map((p) => p.status)).toEqual(["ok", "bad", "dupe", "ok", "dupe"]);
    expect(parsed.map((p) => p.reason)).toEqual([null, "badEmail", "alreadyMember", null, "dupInList"]);
    // line numbers track the original 1-based positions
    expect(parsed.map((p) => p.line)).toEqual([1, 2, 3, 4, 5]);
  });

  it("is case-insensitive for the already-on-the-team check", () => {
    const parsed = parseInviteLines("PRIYA@ACME.COM", ["priya@acme.com"]);
    expect(parsed[0]?.status).toBe("dupe");
    expect(parsed[0]?.reason).toBe("alreadyMember");
  });
});

describe("WizardInvite — send routes through the real invite path", () => {
  it("sends one invite per valid address and shows a per-address confirmation", async () => {
    renderProvider({ initial: { dismissed: false, lastStep: 1 }, emails: [] });
    const ta = screen.getByRole("textbox");
    fireEvent.change(ta, { target: { value: "a@acme.com\nbad\nb@acme.com" } });

    // 2 valid / 1 to fix
    expect(screen.getByText("2 valid")).toBeTruthy();
    expect(screen.getByText("1 to fix")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /send 2 invites/i }));

    await waitFor(() => expect(inviteMock).toHaveBeenCalledTimes(2));
    expect(inviteMock).toHaveBeenCalledWith({ email: "a@acme.com", role: "member" });
    expect(inviteMock).toHaveBeenCalledWith({ email: "b@acme.com", role: "member" });
    // confirmation list
    await waitFor(() => expect(screen.getByText(/2 invites sent via your identity provider/i)).toBeTruthy());
  });
});

describe("wzSlug + scope dup-guard", () => {
  it("derives an immutable kebab-slug (same rule as ScopeEditor)", () => {
    expect(wzSlug("Billing Platform")).toBe("billing-platform");
    expect(wzSlug("  Foo__Bar!! ")).toBe("foo-bar");
    expect(wzSlug("ACME 2.0")).toBe("acme-2-0");
  });

  it("flags a name colliding with an existing scope slug and disables Add", () => {
    renderProvider({ initial: { dismissed: false, lastStep: 2 }, slugs: ["billing-platform"] });
    const input = screen.getByPlaceholderText(/billing platform/i);
    fireEvent.change(input, { target: { value: "Billing Platform" } });
    expect(screen.getByText("already exists")).toBeTruthy();
    expect((screen.getByRole("button", { name: /add scope/i }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("stages a unique scope and creates it on Finish via the real action", async () => {
    renderProvider({ initial: { dismissed: false, lastStep: 2 }, slugs: ["global"] });
    fireEvent.change(screen.getByPlaceholderText(/billing platform/i), { target: { value: "New Project" } });
    fireEvent.click(screen.getByRole("button", { name: /add scope/i }));
    expect(screen.getByText("new-project")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /finish/i }));
    await waitFor(() => expect(createScopeMock).toHaveBeenCalledWith({ slug: "new-project", name: "New Project" }));
  });
});

describe("D-CORE-10.1 scope guard — no out-of-scope controls", () => {
  it("renders NO write-policy control, NO doc-upload, and no radios anywhere in the wizard", () => {
    const { container } = renderProvider({ initial: undefined });
    // walk all three steps (step-rail labels)
    for (const label of ["How it works", "Invite team", "Create scopes"]) {
      fireEvent.click(screen.getByText(label));
      // never a write-policy radio group
      expect(screen.queryAllByRole("radio")).toHaveLength(0);
      // never a document/file upload affordance
      expect(container.querySelector('input[type="file"]')).toBeNull();
    }
    expect(screen.queryByText(/write policy|write-policy/i)).toBeNull();
    expect(screen.queryByText(/upload|document/i)).toBeNull();
  });
});

describe("clampStep", () => {
  it("clamps persisted resume steps into range", () => {
    expect(clampStep(-3)).toBe(0);
    expect(clampStep(99)).toBe(WZ_STEP_COUNT - 1);
    expect(clampStep(1)).toBe(1);
    expect(clampStep(NaN)).toBe(0);
  });
});
