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
    if (seg.kind === "text" && /\{\{|\}\}/.test(seg.text)) {
      throw new GuideFormatError("malformed placeholder token", lineNo);
    }
  }
  return out;
}

/** Parse a full guide document. Throws GuideFormatError on any violation. */
export function parseGuide(source: string): CellGuide {
  const lines = source.split(/\r?\n/);
  let i = 0;

  // --- frontmatter -----------------------------------------------------
  const frontmatter: Record<string, string> = {};
  if (lines[0]?.trim() !== "---") {
    throw new GuideFormatError("guide must start with a --- frontmatter block", 1);
  }
  i = 1;
  for (; i < lines.length && lines[i].trim() !== "---"; i++) {
    const line = lines[i].trim();
    if (line === "" || line.startsWith("#")) continue;
    const m = /^([a-z-]+):\s*(.*)$/.exec(line);
    if (!m) throw new GuideFormatError(`invalid frontmatter line: ${line}`, i + 1);
    frontmatter[m[1]] = m[2].trim();
  }
  if (i >= lines.length) throw new GuideFormatError("unterminated frontmatter block");
  i++;

  // --- body ------------------------------------------------------------
  let title = "";
  let inComment = false;
  const steps: GuideStep[] = [];
  for (; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();
    if (inComment) {
      if (line.endsWith("-->")) inComment = false;
      continue;
    }
    if (line.startsWith("<!--")) {
      if (!line.endsWith("-->")) inComment = true;
      continue;
    }
    if (line === "") continue;
    if (line.startsWith("# ")) {
      title = line.slice(2).trim();
      continue;
    }
    const step = /^(\d+)\.\s+(.*)$/.exec(line);
    if (step) {
      steps.push({
        n: Number(step[1]),
        text: parseInline(step[2], i + 1),
        boxes: [],
        shots: [],
      });
      continue;
    }
    const current = steps[steps.length - 1];
    if (!current) {
      throw new GuideFormatError(`content before the first numbered step: ${line}`, i + 1);
    }
    const shot = /^\[shot\s+(\d+):\s*(.*)\]$/.exec(line);
    if (shot) {
      current.shots.push({ n: Number(shot[1]), caption: shot[2].trim() });
      continue;
    }
    const box = /^\{\{([A-Z_]+)\}\}$/.exec(line);
    if (box) {
      if (!TOKEN_SET.has(box[1])) {
        throw new GuideFormatError(`unknown placeholder token {{${box[1]}}}`, i + 1);
      }
      current.boxes.push(box[1] as GuideToken);
      continue;
    }
    // Continuation line of the step text.
    current.text.push({ kind: "text", text: " " });
    current.text.push(...parseInline(line, i + 1));
  }

  if (!title) throw new GuideFormatError("guide carries no # title");
  const authoringPending = (frontmatter["authoring"] ?? "").toLowerCase() === "pending";
  if (!authoringPending && steps.length === 0) {
    throw new GuideFormatError("guide has no steps and no `authoring: pending` marker");
  }
  return { title, frontmatter, authoringPending, steps };
}
