/**
 * Cell-guide format — parser and loader.
 *
 * A cell guide is a small, deliberately constrained Markdown dialect (no
 * general Markdown engine, no dependency): the author writes numbered
 * steps; a step can carry a value box (a placeholder token on its own
 * line, rendered as a copy box) and screenshot slots. The format is
 * documented in the skeleton files themselves (src/connect/cells/).
 *
 * ```
 * ---
 * agent: claude
 * apparatus: web
 * authoring: pending        <- removed when the steps are written
 * ---
 * # Title
 *
 * 1. Step text with `inline code` and {{ENDPOINT}} inline.
 *    {{ENDPOINT}}           <- value box with copy button
 *    [shot 1: Caption]      <- screenshot slot, numbered like the step
 * 2. ...
 * ```
 *
 * Tokens are the closed set below. An unknown token is a thrown error —
 * never a silent empty string — so a typo fails the build/test pass
 * instead of a user pasting `{{ENDPOINT}}` into their client.
 */

export const GUIDE_TOKENS = [
  "ENDPOINT",
  "CLIENT_ID",
  "SCOPE_SLUG",
  "INSTRUCTION_BLOCK",
] as const;

export type GuideToken = (typeof GUIDE_TOKENS)[number];

const TOKEN_SET = new Set<string>(GUIDE_TOKENS);

/** Inline text is a list of segments so the renderer needs no HTML parsing. */
export type GuideSegment =
  | { kind: "text"; text: string }
  | { kind: "code"; text: string }
  | { kind: "token"; token: GuideToken };

export type GuideStep = {
  n: number;
  text: GuideSegment[];
  /** Value boxes below the step text — each renders as a copy box. */
  boxes: GuideToken[];
  /** Screenshot slots below the step text. */
  shots: { n: number; caption: string }[];
};

export type CellGuide = {
  title: string;
  frontmatter: Record<string, string>;
  /** True while the author has not written the steps yet. */
  authoringPending: boolean;
  steps: GuideStep[];
};

export class GuideFormatError extends Error {
  constructor(message: string, line?: number) {
    super(line === undefined ? message : `${message} (line ${line})`);
    this.name = "GuideFormatError";
  }
}

/** Split one line into text/code/token segments; unknown tokens throw. */
export function parseInline(line: string, lineNo?: number): GuideSegment[] {
  const out: GuideSegment[] = [];
  // Tokens {{NAME}} and `code` spans; everything else is plain text.
  const re = /\{\{([A-Z_]+)\}\}|`([^`]*)`/g;
  let last = 0;
  for (let m = re.exec(line); m !== null; m = re.exec(line)) {
    if (m.index > last) out.push({ kind: "text", text: line.slice(last, m.index) });
    if (m[1] !== undefined) {
      if (!TOKEN_SET.has(m[1])) {
        throw new GuideFormatError(`unknown placeholder token {{${m[1]}}}`, lineNo);
      }
      out.push({ kind: "token", token: m[1] as GuideToken });
    } else {
      out.push({ kind: "code", text: m[2] });
    }
    last = re.lastIndex;
  }
  if (last < line.length) out.push({ kind: "text", text: line.slice(last) });
  // A malformed half-open token ({{ENDPOINT} / {ENDPOINT}}) must not slip
  // through as text — that is exactly the "user copies a placeholder" bug.
  for (const seg of out) {
    if (seg.kind === "text" && (seg.text.includes("{{") || seg.text.includes("}}"))) {
      throw new GuideFormatError("malformed placeholder token", lineNo);
    }
  }
  return out;
}

/** Parse the frontmatter block; returns the map and the next line index. */
function parseFrontmatter(lines: string[]): { frontmatter: Record<string, string>; next: number } {
  if (lines[0]?.trim() !== "---") {
    throw new GuideFormatError("guide must start with a --- frontmatter block", 1);
  }
  const frontmatter: Record<string, string> = {};
  let i = 1;
  for (; i < lines.length && lines[i].trim() !== "---"; i++) {
    const line = lines[i].trim();
    if (line === "" || line.startsWith("#")) continue;
    const colon = line.indexOf(":");
    const key = colon > 0 ? line.slice(0, colon) : "";
    if (!/^[a-z-]+$/.test(key)) {
      throw new GuideFormatError(`invalid frontmatter line: ${line}`, i + 1);
    }
    frontmatter[key] = line.slice(colon + 1).trim();
  }
  if (i >= lines.length) throw new GuideFormatError("unterminated frontmatter block");
  return { frontmatter, next: i + 1 };
}

/** `[shot N: Caption]` — string-parsed, or null if the line is no shot slot. */
function parseShotLine(line: string, lineNo: number): { n: number; caption: string } | null {
  if (!line.startsWith("[shot ") || !line.endsWith("]")) return null;
  const inner = line.slice("[shot ".length, -1);
  const colon = inner.indexOf(":");
  if (colon < 0) throw new GuideFormatError("shot slot needs a `:` before the caption", lineNo);
  const n = Number(inner.slice(0, colon).trim());
  if (!Number.isInteger(n) || n <= 0) {
    throw new GuideFormatError("shot slot needs a positive number", lineNo);
  }
  return { n, caption: inner.slice(colon + 1).trim() };
}

/** `{{TOKEN}}` alone on a line — a value box; unknown tokens throw. */
function parseBoxLine(line: string, lineNo: number): GuideToken | null {
  if (!line.startsWith("{{") || !line.endsWith("}}")) return null;
  const name = line.slice(2, -2);
  if (!/^[A-Z_]+$/.test(name)) return null;
  if (!TOKEN_SET.has(name)) {
    throw new GuideFormatError(`unknown placeholder token {{${name}}}`, lineNo);
  }
  return name as GuideToken;
}

/** One body line into the accumulating state. Returns the (new) title. */
function parseBodyLine(line: string, lineNo: number, title: string, steps: GuideStep[]): string {
  if (line.startsWith("# ")) {
    return line.slice(2).trim();
  }
  const stepStart = /^\d+\.\s/.exec(line);
  if (stepStart) {
    const n = Number(line.slice(0, stepStart[0].indexOf(".")));
    steps.push({ n, text: parseInline(line.slice(stepStart[0].length), lineNo), boxes: [], shots: [] });
    return title;
  }
  const current = steps.at(-1);
  if (!current) {
    throw new GuideFormatError(`content before the first numbered step: ${line}`, lineNo);
  }
  const shot = parseShotLine(line, lineNo);
  if (shot) {
    current.shots.push(shot);
    return title;
  }
  const box = parseBoxLine(line, lineNo);
  if (box) {
    current.boxes.push(box);
    return title;
  }
  // Continuation line of the step text.
  current.text.push({ kind: "text", text: " " }, ...parseInline(line, lineNo));
  return title;
}

/** Body lines with comments and blanks dropped, original line numbers kept. */
function contentLines(lines: string[], start: number): { line: string; no: number }[] {
  const out: { line: string; no: number }[] = [];
  let inComment = false;
  for (let i = start; i < lines.length; i++) {
    const line = lines[i].trim();
    if (inComment) {
      if (line.endsWith("-->")) inComment = false;
      continue;
    }
    if (line.startsWith("<!--")) {
      if (!line.endsWith("-->")) inComment = true;
      continue;
    }
    if (line !== "") out.push({ line, no: i + 1 });
  }
  return out;
}

/** Parse a full guide document. Throws GuideFormatError on any violation. */
export function parseGuide(source: string): CellGuide {
  const lines = source.split(/\r?\n/);
  const { frontmatter, next } = parseFrontmatter(lines);

  let title = "";
  const steps: GuideStep[] = [];
  for (const { line, no } of contentLines(lines, next)) {
    title = parseBodyLine(line, no, title, steps);
  }

  if (!title) throw new GuideFormatError("guide carries no # title");
  const authoringPending = (frontmatter["authoring"] ?? "").toLowerCase() === "pending";
  if (!authoringPending && steps.length === 0) {
    throw new GuideFormatError("guide has no steps and no `authoring: pending` marker");
  }
  return { title, frontmatter, authoringPending, steps };
}
