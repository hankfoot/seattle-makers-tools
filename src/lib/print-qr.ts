/**
 * QR encoding for things that get printed.
 *
 * CLIENT ONLY - never import this from Astro frontmatter. Frontmatter runs in
 * build-time Node, where the qrcode package's `browser` field does not apply,
 * so it would resolve lib/server.js and drag fs/pngjs into the graph.
 *
 * The settings differ from the reel's (scripts/make-qr.mjs) on purpose; see the
 * table in CLAUDE.md.
 */
import QRCode from 'qrcode';

/** Below this, printed modules start failing to scan. */
export const MM_WARN = 0.8;
export const MM_ERROR = 0.5;

/**
 * A bare host like "seattlemakers.org/x" is what people actually type, and it
 * encodes as a relative path no phone will open. Add the scheme - but only when
 * there isn't one, so mailto:, tel: and WIFI: strings survive untouched.
 */
export function normalizeUrl(raw: string): string {
  const s = raw.trim().replace(/[‘’“”]/g, '');
  if (!s) return '';
  return /^[a-z][a-z0-9+.-]*:/i.test(s) ? s : `https://${s}`;
}

export async function encode(text: string): Promise<string> {
  return QRCode.toString(text, {
    type: 'svg',
    // 'M' not 'H': H costs 30-40% more modules for the same payload, which
    // means smaller modules at a fixed physical size - the real limit on paper.
    errorCorrectionLevel: 'M',
    // 1 is out of spec; a trimmed label needs a real quiet zone.
    margin: 4,
    // Pure K. #111 is not single-channel black, and drivers composite it into
    // fuzzy module edges.
    color: { dark: '#000000', light: '#ffffff' },
  });
}

/** Modules across the code, including the quiet zone, read off the SVG. */
export function modulesFrom(svg: string): number | null {
  const m = svg.match(/viewBox="0 0 (\d+(?:\.\d+)?) /);
  return m ? Number(m[1]) : null;
}

export function mmPerModule(inches: number, modules: number): number {
  return (inches * 25.4) / modules;
}

export function tooSmall(mm: number): 'warn' | 'error' | null {
  if (mm < MM_ERROR) return 'error';
  if (mm < MM_WARN) return 'warn';
  return null;
}

export function encodeError(err: unknown): string {
  return err instanceof Error && /too big/i.test(err.message)
    ? 'That link is too long to fit in a QR code. Try a shorter link.'
    : 'Could not encode that link.';
}
