import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { AppShell } from "@/components/AppShell";
import { SelectionProvider } from "@/lib/selection";
import { GA_ID } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  title: "LLM Compare — visual model comparison",
  description:
    "Compare large language models side by side: capability radar, cost-vs-capability frontier, benchmark leaderboards and a full spec table.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0d0d0d" },
    { media: "(prefers-color-scheme: light)", color: "#f9f9f7" },
  ],
};

/**
 * Stamps the saved theme and navigation layout before first paint. Both are
 * root attributes that CSS reads, so the page never flashes the wrong one —
 * and neither is React state, so the prerendered markup stays valid.
 */
const preferenceScript = `
(function () {
  try {
    var theme = localStorage.getItem("llmcompare-theme");
    if (theme === "light" || theme === "dark") {
      document.documentElement.setAttribute("data-theme", theme);
    }
    var nav = localStorage.getItem("llmcompare-nav");
    if (nav === "rail" || nav === "top") {
      document.documentElement.setAttribute("data-nav", nav);
    }
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" data-nav="rail" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: preferenceScript }} />
      </head>
      <body>
        {GA_ID && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
            <Script id="ga-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}');
              `}
            </Script>
          </>
        )}
        <SelectionProvider>
          <AppShell>{children}</AppShell>
        </SelectionProvider>
      </body>
    </html>
  );
}
