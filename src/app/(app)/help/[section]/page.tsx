import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getLocale } from "@/lib/locale";
import { helpManifest } from "@/help/manifest";

/**
 * /help/[section] — renders a manifest section. Unknown slugs are a 404,
 * not an empty shell: the manifest is the single source of what exists.
 *
 * Sections contributed by a downstream build (getNavExtensions("help"))
 * are that build's own static routes, which take precedence over this
 * dynamic segment — they never resolve here.
 *
 * The manifest is empty today, so every slug 404s. Once content exists, a
 * section is a manifest entry plus its body rendered here; until then a
 * known-but-unwritten section shows the pending note below rather than
 * invented documentation.
 */
export default async function HelpSectionPage({
  params,
}: Readonly<{ params: Promise<{ section: string }> }>) {
  const { section } = await params;
  const entry = helpManifest.find((s) => s.slug === section);
  if (!entry) notFound();
  const [locale, t] = await Promise.all([getLocale(), getTranslations("help")]);
  return (
    <article className="help-section">
      <h2>{entry.label[locale]}</h2>
      <p className="help-pending">{t("sectionPending")}</p>
    </article>
  );
}
