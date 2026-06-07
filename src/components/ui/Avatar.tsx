/**
 * Avatar — initials chip. Mirrors the prototype's .avatar /.avatar.xs / .avatar.lg.
 * `agent` renders distinctly per ADR-0008 (source=mcp surfaced as a bot badge).
 */
import { Icon } from "./Icon";

export function Avatar({
  initials,
  isAgent = false,
  size = "md",
  className = "",
  title,
}: {
  initials?: string;
  isAgent?: boolean;
  size?: "xs" | "md" | "lg";
  className?: string;
  title?: string;
}) {
  const sizeClass = size === "xs" ? "avatar xs" : size === "lg" ? "avatar lg" : "avatar";
  if (isAgent) {
    return (
      <span className={`${sizeClass} ${className}`} title={title ?? "via assistant"} aria-label="agent">
        <Icon name="bot" />
      </span>
    );
  }
  return (
    <span className={`${sizeClass} ${className}`} title={title} aria-hidden>
      {initials || "—"}
    </span>
  );
}

export function initialsOf(name: string | undefined | null): string {
  if (!name) return "—";
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? "")
      .join("") || "—"
  );
}
