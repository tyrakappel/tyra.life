import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { APP_VERSION } from "@/lib/version";

export const metadata: Metadata = {
  title: "Tyralife",
  description: "Din livsplan, på ett ställe.",
  applicationName: "Tyralife",
  appleWebApp: {
    title: "Tyralife",
    capable: true,
    statusBarStyle: "default",
  },
  openGraph: {
    title: "Tyralife",
    description: "Din livsplan, på ett ställe.",
    siteName: "Tyralife",
  },
  icons: {
    icon: "/favicon.svg",
    apple: "/favicon.svg",
  },
  manifest: "/manifest.webmanifest",
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
        {/* Sätt data-color-theme INNAN React hydrerar för att undvika FOUC */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var t = localStorage.getItem('tyra-color-theme');
                if (t !== 'indigo' && t !== 'emerald' && t !== 'spectrum') t = 'indigo';
                document.documentElement.setAttribute('data-color-theme', t);
              } catch (e) {
                document.documentElement.setAttribute('data-color-theme', 'indigo');
              }
            `,
          }}
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
