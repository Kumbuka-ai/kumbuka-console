import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/i18n/messages/en.json";
import { ToastHost } from "@/components/ui/Toast";
import { FeedbackLink } from "./FeedbackLink";

function renderLink() {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ToastHost>
        <FeedbackLink />
      </ToastHost>
    </NextIntlClientProvider>,
  );
}

describe("FeedbackLink", () => {
  it("renders a discreet entry point and is closed by default", () => {
    renderLink();
    expect(screen.getByRole("button", { name: /feedback/i })).not.toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens the feedback dialog on click and closes it again", () => {
    renderLink();
    fireEvent.click(screen.getByRole("button", { name: /feedback/i }));
    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-label")).toMatch(/send beta feedback/i);

    fireEvent.click(screen.getByRole("button", { name: /^cancel$/i }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
