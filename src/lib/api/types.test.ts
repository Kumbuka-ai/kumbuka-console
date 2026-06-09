import { describe, expect, it } from "vitest";
import { deriveUserView, type RawUserView } from "./types";

describe("deriveUserView", () => {
  const base: RawUserView = {
    id: "kc-1",
    email: "alice@x.com",
    firstName: "Alice",
    lastName: "Smith",
    role: "admin",
    status: "active",
  };

  it("composes displayName from firstName + lastName, trimmed", () => {
    expect(deriveUserView(base).displayName).toBe("Alice Smith");
  });

  it("falls back to email when both names are null (Keycloak shape during onboarding)", () => {
    expect(deriveUserView({ ...base, firstName: null, lastName: null }).displayName)
      .toBe("alice@x.com");
  });

  it("falls back to email when both names are empty strings (Keycloak sometimes returns '')", () => {
    expect(deriveUserView({ ...base, firstName: "", lastName: "" }).displayName)
      .toBe("alice@x.com");
  });

  it("uses only firstName when lastName is null", () => {
    expect(deriveUserView({ ...base, lastName: null }).displayName).toBe("Alice");
  });

  it("uses only lastName when firstName is null", () => {
    expect(deriveUserView({ ...base, firstName: null }).displayName).toBe("Smith");
  });

  it("uses id as the subject (the Keycloak sub is not yet returned by the backend)", () => {
    const v = deriveUserView(base);
    expect(v.subject).toBe(base.id);
    expect(v.id).toBe(base.id);
  });

  it("marks self when the email matches the session subject", () => {
    expect(deriveUserView(base, "alice@x.com").self).toBe(true);
    expect(deriveUserView(base, "bob@x.com").self).toBe(false);
  });

  it("leaves self undefined when no session subject is provided (table-cell renderer doesn't badge anyone)", () => {
    expect(deriveUserView(base).self).toBeUndefined();
  });

  it("forwards role + status as-is and emits a null lastSeenAt (no telemetry yet)", () => {
    const v = deriveUserView({ ...base, role: "member", status: "invited" });
    expect(v.role).toBe("member");
    expect(v.status).toBe("invited");
    expect(v.lastSeenAt).toBeNull();
  });
});
