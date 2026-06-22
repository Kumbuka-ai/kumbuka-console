/**
 * relTime — short, deterministic relative-time string for table cells.
 * Pair with `title={absolute}` so the precise timestamp is one hover away.
 */
const MIN = 60;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export function relTime(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "never";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const s = Math.max(1, Math.floor((now - t) / 1000));
  if (s < MIN) return `${s}s ago`;
  if (s < HOUR) return `${Math.floor(s / MIN)}m ago`;
  if (s < DAY) return `${Math.floor(s / HOUR)}h ago`;
  if (s < 7 * DAY) return `${Math.floor(s / DAY)}d ago`;
  if (s < 30 * DAY) return `${Math.floor(s / (7 * DAY))}w ago`;
  if (s < 365 * DAY) return `${Math.floor(s / (30 * DAY))}mo ago`;
  return `${Math.floor(s / (365 * DAY))}y ago`;
}

export function absTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  // toISOString() always ends in `.sssZ`; drop the fractional seconds. The
  // `\.\d+Z$` form avoids the `.*`-at-anchor the ReDoS heuristic flags (S8786)
  // and is exact for ISO output — same result as the prior `/\..*$/`.
  return d.toISOString().replace("T", " ").replace(/\.\d+Z$/, "Z");
}
