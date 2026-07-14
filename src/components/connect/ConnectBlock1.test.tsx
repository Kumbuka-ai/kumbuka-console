/**
 * Block-1 rendering contract:
 *
 *  - no verified cell for any agent → the agent-agnostic connector card
 *    (today's surface), no picker, no reference — and the access panel
 *    still present (a private-guarantee surface, in BOTH states),
 *  - a verified cell → picker + guide render, every copy box copies the
 *    FILLED tenant value (never a placeholder),
 *  - the apparatus switcher offers only surfaces with a visible cell —
 *    a single one renders as a quiet label, not a lone tab.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/i18n/messages/en.json";
import { ToastHost } from "@/components/ui/Toast";
import { ConnectBlock1 } from "./ConnectBlock1";
import { MISTRAL_NOTICE } from "@/connect/notices";
import type { RenderableCell, TokenValues } from "./types";
import type { ConnectorView, ScopeView } from "@/lib/api/types";

// The collapse toggle persists via the server action; the component under
// test only needs its resolved { ok } shape.
const { setUiSettingsActionMock } = vi.hoisted(() => ({ setUiSettingsActionMock: vi.fn() }));
vi.mock("@/app/(app)/actions", () => ({
  setUiSettingsAction: setUiSettingsActionMock,
}));

const writeText = vi.fn().mockResolvedValue(undefined);
beforeEach(() => {
  writeText.mockClear();
  setUiSettingsActionMock.mockReset().mockResolvedValue({ ok: true });
  Object.assign(navigator, { clipboard: { writeText } });
});

const CONNECTOR: ConnectorView = {
  endpoint: "https://acme.kumbuka.ai",
  mcpUrl: "https://acme.kumbuka.ai/mcp",
  clientId: "kumbuka-acme",
  clientSecretMasked: null,
  idpName: "Keycloak",
};

const SCOPES: ScopeView[] = [
  {
    slug: "global",
    name: "global",
    kind: "global",
    fixed: true,
    archived: false,
    locked: false,
    description: null,
    entryCount: 0,
    createdAt: "2026-06-17T00:00:00Z",
  },
];

const VALUES: TokenValues = {
  ENDPOINT: "https://acme.kumbuka.ai/mcp",
  SCOPE_SLUG: "global",
  INSTRUCTION_BLOCK: "block-text",
};

const CLAUDE_WEB_CELL: RenderableCell = {
  agent: "claude",
  apparatus: "web",
  title: "Connect the fixture",
  steps: [
    {
      n: 1,
      text: [
        { kind: "text", text: "Enter the endpoint " },
        { kind: "token", token: "ENDPOINT" },
        { kind: "text", text: " into the form." },
      ],
      boxes: ["ENDPOINT"],
      shots: [{ id: "1", caption: "The form", src: null }],
    },
  ],
};

function renderBlock(props: Partial<Parameters<typeof ConnectBlock1>[0]> = {}) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ToastHost>
        <ConnectBlock1
          agents={[]}
          tabsByAgent={{}}
          cells={{}}
          values={VALUES}
          connector={CONNECTOR}
          scopes={SCOPES}
          {...props}
        />
      </ToastHost>
    </NextIntlClientProvider>,
  );
}

describe("ConnectBlock1 — fallback (the ship state of this change)", () => {
  it("renders the URL-only connector card: intro + endpoint, nothing else", () => {
    renderBlock();
    // the endpoint copy box — the one value there is
    expect(screen.getByText("https://acme.kumbuka.ai/mcp")).toBeTruthy();
    // URL-only: no client id, no secret wording anywhere — the connector
    // onboards by endpoint URL alone.
    expect(screen.queryByText("kumbuka-acme")).toBeNull();
    expect(screen.queryByText(/client.?id/i)).toBeNull();
    expect(screen.queryByText(/secret/i)).toBeNull();
    // the old right-hand column (generic steps) is gone — the access
    // panel below is the single statement of reach.
    expect(screen.getAllByText(/what it can reach/i)).toHaveLength(1);
    // no picker, no tabs, no reference details
    expect(screen.queryByRole("radiogroup")).toBeNull();
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.queryByText(/connector reference/i)).toBeNull();
  });

  it("keeps the access-guarantee panel — a private-guarantee surface, in both states", () => {
    renderBlock();
    expect(screen.getByText(/structurally unreachable/i)).toBeTruthy();
    expect(screen.getByText(/guaranteed by architecture/i)).toBeTruthy();
  });

  it("collapses and expands optimistically, persisting each click field-wise", () => {
    renderBlock();
    expect(screen.getByText("https://acme.kumbuka.ai/mcp")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /collapse/i }));
    // Optimistic: the body is gone before the save resolves.
    expect(screen.queryByText("https://acme.kumbuka.ai/mcp")).toBeNull();
    expect(setUiSettingsActionMock).toHaveBeenCalledWith({ connectCollapsed: true });
    fireEvent.click(screen.getByRole("button", { name: /expand/i }));
    expect(screen.getByText("https://acme.kumbuka.ai/mcp")).toBeTruthy();
    // Expanding is a write too (false is a value, not an omission).
    expect(setUiSettingsActionMock).toHaveBeenCalledWith({ connectCollapsed: false });
  });

  it("starts collapsed when the session says so (SSR value, no flicker)", () => {
    renderBlock({ initialCollapsed: true });
    expect(screen.queryByText("https://acme.kumbuka.ai/mcp")).toBeNull();
    expect(screen.getByRole("button", { name: /expand/i })).toBeTruthy();
    // Rendering the persisted state is not a save.
    expect(setUiSettingsActionMock).not.toHaveBeenCalled();
  });

  it("keeps the clicked state and shows a non-blocking notice when the save fails", async () => {
    setUiSettingsActionMock.mockResolvedValue({ ok: false });
    renderBlock();
    fireEvent.click(screen.getByRole("button", { name: /collapse/i }));
    // Silent failure is forbidden: the quiet notice appears…
    expect(await screen.findByText(en.common.viewSaveFailed)).toBeTruthy();
    // …and the user's click is respected for this session (still collapsed).
    expect(screen.queryByText("https://acme.kumbuka.ai/mcp")).toBeNull();
  });
});

describe("ConnectBlock1 — a verified cell", () => {
  const props = {
    agents: [{ slug: "claude", name: "Claude", vendor: "Anthropic" } as const],
    tabsByAgent: { claude: ["web" as const] },
    cells: { "claude/web": CLAUDE_WEB_CELL },
  };

  it("renders the picker and the guide with FILLED tokens — no placeholder reaches the user", () => {
    renderBlock(props);
    expect(screen.getByRole("radio", { name: /claude/i })).toBeTruthy();
    // inline token substituted
    expect(screen.getByText(/Enter the endpoint/)).toBeTruthy();
    expect(screen.queryByText(/\{\{ENDPOINT\}\}/)).toBeNull();
    // the value box carries the filled value
    expect(screen.getAllByText("https://acme.kumbuka.ai/mcp").length).toBeGreaterThan(0);
    // screenshotless slot renders the honest placeholder
    expect(screen.getByText(/screenshot to follow/i)).toBeTruthy();
    // the reference appears in picker mode
    expect(screen.getByText(/connector reference/i)).toBeTruthy();
    // access panel still present
    expect(screen.getByText(/structurally unreachable/i)).toBeTruthy();
  });

  it("one visible surface renders a quiet label, not a lone tab", () => {
    renderBlock(props);
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.getByText(/in the browser/i)).toBeTruthy();
  });

  it("two visible surfaces render the tab bar", () => {
    renderBlock({
      ...props,
      tabsByAgent: { claude: ["web" as const, "desktop" as const] },
      cells: {
        "claude/web": CLAUDE_WEB_CELL,
        "claude/desktop": { ...CLAUDE_WEB_CELL, apparatus: "desktop" },
      },
    });
    expect(screen.getByRole("tablist")).toBeTruthy();
    expect(screen.getAllByRole("tab")).toHaveLength(2);
  });

  it("the copy button copies the FILLED value", async () => {
    renderBlock(props);
    fireEvent.click(screen.getByRole("button", { name: /copy: endpoint url/i }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText).toHaveBeenCalledWith("https://acme.kumbuka.ai/mcp");
  });
});

describe("ConnectBlock1 — a notice agent (verified refusal)", () => {
  const props = {
    agents: [
      { slug: "claude", name: "Claude", vendor: "Anthropic" } as const,
      { slug: "mistral", name: "Mistral", vendor: "Mistral AI", notice: MISTRAL_NOTICE } as never,
    ],
    tabsByAgent: { claude: ["web" as const] },
    cells: { "claude/web": CLAUDE_WEB_CELL },
  };

  it("shows the tile; selecting it renders the notice — no tabs, no guide", () => {
    renderBlock(props);
    const tile = screen.getByRole("radio", { name: /mistral/i });
    fireEvent.click(tile);
    expect(screen.getByText(/not supported as a client yet/i)).toBeTruthy();
    expect(screen.getByText(/fully supported/i)).toBeTruthy();
    // no apparatus surface, no steps, no copy boxes
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.queryByText(/in the browser/i)).toBeNull();
    expect(document.querySelector(".cstep")).toBeNull();
    expect(document.querySelector(".copybox")).toBeNull();
  });

  it("switching back to a cell agent restores the guide", () => {
    renderBlock(props);
    fireEvent.click(screen.getByRole("radio", { name: /mistral/i }));
    fireEvent.click(screen.getByRole("radio", { name: /claude/i }));
    expect(document.querySelector(".cstep")).toBeTruthy();
    expect(screen.queryByText(/not supported as a client yet/i)).toBeNull();
  });
});
