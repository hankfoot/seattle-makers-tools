/**
 * The label stock at the Label Station, measured out of the LibreOffice
 * templates rather than guessed.
 *
 * Every number here was read from the corresponding .odt: page size and margins
 * from `styles.xml`'s page-layout, label size and gutters from the table column
 * and row sequences in `content.xml`. Do not round them - 2.5x1.56 is really
 * 1.5632in tall, and the die-cut does not care what the filename says.
 *
 * "Horizontal" and "Vertical" are NOT different stock. They are the same
 * physical sheet with the content turned 90 degrees: the 8x5 portrait layout
 * (1 across, 2 down) and the 5x8 landscape layout (2 across, 1 down) put ink on
 * exactly the same die-cut rectangles. That is why each pair has the same count.
 *
 * Bottom margin is 0 on every template, with the slack left at the foot. The
 * grid is positioned from the top-left, so that never matters.
 */

export interface LabelSheet {
  id: string;
  /** Physical stock, shared by both content directions. */
  stock: '8x5' | '4x2.5' | '4x1' | '2.5x1.56';
  label: string;
  /** Which way the content runs across the die-cut rectangle. */
  direction: 'horizontal' | 'vertical';
  page: { w: number; h: number };
  orient: 'portrait' | 'landscape';
  /** Offset of the grid's top-left corner from the page's top-left corner. */
  origin: { x: number; y: number };
  size: { w: number; h: number };
  cols: number;
  rows: number;
  gutter: { x: number; y: number };
  /** The .odt these numbers came out of. */
  source: string;
}

export const SHEETS: LabelSheet[] = [
  {
    id: '8x5-h',
    stock: '8x5',
    label: '8 × 5in',
    direction: 'horizontal',
    page: { w: 8.5, h: 11 },
    orient: 'portrait',
    origin: { x: 0.25, y: 0.5 },
    size: { w: 8, h: 5 },
    cols: 1,
    rows: 2,
    gutter: { x: 0, y: 0 },
    source: '8x5 Label Printing Template (Horizontal Labels).odt',
  },
  {
    id: '8x5-v',
    stock: '8x5',
    label: '5 × 8in',
    direction: 'vertical',
    page: { w: 11, h: 8.5 },
    orient: 'landscape',
    origin: { x: 0.5, y: 0.25 },
    size: { w: 5, h: 8 },
    cols: 2,
    rows: 1,
    gutter: { x: 0, y: 0 },
    source: '8x5 Label Printing Template (Vertical Labels).odt',
  },
  {
    id: '4x2.5-h',
    stock: '4x2.5',
    label: '4 × 2.5in',
    direction: 'horizontal',
    page: { w: 8.5, h: 11 },
    orient: 'portrait',
    origin: { x: 0.1874, y: 0.5 },
    size: { w: 4, h: 2.5 },
    cols: 2,
    rows: 4,
    gutter: { x: 0.125, y: 0 },
    source: '4x2.5 Label Printing Template (Horizontal Labels).odt',
  },
  {
    id: '4x2.5-v',
    stock: '4x2.5',
    label: '2.5 × 4in',
    direction: 'vertical',
    page: { w: 11, h: 8.5 },
    orient: 'landscape',
    origin: { x: 0.5, y: 0.1799 },
    size: { w: 2.5, h: 4 },
    cols: 4,
    rows: 2,
    gutter: { x: 0, y: 0.1299 },
    source: '4x2.5 Label Printing Template (Vertical Labels).odt',
  },
  {
    // No vertical counterpart exists in the template folder - a 1 x 4in upright
    // strip is not stock the space carries.
    id: '4x1-h',
    stock: '4x1',
    label: '4 × 1in',
    direction: 'horizontal',
    page: { w: 8.5, h: 11 },
    orient: 'portrait',
    origin: { x: 0.1252, y: 0.5 },
    size: { w: 4, h: 1 },
    cols: 2,
    rows: 10,
    gutter: { x: 0.1882, y: 0 },
    source: '4x1 Label Printing Template (Horizontal Labels).odt',
  },
  {
    id: '2.5x1.56-h',
    stock: '2.5x1.56',
    label: '2.5 × 1.56in',
    direction: 'horizontal',
    page: { w: 8.5, h: 11 },
    orient: 'portrait',
    origin: { x: 0.3752, y: 0.5 },
    size: { w: 2.5, h: 1.5632 },
    cols: 3,
    rows: 6,
    gutter: { x: 0.125, y: 0.125 },
    source: '2.5x1.56 Label Printing Template (Horizontal Labels).odt',
  },
  {
    id: '2.5x1.56-v',
    stock: '2.5x1.56',
    label: '1.56 × 2.5in',
    direction: 'vertical',
    page: { w: 11, h: 8.5 },
    orient: 'landscape',
    origin: { x: 0.5, y: 0.3799 },
    size: { w: 1.5601, h: 2.5 },
    cols: 6,
    rows: 3,
    gutter: { x: 0.1299, y: 0.125 },
    source: '2.5x1.56 Label Printing Template (Vertical Labels).odt',
  },
];

export const byId = (id: string): LabelSheet =>
  SHEETS.find((s) => s.id === id) ?? SHEETS[0]!;

export const perSheet = (s: LabelSheet): number => s.cols * s.rows;

/** Stock options in the order they should be offered, largest first. */
export const STOCKS = ['8x5', '4x2.5', '4x1', '2.5x1.56'] as const;
