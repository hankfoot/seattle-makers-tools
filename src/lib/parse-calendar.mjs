/**
 * Turn the calendar page's HTML into event records.
 *
 * Lifted out of fetch-events.mjs so the Cloudflare function can use it too:
 * the scraper runs this in Node and writes a file, the function runs it on
 * every request and returns JSON. One parser, so a calendar redesign cannot
 * break one of them while the other keeps working.
 *
 * Deliberately pure - string in, array out. No fs, no fetch, no Node built-ins,
 * because a Workers runtime has none of them. Everything in fetch-events.mjs
 * that touches disk (the per-event summary and picture enrichment) stays there.
 *
 * SOURCE is the page this expects; both callers fetch it themselves.
 */
export const SOURCE = 'https://seattlemakers.org/events';

/** Slugs on the anchor that describe the kind of event, not the studio. */
const KINDS = ['class', 'certification', 'guided-studio', 'meetup', 'orientation', 'tour'];
/** Bookkeeping classes emitted by the calendar plugin, never taxonomy. */
const NOISE = new Set(['pp-tip', 'pe-inv-out', 'wposted', 'dashicons']);

const MONTHS = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

const pad = (n) => String(n).padStart(2, '0');

/** "August 5, 2026 6:00 pm" -> "2026-08-05T18:00" (floating local time). */
function parseWhen(text) {
  const m = /^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})\s+(\d{1,2}):(\d{2})\s*(am|pm)$/i.exec(text.trim());
  if (!m) return null;
  const month = MONTHS[m[1].toLowerCase()];
  if (!month) return null;
  let hour = Number(m[4]) % 12;
  if (m[6].toLowerCase() === 'pm') hour += 12;
  return `${m[3]}-${pad(month)}-${pad(Number(m[2]))}T${pad(hour)}:${m[5]}`;
}

function decode(s) {
  return s
    .replace(/&#8217;|&#039;|&apos;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;|&#8221;/g, '"')
    .replace(/&#8211;|&#8212;/g, '-')
    .replace(/&hellip;|&#8230;/g, '…')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/\s+/g, ' ')
    .trim();
}

export function parse(html) {
  const anchor = /<a\s+title="([^"]*)"\s+href="([^"]+)"\s+rel="(\d+)"\s+class="([^"]*)"/g;
  const events = [];
  const seen = new Set();

  for (const m of html.matchAll(anchor)) {
    const [, titleAttr, href, rel, classAttr] = m;
    if (!classAttr.includes('pp-tip')) continue;

    const titleMatch = /pe-hover-title[^>]*>(.*?)<\/div>/s.exec(titleAttr);
    if (!titleMatch) continue;

    const dates = [...titleAttr.matchAll(/pe-hover-date[^>]*>(.*?)<\/div>/gs)].map((d) => d[1]);
    if (dates.length < 1) continue;

    // Availability is appended to the title as "(N avail)".
    let name = decode(titleMatch[1].replace(/<[^>]+>/g, ''));
    let available = null;
    const avail = /\((\d+)\s*avail\)\s*$/i.exec(name);
    if (avail) {
      available = Number(avail[1]);
      name = name.slice(0, avail.index).trim();
    }

    const endRaw = dates[dates.length - 1];
    const tsMatch = /\*(\d{9,11})\*/.exec(endRaw);
    const start = parseWhen(decode(dates[0].replace(/<[^>]+>/g, '')));
    const end = parseWhen(decode(endRaw.replace(/\*\d+\*/, '').replace(/<[^>]+>/g, '')));
    if (!start) continue;

    const categories = classAttr
      .split(/\s+/)
      .filter((c) => c && !NOISE.has(c));

    // The same event can appear more than once in the grid (multi-day series
    // render on each day they touch); the post id plus start time is unique.
    const key = `${rel}@${start}`;
    if (seen.has(key)) continue;
    seen.add(key);

    events.push({
      id: Number(rel),
      title: name,
      url: href,
      start,
      end: end ?? null,
      endTs: tsMatch ? Number(tsMatch[1]) : null,
      available,
      soldOut: classAttr.includes('pe-inv-out') || available === 0,
      kinds: categories.filter((c) => KINDS.includes(c)),
      categories: categories.filter((c) => !KINDS.includes(c)),
    });
  }

  events.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : a.id - b.id));
  return events;
}
