/**
 * The app is a single client-rendered page with no server work, so it exports
 * to static HTML. GITHUB_PAGES=true switches on the export plus the
 * /<repo> path prefix that project pages are served under; without it the
 * config is a plain Next app (`next dev` / `next start`, or Vercel).
 */
const isPages = process.env.GITHUB_PAGES === "true";
const basePath = isPages ? `/${process.env.REPO_NAME || "llmcompare"}` : "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  ...(isPages
    ? {
        output: "export",
        basePath,
        assetPrefix: basePath,
        images: { unoptimized: true },
        trailingSlash: true,
      }
    : {}),
};

export default nextConfig;
