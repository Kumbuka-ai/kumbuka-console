import { notFound } from "next/navigation";
import { getLocale } from "@/lib/locale";
import { helpManifest } from "@/help/manifest";
import { loadHelpDoc } from "@/help/load";
import { HelpDocView } from "@/components/help/HelpDocView";

/**
 * /help/[section] — renders a manifest section's document. Unknown slugs
 * are a 404, not an empty shell: the manifest is the single source of
 * what exists. A manifest section whose document is missing is a thrown
 * error, never a placeholder — a section exists when its text exists.
 *
 * Sections contributed by a downstream build (getNavExtensions("help"))
 * are that build's own static routes, which take precedence over this
 * dynamic segment — they never resolve here.
 */
export default async function HelpSectionPage({
  params,
}: Readonly<{ params: Promise<{ section: string }> }>) {
  const { section } = await params;
  const entry = helpManifest.find((s) => s.slug === section);
  if (!entry) notFound();
  const locale = await getLocale();
  const doc = loadHelpDoc(entry.slug, locale);
  return <HelpDocView doc={doc} locale={locale} />;
}
