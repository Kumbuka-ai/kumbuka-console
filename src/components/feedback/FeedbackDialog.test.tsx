import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/i18n/messages/en.json";
import { ToastHost } from "@/components/ui/Toast";
import { FeedbackDialog } from "./FeedbackDialog";

function renderDialog(onClose = vi.fn()) {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ToastHost>
        <FeedbackDialog onClose={onClose} />
      </ToastHost>
    </NextIntlClientProvider>,
  );
  return { onClose };
}

describe("FeedbackDialog", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("offers the three feedback categories, bug selected by default", () => {
    renderDialog();
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(3);
    expect(screen.getByRole("radio", { name: /bug report/i }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("radio", { name: /feature request/i })).not.toBeNull();
    expect(screen.getByRole("radio", { name: /general feedback/i })).not.toBeNull();
  });

  it("the category is selectable", () => {
    renderDialog();
    const feature = screen.getByRole("radio", { name: /feature request/i });
    fireEvent.click(feature);
    expect(feature.getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("radio", { name: /bug report/i }).getAttribute("aria-checked")).toBe("false");
  });

  it("the body is required — Send is disabled until a non-empty message is typed", () => {
    renderDialog();
    const send = screen.getByRole("button", { name: /send feedback/i });
    expect((send as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByPlaceholderText(/describe it/i), { target: { value: "   " } });
    expect((send as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByPlaceholderText(/describe it/i), { target: { value: "It crashed" } });
    expect((send as HTMLButtonElement).disabled).toBe(false);
  });

  it("contact is optional (no required marker; submit works without it)", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const { onClose } = renderDialog();

    fireEvent.change(screen.getByPlaceholderText(/describe it/i), { target: { value: "It crashed" } });
    fireEvent.click(screen.getByRole("button", { name: /send feedback/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("/api/feedback");
    const sent = JSON.parse(String(init?.body));
    expect(sent.category).toBe("bug");
    expect(sent.message).toBe("It crashed");
    expect(sent.contact).toBeUndefined();
  });

  it("on a non-ok response it shows a failure toast and stays open (no false 'sent')", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: false, reason: "unconfigured" }), { status: 503 }),
    );
    const { onClose } = renderDialog();

    fireEvent.change(screen.getByPlaceholderText(/describe it/i), { target: { value: "hi" } });
    fireEvent.click(screen.getByRole("button", { name: /send feedback/i }));

    await waitFor(() => expect(screen.getByText(/couldn't send your feedback/i)).not.toBeNull());
    expect(onClose).not.toHaveBeenCalled();
  });
});
