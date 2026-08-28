#!/usr/bin/env node
/**
 * Generate the QR codes the reel shows, as committed SVGs.
 *
 * Done at author time rather than in the page so the reel carries no runtime
 * dependency and no network call - the market machine renders a plain SVG. The
 * `qrcode` package is therefore a devDependency; nothing ships it.
 *
 * Error correction is set high ('H'): these get scanned off a screen at an
 * angle, in daylight, sometimes with a logo-sized chunk of glare across them.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const CODES = [
  { file: 'qr-interest.svg', url: 'https://seattlemakers.org/interest/' },
];

for (const { file, url } of CODES) {
  const svg = await QRCode.toString(url, {
    type: 'svg',
    errorCorrectionLevel: 'H',
    margin: 1,
    color: { dark: '#111111', light: '#00000000' },
  });
  const out = resolve(ROOT, 'public/brand', file);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, svg);
  console.log(`make-qr: ${url} -> public/brand/${file}`);
}
