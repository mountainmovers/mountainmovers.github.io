// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// Canonical origin. The GitLab Pages preview overrides this via SITE_URL so
// canonical/og URLs point at the preview host; production builds use the
// default. See docs/adr/0002-hosting-and-preview.md.
const site = process.env.SITE_URL || "https://www.mountainmovers.org";

export default defineConfig({
  site,
  trailingSlash: "ignore",
  integrations: [sitemap()],
  redirects: {
    // Throwaway 2016 Jekyll posts — GitHub Pages has no server redirects, so
    // Astro emits meta-refresh pages. Weak SEO weight is acceptable here.
    "/2016/11/05/5000/": "/about/",
    "/2016/11/01/latest-milestone/": "/about/",
    // Ministry history lives inside the About timeline now.
    "/ministries/": "/about/",
  },
});
