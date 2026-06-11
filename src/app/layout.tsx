import type { Metadata } from "next";
import "./globals.css";
import { ToastHost } from "@/components/ui/Toast";
import { getTheme } from "@/lib/theme";

export const metadata: Metadata = {
  title: `${process.env.NEXT_PUBLIC_APP_NAME ?? "kumbuka.ai"} · Console`,
  description: "kumbuka.ai admin console",
  icons: { icon: "/brand/kumbuka-mark-orange.svg" },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const theme = await getTheme();
  return (
    <html lang="en" data-theme={theme}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&family=Space+Grotesk:wght@500;600;700&display=swap"
        />
      </head>
      <body>
        <ToastHost>{children}</ToastHost>
      </body>
    </html>
  );
}
