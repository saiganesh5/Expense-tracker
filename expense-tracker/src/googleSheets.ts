/* =========================================
   GOOGLE SHEETS IMPORT
   Parse a public Google Sheet URL, fetch it as CSV (browser-side), and turn the
   raw values into typed table data. No dependencies — pure functions + one fetch.
   ========================================= */

import type { CellValue, ColumnType } from './types';

/**
 * A resolved reference to a fetchable sheet.
 * - `gviz`: built from a normal share/edit URL, hits the Visualization CSV endpoint.
 * - `published`: built from a File → Share → Publish-to-web URL (`/d/e/{pubId}/`).
 */
export type SheetRef =
  | { kind: 'gviz'; spreadsheetId: string; gid: string }
  | { kind: 'published'; pubId: string; gid: string };

/**
 * Extract a sheet reference from any Google Sheets URL the user pastes.
 * Handles normal `/spreadsheets/d/{id}/edit#gid=…` links and published
 * `/spreadsheets/d/e/{pubId}/pub…` links. Returns null if it isn't a Sheets URL.
 */
export function parseSheetUrl(url: string): SheetRef | null {
  const trimmed = (url ?? '').trim();
  if (!trimmed) return null;

  const gidMatch = trimmed.match(/[#&?]gid=(\d+)/);
  const gid = gidMatch ? gidMatch[1] : '0';

  // Published-to-web form must be checked first: `/d/e/{pubId}`.
  const published = trimmed.match(/\/spreadsheets\/d\/e\/([\w-]+)/);
  if (published) {
    return { kind: 'published', pubId: published[1], gid };
  }

  // Normal share/edit form: `/d/{spreadsheetId}`.
  const normal = trimmed.match(/\/spreadsheets\/d\/([\w-]+)/);
  if (normal) {
    return { kind: 'gviz', spreadsheetId: normal[1], gid };
  }

  return null;
}

/** Build the CSV endpoint we actually fetch for a given reference. */
export function buildCsvUrl(ref: SheetRef): string {
  if (ref.kind === 'published') {
    return `https://docs.google.com/spreadsheets/d/e/${ref.pubId}/pub?gid=${ref.gid}&single=true&output=csv`;
  }
  // Use the /export endpoint instead of /gviz/tq — the gviz CSV endpoint has a
  // known bug where DD/MM dates with day > 12 are silently dropped (exported as
  // empty strings). The /export endpoint preserves dates exactly as displayed.
  return `https://docs.google.com/spreadsheets/d/${ref.spreadsheetId}/export?format=csv&gid=${ref.gid}`;
}

/**
 * Fetch and parse a resolved CSV URL into a 2D array of raw string cells
 * (row 0 = headers). Used for both the initial import and every refresh.
 * Throws an Error with a user-facing message on network/CORS failure, non-OK
 * responses, a non-public sheet (returns login HTML), or an empty sheet.
 */
export async function fetchCsvTable(csvUrl: string): Promise<string[][]> {
  let res: Response;
  try {
    res = await fetch(csvUrl);
  } catch {
    throw new Error(
      'Couldn’t reach the sheet. Make sure it’s shared as “Anyone with the link”, or use File → Share → Publish to web and paste that link.'
    );
  }

  if (!res.ok) {
    throw new Error(`The sheet couldn’t be loaded (HTTP ${res.status}). Check that the link is public.`);
  }

  const text = await res.text();
  // A non-public sheet redirects to an HTML login/error page instead of CSV.
  if (text.trimStart().startsWith('<')) {
    throw new Error('This sheet isn’t public. Share it as “Anyone with the link: Viewer” and try again.');
  }

  const table = parseCsv(text);
  if (table.length === 0 || table[0].length === 0) {
    throw new Error('The sheet appears to be empty.');
  }
  // Debug: log raw CSV rows so we can see what format dates arrive in.
  console.log('[Sheet Import] Raw CSV rows:', table.slice(0, 5).map(r => r.join(' | ')));
  return table;
}

/**
 * Parse CSV text into rows of string fields. Handles quoted fields, escaped
 * quotes (`""`), embedded commas/newlines, and CRLF/CR/LF line endings.
 */
export function parseCsv(text: string): string[][] {
  const cleaned = (text ?? '').replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++; // consume the escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (ch === '\r') {
      // CRLF: let the following \n close the row. Lone CR (old Mac): close here.
      if (text[i + 1] !== '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      }
    } else {
      field += ch;
    }
  }

  // Flush the trailing field/row if the text didn't end on a newline.
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // Drop fully-empty rows (trailing blank lines, spacer rows).
  return rows.filter(r => r.some(f => f.trim() !== ''));
}

const CURRENCY_RE =
  /^[₹$€£]\s?-?[\d,]+(\.\d+)?$|^-?[\d,]+(\.\d+)?\s?(INR|USD|EUR|GBP)$/i;
const NUMBER_RE = /^-?[\d,]+(\.\d+)?%?$/;

/**
 * Google Sheets serial date epoch: December 30, 1899.
 * A serial number like 45678 means 45678 days from that epoch.
 */
const SHEETS_EPOCH = new Date(1899, 11, 30).getTime();
const MS_PER_DAY = 86_400_000;

/**
 * Month name map for fast textual date parsing without relying on Date.parse.
 */
const MONTH_NAMES: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

/**
 * Parse a date string into an ISO `yyyy-mm-dd`, or null if it isn't a date.
 *
 * Handles many formats Google Sheets may export:
 * - ISO: `2025-08-26`, `2025-08-26T14:30:00`
 * - Numeric with optional time: `26/8/2025`, `8/26/2025 0:00:00`, `26-08-2025 14:30`
 * - Textual: `26 Aug 2025`, `Aug 26, 2025`, `August 26, 2025`
 * - Serial date numbers (Google Sheets internal format): `45678`
 *
 * Numeric slash/dash/dot dates are read **day-first** (`dd/mm/yyyy`) to match this
 * app's `en-IN` locale. If the first field > 12 and second ≤ 12 it's unambiguously
 * month-first, so those swap automatically.
 */
export function parseDateToIso(raw: string): string | null {
  const v = (raw ?? '').trim();
  if (v === '') return null;

  const pad = (n: number) => String(n).padStart(2, '0');

  function validDate(year: number, month: number, day: number): string | null {
    if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2100) return null;
    return `${year}-${pad(month)}-${pad(day)}`;
  }

  // 1. Year-first date (yyyy-mm-dd, yyyy/mm/dd, yyyy.mm.dd…) — keep as-is, no timezone round-trip.
  const iso = v.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (iso) return validDate(+iso[1], +iso[2], +iso[3]);

  // 2. Numeric date with optional trailing time: d/m/yyyy HH:MM:SS, dd-mm-yyyy, d.m.yy, etc.
  //    The time portion (if any) is ignored since we only store the date.
  const num = v.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})(?:\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APap][Mm])?)?$/);
  if (num) {
    let day = parseInt(num[1], 10);
    let month = parseInt(num[2], 10);
    let year = parseInt(num[3], 10);
    if (month > 12 && day <= 12) {
      [day, month] = [month, day]; // unambiguously month-first (m/d/yyyy)
    }
    if (year < 100) year += 2000;
    return validDate(year, month, day);
  }

  // 3. Textual: "26 Aug 2025", "26-Aug-2025", "Aug 26, 2025", "August 26 2025"
  const textual = v.match(/^(\d{1,2})[\s./-]+(\w+)[\s./-]+(\d{2,4})$/);
  if (textual) {
    const monthNum = MONTH_NAMES[textual[2].toLowerCase()];
    if (monthNum) {
      let year = parseInt(textual[3], 10);
      if (year < 100) year += 2000;
      return validDate(year, monthNum, parseInt(textual[1], 10));
    }
  }

  const textual2 = v.match(/^(\w+)[\s./-]+(\d{1,2})[,\s./-]+(\d{2,4})$/);
  if (textual2) {
    const monthNum = MONTH_NAMES[textual2[1].toLowerCase()];
    if (monthNum) {
      let year = parseInt(textual2[3], 10);
      if (year < 100) year += 2000;
      return validDate(year, monthNum, parseInt(textual2[2], 10));
    }
  }

  // 4. Google Sheets gviz Date() format: "Date(2025,10,2)" where month is 0-indexed.
  const gviz = v.match(/^Date\((\d{4}),(\d{1,2}),(\d{1,2})\)$/i);
  if (gviz) {
    return validDate(+gviz[1], +gviz[2] + 1, +gviz[3]); // +1 because gviz months are 0-based
  }

  // 5. Google Sheets serial date number (e.g. 45678 = some date in 2024/2025).
  //    Only treat as serial if it's a bare integer in a plausible range (> 1 and < 100000).
  const serial = v.match(/^(\d{4,6})$/);
  if (serial) {
    const n = parseInt(serial[1], 10);
    if (n > 1 && n < 100000) {
      const d = new Date(SHEETS_EPOCH + n * MS_PER_DAY);
      if (!isNaN(d.getTime())) {
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      }
    }
  }

  // 5. Fallback: Date.parse for any remaining format the engine understands.
  //    Use UTC methods to avoid timezone-shift issues (Date.parse interprets some
  //    formats as local, others as UTC — getUTC* is consistent after the parse).
  const t = Date.parse(v);
  if (!isNaN(t)) {
    const d = new Date(t);
    // Sanity: reject if the year is unreasonable (avoids interpreting random numbers as dates).
    const yr = d.getFullYear();
    if (yr >= 1900 && yr <= 2100) {
      return `${yr}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    }
  }

  return null;
}

/**
 * Guess a column's type from its values. Uses a majority threshold (≥ 70% of
 * non-empty values) for dates, since mixed sheets often have a few cells with
 * notes, dashes, or formatting anomalies that shouldn't collapse the column to text.
 * Currency and number detection remain strict (all values must match).
 */
export function inferColumnType(values: string[]): ColumnType {
  const vals = values.map(v => (v ?? '').trim()).filter(v => v !== '');
  if (vals.length === 0) return 'text';

  if (vals.every(v => CURRENCY_RE.test(v))) return 'currency';
  if (vals.every(v => NUMBER_RE.test(v) && /\d/.test(v))) return 'number';

  // Date: allow up to 30% non-date values (empty-ish cells, '-', 'N/A', etc.)
  const dateCount = vals.filter(v => parseDateToIso(v) !== null).length;
  if (dateCount > 0 && dateCount / vals.length >= 0.7) return 'date';

  return 'text';
}

/** Convert one raw cell string into a stored CellValue for the given column type. */
export function coerceCell(raw: string, type: ColumnType): CellValue {
  const v = (raw ?? '').trim();
  if (v === '') return type === 'number' || type === 'currency' ? null : '';

  switch (type) {
    case 'number':
    case 'currency': {
      const n = parseFloat(v.replace(/[^0-9.-]/g, ''));
      return isNaN(n) ? null : n;
    }
    case 'date': {
      const parsed = parseDateToIso(v);
      if (!parsed && v !== '') {
        console.warn('[Sheet Import] Failed to parse date value:', JSON.stringify(v), '→ storing raw');
      }
      return parsed ?? v;
    }
    default:
      return v;
  }
}
