import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { APP_VERSION } from "@/lib/version";

export const metadata: Metadata = {
  title: "Tyra Life",
  description: "Din livsplan, på ett ställe.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sv" suppressHydrationWarning>
      <head>
        <meta name="app-version" content={APP_VERSION} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
