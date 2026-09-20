/**
 * A short, readable description for one event, pulled from its own page.
 *
 * **`og:description` is the only usable source on these pages.** Measured
 * across a sample of event pages: `og:description` was present on 8 of 8,
 * while `<meta name="description">`, JSON-LD `Event.description` and the
 * `.tribe-events-single-event-description` body were present on 0 of 8. So
 * there is no choice to agonise over - but what it hands back needs work.
 *
 * WordPress builds that string by flattening the page's opening content and
 * cutting it at a character count, which produces four specific problems, all
 * of them visible in the live calendar:
 *
 *   1. A trailing `[…]` where it cut.
 *   2. Headings glued to the paragraph after them, with no punctuation
 *      between: "…required prior to using the woodshop Working on a project…"
 *   3. Bullet lists flattened into word salad, usually announced by an emoji:
 *      "…atmosphere! What's covered 🌞 Printing films & burning screens Films…"
 *   4. A missing space after a full stop: "coverstitch machine.In this course"
 *
 * The fix is to take *complete sentences only*, up to a budget, after undoing
 * (1), (2) and (4) and cutting at (3). Half a sentence with an ellipsis reads
 * as broken; a whole short one reads as written.
 */

/** Characters. Two lines on the board at its largest, which is what /today
    clamps `.t-sum` to anyway. */
export const BUDGET = 180;

/**
 * Words that begin a sentence in this site's event copy.
 *
 * Used for one narrow job: dropping a heading glued to the front of the first
 * sentence. A general "lowercase followed by a capital" rule cannot do it -
 * that also matches "the Seattle Makers maker space" and would eat the good
 * half of a sentence. Checked against the sample: this rule rewrote exactly
 * the one entry that needed it and left the other seven byte-identical.
 */
const OPENERS =
  /[a-z]\s+(?=(?:Working|Come|Join|Bring|Ready|Stop|Please|Learn|Become|Whether|This|These|You|We|Our|In)\b)/;

/** Emoji and dingbats, which is where a flattened bullet list starts. */
const EMOJI = /[\u{1F300}-\u{1FAFF}☀-➿]/u;

export function summarise(text, budget = BUDGET) {
  if (!text) return null;

  let s = String(text)
    .replace(/\s*\[\s*[….]+\s*\]\s*$/, '') // (1) WordPress's cut marker
    .replace(/([.!?])([A-Z])/g, '$1 $2') // (4) "machine.In" -> "machine. In"
    .replace(/\s+/g, ' ')
    .trim();

  // (3) Everything from the first emoji on is a flattened list.
  s = s.split(EMOJI)[0].trim();

  // (2) A heading glued to the first sentence. Only considered *before* the
  // first sentence ending, so this can never chop a later clause out.
  const firstStop = s.search(/[.!?]/);
  const head = s.slice(0, firstStop === -1 ? s.length : firstStop);
  const glued = head.match(OPENERS);
  if (glued) s = s.slice(glued.index + glued[0].length);

  // Complete sentences only.
  const parts = s.match(/[^.!?]+[.!?]/g);
  if (!parts) {
    // No sentence ending at all. Keep it only if it already fits - inventing
    // an ellipsis here would reintroduce exactly what (1) removed.
    const t = s.trim();
    return t && t.length <= budget ? t : null;
  }

  let out = '';
  for (const raw of parts) {
    const p = raw.trim();
    if (out && out.length + 1 + p.length > budget) break;
    out = out ? `${out} ${p}` : p;
  }
  return out || parts[0].trim();
}

/** Pull `og:description` out of a page's HTML. */
export function ogDescription(html) {
  const m =
    /<meta[^>]*property=["']og:description["'][^>]*content=["']([\s\S]*?)["']/i.exec(html) ||
    /<meta[^>]*content=["']([\s\S]*?)["'][^>]*property=["']og:description["']/i.exec(html);
  return m ? decodeEntities(m[1]).trim() : null;
}

/** The handful of entities that actually turn up in these strings. */
function decodeEntities(s) {
  return s
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/** Fetch one event page and reduce it to a sentence or two. Never throws. */
export async function describeEvent(url, fetchImpl = fetch) {
  try {
    const res = await fetchImpl(url, {
      headers: {
        'user-agent':
          'sm-digital-toolbox/0.1 (+https://github.com/seattlemakers/sm-digital-toolbox)',
      },
    });
    if (!res.ok) return null;
    return summarise(ogDescription(await res.text()));
  } catch {
    // A description is a nicety. Losing one costs a line of text; letting it
    // throw would cost the whole board.
    return null;
  }
}
