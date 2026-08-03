import type { APIRoute } from "astro";
import { getCollection, getEntry } from "astro:content";

// Hand-rolled RSS 2.0 + itunes namespace (ADR 0003): @astrojs/rss pushes all
// itunes tags into raw customData strings anyway, so a small builder is
// simpler and easier to validate. Apple/Spotify require: enclosure with
// url/length/type, guid, RFC-822 pubDate, itunes:duration, atom:link self.

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export const GET: APIRoute = async ({ site }) => {
  const company = await getEntry("site", "company");
  if (!company || !site) throw new Error("Missing site config");

  // Drafts never reach the feed — see ADR 0005.
  const episodes = (await getCollection("episodes", ({ data }) => !data.draft)).sort(
    (a, b) => b.data.published.valueOf() - a.data.published.valueOf(),
  );

  const feedUrl = new URL("/podcast/rss.xml", site).toString();
  const homeUrl = new URL("/podcast/", site).toString();
  const coverUrl = new URL("/siteicon.png", site).toString();
  const title = "The Mountain Movers Podcast";
  const description =
    "Stories from the world's hardest mission fields, and teaching that helps you put your gifts to work for God.";

  const items = episodes
    .map((episode) => {
      const pageUrl = new URL(`/podcast/${episode.id}/`, site).toString();
      // Non-draft episodes are schema-guaranteed to have a full enclosure.
      const { audio_url, audio_bytes, audio_type, duration } = episode.data;
      return `    <item>
      <title>${escapeXml(episode.data.title)}</title>
      <description>${escapeXml(episode.data.description)}</description>
      <link>${pageUrl}</link>
      <guid isPermaLink="true">${pageUrl}</guid>
      <pubDate>${episode.data.published.toUTCString()}</pubDate>
      <enclosure url="${escapeXml(audio_url ?? "")}" length="${audio_bytes ?? 0}" type="${escapeXml(audio_type)}"/>
      <itunes:duration>${duration ?? ""}</itunes:duration>
      <itunes:episode>${episode.data.episode_number}</itunes:episode>
      <itunes:season>${episode.data.season}</itunes:season>
      <itunes:explicit>false</itunes:explicit>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(title)}</title>
    <link>${homeUrl}</link>
    <description>${escapeXml(description)}</description>
    <language>en-us</language>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml"/>
    <itunes:author>${escapeXml(company.data.company_name)}</itunes:author>
    <itunes:owner>
      <itunes:name>${escapeXml(company.data.company_name)}</itunes:name>
      <itunes:email>${escapeXml(company.data.email)}</itunes:email>
    </itunes:owner>
    <itunes:image href="${coverUrl}"/>
    <itunes:category text="Religion &amp; Spirituality">
      <itunes:category text="Christianity"/>
    </itunes:category>
    <itunes:explicit>false</itunes:explicit>
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
};
