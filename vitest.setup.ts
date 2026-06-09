import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// React-Testing-Library doesn't auto-cleanup under Vitest the way it does
// under Jest, so component tests would otherwise accumulate rendered DOM
// across cases and break "byRole" queries with "Found multiple elements".
afterEach(() => {
  cleanup();
});
