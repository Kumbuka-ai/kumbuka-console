import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ToastHost } from "@/components/ui/Toast";
import { AssistantPrompt } from "./AssistantPrompt";

const writeText = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
  writeText.mockClear();
  Object.assign(navigator, { clipboard: { writeText } });
});

function renderPrompt() {
  return render(
    <ToastHost>
      <AssistantPrompt />
    </ToastHost>,
  );
}

describe("AssistantPrompt", () => {
  it("renders the heading and a tool-accurate instruction prompt", () => {
    renderPrompt();
    expect(screen.getByText("Prime your assistant")).toBeTruthy();
    // The prompt must reference the real tool surface so it actually works.
    const code = screen.getByText(/memory_load_context/);
    expect(code.textContent).toContain("memory_recall");
    expect(code.textContent).toContain("memory_remember");
  });

  it("copies the full prompt to the clipboard and confirms with a toast", async () => {
    renderPrompt();
    fireEvent.click(screen.getByRole("button", { name: /copy/i }));

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const copied = writeText.mock.calls[0][0] as string;
    expect(copied).toContain("memory_load_context");
    expect(copied).toContain("Your private scope is yours alone");
    expect(await screen.findByText(/Instructions copied/i)).toBeTruthy();
  });
});
