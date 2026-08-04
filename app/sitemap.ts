import type { MetadataRoute } from "next";
import { MODELS, catalog } from "@/lib/models";
import { SITE_URL, STATIC_ROUTES } from "@/lib/site";

/**
 * Static export writes this to sitemap.xml at build time. The model pages are
 * the bulk of the site — one per catalog entry — and they are the pages worth
 * finding from a search for a model name.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date(catalog.meta.lastReviewed);

  return [
    ...STATIC_ROUTES.map((route) => ({
      url: `${SITE_URL}${route || "/"}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: route === "" ? 1 : 0.8,
    })),
    ...MODELS.map((m) => ({
      url: `${SITE_URL}/models/${m.id}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
