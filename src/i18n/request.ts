/**
 * next-intl request config (App Router, NO URL routing). The active locale
 * comes from the cookie (src/lib/locale.ts); messages are loaded per locale.
 */
import { getRequestConfig } from "next-intl/server";
import { getLocale } from "@/lib/locale";

export default getRequestConfig(async () => {
  const locale = await getLocale();
  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
