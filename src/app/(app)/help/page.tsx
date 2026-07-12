import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/ui/Icon";
import { helpNavItems } from "@/help/nav";

/**
 * /help — entry point of the help area. With sections present (from the
 * manifest or contributed by a downstream build) it forwards to the first
 * one; with none it renders a deliberate empty state: the help content is
 * written section by section, and an empty area must look intentional,
 * not broken.
 */
export default async function HelpPage() {
  const items = helpNavItems();
  if (items.length > 0) {
    redirect(items[0].href);
  }
  const t = await getTranslations("help");
  return (
    <div className="help-empty">
      <Icon name="help" className="ico help-empty-ico" />
      <h2>{t("emptyTitle")}</h2>
      <p>{t("emptyBody")}</p>
    </div>
  );
}
