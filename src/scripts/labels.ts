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
const fSub = $<HTMLInputElement>('f-sub');
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

/* ------------------------------------------------------------------ type */

/**
 * One padding value for every stock. It is a registration allowance, not a
 * composition choice: what it protects against is the sheet feeding a fraction
 * of an inch out of true, and that error is the same size on a 4x1 strip as on
 * an 8x5 board. Scaling it with the label - as this did at first, 0.06in to
 * 0.12in - gave the smallest labels the least protection, which is backwards.
 */
const PAD = 0.1;

/**
 * Type scales off the label's short side, so a 4x1 strip and an 8x5 board both
 * end up with something proportionate. The clamps stop the biggest stock from
 * turning into a billboard and the smallest from going unreadable.
 *
 * The gap between code and words does still scale - unlike the padding it is a
 * composition choice, and a big label wants more air there than a small one.
 */
function scaleFor(s: LabelSheet) {
  const short = Math.min(s.size.w, s.size.h);
  const title = Math.min(60, Math.max(12, short * 72 * 0.2));
  const sub = Math.min(22, Math.max(7, title * 0.42));
  const gap = Math.max(0.06, short * 0.07);
  return { pad: PAD, title, sub, gap };
}

/** Wide labels put the code beside the words; tall ones stack it above. */
const flowFor = (s: LabelSheet) => (s.size.w / s.size.h >= 1.35 ? 'row' : 'column');

function qrInchesFor(s: LabelSheet, hasText: boolean) {
  if (flowFor(s) === 'row') {
    const box = s.size.h - PAD * 2;
    return hasText ? Math.min(box, s.size.w * 0.34) : Math.min(box, s.size.w - PAD * 2);
  }
  const box = s.size.w - PAD * 2;
  return hasText ? Math.min(box, s.size.h * 0.46) : Math.min(box, s.size.h - PAD * 2);
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

  const title = fTitle.value.trim();
  const sub = fSub.value.trim();
  const url = normalizeUrl(fUrl.value);
  const hasText = Boolean(title || sub);

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
  proto.querySelector<HTMLElement>('.lb-title')!.textContent = title;
  proto.querySelector<HTMLElement>('.lb-subtitle')!.textContent = sub;

  // Fit the type to the box it actually has. Scaling off the label's short side
  // alone is not enough: a QR takes a third of the width, so "Woodshop" at the
  // nominal size would break mid-word on a 4x2.5. Measure one real label and
  // step the size down until it fits, then clone that.
  grid.replaceChildren(proto);
  let pt = tpt;
  const titleEl = proto.querySelector<HTMLElement>('.lb-title')!;
  const innerEl = proto.querySelector<HTMLElement>('.lb-inner')!;
  // Measure the title, not its wrapper: a wrapper that has already wrapped
  // reports no overflow at all, which is why the first attempt at this did
  // nothing and "Woodshop" printed as "Woodsho / p".
  const overflows = () =>
    titleEl.scrollWidth > titleEl.clientWidth + 1 ||
    innerEl.scrollHeight > innerEl.clientHeight + 1;
  for (let guard = 0; guard < 24 && pt > 6 && overflows(); guard++) {
    pt *= 0.94;
    proto.style.setProperty('--title', `${pt}pt`);
    proto.style.setProperty('--sub', `${Math.min(22, Math.max(6, pt * 0.42))}pt`);
  }
  const shrunk = pt < tpt - 0.01;

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
  if (!problem && shrunk && overflows()) {
    problem = { msg: 'The text is too long for this label - it will be cut off.', level: 'warn' };
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
  ['url', fUrl],
] as const) {
  const v = q.get(key);
  if (v !== null) el.value = v;
}

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
