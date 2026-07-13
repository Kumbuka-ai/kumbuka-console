import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { HelpBlock, HelpDoc, HelpSegment } from "@/help/doc";
import { TypeCatalog } from "./TypeCatalog";

/**
 * Renders a parsed help document (see src/help/doc.ts for the format).
 * A server component: the document is loaded and parsed on the server;
 * the only client island is the collapsible type catalogue.
 *
 * React keys are character offsets into the source content — stable and
 * content-bound, the same scheme the connect area's step renderer uses.
 */
function segmentsLength(segments: HelpSegment[]): number {
  return segments.reduce((n, s) => n + s.text.length, 0);
}

function blockLength(block: HelpBlock): number {
  switch (block.kind) {
    case "list":
      return block.items.reduce((n, item) => n + segmentsLength(item), 0);
    case "type-catalog":
      return "[type-catalog]".length;
    default:
      return segmentsLength(block.segments);
  }
}

function Segments({ segments }: Readonly<{ segments: HelpSegment[] }>) {
  let offset = 0;
  const nodes = segments.map((seg) => {
    const key = `${seg.kind}-${offset}`;
    offset += seg.text.length;
    if (seg.kind === "code") return <code key={key}>{seg.text}</code>;
    if (seg.kind === "bold") return <b key={key}>{seg.text}</b>;
    if (seg.kind === "link") {
      return seg.href.startsWith("/") ? (
        <Link key={key} href={seg.href}>
          {seg.text}
        </Link>
      ) : (
        <a key={key} href={seg.href} target="_blank" rel="noreferrer">
          {seg.text}
        </a>
      );
    }
    return <span key={key}>{seg.text}</span>;
  });
  return <>{nodes}</>;
}

function List({ items }: Readonly<{ items: HelpSegment[][] }>) {
  let offset = 0;
  const nodes = items.map((item) => {
    const key = `item-${offset}`;
    offset += segmentsLength(item);
    return (
      <li key={key}>
        <Segments segments={item} />
      </li>
    );
  });
  return <ul className="hd-list">{nodes}</ul>;
}

function Block({ block, locale }: Readonly<{ block: HelpBlock; locale: Locale }>) {
  switch (block.kind) {
    case "heading":
      return (
        <h3 className="hd-h" id={block.anchor}>
          <Segments segments={block.segments} />
        </h3>
      );
    case "list":
      return <List items={block.items} />;
    case "callout":
      return (
        <aside className="hd-callout">
          <Segments segments={block.segments} />
        </aside>
      );
    case "type-catalog":
      return <TypeCatalog locale={locale} />;
    default:
      return (
        <p className="hd-p">
          <Segments segments={block.segments} />
        </p>
      );
  }
}

export function HelpDocView({ doc, locale }: Readonly<{ doc: HelpDoc; locale: Locale }>) {
  let offset = 0;
  const rendered = doc.blocks.map((block) => {
    const key = `${block.kind}-${offset}`;
    offset += blockLength(block);
    return <Block key={key} block={block} locale={locale} />;
  });
  return (
    <article className="help-section hd-doc">
      <h2>{doc.title}</h2>
      {rendered}
    </article>
  );
}
