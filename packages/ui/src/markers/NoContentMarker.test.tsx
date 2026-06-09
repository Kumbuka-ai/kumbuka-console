import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { NoContentMarker } from "./NoContentMarker";

describe("NoContentMarker", () => {
  it("renders title + body (the core trust surface)", () => {
    const { container } = render(
      <NoContentMarker title="No content here" body="Memory is private by design." />,
    );
    expect(container.textContent).toContain("No content here");
    expect(container.textContent).toContain("Memory is private by design.");
  });

  it("shows the eyebrow above the title when supplied", () => {
    const { container } = render(
      <NoContentMarker eyebrow="// trust" title="t" body="b" />,
    );
    expect(container.querySelector(".nocontent-eyebrow")?.textContent).toBe("// trust");
  });

  it("omits the eyebrow element when not supplied (no empty wrapper)", () => {
    const { container } = render(<NoContentMarker title="t" body="b" />);
    expect(container.querySelector(".nocontent-eyebrow")).toBeNull();
  });

  it("uses 'guaranteed by design' as the default status tag (the recurring phrase)", () => {
    const { container } = render(<NoContentMarker title="t" body="b" />);
    expect(container.textContent).toContain("guaranteed by design");
  });

  it("respects an explicit status override (e.g. 'team-only' for the team-console PrivatePanel)", () => {
    const { container } = render(
      <NoContentMarker title="t" body="b" status="team-only" />,
    );
    expect(container.textContent).toContain("team-only");
    expect(container.textContent).not.toContain("guaranteed by design");
  });

  it("hides the foot status entirely when status is explicitly null", () => {
    const { container } = render(<NoContentMarker title="t" body="b" status={null} />);
    expect(container.querySelector(".nocontent-foot")).toBeNull();
  });

  it("adds the 'nocontent-private' modifier when variant='private' (team-console PrivatePanel)", () => {
    const { container } = render(<NoContentMarker title="t" body="b" variant="private" />);
    expect(container.querySelector(".nocontent")?.className).toContain("nocontent-private");
  });

  it("uses role='note' so screen readers announce the trust phrase", () => {
    const { container } = render(<NoContentMarker title="t" body="b" />);
    expect(container.querySelector('[role="note"]')).not.toBeNull();
  });
});
