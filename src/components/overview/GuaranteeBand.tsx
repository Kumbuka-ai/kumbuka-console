import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/ui/Icon";

/** Private-guarantee surface 2 of 5. */
export async function GuaranteeBand() {
  const t = await getTranslations("overview.guarantee");
  return (
    <div className="guarantee-band">
      <div className="gb-lock">
        <Icon name="lock" />
      </div>
      <div>
        <h4>{t("title")}</h4>
        <p>{t("body")}</p>
      </div>
      <span className="gb-tag">
        <Icon name="ok" />
        {t("tag")}
      </span>
    </div>
  );
}
