import { useState, useEffect, useCallback, useRef } from 'react';
import type { Work, Column, Row, CellValue } from './types';
import { DEFAULT_COLUMNS, EXPENSE_CATEGORIES, WORK_COLORS, emptyCellValue, isSynced, SHEET_REFRESH_MS } from './types';
import { parseSheetUrl, buildCsvUrl, fetchCsvTable, inferColumnType, coerceCell } from './googleSheets';
import { fetchWorks, removeWork, saveWork } from './worksApi';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

/** Coerce any stored cell value into a number for totals (empty/invalid -> 0). */
export function toNumber(v: CellValue | undefined): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return isNaN(n) ? 0 : n;
}

/**
 * Build the read-only, sheet-derived columns for a linked work from the sheet's
 * header row + data. Reuses existing synced column ids (matched by position) so
 * cell keys stay stable across refreshes and the UI doesn't flicker.
 */
function buildSyncedColumns(headers: string[], dataRows: string[][], reuse?: Column[]): Column[] {
  return headers.map((header, i) => {
    const colValues = dataRows.map(r => r[i] ?? '');
    const existing = reuse?.find(c => isSynced(c) && c.sheetIndex === i);
    return {
      id: existing?.id ?? generateId(),
      name: header.trim() || `Column ${i + 1}`,
      type: inferColumnType(colValues),
      source: 'sheet' as const,
      sheetIndex: i,
    };
  });
}

/**
 * Convert a work stored in the legacy fixed-expense shape into the new
 * columns + rows model. Works already in the new shape pass through untouched.
 */
function migrateWork(raw: unknown): Work {
  const w = (raw ?? {}) as Record<string, unknown>;

  if (Array.isArray(w.columns) && Array.isArray(w.rows)) {
    return raw as Work;
  }

  const descCol: Column = { id: generateId(), name: 'Description', type: 'text' };
  const amountCol: Column = { id: generateId(), name: 'Amount', type: 'currency' };
  const categoryCol: Column = {
    id: generateId(),
    name: 'Category',
    type: 'select',
    options: EXPENSE_CATEGORIES.map(c => c.label),
  };
  const dateCol: Column = { id: generateId(), name: 'Date', type: 'date' };
  const noteCol: Column = { id: generateId(), name: 'Note', type: 'text' };
  const columns = [descCol, amountCol, categoryCol, dateCol, noteCol];

  const expenses = Array.isArray(w.expenses) ? (w.expenses as Record<string, unknown>[]) : [];
  const rows: Row[] = expenses.map(e => {
    const catLabel = EXPENSE_CATEGORIES.find(c => c.value === e.category)?.label ?? '';
    return {
      id: typeof e.id === 'string' ? e.id : generateId(),
      cells: {
        [descCol.id]: (e.description as string) ?? '',
        [amountCol.id]: typeof e.amount === 'number' ? e.amount : null,
        [categoryCol.id]: catLabel,
        [dateCol.id]: (e.date as string) ?? '',
        [noteCol.id]: (e.note as string) ?? '',
      },
    };
  });

  return {
    id: typeof w.id === 'string' ? w.id : generateId(),
    name: typeof w.name === 'string' ? w.name : 'Untitled',
    description: typeof w.description === 'string' ? w.description : '',
    color: typeof w.color === 'string' ? w.color : WORK_COLORS[0],
    createdAt: typeof w.createdAt === 'string' ? w.createdAt : new Date().toISOString(),
    columns,
    rows,
  };
}

/**
 * One-time bridge for installations made before server persistence existed.
 * The data is uploaded and the browser copy is removed; new data is never written
 * to localStorage.
 */
function readLegacyWorks(userKey: string): Work[] {
  const key = `expense-tracker-works::${userKey.trim().toLowerCase()}`;
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(migrateWork) : [];
  } catch {
    return [];
  }
}

function clearLegacyWorks(userKey: string): void {
  localStorage.removeItem(`expense-tracker-works::${userKey.trim().toLowerCase()}`);
}

/**
 * Manages the logged-in user's works. The API derives ownership from the JWT;
 * this hook contains no browser persistence for work data.
 */
export function useWorks(userKey: string) {
  const [works, setWorks] = useState<Work[]>([]);
  // Work ids currently mid-sync (transient; never persisted).
  const [syncingIds, setSyncingIds] = useState<string[]>([]);

  // Latest works, readable from stable callbacks / the refresh interval.
  const worksRef = useRef(works);

  const loadedRef = useRef(false);
  const writeQueuesRef = useRef(new Map<string, Promise<void>>());
  const lastSavedMapRef = useRef(new Map<string, string>());

  const queueSave = useCallback((work: Work) => {
    const previous = writeQueuesRef.current.get(work.id) ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(() => saveWork(work)).then(() => undefined);
    writeQueuesRef.current.set(work.id, next);
    void next.catch(error => console.error('Could not save work:', error));
  }, []);

  const queueDelete = useCallback((id: string) => {
    const previous = writeQueuesRef.current.get(id) ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(() => removeWork(id));
    writeQueuesRef.current.set(id, next);
    void next.then(() => {
      // Do not let a stale queued save recreate a record after deletion.
      writeQueuesRef.current.delete(id);
    }).catch(error => console.error('Could not delete work:', error));
  }, []);

  useEffect(() => {
    let active = true;
    loadedRef.current = false;
    void fetchWorks()
      .then(async serverWorks => {
        if (!active) return;
        if (serverWorks.length > 0) {
          const migrated = serverWorks.map(migrateWork);
          migrated.forEach(w => lastSavedMapRef.current.set(w.id, JSON.stringify(w)));
          setWorks(migrated);
          return;
        }
        const legacyWorks = readLegacyWorks(userKey);
        if (legacyWorks.length === 0) return;
        await Promise.all(legacyWorks.map(saveWork));
        clearLegacyWorks(userKey);
        if (active) {
          legacyWorks.forEach(w => lastSavedMapRef.current.set(w.id, JSON.stringify(w)));
          setWorks(legacyWorks);
        }
      })
      .catch(error => console.error('Could not load works:', error))
      .finally(() => { if (active) loadedRef.current = true; });
    return () => { active = false; };
  }, [userKey]);

  useEffect(() => {
    worksRef.current = works;
    if (!loadedRef.current) return;
    works.forEach(work => {
      const serialized = JSON.stringify(work);
      if (lastSavedMapRef.current.get(work.id) !== serialized) {
        lastSavedMapRef.current.set(work.id, serialized);
        queueSave(work);
      }
    });
  }, [works, queueSave]);

  // ---- Works ----

  const addWork = useCallback((name: string, description: string, color: string) => {
    const newWork: Work = {
      id: generateId(),
      name,
      description,
      color,
      createdAt: new Date().toISOString(),
      columns: DEFAULT_COLUMNS.map(c => ({ ...c, id: generateId() })),
      rows: [],
    };
    setWorks(prev => [newWork, ...prev]);
    return newWork.id;
  }, []);

  const updateWork = useCallback(
    (id: string, updates: Partial<Pick<Work, 'name' | 'description' | 'color' | 'notes'>>) => {
      setWorks(prev => prev.map(w => (w.id === id ? { ...w, ...updates } : w)));
    },
    []
  );

  const deleteWork = useCallback((id: string) => {
    lastSavedMapRef.current.delete(id);
    setWorks(prev => prev.filter(w => w.id !== id));
    queueDelete(id);
  }, [queueDelete]);

  // ---- Columns ----

  const addColumn = useCallback((workId: string, col: Omit<Column, 'id'>) => {
    const id = generateId();
    setWorks(prev =>
      prev.map(w =>
        w.id === workId
          ? {
              ...w,
              // On a sheet-linked work, user-added columns are local (editable) and persist across refreshes.
              columns: [...w.columns, { ...col, id, source: w.sheet ? 'local' : col.source }],
              rows: w.rows.map(r => ({ ...r, cells: { ...r.cells, [id]: emptyCellValue(col.type) } })),
            }
          : w
      )
    );
    return id;
  }, []);

  const updateColumn = useCallback(
    (workId: string, columnId: string, updates: Partial<Omit<Column, 'id' | 'type'>>) => {
      setWorks(prev =>
        prev.map(w =>
          w.id === workId
            ? {
                ...w,
                // Synced columns are owned by the sheet — never rename/re-option them here.
                columns: w.columns.map(c => (c.id === columnId && !isSynced(c) ? { ...c, ...updates } : c)),
              }
            : w
        )
      );
    },
    []
  );

  const deleteColumn = useCallback((workId: string, columnId: string) => {
    setWorks(prev =>
      prev.map(w => {
        if (w.id !== workId) return w;
        const target = w.columns.find(c => c.id === columnId);
        if (!target || isSynced(target)) return w; // can't delete a synced column
        const columns = w.columns.filter(c => c.id !== columnId);
        const rows = w.rows.map(r => {
          const cells = { ...r.cells };
          delete cells[columnId];
          return { ...r, cells };
        });
        return { ...w, columns, rows };
      })
    );
  }, []);

  const moveColumn = useCallback((workId: string, columnId: string, direction: 'left' | 'right') => {
    setWorks(prev =>
      prev.map(w => {
        if (w.id !== workId) return w;
        const idx = w.columns.findIndex(c => c.id === columnId);
        if (idx === -1 || isSynced(w.columns[idx])) return w;
        const target = direction === 'left' ? idx - 1 : idx + 1;
        if (target < 0 || target >= w.columns.length) return w;
        if (isSynced(w.columns[target])) return w; // don't reorder a local column into the synced block
        const columns = [...w.columns];
        [columns[idx], columns[target]] = [columns[target], columns[idx]];
        return { ...w, columns };
      })
    );
  }, []);

  // ---- Rows ----

  const addRow = useCallback((workId: string) => {
    const id = generateId();
    setWorks(prev =>
      prev.map(w => {
        if (w.id !== workId || w.sheet) return w; // linked works mirror the sheet's rows
        const cells: Record<string, CellValue> = {};
        w.columns.forEach(c => {
          cells[c.id] = emptyCellValue(c.type);
        });
        return { ...w, rows: [...w.rows, { id, cells }] };
      })
    );
    return id;
  }, []);

  const updateCell = useCallback(
    (workId: string, rowId: string, columnId: string, value: CellValue) => {
      setWorks(prev =>
        prev.map(w => {
          if (w.id !== workId) return w;
          const col = w.columns.find(c => c.id === columnId);
          if (col && isSynced(col)) return w; // synced cells are read-only; local cells stay editable
          return {
            ...w,
            rows: w.rows.map(r =>
              r.id === rowId ? { ...r, cells: { ...r.cells, [columnId]: value } } : r
            ),
          };
        })
      );
    },
    []
  );

  const deleteRow = useCallback((workId: string, rowId: string) => {
    setWorks(prev =>
      prev.map(w => (w.id === workId && !w.sheet ? { ...w, rows: w.rows.filter(r => r.id !== rowId) } : w))
    );
  }, []);

  // ---- Google Sheets sync ----

  /** Import a public Google Sheet as a new linked (mirrored) work. */
  const importSheet = useCallback(
    async (
      url: string,
      name: string,
      color: string
    ): Promise<{ workId: string } | { error: string }> => {
      const ref = parseSheetUrl(url);
      if (!ref) {
        return { error: 'That doesn’t look like a Google Sheets link. Paste the full URL from your browser.' };
      }
      const csvUrl = buildCsvUrl(ref);

      let table: string[][];
      try {
        table = await fetchCsvTable(csvUrl);
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Couldn’t import the sheet.' };
      }

      const [headers, ...dataRows] = table;
      const columns = buildSyncedColumns(headers, dataRows);
      const rows: Row[] = dataRows.map(cells => ({
        id: generateId(),
        cells: Object.fromEntries(columns.map(c => [c.id, coerceCell(cells[c.sheetIndex ?? 0] ?? '', c.type)])),
      }));

      const id = generateId();
      const now = new Date().toISOString();
      const newWork: Work = {
        id,
        name: name.trim() || 'Imported Sheet',
        description: '',
        color,
        createdAt: now,
        columns,
        rows,
        sheet: { originalUrl: url.trim(), csvUrl, gid: ref.gid, lastSyncedAt: now, lastError: null },
      };

      // Persist the import before updating the UI. This prevents a successful-looking
      // import from being lost while the initial works request is still in flight.
      try {
        await saveWork(newWork);
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Could not store the imported sheet.' };
      }
      lastSavedMapRef.current.set(id, JSON.stringify(newWork));
      setWorks(prev => [newWork, ...prev]);
      return { workId: id };
    },
    []
  );

  /** Re-fetch a linked work's sheet, rebuilding synced data while preserving local columns. */
  const refreshSheet = useCallback(async (workId: string) => {
    const target = worksRef.current.find(w => w.id === workId);
    if (!target?.sheet) return;

    setSyncingIds(prev => (prev.includes(workId) ? prev : [...prev, workId]));
    try {
      const table = await fetchCsvTable(target.sheet.csvUrl);
      const [headers, ...dataRows] = table;
      const now = new Date().toISOString();

      setWorks(prev =>
        prev.map(w => {
          if (w.id !== workId || !w.sheet) return w;
          const syncedColumns = buildSyncedColumns(headers, dataRows, w.columns);
          const localColumns = w.columns.filter(c => !isSynced(c));
          // Match rows by position; carry each row's local-column values forward.
          const rows: Row[] = dataRows.map((cells, idx) => {
            const prevRow = w.rows[idx];
            const newCells: Record<string, CellValue> = {};
            syncedColumns.forEach(c => {
              newCells[c.id] = coerceCell(cells[c.sheetIndex ?? 0] ?? '', c.type);
            });
            localColumns.forEach(c => {
              newCells[c.id] = prevRow?.cells[c.id] ?? emptyCellValue(c.type);
            });
            return { id: prevRow?.id ?? generateId(), cells: newCells };
          });
          return {
            ...w,
            columns: [...syncedColumns, ...localColumns],
            rows,
            sheet: { ...w.sheet, lastSyncedAt: now, lastError: null },
          };
        })
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sync failed.';
      setWorks(prev =>
        prev.map(w => (w.id === workId && w.sheet ? { ...w, sheet: { ...w.sheet, lastError: message } } : w))
      );
    } finally {
      setSyncingIds(prev => prev.filter(x => x !== workId));
    }
  }, []);

  /** Detach a work from its sheet: synced columns become normal editable local columns. */
  const unlinkSheet = useCallback((workId: string) => {
    setWorks(prev =>
      prev.map(w => {
        if (w.id !== workId) return w;
        const next: Work = { ...w, columns: w.columns.map(c => ({ ...c, source: 'local' as const })) };
        delete next.sheet;
        return next;
      })
    );
  }, []);

  const isSyncing = useCallback((workId: string) => syncingIds.includes(workId), [syncingIds]);

  // Refresh every linked work once on load, then every SHEET_REFRESH_MS while the app is open.
  useEffect(() => {
    const refreshAllLinked = () => {
      worksRef.current.filter(w => w.sheet).forEach(w => void refreshSheet(w.id));
    };
    refreshAllLinked();
    const timer = setInterval(refreshAllLinked, SHEET_REFRESH_MS);
    return () => clearInterval(timer);
  }, [refreshSheet]);

  // ---- Derived ----

  const getWork = useCallback((id: string) => works.find(w => w.id === id), [works]);

  const getGrandTotal = useCallback(
    () =>
      works.reduce((sum, w) => {
        const currencyCols = w.columns.filter(c => c.type === 'currency');
        return (
          sum +
          w.rows.reduce(
            (s, r) => s + currencyCols.reduce((cs, c) => cs + toNumber(r.cells[c.id]), 0),
            0
          )
        );
      }, 0),
    [works]
  );

  return {
    works,
    addWork,
    updateWork,
    deleteWork,
    addColumn,
    updateColumn,
    deleteColumn,
    moveColumn,
    addRow,
    updateCell,
    deleteRow,
    getWork,
    getGrandTotal,
    importSheet,
    refreshSheet,
    unlinkSheet,
    isSyncing,
  };
}
