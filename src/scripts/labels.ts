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
const fTitle = $('f-title');
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
const pvZoom = $('pv-zoom');

/* @page cannot be selected by class, so orientation is swapped by rewriting it. */
const pageRule = document.createElement('style');
document.head.append(pageRule);

let stock = '4x2.5';
let direction: 'horizontal' | 'vertical' = 'horizontal';
let sheet: LabelSheet = byId('4x2.5-h');
/** Positions still on the physical sheet, by index. Keyed per sheet id. */
let on = new Set<number>();

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
function scaleFor(s: LabelSheet) {
  const short = Math.min(s.size.w, s.size.h);
  const title = Math.min(54, Math.max(14, short * 72 * 0.17));
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
  const scale = Math.min(1, host.clientWidth / (sheet.page.w * PX_PER_IN));
  host.style.setProperty('--preview-scale', String(scale));
  host.style.height = `${sheet.page.h * PX_PER_IN * scale}px`;
  pvZoom.textContent = `${Math.round(scale * 100)}%`;
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
  const found = vs.find((s) => s.direction === direction) ?? vs[0]!;
  if (found !== sheet) {
    sheet = found;
    // Positions do not carry across stock - a 20-up sheet's index 14 means
    // nothing on a 2-up sheet. Start fresh, all on.
    on = new Set(Array.from({ length: perSheet(sheet) }, (_, i) => i));
  }
  for (const b of fDir.querySelectorAll('button')) {
    const d = b.dataset.dir as 'horizontal' | 'vertical';
    const exists = vs.some((s) => s.direction === d);
    b.disabled = !exists;
    b.setAttribute('aria-pressed', String(exists && d === sheet.direction));
  }
  fDirWrap.hidden = vs.length < 2;
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

  const titleHtml = clean(fTitle);
  const subHtml = clean(fSub);
  const titleBlank = isBlank(titleHtml);
  const subBlank = isBlank(subHtml);
  const url = normalizeUrl(fUrl.value);
  const hasText = !titleBlank || !subBlank;

  if (url && url !== fUrl.value.trim()) {
    fUrlNote.hidden = false;
    fUrlNote.textContent = `Encodes as ${url}`;
  } else {
    fUrlNote.hidden = true;
  }

  const orient = sheet.orient;
  pageRule.textContent = `@page { size: letter ${orient}; margin: 0; }`;
  page.style.setProperty('--page-w', `${sheet.page.w}in`);
  page.style.setProperty('--page-h', `${sheet.page.h}in`);

  const { pad, title: tpt, sub: spt, gap } = scaleFor(sheet);
  const qrIn = qrInchesFor(sheet, hasText);

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

  // Build one label, then clone it into every switched-on position.
  const proto = tpl.content.firstElementChild!.cloneNode(true) as HTMLElement;
  proto.dataset.flow = flowFor(sheet);
  proto.style.setProperty('--pad', `${pad}in`);
  proto.style.setProperty('--gap', `${gap}in`);
  proto.style.setProperty('--title', `${tpt}pt`);
  proto.style.setProperty('--sub', `${spt}pt`);
  proto.style.setProperty('--qr', `${qrIn}in`);
  proto.style.width = `${sheet.size.w}in`;
  proto.style.height = `${sheet.size.h}in`;
  // Safe: the link reaches the output only as path geometry, and the colours
  // are our own literals. Title and subtitle go through textContent.
  if (svg) proto.querySelector<HTMLElement>('.lb-qr')!.innerHTML = svg;
  const titleNode = proto.querySelector<HTMLElement>('.lb-title')!;
  const subNode = proto.querySelector<HTMLElement>('.lb-subtitle')!;
  // Already through clean(): b / i / br only, no attributes.
  titleNode.innerHTML = titleHtml;
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
  const textEl = proto.querySelector<HTMLElement>('.lb-text')!;

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
    return (
      titleNode.scrollWidth <= titleNode.clientWidth &&
      subNode.scrollWidth <= subNode.clientWidth &&
      textEl.scrollHeight <= textEl.clientHeight + 1 &&
      innerEl.scrollHeight <= innerEl.clientHeight + 1
    );
  };

  // Never below 6pt - past that it is unreadable, and shrinking further only
  // hides the fact that the copy does not belong on this label.
  const floor = Math.min(1, 6 / tpt);
  let k = 1;
  if (!fits(1)) {
    let lo = floor;
    let hi = 1;
    for (let i = 0; i < 12; i++) {
      const mid = (lo + hi) / 2;
      if (fits(mid)) lo = mid;
      else hi = mid;
    }
    k = lo;
  }
  const overflowing = !fits(k);

  grid.replaceChildren();
  const total = perSheet(sheet);
  for (let i = 0; i < total; i++) {
    const c = i % sheet.cols;
    const r = Math.floor(i / sheet.cols);
    const cell = proto.cloneNode(true) as HTMLElement;
    cell.style.left = `${sheet.origin.x + c * (sheet.size.w + sheet.gutter.x)}in`;
    cell.style.top = `${sheet.origin.y + r * (sheet.size.h + sheet.gutter.y)}in`;
    cell.dataset.on = on.has(i) ? '1' : '0';
    cell.dataset.i = String(i);
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

  pvSheet.textContent = `${sheet.page.w} × ${sheet.page.h}in ${orient}`;
  pvLabel.textContent = `${sheet.label} · ${on.size} of ${total}`;
  fCount.textContent = `${on.size} of ${total}`;
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
  const total = perSheet(sheet);
  pvLabel.textContent = `${sheet.label} · ${on.size} of ${total}`;
  fCount.textContent = `${on.size} of ${total}`;
  fPrint.disabled = on.size === 0;
});

fAll.addEventListener('click', () => {
  on = new Set(Array.from({ length: perSheet(sheet) }, (_, i) => i));
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

for (const field of [fTitle, fSub]) {
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
for (const [key, el] of [
  ['title', fTitle],
  ['sub', fSub],
] as const) {
  const v = q.get(key);
  if (v !== null) el.textContent = v;
}
const qUrl = q.get('url');
if (qUrl !== null) fUrl.value = qUrl;

/* Start with every position live, then drop the ones named by ?off= - a sheet
   you have already peeled from is worth being able to bookmark. Applied after
   the first render, because the sheet (and so the position count) is resolved
   there. */
const initialOff = (q.get('off') ?? '')
  .split(',')
  .map((v) => Number(v.trim()))
  .filter((v) => Number.isInteger(v) && v >= 1);

on = new Set(Array.from({ length: perSheet(byId('4x2.5-h')) }, (_, i) => i));
void render().then(() => {
  if (!initialOff.length) return;
  // 1-based in the URL: the sheet map reads as label 1..n, not 0..n-1.
  for (const v of initialOff) on.delete(v - 1);
  return render();
});
