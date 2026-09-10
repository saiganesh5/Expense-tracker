import { useState, type FormEvent } from 'react';
import './App.css';
import AuthPage from './AuthPage';
import { getUser, isLoggedIn, logout, type StoredUser } from './authService';
import { Markdown } from './markdown';
import { WorkCharts } from './Charts';
import { useWorks, toNumber } from './useWorks';
import { WORK_COLORS, COLUMN_TYPES, NUMERIC_TYPES, getColumnTypeInfo, isSynced } from './types';
import type { Column, CellValue, ColumnType } from './types';

/* =========================================
   UTILITY HELPERS
   ========================================= */

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatNumber(amount: number): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(amount);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr; // show raw value rather than "Invalid Date"
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

function columnTotal(rows: { cells: Record<string, CellValue> }[], columnId: string): number {
  return rows.reduce((s, r) => s + toNumber(r.cells[columnId]), 0);
}

const STAT_ACCENTS = [
  'var(--accent-rose)',
  'var(--accent-emerald)',
  'var(--accent-amber)',
  'var(--accent-orange)',
  'var(--accent-cyan)',
  'var(--accent-purple)',
];

/* =========================================
   SVG ICONS
   ========================================= */

const Icons = {
  plus: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
  ),
  back: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
  ),
  trash: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
  ),
  edit: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
  ),
  close: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
  ),
  columns: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" /></svg>
  ),
  up: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15" /></svg>
  ),
  down: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
  ),
  link: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
  ),
  refresh: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
  ),
  logout: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
  ),
  note: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><line x1="10" y1="9" x2="8" y2="9" /></svg>
  ),
};

/* =========================================
   MODAL COMPONENT
   ========================================= */

function Modal({
  title,
  onClose,
  children,
  footer,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal ${wide ? 'modal-wide' : ''}`} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="btn-icon" onClick={onClose} aria-label="Close modal">
            {Icons.close}
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

/* =========================================
   CELL DISPLAY + EDITOR
   ========================================= */

function CellDisplay({ column, value }: { column: Column; value: CellValue }) {
  const isEmpty = value === null || value === undefined || value === '';

  switch (column.type) {
    case 'currency':
      return isEmpty ? <span className="cell-empty">—</span> : <>{formatCurrency(toNumber(value))}</>;
    case 'number':
      return isEmpty ? <span className="cell-empty">—</span> : <>{formatNumber(toNumber(value))}</>;
    case 'date':
      return isEmpty ? <span className="cell-empty">—</span> : <>{formatDate(String(value))}</>;
    case 'select':
      return isEmpty ? <span className="cell-empty">—</span> : <span className="cell-tag">{String(value)}</span>;
    default:
      return isEmpty ? <span className="cell-empty">—</span> : <>{String(value)}</>;
  }
}

function CellEditor({
  column,
  value,
  onCommit,
  onCancel,
}: {
  column: Column;
  value: CellValue;
  onCommit: (v: CellValue) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(value === null || value === undefined ? '' : String(value));

  function commit() {
    if (column.type === 'number' || column.type === 'currency') {
      const trimmed = draft.trim();
      const n = parseFloat(trimmed);
      onCommit(trimmed === '' || isNaN(n) ? null : n);
    } else {
      onCommit(draft);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  }

  if (column.type === 'select') {
    return (
      <select
        className="cell-input"
        autoFocus
        value={draft}
        onChange={e => onCommit(e.target.value)}
        onBlur={onCancel}
        onKeyDown={handleKey}
      >
        <option value="">—</option>
        {(column.options ?? []).map(opt => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  }

  const inputType =
    column.type === 'date' ? 'date' : column.type === 'number' || column.type === 'currency' ? 'number' : 'text';

  return (
    <input
      className="cell-input"
      type={inputType}
      autoFocus
      value={draft}
      step={column.type === 'currency' ? '0.01' : undefined}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={handleKey}
    />
  );
}

/* =========================================
   MAIN APP
   ========================================= */

type View = { type: 'dashboard' } | { type: 'work'; workId: string };
type ConfirmTarget =
  | { type: 'work'; workId: string }
  | { type: 'column'; workId: string; columnId: string }
  | { type: 'unlink'; workId: string };

export default function App() {
  // The user shared from the login / signup flow (via authService + localStorage).
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(() =>
    isLoggedIn() ? getUser() : null
  );

  if (!currentUser) {
    return <AuthPage onAuthenticated={setCurrentUser} />;
  }

  return (
    <ExpenseApp
      key={currentUser.email}
      user={currentUser}
      onLogout={() => {
        logout();
        setCurrentUser(null);
      }}
    />
  );
}

function ExpenseApp({ user, onLogout }: { user: StoredUser; onLogout: () => void }) {
  const {
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
  } = useWorks(user.email);

  const [view, setView] = useState<View>({ type: 'dashboard' });
  const [showCreateWork, setShowCreateWork] = useState(false);
  const [showEditWork, setShowEditWork] = useState<string | null>(null);
  const [showColumns, setShowColumns] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ConfirmTarget | null>(null);
  const [editing, setEditing] = useState<{ rowId: string; columnId: string } | null>(null);

  // Notes editor state (Markdown, per work)
  const [showNotes, setShowNotes] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [notesTab, setNotesTab] = useState<'write' | 'preview'>('write');

  // Create work form state
  const [newWorkName, setNewWorkName] = useState('');
  const [newWorkDesc, setNewWorkDesc] = useState('');
  const [newWorkColor, setNewWorkColor] = useState(WORK_COLORS[0]);

  // Edit work form state
  const [editWorkName, setEditWorkName] = useState('');
  const [editWorkDesc, setEditWorkDesc] = useState('');
  const [editWorkColor, setEditWorkColor] = useState('');

  // Add column form state
  const [newColName, setNewColName] = useState('');
  const [newColType, setNewColType] = useState<ColumnType>('text');
  const [newColOptions, setNewColOptions] = useState('');

  // Import-from-Sheets form state
  const [showImport, setShowImport] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importName, setImportName] = useState('');
  const [importColor, setImportColor] = useState(WORK_COLORS[2]);
  const [importError, setImportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const totalWorks = works.length;
  const totalRows = works.reduce((s, w) => s + w.rows.length, 0);
  const grandTotal = getGrandTotal();

  // ---- Handlers ----

  function handleCreateWork(e: FormEvent) {
    e.preventDefault();
    if (!newWorkName.trim()) return;
    const id = addWork(newWorkName.trim(), newWorkDesc.trim(), newWorkColor);
    setNewWorkName('');
    setNewWorkDesc('');
    setNewWorkColor(WORK_COLORS[0]);
    setShowCreateWork(false);
    setView({ type: 'work', workId: id });
  }

  function openEditWork(workId: string) {
    const w = getWork(workId);
    if (!w) return;
    setEditWorkName(w.name);
    setEditWorkDesc(w.description);
    setEditWorkColor(w.color);
    setShowEditWork(workId);
  }

  function handleEditWork(e: FormEvent) {
    e.preventDefault();
    if (!showEditWork || !editWorkName.trim()) return;
    updateWork(showEditWork, {
      name: editWorkName.trim(),
      description: editWorkDesc.trim(),
      color: editWorkColor,
    });
    setShowEditWork(null);
  }

  function parseOptions(raw: string): string[] {
    return raw
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
  }

  function handleAddColumn() {
    if (!showColumns || !newColName.trim()) return;
    addColumn(showColumns, {
      name: newColName.trim(),
      type: newColType,
      options: newColType === 'select' ? parseOptions(newColOptions) : undefined,
    });
    setNewColName('');
    setNewColType('text');
    setNewColOptions('');
  }

  function openNotes(workId: string) {
    const w = getWork(workId);
    if (!w) return;
    setNotesDraft(w.notes ?? '');
    setNotesTab('write');
    setShowNotes(workId);
  }

  function handleSaveNotes() {
    if (!showNotes) return;
    updateWork(showNotes, { notes: notesDraft });
    setShowNotes(null);
  }

  async function handleImportSheet(e: FormEvent) {
    e.preventDefault();
    if (!importUrl.trim() || importing) return;
    setImporting(true);
    setImportError(null);
    const result = await importSheet(importUrl, importName, importColor);
    setImporting(false);
    if ('error' in result) {
      setImportError(result.error);
      return;
    }
    setImportUrl('');
    setImportName('');
    setImportColor(WORK_COLORS[2]);
    setShowImport(false);
    setView({ type: 'work', workId: result.workId });
  }

  function handleConfirmDelete() {
    if (!confirmDelete) return;
    if (confirmDelete.type === 'work') {
      deleteWork(confirmDelete.workId);
      if (view.type === 'work' && view.workId === confirmDelete.workId) {
        setView({ type: 'dashboard' });
      }
    } else if (confirmDelete.type === 'unlink') {
      unlinkSheet(confirmDelete.workId);
    } else {
      deleteColumn(confirmDelete.workId, confirmDelete.columnId);
    }
    setConfirmDelete(null);
  }

  // ---- Render: Dashboard ----

  function renderDashboard() {
    return (
      <div className="animate-fade-in">
        <div className="dashboard-header">
          <h1 className="dashboard-title">
            Your <span>Works</span>
          </h1>
        </div>

        <div className="summary-cards">
          <div className="summary-card">
            <div className="summary-icon" style={{ background: 'rgba(139, 92, 246, 0.12)', color: 'var(--accent-purple)' }}>
              📁
            </div>
            <div className="summary-info">
              <h3>Total Works</h3>
              <div className="value">{totalWorks}</div>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-icon" style={{ background: 'rgba(59, 130, 246, 0.12)', color: 'var(--accent-blue)' }}>
              📝
            </div>
            <div className="summary-info">
              <h3>Total Entries</h3>
              <div className="value">{totalRows}</div>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-icon" style={{ background: 'rgba(244, 63, 94, 0.12)', color: 'var(--accent-rose)' }}>
              💰
            </div>
            <div className="summary-info">
              <h3>Total Value</h3>
              <div className="value">{formatCurrency(grandTotal)}</div>
            </div>
          </div>
        </div>

        <div className="section-header">
          <h2 className="section-title">All Works</h2>
        </div>

        <div className="works-grid">
          <button type="button" className="create-work-card" onClick={() => setShowCreateWork(true)} id="create-work-btn">
            <div className="create-work-icon">{Icons.plus}</div>
            <span>Create New Work</span>
          </button>

          <button type="button" className="import-sheet-card" onClick={() => setShowImport(true)} id="import-sheet-btn">
            <div className="import-sheet-icon">{Icons.link}</div>
            <span>Import from Google Sheets</span>
          </button>

          {works.map((work, i) => {
            const firstCurrency = work.columns.find(c => c.type === 'currency');
            const workTotal = firstCurrency ? columnTotal(work.rows, firstCurrency.id) : null;
            return (
              <div
                role="button"
                tabIndex={0}
                className="work-card"
                key={work.id}
                style={{ animationDelay: `${i * 0.05}s` }}
                onClick={() => setView({ type: 'work', workId: work.id })}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setView({ type: 'work', workId: work.id });
                  }
                }}
                id={`work-card-${work.id}`}
              >
                <div className="work-card-accent" style={{ background: work.color }} />
                <div className="work-card-top">
                  <div className="work-card-color" style={{ background: work.color }}>
                    {work.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="work-card-actions">
                    <button
                      className="btn-icon"
                      onClick={e => { e.stopPropagation(); openEditWork(work.id); }}
                      aria-label="Edit work"
                    >
                      {Icons.edit}
                    </button>
                    <button
                      className="btn-icon danger"
                      onClick={e => { e.stopPropagation(); setConfirmDelete({ type: 'work', workId: work.id }); }}
                      aria-label="Delete work"
                    >
                      {Icons.trash}
                    </button>
                  </div>
                </div>
                <h3>{work.name}</h3>
                <p>{work.description || 'No description'}</p>
                {work.sheet && (
                  <div className="work-card-linked-badge">
                    {Icons.link} Google Sheet
                  </div>
                )}
                <div className="work-card-stats">
                  <div className="work-card-stat">
                    <span className="work-card-stat-label">Rows</span>
                    <span className="work-card-stat-value">{work.rows.length}</span>
                  </div>
                  <div className="work-card-stat">
                    <span className="work-card-stat-label">Total</span>
                    <span className="work-card-stat-value">{workTotal === null ? '—' : formatCurrency(workTotal)}</span>
                  </div>
                  <div className="work-card-stat">
                    <span className="work-card-stat-label">Created</span>
                    <span className="work-card-stat-value">{formatDate(work.createdAt)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {works.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">🚀</div>
            <h3>Start tracking your data</h3>
            <p>Create your first Work to begin building your own table with custom columns.</p>
          </div>
        )}
      </div>
    );
  }

  // ---- Render: Work Detail (table) ----

  function renderWorkDetail() {
    if (view.type !== 'work') return null;
    const work = getWork(view.workId);
    if (!work) {
      return (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <h3>Work not found</h3>
          <p>This work no longer exists.</p>
          <button className="btn btn-secondary" style={{ marginTop: '1rem' }} onClick={() => setView({ type: 'dashboard' })}>
            {Icons.back} Back to Dashboard
          </button>
        </div>
      );
    }

    const numericColumns = work.columns.filter(c => NUMERIC_TYPES.includes(c.type));
    const hasNumeric = numericColumns.length > 0;
    const showRowActions = !work.sheet;
    const syncing = isSyncing(work.id);

    return (
      <div className="work-detail">
        {/* Header */}
        <div className="work-detail-header">
          <button className="back-btn" onClick={() => setView({ type: 'dashboard' })} id="back-to-dashboard">
            {Icons.back} Back
          </button>
          <div className="work-detail-info">
            <h1 className="work-detail-name">
              <span className="work-detail-dot" style={{ background: work.color }} />
              {work.name}
            </h1>
            {work.description && <p className="work-detail-desc">{work.description}</p>}
          </div>
        </div>

        {/* Google Sheet sync bar */}
        {work.sheet && (
          <div className={`sheet-bar ${work.sheet.lastError ? 'error' : ''}`}>
            <div className="sheet-pill">
              <span className="sheet-pill-icon">{Icons.link}</span>
              <span className="sheet-pill-text">
                {work.sheet.lastError
                  ? `Sync failed — ${work.sheet.lastError}`
                  : work.sheet.lastSyncedAt
                    ? `Synced from Google Sheets · Updated ${formatTime(work.sheet.lastSyncedAt)}`
                    : 'Synced from Google Sheets'}
              </span>
            </div>
            <div className="sheet-bar-actions">
              <button className="btn btn-secondary" onClick={() => refreshSheet(work.id)} disabled={syncing} id="sync-now-btn">
                <span className={`sync-icon ${syncing ? 'spinning' : ''}`}>{Icons.refresh}</span>
                {syncing ? 'Syncing…' : 'Sync now'}
              </button>
              <button className="btn btn-secondary" onClick={() => setConfirmDelete({ type: 'unlink', workId: work.id })} id="unlink-sheet-btn">
                Unlink
              </button>
            </div>
          </div>
        )}

        {/* Notes (Markdown) */}
        <div className="notes-card">
          <div className="notes-card-head">
            <h3 className="notes-card-title">{Icons.note} Notes</h3>
            <button className="btn btn-secondary" onClick={() => openNotes(work.id)} id="edit-notes-btn">
              {work.notes && work.notes.trim() ? <>{Icons.edit} Edit</> : <>{Icons.plus} Add note</>}
            </button>
          </div>
          {work.notes && work.notes.trim() ? (
            <div className="notes-card-body">
              <Markdown source={work.notes} />
            </div>
          ) : (
            <p className="notes-empty">
              No notes yet. Add notes in <strong>Markdown</strong> to capture context, links, or a checklist for this work.
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="expense-summary">
          <div className="expense-summary-card">
            <div className="label">Rows</div>
            <div className="value" style={{ color: 'var(--accent-blue)' }}>{work.rows.length}</div>
          </div>
          <div className="expense-summary-card">
            <div className="label">Columns</div>
            <div className="value" style={{ color: 'var(--accent-purple)' }}>{work.columns.length}</div>
          </div>
          {numericColumns.map((col, i) => (
            <div className="expense-summary-card" key={col.id}>
              <div className="label">{col.name}</div>
              <div className="value" style={{ color: STAT_ACCENTS[i % STAT_ACCENTS.length] }}>
                {col.type === 'currency'
                  ? formatCurrency(columnTotal(work.rows, col.id))
                  : formatNumber(columnTotal(work.rows, col.id))}
              </div>
            </div>
          ))}
        </div>

        {/* Charts — where the money goes */}
        {work.rows.length > 0 && <WorkCharts key={work.id} work={work} />}

        {/* Toolbar */}
        <div className="table-toolbar">
          <h3 className="expense-list-title">
            Data <span className="expense-count-badge">{work.rows.length}</span>
          </h3>
          <div className="table-toolbar-actions">
            <button className="btn btn-secondary" onClick={() => setShowColumns(work.id)} id="manage-columns-btn">
              {Icons.columns} Manage Columns
            </button>
            {showRowActions && (
              <button
                className="btn btn-primary"
                onClick={() => addRow(work.id)}
                disabled={work.columns.length === 0}
                id="add-row-btn"
              >
                {Icons.plus} Add Row
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        {work.columns.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📐</div>
            <h3>No columns yet</h3>
            <p>Use “Manage Columns” to define the columns for this table.</p>
          </div>
        ) : (
          <>
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    {work.columns.map(col => (
                      <th key={col.id} className={`type-${col.type} ${isSynced(col) ? 'th-synced' : ''}`}>
                        <span className="th-inner">
                          <span className="th-type">{getColumnTypeInfo(col.type).icon}</span>
                          {col.name}
                          {isSynced(col) && (
                            <span className="th-synced-mark" title="Synced from Google Sheet">{Icons.link}</span>
                          )}
                        </span>
                      </th>
                    ))}
                    {showRowActions && <th className="col-actions-head" aria-label="Row actions" />}
                  </tr>
                </thead>
                <tbody>
                  {work.rows.map(row => (
                    <tr key={row.id} id={`row-${row.id}`}>
                      {work.columns.map(col => {
                        const value = row.cells[col.id] ?? null;
                        const readOnly = isSynced(col);
                        if (col.type === 'checkbox') {
                          return (
                            <td key={col.id} className={`data-cell type-checkbox ${readOnly ? 'cell-readonly' : ''}`}>
                              <input
                                type="checkbox"
                                className="cell-checkbox"
                                checked={value === true}
                                disabled={readOnly}
                                onChange={e => { if (!readOnly) updateCell(work.id, row.id, col.id, e.target.checked); }}
                              />
                            </td>
                          );
                        }
                        if (readOnly) {
                          return (
                            <td key={col.id} className={`data-cell type-${col.type} cell-readonly`}>
                              <CellDisplay column={col} value={value} />
                            </td>
                          );
                        }
                        const isEditing = editing?.rowId === row.id && editing?.columnId === col.id;
                        return (
                          <td
                            key={col.id}
                            className={`data-cell type-${col.type} ${isEditing ? 'editing' : ''}`}
                            onClick={() => { if (!isEditing) setEditing({ rowId: row.id, columnId: col.id }); }}
                          >
                            {isEditing ? (
                              <CellEditor
                                column={col}
                                value={value}
                                onCommit={v => { updateCell(work.id, row.id, col.id, v); setEditing(null); }}
                                onCancel={() => setEditing(null)}
                              />
                            ) : (
                              <CellDisplay column={col} value={value} />
                            )}
                          </td>
                        );
                      })}
                      {showRowActions && (
                        <td className="col-actions">
                          <button
                            className="btn-icon danger"
                            onClick={() => deleteRow(work.id, row.id)}
                            aria-label="Delete row"
                          >
                            {Icons.trash}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                {hasNumeric && work.rows.length > 0 && (
                  <tfoot>
                    <tr>
                      {work.columns.map((col, i) => {
                        if (NUMERIC_TYPES.includes(col.type)) {
                          const total = columnTotal(work.rows, col.id);
                          return (
                            <td key={col.id} className={`data-cell type-${col.type} cell-total`}>
                              {col.type === 'currency' ? formatCurrency(total) : formatNumber(total)}
                            </td>
                          );
                        }
                        return (
                          <td key={col.id} className="cell-total">
                            {i === 0 ? 'Total' : ''}
                          </td>
                        );
                      })}
                      {showRowActions && <td className="cell-total" />}
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {work.rows.length === 0 && (
              <div className="empty-state">
                <div className="empty-state-icon">📊</div>
                <h3>No rows yet</h3>
                <p>Click “Add Row” to start entering data into your table.</p>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // ---- Column Manager ----

  const managerWork = showColumns ? getWork(showColumns) : null;

  // ---- Render ----

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <button type="button" className="logo" onClick={() => setView({ type: 'dashboard' })} id="app-logo" aria-label="Go to dashboard">
            <div className="logo-icon">💸</div>
            <span className="logo-text">ExpenseTracker</span>
          </button>
          <div className="header-stats">
            <div className="header-stat">
              <span className="header-stat-label">Works</span>
              <span className="header-stat-value">{totalWorks}</span>
            </div>
            <div className="header-stat">
              <span className="header-stat-label">Total Value</span>
              <span className="header-stat-value">{formatCurrency(grandTotal)}</span>
            </div>
            <div className="header-user">
              <div className="header-avatar" title={user.fullName}>
                {user.fullName.charAt(0).toUpperCase()}
              </div>
              <div className="header-user-info">
                <span className="header-user-name">{user.fullName}</span>
                <span className="header-user-email">{user.email}</span>
              </div>
              <button className="btn-icon" onClick={onLogout} aria-label="Log out" title="Log out" id="logout-btn">
                {Icons.logout}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="main">
        {view.type === 'dashboard' ? renderDashboard() : renderWorkDetail()}
      </main>

      {/* Create Work Modal */}
      {showCreateWork && (
        <Modal title="Create New Work" onClose={() => setShowCreateWork(false)} footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setShowCreateWork(false)}>Cancel</button>
            <button type="submit" form="create-work-form" className="btn btn-primary" id="submit-create-work">Create Work</button>
          </>
        }>
          <form onSubmit={handleCreateWork} id="create-work-form">
            <div className="form-group">
              <label className="form-label" htmlFor="work-name">Work Name</label>
              <input
                className="form-input"
                id="work-name"
                type="text"
                placeholder="e.g. Client Project, Office Expenses"
                value={newWorkName}
                onChange={e => setNewWorkName(e.target.value)}
                autoFocus
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="work-desc">Description (optional)</label>
              <textarea
                className="form-textarea"
                id="work-desc"
                placeholder="Brief description of this work..."
                value={newWorkDesc}
                onChange={e => setNewWorkDesc(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Color</label>
              <div className="color-picker">
                {WORK_COLORS.map(c => (
                  <div
                    key={c}
                    className={`color-swatch ${newWorkColor === c ? 'active' : ''}`}
                    style={{ background: c, color: c }}
                    onClick={() => setNewWorkColor(c)}
                  />
                ))}
              </div>
            </div>
            <p className="hint-text">New works start with <strong>Item</strong>, <strong>Amount</strong> and <strong>Date</strong> columns — customize them anytime.</p>
          </form>
        </Modal>
      )}

      {/* Import from Google Sheets Modal */}
      {showImport && (
        <Modal
          title="Import from Google Sheets"
          onClose={() => { if (!importing) setShowImport(false); }}
          footer={
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setShowImport(false)} disabled={importing}>Cancel</button>
              <button
                type="submit"
                form="import-sheet-form"
                className="btn btn-primary"
                disabled={importing || !importUrl.trim()}
                id="submit-import-sheet"
              >
                {importing ? 'Importing…' : 'Import Sheet'}
              </button>
            </>
          }
        >
          <form onSubmit={handleImportSheet} id="import-sheet-form">
            <div className="form-group">
              <label className="form-label" htmlFor="import-url">Google Sheets URL</label>
              <input
                className="form-input"
                id="import-url"
                type="url"
                placeholder="https://docs.google.com/spreadsheets/d/…"
                value={importUrl}
                onChange={e => { setImportUrl(e.target.value); if (importError) setImportError(null); }}
                autoFocus
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="import-name">Name (optional)</label>
              <input
                className="form-input"
                id="import-name"
                type="text"
                placeholder="Imported Sheet"
                value={importName}
                onChange={e => setImportName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Color</label>
              <div className="color-picker">
                {WORK_COLORS.map(c => (
                  <div
                    key={c}
                    className={`color-swatch ${importColor === c ? 'active' : ''}`}
                    style={{ background: c, color: c }}
                    onClick={() => setImportColor(c)}
                  />
                ))}
              </div>
            </div>
            {importError && <p className="import-error">{importError}</p>}
            <p className="hint-text">
              The sheet must be shared as <strong>“Anyone with the link”</strong> (or published via File → Share → Publish to web).
              Its columns and rows are mirrored here and <strong>refresh every 5 minutes</strong> while this app is open.
              You can add your own extra columns afterwards — they stay editable and are kept on each refresh.
            </p>
          </form>
        </Modal>
      )}

      {/* Edit Work Modal */}
      {showEditWork && (
        <Modal title="Edit Work" onClose={() => setShowEditWork(null)} footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setShowEditWork(null)}>Cancel</button>
            <button type="submit" form="edit-work-form" className="btn btn-primary" id="submit-edit-work">Save Changes</button>
          </>
        }>
          <form onSubmit={handleEditWork} id="edit-work-form">
            <div className="form-group">
              <label className="form-label" htmlFor="edit-work-name">Work Name</label>
              <input
                className="form-input"
                id="edit-work-name"
                type="text"
                value={editWorkName}
                onChange={e => setEditWorkName(e.target.value)}
                autoFocus
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="edit-work-desc">Description</label>
              <textarea
                className="form-textarea"
                id="edit-work-desc"
                value={editWorkDesc}
                onChange={e => setEditWorkDesc(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Color</label>
              <div className="color-picker">
                {WORK_COLORS.map(c => (
                  <div
                    key={c}
                    className={`color-swatch ${editWorkColor === c ? 'active' : ''}`}
                    style={{ background: c, color: c }}
                    onClick={() => setEditWorkColor(c)}
                  />
                ))}
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* Notes Modal (Markdown editor + preview) */}
      {showNotes && (
        <Modal
          title="Notes"
          wide
          onClose={() => setShowNotes(null)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowNotes(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveNotes} id="save-notes-btn">Save Notes</button>
            </>
          }
        >
          <div className="notes-editor">
            <div className="notes-tabs" role="tablist" aria-label="Notes editor mode">
              <button
                type="button"
                role="tab"
                aria-selected={notesTab === 'write'}
                className={`notes-tab ${notesTab === 'write' ? 'active' : ''}`}
                onClick={() => setNotesTab('write')}
              >
                Write
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={notesTab === 'preview'}
                className={`notes-tab ${notesTab === 'preview' ? 'active' : ''}`}
                onClick={() => setNotesTab('preview')}
              >
                Preview
              </button>
            </div>

            {notesTab === 'write' ? (
              <textarea
                className="form-textarea notes-textarea"
                id="notes-textarea"
                value={notesDraft}
                onChange={e => setNotesDraft(e.target.value)}
                placeholder={"# Notes for this work\n\n**Bold**, *italic*, `code`\n\n- First point\n- Second point\n\n> A quote or reminder\n\n[Reference link](https://example.com)"}
                autoFocus
              />
            ) : (
              <div className="notes-preview">
                {notesDraft.trim() ? (
                  <Markdown source={notesDraft} />
                ) : (
                  <p className="notes-empty">Nothing to preview yet — switch to “Write” and jot something down.</p>
                )}
              </div>
            )}
          </div>
          <p className="hint-text">
            Supports Markdown — headings, <strong>**bold**</strong>, <em>*italic*</em>, <code>`code`</code>,
            lists, &gt; quotes, links, and <code>```</code> code blocks.
          </p>
        </Modal>
      )}

      {/* Column Manager Modal */}
      {managerWork && (
        <Modal title="Manage Columns" wide onClose={() => setShowColumns(null)} footer={
          <button className="btn btn-primary" onClick={() => setShowColumns(null)}>Done</button>
        }>
          <div className="col-manager-list">
            {managerWork.sheet && (
              <p className="hint-text col-manager-hint">
                {Icons.link} Columns tagged <strong>sheet</strong> are synced from Google Sheets and locked. Columns you add below are yours — editable and kept on every refresh.
              </p>
            )}
            {managerWork.columns.map((col, i) => {
              const locked = isSynced(col);
              const prevLocked = i > 0 && isSynced(managerWork.columns[i - 1]);
              const nextLocked = i < managerWork.columns.length - 1 && isSynced(managerWork.columns[i + 1]);
              return (
                <div className={`col-manager-item ${locked ? 'col-locked' : ''}`} key={col.id}>
                  <span className="type-badge" title={getColumnTypeInfo(col.type).label}>
                    {getColumnTypeInfo(col.type).icon}
                  </span>
                  <input
                    className="form-input"
                    value={col.name}
                    disabled={locked}
                    onChange={e => updateColumn(managerWork.id, col.id, { name: e.target.value })}
                    aria-label="Column name"
                  />
                  {col.type === 'select' && (
                    <input
                      className="form-input"
                      placeholder="Options, comma-separated"
                      value={(col.options ?? []).join(', ')}
                      disabled={locked}
                      onChange={e => updateColumn(managerWork.id, col.id, { options: parseOptions(e.target.value) })}
                      aria-label="Dropdown options"
                    />
                  )}
                  {locked && <span className="col-sheet-tag">{Icons.link} sheet</span>}
                  <div className="col-manager-actions">
                    <button className="btn-icon" disabled={i === 0 || locked || prevLocked} onClick={() => moveColumn(managerWork.id, col.id, 'left')} aria-label="Move left">
                      {Icons.up}
                    </button>
                    <button className="btn-icon" disabled={i === managerWork.columns.length - 1 || locked || nextLocked} onClick={() => moveColumn(managerWork.id, col.id, 'right')} aria-label="Move right">
                      {Icons.down}
                    </button>
                    <button className="btn-icon danger" disabled={locked} onClick={() => setConfirmDelete({ type: 'column', workId: managerWork.id, columnId: col.id })} aria-label="Delete column">
                      {Icons.trash}
                    </button>
                  </div>
                </div>
              );
            })}
            {managerWork.columns.length === 0 && (
              <p className="hint-text">No columns yet. Add one below to get started.</p>
            )}
          </div>

          <div className="col-add-form">
            <div className="form-group">
              <label className="form-label" htmlFor="new-col-name">New Column</label>
              <input
                className="form-input"
                id="new-col-name"
                type="text"
                placeholder="Column name"
                value={newColName}
                onChange={e => setNewColName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddColumn(); } }}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="new-col-type">Type</label>
              <select
                className="form-select"
                id="new-col-type"
                value={newColType}
                onChange={e => setNewColType(e.target.value as ColumnType)}
              >
                {COLUMN_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                ))}
              </select>
            </div>
            {newColType === 'select' && (
              <div className="form-group">
                <label className="form-label" htmlFor="new-col-options">Options</label>
                <input
                  className="form-input"
                  id="new-col-options"
                  type="text"
                  placeholder="e.g. Low, Medium, High"
                  value={newColOptions}
                  onChange={e => setNewColOptions(e.target.value)}
                />
              </div>
            )}
            <button className="btn btn-primary col-add-btn" onClick={handleAddColumn} id="add-column-btn">
              {Icons.plus} Add Column
            </button>
          </div>
        </Modal>
      )}

      {/* Confirm Delete / Unlink Modal */}
      {confirmDelete && (
        <Modal
          title={
            confirmDelete.type === 'work'
              ? 'Delete Work'
              : confirmDelete.type === 'unlink'
                ? 'Unlink Google Sheet'
                : 'Delete Column'
          }
          onClose={() => setConfirmDelete(null)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>Cancel</button>
              {confirmDelete.type === 'unlink' ? (
                <button className="btn btn-primary" onClick={handleConfirmDelete} id="confirm-delete-btn">Unlink</button>
              ) : (
                <button className="btn btn-danger" onClick={handleConfirmDelete} id="confirm-delete-btn">Delete</button>
              )}
            </>
          }
        >
          <p className="confirm-text">
            {confirmDelete.type === 'work' ? (
              <>Are you sure you want to delete this work? <strong>All rows and columns inside it will also be deleted.</strong> This action cannot be undone.</>
            ) : confirmDelete.type === 'unlink' ? (
              <>This stops syncing with Google Sheets. The current columns and data stay, and <strong>every column becomes editable</strong> — you can add and delete rows again. You can’t re-link automatically afterwards.</>
            ) : (
              <>Are you sure you want to delete this column? <strong>Its data will be removed from every row.</strong> This action cannot be undone.</>
            )}
          </p>
        </Modal>
      )}
    </div>
  );
}
