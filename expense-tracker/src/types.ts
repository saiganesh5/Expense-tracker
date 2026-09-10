/* =========================================
   DATA MODEL
   ========================================= */

export type ColumnType = 'text' | 'number' | 'currency' | 'date' | 'select' | 'checkbox';

export interface Column {
  id: string;
  name: string;
  type: ColumnType;
  options?: string[]; // only used by 'select'
  source?: 'sheet' | 'local'; // 'sheet' = synced from a linked Google Sheet (read-only); undefined/'local' = user column
  sheetIndex?: number; // position of this column in the source sheet (synced columns only)
}

export type CellValue = string | number | boolean | null;

export interface Row {
  id: string;
  cells: Record<string, CellValue>; // columnId -> value
}

/**
 * Metadata attached to a Work that mirrors a public Google Sheet. When present,
 * the sheet-derived columns/rows are refreshed from `csvUrl`; the user may still
 * add their own local (editable) columns alongside them.
 */
export interface SheetSource {
  originalUrl: string; // the URL the user pasted (kept for display / re-parsing)
  csvUrl: string; // resolved CSV endpoint we actually fetch
  gid: string; // sheet tab id within the spreadsheet
  lastSyncedAt: string | null; // ISO timestamp of the last successful sync
  lastError: string | null; // message from the last failed sync (null when healthy)
}

export interface Work {
  id: string;
  name: string;
  description: string;
  color: string;
  createdAt: string;
  notes?: string; // free-form Markdown notes about the work
  columns: Column[];
  rows: Row[];
  sheet?: SheetSource; // present iff this work mirrors a Google Sheet
}

/* =========================================
   COLUMN TYPES (for the type picker)
   ========================================= */

export const COLUMN_TYPES: { value: ColumnType; label: string; icon: string }[] = [
  { value: 'text', label: 'Text', icon: 'Aa' },
  { value: 'number', label: 'Number', icon: '#' },
  { value: 'currency', label: 'Currency (₹)', icon: '₹' },
  { value: 'date', label: 'Date', icon: '📅' },
  { value: 'select', label: 'Dropdown', icon: '▾' },
  { value: 'checkbox', label: 'Checkbox', icon: '☑' },
];

export function getColumnTypeInfo(type: ColumnType) {
  return COLUMN_TYPES.find(t => t.value === type) ?? COLUMN_TYPES[0];
}

/** Synced columns come from a linked Google Sheet and are read-only in the UI. */
export function isSynced(column: Column): boolean {
  return column.source === 'sheet';
}

/** How often linked works re-fetch their Google Sheet (5 minutes). */
export const SHEET_REFRESH_MS = 5 * 60 * 1000;

export const NUMERIC_TYPES: ColumnType[] = ['number', 'currency'];

/** Columns new works start with, so the table is usable immediately. */
export const DEFAULT_COLUMNS: Omit<Column, 'id'>[] = [
  { name: 'Item', type: 'text' },
  { name: 'Amount', type: 'currency' },
  { name: 'Date', type: 'date' },
];

/** Sensible empty value for a freshly-added cell of the given type. */
export function emptyCellValue(type: ColumnType): CellValue {
  switch (type) {
    case 'checkbox':
      return false;
    case 'number':
    case 'currency':
      return null;
    default:
      return '';
  }
}

export const WORK_COLORS = [
  '#8b5cf6',
  '#3b82f6',
  '#06b6d4',
  '#10b981',
  '#f59e0b',
  '#f43f5e',
  '#f97316',
  '#ec4899',
  '#6366f1',
  '#14b8a6',
];

/**
 * Legacy expense categories. Retained only so the migration from the old
 * fixed-expense model can turn stored category values into dropdown labels.
 */
export const EXPENSE_CATEGORIES = [
  { value: 'travel', label: 'Travel', icon: '✈️' },
  { value: 'food', label: 'Food & Dining', icon: '🍕' },
  { value: 'supplies', label: 'Supplies', icon: '📦' },
  { value: 'equipment', label: 'Equipment', icon: '🖥️' },
  { value: 'software', label: 'Software', icon: '💻' },
  { value: 'services', label: 'Services', icon: '🔧' },
  { value: 'communication', label: 'Communication', icon: '📱' },
  { value: 'transport', label: 'Transport', icon: '🚗' },
  { value: 'utilities', label: 'Utilities', icon: '⚡' },
  { value: 'other', label: 'Other', icon: '📋' },
] as const;
