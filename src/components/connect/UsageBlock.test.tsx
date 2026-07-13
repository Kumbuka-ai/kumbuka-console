/**
 * Block-3 contract: exactly two examples, the copy button copies the
 * SENTENCE to the assistant — never a tool call (showing signatures would
 * teach users kumbuka is an API with a chat veneer) — the type appears as
 * a result, and the single link deep-links to the type anchor in the help
 * area, not to the page head.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import de from "@/i18n/messages/de.json";
import { ToastHost } from "@/components/ui/Toast";
import { UsageBlock } from "./UsageBlock";

const writeText = vi.fn().mockResolvedValue(undefined);
beforeEach(() => {
  writeText.mockClear();
  Object.assign(navigator, { clipboard: { writeText } });
});

function renderBlock() {
  return render(
    <NextIntlClientProvider locale="de" messages={de}>
      <ToastHost>
        <UsageBlock />
      </ToastHost>
    </NextIntlClientProvider>,
  );
}

describe("UsageBlock", () => {
  it("renders exactly the two canonical example sentences", () => {
    renderBlock();
    expect(
      screen.getByText(/Wir bleiben bei Postgres als System of Record/),
    ).toBeTruthy();
    expect(screen.getByText(/Was haben wir zur Datenbank entschieden/)).toBeTruthy();
  });

  it("copies the SENTENCE — never a tool call", async () => {
    renderBlock();
    const copies = screen.getAllByRole("button", { name: /satz kopieren/i });
    expect(copies).toHaveLength(2);
    fireEvent.click(copies[0]);
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const copied = writeText.mock.calls[0][0] as string;
    expect(copied).toContain("Merk dir:");
    expect(copied).not.toContain("memory_remember");
    expect(copied).not.toContain("(");
  });

  it("shows the type as a RESULT chip with its key", () => {
    renderBlock();
    expect(screen.getByText("db.system-of-record")).toBeTruthy();
  });

  it("deep-links to the type anchor in the help area", () => {
    renderBlock();
    const link = screen.getByRole("link", { name: /alle speicherarten/i });
    expect(link.getAttribute("href")).toBe("/help/types#decision");
  });
});
