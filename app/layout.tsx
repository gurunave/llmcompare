import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/AppShell";
import { SelectionProvider } from "@/lib/selection";
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

/** Stamps the saved theme before first paint so the page never flashes. */
const themeScript = `
(function () {
  try {
    var saved = localStorage.getItem("llmcompare-theme");
    if (saved === "light" || saved === "dark") {
      document.documentElement.setAttribute("data-theme", saved);
    }
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <SelectionProvider>
          <AppShell>{children}</AppShell>
        </SelectionProvider>
      </body>
    </html>
  );
}
