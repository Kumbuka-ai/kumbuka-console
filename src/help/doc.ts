/**
 * Help-doc format — parser.
 *
 * A help document is a small, deliberately constrained Markdown dialect
 * (no general Markdown engine, no dependency), the same discipline as the
 * connect-cell guide format one level over: a closed grammar and thrown
 * errors instead of silent fallbacks. A malformed marker must never reach
 * the user as literal text.
 *
 * ```
 * ---
 * updated: 2026-07-13
 * ---
 *
 * # Page title
 *
 * A paragraph with **bold**, `code` and [an internal link](/scopes).
 *
 * ## Section heading {#stable-anchor}
 *
 * - list item
 * - list item
 *
 * > A callout block.
 *
 * [type-catalog]
 * ```
 *
 * Grammar rules, each a thrown HelpDocFormatError:
 *  - the frontmatter block is mandatory and carries at least `updated`,
 *  - exactly one `# ` title, plain text,
 *  - every `## ` heading carries an explicit `{#anchor}` (lowercase,
 *    digits, hyphens). Anchors are never derived from the heading text —
 *    a derived anchor would differ between the German and the English
 *    page and every deep link would be language-dependent,
 *  - blocks are separated by blank lines: paragraphs, `- ` lists, `> `
 *    callouts,
 *  - inline: `**bold**`, `` `code` ``, `[text](/path)`; a link target
 *    that is neither an in-app path nor an http(s) URL is an error,
 *  - `[type-catalog]` alone on a line is a block token — the only one;
 *    an unknown `[...]` block token is an error,
 *  - half-open constructs (`{#anchor`, `**bold`) are errors.
 */

/** Inline text is a list of segments so the renderer needs no HTML parsing. */
export type HelpSegment =
  | { kind: "text"; text: string }
  | { kind: "bold"; text: string }
  | { kind: "code"; text: string }
  | { kind: "link"; text: string; href: string };

export type HelpBlock =
  | { kind: "paragraph"; segments: HelpSegment[] }
  | { kind: "heading"; anchor: string; segments: HelpSegment[] }
  | { kind: "list"; items: HelpSegment[][] }
  | { kind: "callout"; segments: HelpSegment[] }
  | { kind: "type-catalog" };

export type HelpDoc = {
  title: string;
  frontmatter: Record<string, string>;
  blocks: HelpBlock[];
};

export class HelpDocFormatError extends Error {
  constructor(message: string, line?: number) {
    super(line === undefined ? message : `${message} (line ${line})`);
    this.name = "HelpDocFormatError";
  }
}

/** Split one line into text/bold/code/link segments; violations throw. */
export function parseInline(line: string, lineNo?: number): HelpSegment[] {
  const out: HelpSegment[] = [];
  const re = /\*\*([^*]+)\*\*|`([^`]*)`|\[([^\]]+)\]\(([^()\s]+)\)/g;
  let last = 0;
  for (let m = re.exec(line); m !== null; m = re.exec(line)) {
    if (m.index > last) out.push({ kind: "text", text: line.slice(last, m.index) });
    if (m[1] !== undefined) {
      out.push({ kind: "bold", text: m[1] });
    } else if (m[2] !== undefined) {
      out.push({ kind: "code", text: m[2] });
    } else {
      const href = m[4];
      if (!href.startsWith("/") && !/^https?:\/\//.test(href)) {
        throw new HelpDocFormatError(
          `link target must be an in-app path or an http(s) URL: ${href}`,
          lineNo,
        );
      }
      out.push({ kind: "link", text: m[3], href });
    }
    last = re.lastIndex;
  }
  if (last < line.length) out.push({ kind: "text", text: line.slice(last) });
  // A half-open construct (`**bold`, `` `code ``, `[text](...`, `{#anchor`)
  // must not slip through as literal text.
  for (const seg of out) {
    if (seg.kind !== "text") continue;
    for (const marker of ["**", "`", "[", "]", "{#"]) {
      if (seg.text.includes(marker)) {
        throw new HelpDocFormatError(`malformed inline marker near "${marker}"`, lineNo);
      }
    }
  }
  return out;
}

/** Parse the frontmatter block; returns the map and the next line index. */
function parseFrontmatter(lines: string[]): { frontmatter: Record<string, string>; next: number } {
  if (lines[0]?.trim() !== "---") {
    throw new HelpDocFormatError("document must start with a --- frontmatter block", 1);
  }
  const frontmatter: Record<string, string> = {};
  let i = 1;
  for (; i < lines.length && lines[i].trim() !== "---"; i++) {
    const line = lines[i].trim();
    if (line === "") continue;
    const colon = line.indexOf(":");
    const key = colon > 0 ? line.slice(0, colon) : "";
    if (!/^[a-z-]+$/.test(key)) {
      throw new HelpDocFormatError(`invalid frontmatter line: ${line}`, i + 1);
    }
    frontmatter[key] = line.slice(colon + 1).trim();
  }
  if (i >= lines.length) throw new HelpDocFormatError("unterminated frontmatter block");
  if (!frontmatter["updated"]) {
    throw new HelpDocFormatError("frontmatter must carry at least `updated`");
  }
  return { frontmatter, next: i + 1 };
}

type NumberedLine = { line: string; no: number };

/** Non-blank lines grouped into blocks at blank-line boundaries. */
function groupBlocks(lines: string[], start: number): NumberedLine[][] {
  const groups: NumberedLine[][] = [];
  let current: NumberedLine[] = [];
  for (let i = start; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === "") {
      if (current.length > 0) {
        groups.push(current);
        current = [];
      }
    } else {
      current.push({ line, no: i + 1 });
    }
  }
  if (current.length > 0) groups.push(current);
  return groups;
}

/** `[token]` alone on a line — a block token candidate. */
const BLOCK_TOKEN_RE = /^\[[^\]]*\]$/;

function requireSingleLine(group: NumberedLine[], what: string): NumberedLine {
  if (group.length > 1) {
    throw new HelpDocFormatError(`${what} must be a single line`, group[1].no);
  }
  return group[0];
}

function parseTitle(group: NumberedLine[]): string {
  const { line, no } = requireSingleLine(group, "the # title");
  const segments = parseInline(line.slice(2).trim(), no);
  if (segments.length !== 1 || segments[0].kind !== "text") {
    throw new HelpDocFormatError("the # title must be plain text", no);
  }
  const title = segments[0].text;
  if (title === "") throw new HelpDocFormatError("the # title is empty", no);
  return title;
}

function parseHeading(group: NumberedLine[]): HelpBlock {
  const { line, no } = requireSingleLine(group, "a ## heading");
  const anchorMatch = /\{#([^}]*)\}\s*$/.exec(line);
  if (!anchorMatch) {
    throw new HelpDocFormatError(
      line.includes("{#")
        ? "malformed {#anchor} marker on a ## heading"
        : "a ## heading must carry an explicit {#anchor}",
      no,
    );
  }
  const anchor = anchorMatch[1];
  if (!/^[a-z0-9-]+$/.test(anchor)) {
    throw new HelpDocFormatError(
      `anchor must be lowercase letters, digits and hyphens: {#${anchor}}`,
      no,
    );
  }
  const segments = parseInline(line.slice(3, anchorMatch.index).trim(), no);
  if (segments.length === 0) {
    throw new HelpDocFormatError("a ## heading carries no text", no);
  }
  return { kind: "heading", anchor, segments };
}

function parseList(group: NumberedLine[]): HelpBlock {
  const items: HelpSegment[][] = [];
  let text = "";
  let itemNo = group[0].no;
  const flush = () => {
    if (text !== "") items.push(parseInline(text, itemNo));
  };
  for (const { line, no } of group) {
    if (line.startsWith("- ")) {
      flush();
      text = line.slice(2).trim();
      itemNo = no;
    } else if (line.startsWith(">") || line.startsWith("#") || BLOCK_TOKEN_RE.test(line)) {
      throw new HelpDocFormatError("mixed content inside a list block", no);
    } else {
      // Continuation line of the current item.
      text += ` ${line}`;
    }
  }
  flush();
  return { kind: "list", items };
}

function parseCallout(group: NumberedLine[]): HelpBlock {
  const parts: string[] = [];
  for (const { line, no } of group) {
    if (!line.startsWith("> ")) {
      throw new HelpDocFormatError("every line of a callout must start with '> '", no);
    }
    parts.push(line.slice(2).trim());
  }
  return { kind: "callout", segments: parseInline(parts.join(" "), group[0].no) };
}

function parseBlockToken(group: NumberedLine[]): HelpBlock {
  const { line, no } = requireSingleLine(group, "a block token");
  if (line !== "[type-catalog]") {
    throw new HelpDocFormatError(`unknown block token ${line}`, no);
  }
  return { kind: "type-catalog" };
}

function parseParagraph(group: NumberedLine[]): HelpBlock {
  for (const { line, no } of group.slice(1)) {
    if (
      line.startsWith("- ") ||
      line.startsWith(">") ||
      line.startsWith("#") ||
      BLOCK_TOKEN_RE.test(line)
    ) {
      throw new HelpDocFormatError("mixed content inside a paragraph block", no);
    }
  }
  const text = group.map((l) => l.line).join(" ");
  return { kind: "paragraph", segments: parseInline(text, group[0].no) };
}

/** Parse a full help document. Throws HelpDocFormatError on any violation. */
export function parseHelpDoc(source: string): HelpDoc {
  const lines = source.split(/\r?\n/);
  const { frontmatter, next } = parseFrontmatter(lines);

  let title: string | null = null;
  const blocks: HelpBlock[] = [];
  const anchors = new Set<string>();
  for (const group of groupBlocks(lines, next)) {
    const first = group[0];
    if (first.line.startsWith("# ")) {
      if (title !== null) {
        throw new HelpDocFormatError("more than one # title", first.no);
      }
      title = parseTitle(group);
      continue;
    }
    let block: HelpBlock;
    if (first.line.startsWith("## ")) {
      block = parseHeading(group);
      if (block.kind === "heading") {
        if (anchors.has(block.anchor)) {
          throw new HelpDocFormatError(`duplicate anchor {#${block.anchor}}`, first.no);
        }
        anchors.add(block.anchor);
      }
    } else if (first.line.startsWith("#")) {
      throw new HelpDocFormatError(`unsupported heading level: ${first.line}`, first.no);
    } else if (first.line.startsWith("- ")) {
      block = parseList(group);
    } else if (first.line.startsWith(">")) {
      block = parseCallout(group);
    } else if (BLOCK_TOKEN_RE.test(first.line)) {
      block = parseBlockToken(group);
    } else {
      block = parseParagraph(group);
    }
    blocks.push(block);
  }

  if (title === null) throw new HelpDocFormatError("document carries no # title");
  return { title, frontmatter, blocks };
}

/** The heading anchors of a document, in order — the deep-link surface. */
export function docAnchors(doc: HelpDoc): string[] {
  return doc.blocks.flatMap((b) => (b.kind === "heading" ? [b.anchor] : []));
}
