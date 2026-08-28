/**
 * The canonical origin the site is served from, for sitemap and robots URLs.
 *
 * GitHub Pages serves a project site at <owner>.github.io/<repo>, which is why
 * next.config sets a basePath there — but a sitemap needs absolute URLs, and
 * the basePath alone does not give one. The workflow already knows both halves,
 * so they are read from the same environment it sets, with a local default that
 * keeps `next dev` and `next start` working.
 */
const owner = process.env.REPO_OWNER || "gurunave";
const repo = process.env.REPO_NAME || "llmcompare";

export const SITE_URL = process.env.SITE_URL
  ? process.env.SITE_URL.replace(/\/$/, "")
  : process.env.GITHUB_PAGES === "true"
    ? `https://${owner}.github.io/${repo}`
    : "http://localhost:3000";

/** Every route the site serves, without the per-model pages. */
export const STATIC_ROUTES = [
  "",
  "/timeline",
  "/compare",
  "/recommend",
  "/hardware",
  "/methodology",
];
