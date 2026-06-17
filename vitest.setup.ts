import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// jsdom (through v25) does not implement HTMLDialogElement.showModal/close —
// it throws "Not implemented", so a <dialog> opened via showModal() never gets
// the `open` attribute and is treated as hidden (getByRole("dialog") misses
// it). Provide a minimal attribute-toggling polyfill so the native-<dialog>
// onboarding wizard is testable; real browsers use the native top-layer modal.
if (typeof HTMLDialogElement !== "undefined") {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.show = function show() {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
}

// React-Testing-Library doesn't auto-cleanup under Vitest the way it does
// under Jest, so component tests would otherwise accumulate rendered DOM
// across cases and break "byRole" queries with "Found multiple elements".
afterEach(() => {
  cleanup();
});
