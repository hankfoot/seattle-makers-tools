/**
 * QR sign generator.
 *
 * Print settings deliberately diverge from the reel's (scripts/make-qr.mjs):
 * pure #000 rather than brand ink, a spec-legal quiet zone, and error
 * correction 'M'. See the table in CLAUDE.md for why each one differs.
 */
import QRCode from 'qrcode';

type Size = 'full' | 'half' | 'card';

/** Copies that tile a sheet at each size, from the geometry in qr.astro. */
const FILL: Record<Size, number> = { full: 1, half: 2, card: 4 };
/** Printed width of the code itself, matching --qr in the stylesheet. */
const QR_INCHES: Record<Size, number> = { full: 5.5, half: 3, card: 2.25 };

/** A module narrower than this is where printed codes start failing to scan. */
const MM_WARN = 0.8;
const MM_ERROR = 0.5;

const PX_PER_IN = 96;
/* The preview shows the whole sheet, so it scales on the paper, not the
   printable area inside it. Half prints as two portrait pieces on a landscape
   sheet, which is what a half-page flyer actually is. */
const LANDSCAPE: Record<Size, boolean> = { full: false, half: true, card: false };
const PAPER = { portrait: { w: 8.5, h: 11 }, landscape: { w: 11, h: 8.5 } };

const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`qr: #${id} missing`);
  return el as T;
};

const fUrl = $<HTMLInputElement>('f-url');
const fUrlNote = $<HTMLParagraphElement>('f-url-note');
const fEyebrow = $<HTMLInputElement>('f-eyebrow');
const fTitle = $<HTMLInputElement>('f-title');
const fDesc = $<HTMLTextAreaElement>('f-desc');
const fSize = $('f-size');
const fCopies = $('f-copies');
const fillN = $('fill-n');
const fCut = $<HTMLInputElement>('f-cut');
const fShowUrl = $<HTMLInputElement>('f-showurl');
const fPrint = $<HTMLButtonElement>('f-print');
const warn = $<HTMLParagraphElement>('warn');
const host = $('preview-host');
const sheet = $('sheet');
const paper = $('paper');
const page = $('page');
const pvPaper = $('pv-paper');
const pvCount = $('pv-count');

/* @page cannot be selected by class, so the orientation is swapped by
   rewriting the rule. Chrome honours the last one declared. */
const pageRule = document.createElement('style');
document.head.append(pageRule);
const pvZoom = $('pv-zoom');
const tpl = $<HTMLTemplateElement>('piece-tpl');

let size: Size = 'full';
let copies: '1' | 'fill' = '1';
/** Once the cut-line box is touched by hand, stop steering it from the size. */
let cutTouched = false;

/* ----------------------------------------------------------------- input */

/**
 * A bare host like "seattlemakers.org/x" is what people actually type, and it
 * encodes as a relative path that no phone will open. Add the scheme - but only
 * when there isn't one, so mailto: and tel: survive.
 */
function normalizeUrl(raw: string): string {
  const s = raw.trim().replace(/[‘’“”]/g, '');
  if (!s) return '';
  return /^[a-z][a-z0-9+.-]*:/i.test(s) ? s : `https://${s}`;
}

/* --------------------------------------------------------------- preview */

/**
 * The page is authored at true physical size, so fitting it to the column is
 * one transform. Height has to be set by hand because a scaled element keeps
 * its unscaled layout box.
 */
function fit(): void {
  const { w, h } = PAPER[LANDSCAPE[size] ? 'landscape' : 'portrait'];
  const scale = Math.min(1, host.clientWidth / (w * PX_PER_IN));
  host.style.setProperty('--preview-scale', String(scale));
  host.style.height = `${h * PX_PER_IN * scale}px`;
  pvZoom.textContent = `${Math.round(scale * 100)}%`;
}

function applyOrientation(): void {
  const orient = LANDSCAPE[size] ? 'landscape' : 'portrait';
  paper.dataset.orient = orient;
  page.dataset.orient = orient;
  pageRule.textContent = `@page { size: letter ${orient}; margin: 0.5in; }`;
  const { w, h } = PAPER[orient];
  pvPaper.textContent = `Letter \u00b7 ${w} \u00d7 ${h}in`;
}

/** Modules across the code, read back off the SVG the encoder just produced. */
function modulesFrom(svg: string): number | null {
  const m = svg.match(/viewBox="0 0 (\d+(?:\.\d+)?) /);
  return m ? Number(m[1]) : null;
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

async function render(): Promise<void> {
  const url = normalizeUrl(fUrl.value);
  const eyebrow = fEyebrow.value.trim();
  const title = fTitle.value.trim();
  const desc = fDesc.value.trim();

  // Show what actually gets encoded, so an added scheme is never a surprise.
  if (url && url !== fUrl.value.trim()) {
    fUrlNote.hidden = false;
    fUrlNote.textContent = `Encodes as ${url}`;
  } else {
    fUrlNote.hidden = true;
  }

  const n = copies === 'fill' ? FILL[size] : 1;
  applyOrientation();
  sheet.dataset.size = size;
  sheet.dataset.copies = copies === 'fill' ? String(n) : '1';
  sheet.dataset.cut = fCut.checked ? 'on' : 'off';

  let svg = '';
  let problem: { msg: string; level: 'warn' | 'error' } | null = null;

  if (url) {
    try {
      svg = await QRCode.toString(url, {
        type: 'svg',
        errorCorrectionLevel: 'M',
        margin: 4,
        // Pure K. #111 is not single-channel black - drivers render it as a
        // four-colour composite, which fuzzes every module edge in print.
        color: { dark: '#000000', light: '#ffffff' },
      });
    } catch (err) {
      problem = {
        msg:
          err instanceof Error && /too big/i.test(err.message)
            ? 'That link is too long to fit in a QR code. Try a shorter link.'
            : 'Could not encode that link.',
        level: 'error',
      };
    }
  }

  // Build one piece, then clone it - the SVG comes along with the clone.
  const piece = tpl.content.firstElementChild!.cloneNode(true) as HTMLElement;
  const qrSlot = piece.querySelector<HTMLElement>('.p-qr')!;

  if (svg) {
    // Safe: the link only reaches the output as path geometry, and the colours
    // are our own literals. The text fields below go through textContent.
    qrSlot.innerHTML = svg;
  } else {
    qrSlot.classList.add('is-empty');
  }
  piece.querySelector<HTMLElement>('.p-eyetext')!.textContent = eyebrow;
  piece.querySelector<HTMLElement>('.p-title')!.textContent = title;
  piece.querySelector<HTMLElement>('.p-desc')!.textContent = desc;
  piece.querySelector<HTMLElement>('.p-url')!.textContent =
    svg && fShowUrl.checked ? url.replace(/^https?:\/\//, '') : '';

  sheet.replaceChildren(piece);
  for (let i = 1; i < n; i++) sheet.append(piece.cloneNode(true));

  /* ------------------------------------------------------------ warnings */

  // The failure that actually happens is silent: modules too small to scan.
  if (!problem && svg) {
    const modules = modulesFrom(svg);
    if (modules) {
      const mm = (QR_INCHES[size] * 25.4) / modules;
      if (mm < MM_ERROR) {
        problem = {
          msg: `Modules would print at ${mm.toFixed(2)}mm - too small to scan reliably. Use a bigger size or a shorter link.`,
          level: 'error',
        };
      } else if (mm < MM_WARN) {
        problem = {
          msg: `Modules print at ${mm.toFixed(2)}mm. That is tight - test one before printing a stack.`,
          level: 'warn',
        };
      }
    }
  }

  // Sizes are print-calibrated, so overflow is reported rather than fixed by
  // shrinking type that was chosen for a scan distance.
  if (!problem && piece.scrollHeight > piece.clientHeight + 1) {
    problem = { msg: 'The text is too long for this size - it will be cut off.', level: 'warn' };
  }

  if (!problem && url) {
    try {
      new URL(url);
    } catch {
      problem = { msg: 'That does not look like a valid link, but it will still encode.', level: 'warn' };
    }
  }

  const noun = size === 'card' ? 'card' : 'sign';
  pvCount.textContent = n === 1 ? `1 ${noun}` : `${n} ${noun}s`;

  setWarning(problem?.msg ?? '', problem?.level ?? null);
  fPrint.disabled = !svg;
  fit();
}

/* --------------------------------------------------------------- controls */

function syncCopies(): void {
  const max = FILL[size];
  fillN.textContent = max > 1 ? `${max} per sheet` : '—';
  for (const b of fCopies.querySelectorAll('button')) {
    const isFill = b.dataset.copies === 'fill';
    b.disabled = isFill && max === 1;
    if (isFill && max === 1 && copies === 'fill') copies = '1';
    b.setAttribute('aria-pressed', String(b.dataset.copies === copies));
  }
}

fSize.addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-size]');
  if (!b) return;
  size = b.dataset.size as Size;
  for (const o of fSize.querySelectorAll('button')) {
    o.setAttribute('aria-pressed', String(o === b));
  }
  // Cut lines only mean something when you are trimming.
  if (!cutTouched) fCut.checked = size !== 'full';
  syncCopies();
  void render();
});

fCopies.addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-copies]');
  if (!b || b.disabled) return;
  copies = b.dataset.copies as '1' | 'fill';
  syncCopies();
  void render();
});

fCut.addEventListener('change', () => {
  cutTouched = true;
  void render();
});

for (const el of [fUrl, fEyebrow, fTitle, fDesc]) {
  el.addEventListener('input', () => void render());
}
fShowUrl.addEventListener('change', () => void render());
fPrint.addEventListener('click', () => window.print());

/* ------------------------------------------------------------- prefill */

/**
 * ?url=&title=&desc=&size=&copies=&cut=&showurl= - not persistence, which the
 * tool deliberately has none of. It makes one sign reproducible: bookmark the
 * membership card, hand someone a link to the exact sheet you printed.
 */
function applyParams(): void {
  const q = new URLSearchParams(location.search);
  const set = (el: HTMLInputElement | HTMLTextAreaElement, key: string) => {
    const v = q.get(key);
    if (v !== null) el.value = v;
  };
  set(fUrl, 'url');
  set(fEyebrow, 'eyebrow');
  set(fTitle, 'title');
  set(fDesc, 'desc');

  const s = q.get('size');
  if (s === 'full' || s === 'half' || s === 'card') {
    size = s;
    for (const b of fSize.querySelectorAll('button')) {
      b.setAttribute('aria-pressed', String(b.dataset.size === size));
    }
  }

  const c = q.get('copies');
  if (c === '1' || c === 'fill') copies = c;

  const cut = q.get('cut');
  if (cut !== null) {
    fCut.checked = cut !== '0';
    cutTouched = true;
  } else {
    fCut.checked = size !== 'full';
  }

  const su = q.get('showurl');
  if (su !== null) fShowUrl.checked = su !== '0';
}

/* Both, deliberately. The window listener is the one that always fires and is
   what slideshow.ts uses; the observer additionally catches the host changing
   width without the window doing so. fit() is idempotent, so double-firing is
   free. */
addEventListener('resize', fit);
new ResizeObserver(fit).observe(host);

applyParams();
syncCopies();
void render();
