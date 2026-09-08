/**
 * Label sheet runtime.
 *
 * One design, repeated onto whichever die-cut positions are still on the sheet.
 * Everything is placed in absolute inches from the page corner - see
 * labelSheets.ts for why the numbers are not rounded.
 */
import { SHEETS, byId, perSheet, type LabelSheet } from '../data/labelSheets';
import {
  encode,
  encodeError,
  mmPerModule,
  modulesFrom,
  normalizeUrl,
  tooSmall,
} from '../lib/print-qr';

const PX_PER_IN = 96;

const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`labels: #${id} missing`);
  return el as T;
};

const fStock = $('f-stock');
const fDir = $('f-dir');
const fDirWrap = $('f-dir-wrap');
const fTitle = $<HTMLInputElement>('f-title');
const fSub = $('f-sub');
const fUrl = $<HTMLInputElement>('f-url');
const fUrlNote = $('f-url-note');
const fAll = $('f-all');
const fNone = $('f-none');
const fCount = $('f-count');
const fPrint = $<HTMLButtonElement>('f-print');
const warn = $('warn');
const host = $('preview-host');
const page = $('page');
const grid = $('grid');
const tpl = $<HTMLTemplateElement>('label-tpl');
const pvSheet = $('pv-sheet');
const pvLabel = $('pv-label');

/* @page cannot be selected by class, so orientation is swapped by rewriting it. */
const pageRule = document.createElement('style');
document.head.append(pageRule);

let stock = '4x2.5';
let direction: 'horizontal' | 'vertical' = 'horizontal';
/**
 * Alignment is derived, not chosen. Centre reads best in every case except one:
 * a code sitting *beside* the words, where a centred column drifts away from
 * the code and the label stops looking like one thing. That is exactly the
 * row-flow-with-a-code case, so it is the only one that goes left.
 */
const alignFor = (flow: 'row' | 'column', hasQr: boolean) =>
  flow === 'row' && hasQr ? 'left' : 'center';

/**
 * A code takes about a third of a wide label's width, or a good part of a tall
 * one's height. Type calibrated for the whole label is too assertive for what
 * is left, so it starts smaller when there is a code to share with.
 */
const QR_TYPE_SCALE = 0.85;

/**
 * The sheet is ALWAYS the portrait one, because the paper always is - the
 * die-cut does not move when you change what you print on it. Rotating the
 * landscape template 90 degrees clockwise lands on exactly the same rectangles
 * (checked against all three: 8x5 to the thousandth, the others within 0.009in,
 * which is the template author's own rounding).
 *
 * So "Upright" no longer means a landscape page. It means the same portrait
 * sheet with the content turned inside each label - which is what the physical
 * sheet actually looks like, and leaves one feed orientation instead of two.
 */
let gridSheet: LabelSheet = byId('4x2.5-h');
/** The sheet whose proportions the *content* is laid out in. */
let contentSheet: LabelSheet = byId('4x2.5-h');
let upright = false;
let sheet: LabelSheet = byId('4x2.5-h');
/**
 * Which die-cut positions get printed, by index.
 *
 * Starts as a single label, because that is what people actually come here to
 * do - one tool tag, one bench label. Filling the sheet is the exception, and
 * it is one click away.
 */
const FIRST_ONLY = () => new Set([0]);
let on = FIRST_ONLY();

/* ------------------------------------------------------------ rich text */

/** The only markup a label may carry. Everything else is unwrapped. */
const KEEP = new Set(['B', 'STRONG', 'I', 'EM', 'BR']);

/**
 * Elements whose *contents* go too. Unwrapping these would keep their text -
 * a pasted <script> would quietly turn into label copy reading "bad()".
 */
const DROP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'TITLE', 'HEAD']);

/**
 * contenteditable will happily accept a pasted table, a font tag or a styled
 * span. Strip it back to bold, italic and line breaks - both so the label
 * renders predictably and so nothing unexpected reaches innerHTML.
 */
function clean(root: Node): string {
  const doc = document.implementation.createHTMLDocument('');
  const box = doc.body;
  box.append(doc.importNode(root, true));

  const walk = (node: Element) => {
    if (DROP.has(node.tagName)) {
      node.remove();
      return;
    }
    for (const child of [...node.children]) walk(child);
    if (KEEP.has(node.tagName)) {
      for (const a of [...node.attributes]) node.removeAttribute(a.name);
      return;
    }
    // A block element ends a line; unwrapping it would run text together.
    const block = getComputedStyle(node).display !== 'inline';
    const parent = node.parentNode!;
    if (block && node.previousSibling) parent.insertBefore(doc.createElement('br'), node);
    while (node.firstChild) parent.insertBefore(node.firstChild, node);
    parent.removeChild(node);
  };
  for (const child of [...box.children]) walk(child);
  return box.innerHTML;
}

/** Text with no characters in it, even if it carries <br> or empty tags. */
function isBlank(html: string): boolean {
  const d = document.createElement('div');
  d.innerHTML = html;
  return d.textContent!.trim() === '';
}

/* ------------------------------------------------------------------ type */

/**
 * 0.1in is the registration floor - the allowance for the sheet feeding
 * slightly out of true, which is the same physical error on a 4x1 strip as on
 * an 8x5 board, so it must never scale below this.
 *
 * Above the floor it is an optical margin, and that one does scale: 0.1in on an
 * 8x5 board looks like the words are falling off the edge. So the rule is a
 * floor, not a constant - the small stock is protected, the large stock breathes.
 */
const PAD_MIN = 0.1;
const padFor = (s: LabelSheet) => Math.max(PAD_MIN, Math.min(s.size.w, s.size.h) * 0.06);

/**
 * One ratio between title and copy, everywhere.
 *
 * This used to clamp the two sizes independently - title to 12..60pt, subtitle
 * to 7..22pt - which meant the clamps, not the design, decided the
 * relationship: it came out at 2.7x on the 8x5 board and 2.1x on the 4x1 strip,
 * so the same words looked differently balanced on every stock.
 *
 * Now only the title is clamped and the subtitle is always derived from it, so
 * the ratio is fixed no matter what the auto-fit does afterwards - it scales
 * both together. 1.8 keeps the title clearly dominant without the copy dropping
 * to a size nobody reads.
 */
const TITLE_TO_SUB = 1.8;

/**
 * Title size follows the label's short side. The clamps stop an 8x5 board
 * becoming a billboard and a 4x1 strip becoming unreadable; between them the
 * size is proportional.
 *
 * The gap between code and words does still scale - unlike the padding it is a
 * composition choice, and a big label wants more air there than a small one.
 */
const TITLE_MIN = 14;
const TITLE_MAX = 54;

function scaleFor(s: LabelSheet) {
  const short = Math.min(s.size.w, s.size.h);
  const title = Math.min(TITLE_MAX, Math.max(TITLE_MIN, short * 72 * 0.17));
  const gap = Math.max(0.06, short * 0.07);
  return { pad: padFor(s), title, sub: title / TITLE_TO_SUB, gap };
}

/** Wide labels put the code beside the words; tall ones stack it above. */
const flowFor = (s: LabelSheet) => (s.size.w / s.size.h >= 1.35 ? 'row' : 'column');

function qrInchesFor(s: LabelSheet, hasText: boolean) {
  const pad = padFor(s);
  if (flowFor(s) === 'row') {
    const box = s.size.h - pad * 2;
    return hasText ? Math.min(box, s.size.w * 0.34) : Math.min(box, s.size.w - pad * 2);
  }
  const box = s.size.w - pad * 2;
  return hasText ? Math.min(box, s.size.h * 0.46) : Math.min(box, s.size.h - pad * 2);
}

/* --------------------------------------------------------------- preview */

function fit(): void {
  const scale = Math.min(1, host.clientWidth / (gridSheet.page.w * PX_PER_IN));
  host.style.setProperty('--preview-scale', String(scale));
  host.style.height = `${gridSheet.page.h * PX_PER_IN * scale}px`;
}

function setWarning(msg: string, level: 'warn' | 'error' | null): void {
  if (!level) {
    warn.hidden = true;
    warn.textContent = '';
    return;
  }
  warn.hidden = false;
  warn.dataset.level = level;
  warn.textContent = msg;
}

/** Variants of the current stock, and whether an upright option even exists. */
function variants(): LabelSheet[] {
  return SHEETS.filter((s) => s.stock === stock);
}

function selectSheet(): void {
  const vs = variants();
  const horiz = vs.find((s) => s.direction === 'horizontal') ?? vs[0]!;
  const vert = vs.find((s) => s.direction === 'vertical');
  // Stock with no upright variant does not just *display* as Across, it
  // *becomes* Across - so switching on to a stock that does offer it does not
  // silently spring back to a setting the last sheet could not honour.
  if (!vert) direction = 'horizontal';
  upright = direction === 'vertical';
  contentSheet = upright ? vert! : horiz;

  if (horiz !== gridSheet) {
    gridSheet = horiz;
    // Positions do not carry across stock - a 20-up sheet's index 14 means
    // nothing on a 2-up sheet. Start over at one label.
    on = FIRST_ONLY();
  }
  for (const b of fDir.querySelectorAll('button')) {
    const d = b.dataset.dir as 'horizontal' | 'vertical';
    const exists = d === 'horizontal' || Boolean(vert);
    b.disabled = !exists;
    b.setAttribute('aria-pressed', String(exists && d === direction));
  }
  // Shown always, greyed when the stock has no upright variant. Hiding it made
  // the control vanish and reappear as you moved between stocks.
  fDirWrap.classList.toggle('is-limited', !vert);
}

/**
 * render() awaits the encoder, so two renders can be in flight at once and the
 * slower one can land last - typing into three fields in quick succession was
 * enough to leave a stale QR on a label whose link had been cleared. Each run
 * takes a ticket and stands down if a newer one has started.
 */
let generation = 0;

async function render(): Promise<void> {
  const mine = ++generation;
  selectSheet();

  const titleText = fTitle.value.trim();
  const subHtml = clean(fSub);
  const titleBlank = titleText === '';
  const subBlank = isBlank(subHtml);
  const url = normalizeUrl(fUrl.value);
  const hasText = !titleBlank || !subBlank;

  if (url && url !== fUrl.value.trim()) {
    fUrlNote.hidden = false;
    fUrlNote.textContent = `Encodes as ${url}`;
  } else {
    fUrlNote.hidden = true;
  }

  // Always portrait: the paper is.
  pageRule.textContent = `@page { size: letter portrait; margin: 0; }`;
  page.dataset.orient = gridSheet.orient;
  page.style.setProperty('--page-w', `${gridSheet.page.w}in`);
  page.style.setProperty('--page-h', `${gridSheet.page.h}in`);

  // Type and composition follow the *reading* orientation, not the die-cut.
  const { pad, title: baseTitle, gap } = scaleFor(contentSheet);
  const qrIn = qrInchesFor(contentSheet, hasText);
  const flow = flowFor(contentSheet);

  let svg = '';
  let problem: { msg: string; level: 'warn' | 'error' } | null = null;
  if (url) {
    try {
      svg = await encode(url);
    } catch (err) {
      problem = { msg: encodeError(err), level: 'error' };
    }
  }

  if (mine !== generation) return;

  const hasQr = Boolean(svg);
  // The readability floor still wins. Applying the reduction after the clamp
  // pushed the 4x1 strip to 11.9pt, under the 14pt the clamp exists to hold -
  // on the smallest stock there is nothing to give back.
  const tpt = hasQr ? Math.max(TITLE_MIN, baseTitle * QR_TYPE_SCALE) : baseTitle;
  const spt = tpt / TITLE_TO_SUB;

  // Build one label, then clone it into every switched-on position.
  const proto = tpl.content.firstElementChild!.cloneNode(true) as HTMLElement;
  proto.dataset.flow = flow;
  proto.dataset.align = alignFor(flow, hasQr);
  proto.dataset.rot = upright ? '1' : '0';
  proto.style.setProperty('--pad', `${pad}in`);
  proto.style.setProperty('--gap', `${gap}in`);
  proto.style.setProperty('--title', `${tpt}pt`);
  proto.style.setProperty('--sub', `${spt}pt`);
  proto.style.setProperty('--qr', `${qrIn}in`);
  // The cell is the die-cut rectangle; the content box inside it is the reading
  // orientation, turned 90 degrees when upright. A w x h box rotated a quarter
  // turn occupies h x w, which is exactly the rectangle it sits in.
  proto.style.width = `${gridSheet.size.w}in`;
  proto.style.height = `${gridSheet.size.h}in`;
  proto.style.setProperty('--rot-w', `${contentSheet.size.w}in`);
  proto.style.setProperty('--rot-h', `${contentSheet.size.h}in`);
  // Safe: the link reaches the output only as path geometry, and the colours
  // are our own literals. Title and subtitle go through textContent.
  if (svg) {
    const slot = proto.querySelector<HTMLElement>('.lb-qr')!;
    slot.innerHTML = svg;
    // The encoder bakes a 4-module quiet zone inside the image, so the code's
    // *ink* sits inset from its own box - 0.29in on an 8x5. Left as-is the
    // visible left margin is padding plus quiet zone, about twice the right,
    // and the gap to the words reads far wider than the one declared. Pulling
    // the box out by the quiet zone lines the ink up with the padding instead.
    //
    // Capped at the padding, because the quiet zone still has to be white: past
    // that the code would hang over the label edge. It stays satisfied either
    // way - the white it needs comes from the padding rather than the image.
    const modules = modulesFrom(svg);
    const quiet = modules ? (qrIn * 4) / modules : 0;
    proto.style.setProperty('--quiet-pull', `${Math.min(quiet, pad)}in`);
  }
  const titleNode = proto.querySelector<HTMLElement>('.lb-title')!;
  const subNode = proto.querySelector<HTMLElement>('.lb-subtitle')!;
  titleNode.textContent = titleText;
  // Already through clean(): b / i / br only, no attributes.
  subNode.innerHTML = subHtml;
  titleNode.classList.toggle('is-empty', titleBlank);
  subNode.classList.toggle('is-empty', subBlank);

  // Fit the type to the box it actually has. Scaling off the label's short side
  // alone is not enough: a QR takes a third of the width, so "Woodshop" at the
  // nominal size would break mid-word on a 4x2.5. Measure one real label and
  // step the size down until it fits, then clone that.
  //
  // Binary search on one scale factor rather than stepping down in fixed
  // percentages: it lands within ~0.02% of the largest size that fits, in a
  // fixed 12 reflows, instead of overshooting by up to a whole step. Both sizes
  // move together so the title/subtitle relationship never drifts.
  grid.replaceChildren(proto);
  const innerEl = proto.querySelector<HTMLElement>('.lb-inner')!;

  const apply = (k: number) => {
    proto.style.setProperty('--title', `${tpt * k}pt`);
    proto.style.setProperty('--sub', `${spt * k}pt`);
  };
  // Width is measured on the two text nodes, because a wrapper that has already
  // wrapped reports no overflow - that mistake once printed "Woodsho / p".
  // Height is measured on the row, which is what actually runs out of room.
  const fits = (k: number) => {
    apply(k);
    // Exactly equal, no tolerance either way. A `+ 1` slack absorbed a real
    // overflow (130 in a 129 box passed as "fits"); a `- 1` demand can never be
    // met, because text that fits reports scrollWidth === clientWidth, so
    // everything collapsed to the 6pt floor. Glyph side bearings get their room
    // from --ink-slack in the stylesheet instead, which is a layout inset
    // rather than a fudged comparison.
    // Height is only ever measured on .lb-inner, which has the label's real
    // height. .lb-text is a shrink-to-fit flex item - its clientHeight IS its
    // content height, so the two differ only by sub-pixel rounding, and that
    // difference grows with the font size until it trips any tolerance. Testing
    // it dropped an 8x5 title from 54pt to 9.7pt whenever there was no
    // subtitle, because the subtitle happened to round the discrepancy away.
    return (
      titleNode.scrollWidth <= titleNode.clientWidth &&
      subNode.scrollWidth <= subNode.clientWidth &&
      innerEl.scrollHeight <= innerEl.clientHeight + 1
    );
  };

  // Never below 6pt - past that it is unreadable, and shrinking further only
  // hides the fact that the copy does not belong on this label.
  const floor = Math.min(1, 6 / tpt);

  /**
   * How many lines the title is currently taking. Smaller type means more
   * characters per line, so this falls as the scale falls - which is what lets
   * it be searched on.
   */
  const titleLines = () => {
    const lh = parseFloat(getComputedStyle(titleNode).lineHeight);
    return lh > 0 ? Math.round(titleNode.scrollHeight / lh) : 1;
  };
  /** A title is plain text, so it always wants exactly one line. */
  const wanted = 1;

  const search = (ok: (k: number) => boolean) => {
    if (ok(1)) return 1;
    let lo = floor;
    let hi = 1;
    for (let i = 0; i < 12; i++) {
      const mid = (lo + hi) / 2;
      if (ok(mid)) lo = mid;
      else hi = mid;
    }
    return lo;
  };

  // A QR takes a third of a wide label, and the title was being wrapped into
  // what was left rather than sized for it - "Laser Cutter" came out as two
  // big lines beside the code while the plain version sat happily on one.
  //
  // So the search is tiered: first ask for the title to take only the lines the
  // copy asked for, and accept that unless it costs more than a third of the
  // size. Otherwise allow one extra line, then give up and just fit the box.
  let k = search((n) => fits(n) && titleLines() <= wanted);
  if (k < 0.66) {
    const relaxed = search((n) => fits(n) && titleLines() <= wanted + 1);
    k = Math.max(k, relaxed >= 0.5 ? relaxed : search(fits));
  }
  const overflowing = !fits(k);

  grid.replaceChildren();
  const total = perSheet(gridSheet);
  for (let i = 0; i < total; i++) {
    const c = i % gridSheet.cols;
    const r = Math.floor(i / gridSheet.cols);
    const cell = proto.cloneNode(true) as HTMLElement;
    cell.style.left = `${gridSheet.origin.x + c * (gridSheet.size.w + gridSheet.gutter.x)}in`;
    cell.style.top = `${gridSheet.origin.y + r * (gridSheet.size.h + gridSheet.gutter.y)}in`;
    cell.dataset.on = on.has(i) ? '1' : '0';
    cell.dataset.i = String(i);
    cell.querySelector<HTMLElement>('.lb-num')!.textContent = String(i + 1);
    grid.append(cell);
  }

  /* ------------------------------------------------------------ warnings */

  if (!problem && svg) {
    const modules = modulesFrom(svg);
    if (modules) {
      const mm = mmPerModule(qrIn, modules);
      const level = tooSmall(mm);
      if (level === 'error') {
        problem = {
          msg: `On this label the code prints at ${mm.toFixed(2)}mm per module - too small to scan. Use a bigger label or a shorter link.`,
          level,
        };
      } else if (level === 'warn') {
        problem = {
          msg: `The code prints at ${mm.toFixed(2)}mm per module on this label. That is tight - test one before running a sheet.`,
          level,
        };
      }
    }
  }

  // Only complain once the auto-fit has run out of room; shrinking on its own
  // is normal and not worth a warning.
  if (!problem && overflowing) {
    problem = {
      msg: 'Even at the smallest readable size this copy does not fit - it will be cut off.',
      level: 'warn',
    };
  }

  setWarning(problem?.msg ?? '', problem?.level ?? null);

  pvSheet.textContent = `${gridSheet.page.w} × ${gridSheet.page.h}in portrait`;
  pvLabel.textContent = `${contentSheet.label} · ${on.size} of ${total}`;
  fCount.textContent = on.size === 1 ? '1 label' : `${on.size} of ${total}`;
  fPrint.disabled = on.size === 0 || (!hasText && !svg);
  fit();
}

/* -------------------------------------------------------------- controls */

fStock.addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-stock]');
  if (!b) return;
  stock = b.dataset.stock!;
  for (const o of fStock.querySelectorAll('button')) {
    o.setAttribute('aria-pressed', String(o === b));
  }
  void render();
});

fDir.addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-dir]');
  if (!b || b.disabled) return;
  direction = b.dataset.dir as 'horizontal' | 'vertical';
  void render();
});

// The preview is the sheet map: click a position to take it out of the run.
grid.addEventListener('click', (e) => {
  const cell = (e.target as HTMLElement).closest<HTMLElement>('.lb-cell');
  if (!cell) return;
  const i = Number(cell.dataset.i);
  if (on.has(i)) on.delete(i);
  else on.add(i);
  cell.dataset.on = on.has(i) ? '1' : '0';
  const total = perSheet(gridSheet);
  pvLabel.textContent = `${contentSheet.label} · ${on.size} of ${total}`;
  fCount.textContent = on.size === 1 ? '1 label' : `${on.size} of ${total}`;
  fPrint.disabled = on.size === 0;
});

fAll.addEventListener('click', () => {
  on = new Set(Array.from({ length: perSheet(gridSheet) }, (_, i) => i));
  void render();
});
fNone.addEventListener('click', () => {
  on = new Set();
  void render();
});

for (const el of [fTitle, fSub, fUrl]) {
  el.addEventListener('input', () => void render());
}

/* --------------------------------------------------------- rich editing */

/** Light up B / I when the caret sits inside bold or italic text. */
function syncTools(): void {
  for (const tools of document.querySelectorAll<HTMLElement>('.lb-tools')) {
    const field = document.getElementById(tools.dataset.for!);
    const anchor = document.getSelection()?.anchorNode ?? null;
    const inside = Boolean(field && anchor && field.contains(anchor));
    for (const b of tools.querySelectorAll('button')) {
      b.setAttribute(
        'aria-pressed',
        String(inside && document.queryCommandState(b.dataset.cmd!)),
      );
    }
  }
}

for (const tools of document.querySelectorAll<HTMLElement>('.lb-tools')) {
  const field = $(tools.dataset.for!);
  // Keep the caret where it is: focus must not leave the field on mousedown,
  // or the command has no selection to act on.
  tools.addEventListener('mousedown', (e) => e.preventDefault());
  tools.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-cmd]');
    if (!b) return;
    field.focus();
    // execCommand is deprecated but remains the only one-liner that toggles
    // bold/italic across a selection, and it works in every browser this tool
    // will run in. Whatever it produces is put through clean() anyway.
    document.execCommand(b.dataset.cmd!);
    void render();
    syncTools();
  });
}

document.addEventListener('selectionchange', syncTools);

for (const field of [fSub]) {
  field.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && (e.key === 'b' || e.key === 'i')) {
      e.preventDefault();
      document.execCommand(e.key === 'b' ? 'bold' : 'italic');
      void render();
      syncTools();
      return;
    }
    if (e.key === 'Enter') {
      // A plain <br>, not the <div> or <p> contenteditable would otherwise
      // insert - clean() would have to unwrap those back into breaks anyway.
      e.preventDefault();
      document.execCommand('insertLineBreak');
      void render();
    }
  });
  // Paste as plain text. clean() would strip the markup regardless; doing it
  // here stops the editor briefly showing styling that is about to vanish.
  field.addEventListener('paste', (e) => {
    e.preventDefault();
    document.execCommand('insertText', false, e.clipboardData?.getData('text/plain') ?? '');
  });
}
fPrint.addEventListener('click', () => window.print());

addEventListener('resize', fit);
new ResizeObserver(fit).observe(host);

/* ---------------------------------------------------------------- prefill */

const q = new URLSearchParams(location.search);
const qStock = q.get('stock');
if (qStock && SHEETS.some((s) => s.stock === qStock)) {
  stock = qStock;
  for (const o of fStock.querySelectorAll('button')) {
    o.setAttribute('aria-pressed', String(o.dataset.stock === stock));
  }
}
const qDir = q.get('dir');
if (qDir === 'horizontal' || qDir === 'vertical') direction = qDir;
const qTitle = q.get('title');
if (qTitle !== null) fTitle.value = qTitle;
const qSub = q.get('sub');
if (qSub !== null) fSub.textContent = qSub;
const qUrl = q.get('url');
if (qUrl !== null) fUrl.value = qUrl;

/* ?on=3,4,7 names the positions to print, 1-based to match the sheet map. It
   replaces the old ?off=, which only made sense back when the default was a
   full sheet. Applied after the first render, because the sheet - and so how
   many positions exist - is resolved there. */
const initialOn = (q.get('on') ?? '')
  .split(',')
  .map((v) => Number(v.trim()))
  .filter((v) => Number.isInteger(v) && v >= 1);

void render().then(() => {
  if (!initialOn.length) return;
  const total = perSheet(gridSheet);
  on = new Set(initialOn.filter((v) => v <= total).map((v) => v - 1));
  return render();
});
