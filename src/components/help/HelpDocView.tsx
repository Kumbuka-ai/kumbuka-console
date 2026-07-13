import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { HelpBlock, HelpDoc, HelpSegment } from "@/help/doc";
import { TypeCatalog } from "./TypeCatalog";

/**
 * Renders a parsed help document (see src/help/doc.ts for the format).
 * A server component: the document is loaded and parsed on the server;
 * the only client island is the collapsible type catalogue.
 */
function Segments({ segments }: Readonly<{ segments: HelpSegment[] }>) {
  // Keys are the segment's character offset in the source text — stable
  // and content-bound, unlike an array index.
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

function Block({ block, locale }: Readonly<{ block: HelpBlock; locale: Locale }>) {
  switch (block.kind) {
    case "heading":
      return (
        <h3 className="hd-h" id={block.anchor}>
          <Segments segments={block.segments} />
        </h3>
      );
    case "list":
      return (
        <ul className="hd-list">
          {block.items.map((item, i) => (
            // Static document content — the index is stable.
            <li key={i}>
              <Segments segments={item} />
            </li>
          ))}
        </ul>
      );
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
  return (
    <article className="help-section hd-doc">
      <h2>{doc.title}</h2>
      {doc.blocks.map((block, i) => (
        // Static document content — the index is stable.
        <Block key={i} block={block} locale={locale} />
      ))}
    </article>
  );
}
