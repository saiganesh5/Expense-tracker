import { useState, type FormEvent } from 'react';
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
  '#f43f5e', // rose
  '#10b981', // emerald
  '#f59e0b', // amber
  '#f97316', // orange
  '#06b6d4', // cyan
  '#a855f7', // purple
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className={`bg-[#121217] border border-white/10 rounded-2xl w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-scale-in`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <h2 className="text-base font-semibold text-white tracking-tight">{title}</h2>
          <button className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer" onClick={onClose} aria-label="Close modal">
            {Icons.close}
          </button>
        </div>
        <div className="p-6 overflow-y-auto space-y-4">{children}</div>
        {footer && <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10 bg-white/[0.02]">{footer}</div>}
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
      return isEmpty ? <span className="text-slate-500 font-mono">—</span> : <>{formatCurrency(toNumber(value))}</>;
    case 'number':
      return isEmpty ? <span className="text-slate-500 font-mono">—</span> : <>{formatNumber(toNumber(value))}</>;
    case 'date':
      return isEmpty ? <span className="text-slate-500 font-mono">—</span> : <>{formatDate(String(value))}</>;
    case 'select':
      return isEmpty ? <span className="text-slate-500 font-mono">—</span> : <span className="inline-block px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-300 border border-violet-500/20 text-[11px] font-medium">{String(value)}</span>;
    default:
      return isEmpty ? <span className="text-slate-500 font-mono">—</span> : <>{String(value)}</>;
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
        className="w-full bg-[#18181f] border border-violet-500 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-violet-500 cursor-pointer"
        autoFocus
        value={draft}
        onChange={e => onCommit(e.target.value)}
        onBlur={onCancel}
        onKeyDown={handleKey}
      >
        <option value="">—</option>
        {(column.options ?? []).map(opt => (
          <option key={opt} value={opt} className="bg-[#18181f] text-white">
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
      className="w-full bg-[#18181f] border border-violet-500 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
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
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Your <span className="text-violet-400">Works</span>
          </h1>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-[#121217] border border-white/10 rounded-2xl p-5 flex items-center gap-4 shadow-lg hover:border-white/20 transition-colors">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 bg-violet-500/10 text-violet-400">
              📁
            </div>
            <div className="flex flex-col">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Total Works</h3>
              <div className="text-xl font-bold text-white font-mono tabular-nums">{totalWorks}</div>
            </div>
          </div>
          <div className="bg-[#121217] border border-white/10 rounded-2xl p-5 flex items-center gap-4 shadow-lg hover:border-white/20 transition-colors">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 bg-blue-500/10 text-blue-400">
              📝
            </div>
            <div className="flex flex-col">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Total Entries</h3>
              <div className="text-xl font-bold text-white font-mono tabular-nums">{totalRows}</div>
            </div>
          </div>
          <div className="bg-[#121217] border border-white/10 rounded-2xl p-5 flex items-center gap-4 shadow-lg hover:border-white/20 transition-colors">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 bg-rose-500/10 text-rose-400">
              💰
            </div>
            <div className="flex flex-col">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Total Value</h3>
              <div className="text-xl font-bold text-white font-mono tabular-nums">{formatCurrency(grandTotal)}</div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">All Works</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <button type="button" className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 border-dashed border-white/15 bg-white/[0.02] hover:bg-white/[0.04] hover:border-violet-500/50 text-slate-300 hover:text-white transition-all duration-200 cursor-pointer group min-h-[190px]" onClick={() => setShowCreateWork(true)} id="create-work-btn">
            <div className="w-10 h-10 rounded-xl bg-violet-600/10 text-violet-400 flex items-center justify-center group-hover:scale-110 group-hover:bg-violet-600 group-hover:text-white transition-all">{Icons.plus}</div>
            <span className="text-sm font-semibold">Create New Work</span>
          </button>

          <button type="button" className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 border-dashed border-emerald-500/25 bg-emerald-500/[0.02] hover:bg-emerald-500/[0.05] hover:border-emerald-500/50 text-emerald-300 hover:text-emerald-200 transition-all duration-200 cursor-pointer group min-h-[190px]" onClick={() => setShowImport(true)} id="import-sheet-btn">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all">{Icons.link}</div>
            <span className="text-sm font-semibold">Import from Google Sheets</span>
          </button>

          {works.map((work, i) => {
            const firstCurrency = work.columns.find(c => c.type === 'currency');
            const workTotal = firstCurrency ? columnTotal(work.rows, firstCurrency.id) : null;
            return (
              <div
                role="button"
                tabIndex={0}
                className="relative bg-[#121217] border border-white/10 rounded-2xl p-5 shadow-lg hover:border-white/20 hover:shadow-xl transition-all duration-200 flex flex-col justify-between cursor-pointer group min-h-[190px]"
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
                <div className="absolute top-0 left-5 right-5 h-[2px] rounded-t opacity-80 group-hover:opacity-100 transition-opacity" style={{ background: work.color }} />
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-inner" style={{ background: work.color }}>
                      {work.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                      <button
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                        onClick={e => { e.stopPropagation(); openEditWork(work.id); }}
                        aria-label="Edit work"
                      >
                        {Icons.edit}
                      </button>
                      <button
                        className="p-1.5 rounded-lg text-rose-400/80 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        onClick={e => { e.stopPropagation(); setConfirmDelete({ type: 'work', workId: work.id }); }}
                        aria-label="Delete work"
                      >
                        {Icons.trash}
                      </button>
                    </div>
                  </div>
                  <h3 className="text-base font-semibold text-white mb-1 truncate">{work.name}</h3>
                  <p className="text-xs text-slate-400 line-clamp-2 mb-3">{work.description || 'No description'}</p>
                  {work.sheet && (
                    <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md mb-3 self-start">
                      {Icons.link} Google Sheet
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/5">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Rows</span>
                    <span className="text-xs font-bold text-slate-200 font-mono tabular-nums">{work.rows.length}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Total</span>
                    <span className="text-xs font-bold text-slate-200 font-mono tabular-nums truncate">{workTotal === null ? '—' : formatCurrency(workTotal)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Created</span>
                    <span className="text-xs font-bold text-slate-200 font-mono tabular-nums">{formatDate(work.createdAt)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {works.length === 0 && (
          <div className="text-center py-16 px-4 bg-[#121217] border border-white/10 rounded-2xl my-6 flex flex-col items-center justify-center">
            <div className="text-4xl mb-3">🚀</div>
            <h3 className="text-base font-semibold text-white mb-1">Start tracking your data</h3>
            <p className="text-xs text-slate-400 max-w-sm">Create your first Work to begin building your own table with custom columns.</p>
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
        <div className="text-center py-16 px-4 bg-[#121217] border border-white/10 rounded-2xl my-6 flex flex-col items-center justify-center">
          <div className="text-4xl mb-3">🔍</div>
          <h3 className="text-base font-semibold text-white mb-1">Work not found</h3>
          <p className="text-xs text-slate-400 max-w-sm">This work no longer exists.</p>
          <button className="inline-flex items-center gap-2 px-4 py-2 mt-4 text-sm font-medium rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-colors cursor-pointer" onClick={() => setView({ type: 'dashboard' })}>
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
      <div className="animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer" onClick={() => setView({ type: 'dashboard' })} id="back-to-dashboard">
            {Icons.back} Back
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5 truncate">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ background: work.color }} />
              {work.name}
            </h1>
            {work.description && <p className="text-xs text-slate-400 mt-1 truncate">{work.description}</p>}
          </div>
        </div>

        {/* Google Sheet sync bar */}
        {work.sheet && (
          <div className={`flex items-center justify-between flex-wrap gap-3 p-3.5 rounded-xl border mb-6 ${work.sheet.lastError ? 'bg-rose-500/10 border-rose-500/20 text-rose-300' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'}`}>
            <div className="flex items-center gap-2 text-xs font-medium">
              <span className="shrink-0">{Icons.link}</span>
              <span>
                {work.sheet.lastError
                  ? `Sync failed — ${work.sheet.lastError}`
                  : work.sheet.lastSyncedAt
                    ? `Synced from Google Sheets · Updated ${formatTime(work.sheet.lastSyncedAt)}`
                    : 'Synced from Google Sheets'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/15 text-white transition-colors cursor-pointer disabled:opacity-50" onClick={() => refreshSheet(work.id)} disabled={syncing} id="sync-now-btn">
                <span className={`inline-block shrink-0 ${syncing ? 'animate-spin' : ''}`}>{Icons.refresh}</span>
                {syncing ? 'Syncing…' : 'Sync now'}
              </button>
              <button className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer" onClick={() => setConfirmDelete({ type: 'unlink', workId: work.id })} id="unlink-sheet-btn">
                Unlink
              </button>
            </div>
          </div>
        )}

        {/* Notes (Markdown) */}
        <div className="bg-[#121217] border border-white/10 rounded-2xl p-5 mb-6 shadow-lg">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
              <span className="text-violet-400">{Icons.note}</span> Notes
            </h3>
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer" onClick={() => openNotes(work.id)} id="edit-notes-btn">
              {work.notes && work.notes.trim() ? <>{Icons.edit} Edit</> : <>{Icons.plus} Add note</>}
            </button>
          </div>
          {work.notes && work.notes.trim() ? (
            <div className="bg-black/30 border border-white/5 rounded-xl p-4 max-h-60 overflow-y-auto">
              <Markdown source={work.notes} />
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-1">
              No notes yet. Add notes in <strong className="text-white">Markdown</strong> to capture context, links, or a checklist for this work.
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 mb-6">
          <div className="bg-[#121217] border border-white/10 rounded-xl p-3.5 shadow-sm">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 truncate">Rows</div>
            <div className="text-base font-bold font-mono tabular-nums text-blue-400 truncate">{work.rows.length}</div>
          </div>
          <div className="bg-[#121217] border border-white/10 rounded-xl p-3.5 shadow-sm">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 truncate">Columns</div>
            <div className="text-base font-bold font-mono tabular-nums text-violet-400 truncate">{work.columns.length}</div>
          </div>
          {numericColumns.map((col, i) => (
            <div className="bg-[#121217] border border-white/10 rounded-xl p-3.5 shadow-sm" key={col.id}>
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 truncate">{col.name}</div>
              <div className="text-base font-bold font-mono tabular-nums truncate" style={{ color: STAT_ACCENTS[i % STAT_ACCENTS.length] }}>
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
        <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            Data <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-slate-300 font-mono">{work.rows.length}</span>
          </h3>
          <div className="flex items-center gap-2.5">
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer" onClick={() => setShowColumns(work.id)} id="manage-columns-btn">
              {Icons.columns} Manage Columns
            </button>
            {showRowActions && (
              <button
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-violet-600 hover:bg-violet-500 text-white shadow-md shadow-violet-900/30 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
          <div className="text-center py-16 px-4 bg-[#121217] border border-white/10 rounded-2xl my-6 flex flex-col items-center justify-center">
            <div className="text-4xl mb-3">📐</div>
            <h3 className="text-base font-semibold text-white mb-1">No columns yet</h3>
            <p className="text-xs text-slate-400 max-w-sm">Use “Manage Columns” to define the columns for this table.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#121217] shadow-xl">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr>
                    {work.columns.map(col => (
                      <th key={col.id} className={`sticky top-0 bg-[#16161d] text-slate-300 font-semibold text-[11px] tracking-wider uppercase px-4 py-3 border-b border-white/10 whitespace-nowrap ${col.type === 'currency' || col.type === 'number' ? 'text-right' : col.type === 'checkbox' ? 'text-center w-12' : ''}`}>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="text-slate-500">{getColumnTypeInfo(col.type).icon}</span>
                          {col.name}
                          {isSynced(col) && (
                            <span className="text-emerald-400" title="Synced from Google Sheet">{Icons.link}</span>
                          )}
                        </span>
                      </th>
                    ))}
                    {showRowActions && <th className="sticky top-0 bg-[#16161d] border-b border-white/10 w-12 text-center" aria-label="Row actions" />}
                  </tr>
                </thead>
                <tbody>
                  {work.rows.map(row => (
                    <tr key={row.id} id={`row-${row.id}`} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                      {work.columns.map(col => {
                        const value = row.cells[col.id] ?? null;
                        const readOnly = isSynced(col);
                        if (col.type === 'checkbox') {
                          return (
                            <td key={col.id} className={`px-4 py-3 text-center align-middle ${readOnly ? 'opacity-70 cursor-default' : ''}`}>
                              <input
                                type="checkbox"
                                className="w-4 h-4 rounded border-white/20 bg-black/40 text-violet-600 focus:ring-violet-500 focus:ring-offset-0 cursor-pointer disabled:cursor-default"
                                checked={value === true}
                                disabled={readOnly}
                                onChange={e => { if (!readOnly) updateCell(work.id, row.id, col.id, e.target.checked); }}
                              />
                            </td>
                          );
                        }
                        if (readOnly) {
                          return (
                            <td key={col.id} className={`px-4 py-3 align-middle text-slate-400 cursor-default ${col.type === 'currency' || col.type === 'number' ? 'text-right font-mono tabular-nums' : ''}`}>
                              <CellDisplay column={col} value={value} />
                            </td>
                          );
                        }
                        const isEditing = editing?.rowId === row.id && editing?.columnId === col.id;
                        return (
                          <td
                            key={col.id}
                            className={`px-4 py-3 align-middle transition-colors cursor-pointer hover:bg-white/[0.04] ${col.type === 'currency' || col.type === 'number' ? 'text-right font-mono tabular-nums' : ''} ${isEditing ? 'p-1 bg-black/70' : ''}`}
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
                        <td className="w-12 text-center px-2 py-1 align-middle">
                          <button
                            className="p-1.5 rounded-lg text-rose-400/70 hover:text-rose-300 hover:bg-rose-500/10 transition-colors opacity-40 group-hover:opacity-100 cursor-pointer"
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
                    <tr className="bg-[#16161d]/90 border-t-2 border-white/10 font-semibold text-white">
                      {work.columns.map((col, i) => {
                        if (NUMERIC_TYPES.includes(col.type)) {
                          const total = columnTotal(work.rows, col.id);
                          return (
                            <td key={col.id} className="px-4 py-3 text-right font-mono tabular-nums text-xs font-bold text-white">
                              {col.type === 'currency' ? formatCurrency(total) : formatNumber(total)}
                            </td>
                          );
                        }
                        return (
                          <td key={col.id} className="px-4 py-3 text-xs font-bold text-slate-300">
                            {i === 0 ? 'Total' : ''}
                          </td>
                        );
                      })}
                      {showRowActions && <td className="px-4 py-3" />}
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {work.rows.length === 0 && (
              <div className="text-center py-16 px-4 bg-[#121217] border border-white/10 rounded-2xl my-6 flex flex-col items-center justify-center">
                <div className="text-4xl mb-3">📊</div>
                <h3 className="text-base font-semibold text-white mb-1">No rows yet</h3>
                <p className="text-xs text-slate-400 max-w-sm">Click “Add Row” to start entering data into your table.</p>
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
    <div className="min-h-screen bg-[#09090d] text-slate-100 flex flex-col font-sans">
      <header className="sticky top-0 z-40 bg-[#0c0c10]/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <button type="button" className="flex items-center gap-2.5 text-white font-semibold text-base tracking-tight hover:opacity-90 transition-opacity bg-transparent border-none cursor-pointer p-0" onClick={() => setView({ type: 'dashboard' })} id="app-logo" aria-label="Go to dashboard">
            <div className="w-8 h-8 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-lg">💸</div>
            <span className="font-bold text-white tracking-tight">ExpenseTracker</span>
          </button>
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Works</span>
              <span className="text-xs font-bold text-white font-mono tabular-nums">{totalWorks}</span>
            </div>
            <div className="hidden md:flex flex-col items-end">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Total Value</span>
              <span className="text-xs font-bold text-white font-mono tabular-nums">{formatCurrency(grandTotal)}</span>
            </div>
            <div className="flex items-center gap-3 pl-4 border-l border-white/10">
              <div className="w-8 h-8 rounded-full bg-violet-600/30 border border-violet-500/40 text-violet-300 font-semibold text-xs flex items-center justify-center" title={user.fullName}>
                {user.fullName.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-semibold text-white leading-tight">{user.fullName}</span>
                <span className="text-[11px] text-slate-400 leading-tight truncate max-w-[140px]">{user.email}</span>
              </div>
              <button className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer" onClick={onLogout} aria-label="Log out" title="Log out" id="logout-btn">
                {Icons.logout}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {view.type === 'dashboard' ? renderDashboard() : renderWorkDetail()}
      </main>

      {/* Create Work Modal */}
      {showCreateWork && (
        <Modal title="Create New Work" onClose={() => setShowCreateWork(false)} footer={
          <>
            <button type="button" className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors cursor-pointer" onClick={() => setShowCreateWork(false)}>Cancel</button>
            <button type="submit" form="create-work-form" className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-xl bg-violet-600 hover:bg-violet-500 text-white shadow-md shadow-violet-900/30 transition-colors cursor-pointer" id="submit-create-work">Create Work</button>
          </>
        }>
          <form onSubmit={handleCreateWork} id="create-work-form" className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300 tracking-wide uppercase" htmlFor="work-name">Work Name</label>
              <input
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
                id="work-name"
                type="text"
                placeholder="e.g. Client Project, Office Expenses"
                value={newWorkName}
                onChange={e => setNewWorkName(e.target.value)}
                autoFocus
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300 tracking-wide uppercase" htmlFor="work-desc">Description (optional)</label>
              <textarea
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors resize-y min-h-[80px]"
                id="work-desc"
                placeholder="Brief description of this work..."
                value={newWorkDesc}
                onChange={e => setNewWorkDesc(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300 tracking-wide uppercase">Color</label>
              <div className="flex items-center gap-2 flex-wrap pt-1">
                {WORK_COLORS.map(c => (
                  <div
                    key={c}
                    className={`w-7 h-7 rounded-full cursor-pointer transition-transform duration-150 hover:scale-110 flex items-center justify-center border-2 ${newWorkColor === c ? 'border-white ring-2 ring-violet-500 ring-offset-2 ring-offset-[#121217] scale-110' : 'border-transparent opacity-80 hover:opacity-100'}`}
                    style={{ background: c }}
                    onClick={() => setNewWorkColor(c)}
                  />
                ))}
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">New works start with <strong className="text-white">Item</strong>, <strong className="text-white">Amount</strong> and <strong className="text-white">Date</strong> columns — customize them anytime.</p>
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
              <button type="button" className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors cursor-pointer disabled:opacity-50" onClick={() => setShowImport(false)} disabled={importing}>Cancel</button>
              <button
                type="submit"
                form="import-sheet-form"
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/30 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={importing || !importUrl.trim()}
                id="submit-import-sheet"
              >
                {importing ? 'Importing…' : 'Import Sheet'}
              </button>
            </>
          }
        >
          <form onSubmit={handleImportSheet} id="import-sheet-form" className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300 tracking-wide uppercase" htmlFor="import-url">Google Sheets URL</label>
              <input
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
                id="import-url"
                type="url"
                placeholder="https://docs.google.com/spreadsheets/d/…"
                value={importUrl}
                onChange={e => { setImportUrl(e.target.value); if (importError) setImportError(null); }}
                autoFocus
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300 tracking-wide uppercase" htmlFor="import-name">Name (optional)</label>
              <input
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
                id="import-name"
                type="text"
                placeholder="Imported Sheet"
                value={importName}
                onChange={e => setImportName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300 tracking-wide uppercase">Color</label>
              <div className="flex items-center gap-2 flex-wrap pt-1">
                {WORK_COLORS.map(c => (
                  <div
                    key={c}
                    className={`w-7 h-7 rounded-full cursor-pointer transition-transform duration-150 hover:scale-110 flex items-center justify-center border-2 ${importColor === c ? 'border-white ring-2 ring-emerald-500 ring-offset-2 ring-offset-[#121217] scale-110' : 'border-transparent opacity-80 hover:opacity-100'}`}
                    style={{ background: c }}
                    onClick={() => setImportColor(c)}
                  />
                ))}
              </div>
            </div>
            {importError && <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">{importError}</p>}
            <p className="text-xs text-slate-400 leading-relaxed">
              The sheet must be shared as <strong className="text-white">“Anyone with the link”</strong> (or published via File → Share → Publish to web).
              Its columns and rows are mirrored here and <strong className="text-white">refresh every 5 minutes</strong> while this app is open.
              You can add your own extra columns afterwards — they stay editable and are kept on each refresh.
            </p>
          </form>
        </Modal>
      )}

      {/* Edit Work Modal */}
      {showEditWork && (
        <Modal title="Edit Work" onClose={() => setShowEditWork(null)} footer={
          <>
            <button type="button" className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors cursor-pointer" onClick={() => setShowEditWork(null)}>Cancel</button>
            <button type="submit" form="edit-work-form" className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-xl bg-violet-600 hover:bg-violet-500 text-white shadow-md shadow-violet-900/30 transition-colors cursor-pointer" id="submit-edit-work">Save Changes</button>
          </>
        }>
          <form onSubmit={handleEditWork} id="edit-work-form" className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300 tracking-wide uppercase" htmlFor="edit-work-name">Work Name</label>
              <input
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
                id="edit-work-name"
                type="text"
                value={editWorkName}
                onChange={e => setEditWorkName(e.target.value)}
                autoFocus
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300 tracking-wide uppercase" htmlFor="edit-work-desc">Description</label>
              <textarea
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors resize-y min-h-[80px]"
                id="edit-work-desc"
                value={editWorkDesc}
                onChange={e => setEditWorkDesc(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300 tracking-wide uppercase">Color</label>
              <div className="flex items-center gap-2 flex-wrap pt-1">
                {WORK_COLORS.map(c => (
                  <div
                    key={c}
                    className={`w-7 h-7 rounded-full cursor-pointer transition-transform duration-150 hover:scale-110 flex items-center justify-center border-2 ${editWorkColor === c ? 'border-white ring-2 ring-violet-500 ring-offset-2 ring-offset-[#121217] scale-110' : 'border-transparent opacity-80 hover:opacity-100'}`}
                    style={{ background: c }}
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
              <button className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors cursor-pointer" onClick={() => setShowNotes(null)}>Cancel</button>
              <button className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-xl bg-violet-600 hover:bg-violet-500 text-white shadow-md shadow-violet-900/30 transition-colors cursor-pointer" onClick={handleSaveNotes} id="save-notes-btn">Save Notes</button>
            </>
          }
        >
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-1 p-1 bg-black/40 border border-white/10 rounded-xl" role="tablist" aria-label="Notes editor mode">
              <button
                type="button"
                role="tab"
                aria-selected={notesTab === 'write'}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${notesTab === 'write' ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                onClick={() => setNotesTab('write')}
              >
                Write
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={notesTab === 'preview'}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${notesTab === 'preview' ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                onClick={() => setNotesTab('preview')}
              >
                Preview
              </button>
            </div>

            {notesTab === 'write' ? (
              <textarea
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors resize-y min-h-[220px]"
                id="notes-textarea"
                value={notesDraft}
                onChange={e => setNotesDraft(e.target.value)}
                placeholder={"# Notes for this work\n\n**Bold**, *italic*, `code`\n\n- First point\n- Second point\n\n> A quote or reminder\n\n[Reference link](https://example.com)"}
                autoFocus
              />
            ) : (
              <div className="min-h-[220px] p-4 bg-black/30 border border-white/10 rounded-xl overflow-y-auto max-h-[350px]">
                {notesDraft.trim() ? (
                  <Markdown source={notesDraft} />
                ) : (
                  <p className="text-xs text-slate-400 py-1">Nothing to preview yet — switch to “Write” and jot something down.</p>
                )}
              </div>
            )}
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Supports Markdown — headings, <strong className="text-white">**bold**</strong>, <em className="text-white">*italic*</em>, <code className="bg-white/10 text-violet-300 font-mono text-xs px-1 rounded">`code`</code>,
            lists, &gt; quotes, links, and <code className="bg-white/10 text-violet-300 font-mono text-xs px-1 rounded">```</code> code blocks.
          </p>
        </Modal>
      )}

      {/* Column Manager Modal */}
      {managerWork && (
        <Modal title="Manage Columns" wide onClose={() => setShowColumns(null)} footer={
          <button className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-xl bg-violet-600 hover:bg-violet-500 text-white shadow-md shadow-violet-900/30 transition-colors cursor-pointer" onClick={() => setShowColumns(null)}>Done</button>
        }>
          <div className="space-y-2.5 max-h-[40vh] overflow-y-auto pr-1">
            {managerWork.sheet && (
              <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-center gap-1.5 leading-relaxed">
                <span className="shrink-0">{Icons.link}</span> Columns tagged <strong className="font-semibold text-white">sheet</strong> are synced from Google Sheets and locked. Columns you add below are yours — editable and kept on every refresh.
              </p>
            )}
            {managerWork.columns.map((col, i) => {
              const locked = isSynced(col);
              const prevLocked = i > 0 && isSynced(managerWork.columns[i - 1]);
              const nextLocked = i < managerWork.columns.length - 1 && isSynced(managerWork.columns[i + 1]);
              return (
                <div className={`flex items-center gap-2.5 p-2.5 bg-black/40 border border-white/10 rounded-xl ${locked ? 'opacity-80' : ''}`} key={col.id}>
                  <span className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-xs shrink-0 text-slate-400" title={getColumnTypeInfo(col.type).label}>
                    {getColumnTypeInfo(col.type).icon}
                  </span>
                  <input
                    className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 disabled:opacity-60 disabled:cursor-not-allowed"
                    value={col.name}
                    disabled={locked}
                    onChange={e => updateColumn(managerWork.id, col.id, { name: e.target.value })}
                    aria-label="Column name"
                  />
                  {col.type === 'select' && (
                    <input
                      className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 disabled:opacity-60 disabled:cursor-not-allowed"
                      placeholder="Options, comma-separated"
                      value={(col.options ?? []).join(', ')}
                      disabled={locked}
                      onChange={e => updateColumn(managerWork.id, col.id, { options: parseOptions(e.target.value) })}
                      aria-label="Dropdown options"
                    />
                  )}
                  {locked && <span className="text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0">{Icons.link} sheet</span>}
                  <div className="flex items-center gap-1 shrink-0">
                    <button className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed" disabled={i === 0 || locked || prevLocked} onClick={() => moveColumn(managerWork.id, col.id, 'left')} aria-label="Move left">
                      {Icons.up}
                    </button>
                    <button className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed" disabled={i === managerWork.columns.length - 1 || locked || nextLocked} onClick={() => moveColumn(managerWork.id, col.id, 'right')} aria-label="Move right">
                      {Icons.down}
                    </button>
                    <button className="p-1.5 rounded-lg text-rose-400/80 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed" disabled={locked} onClick={() => setConfirmDelete({ type: 'column', workId: managerWork.id, columnId: col.id })} aria-label="Delete column">
                      {Icons.trash}
                    </button>
                  </div>
                </div>
              );
            })}
            {managerWork.columns.length === 0 && (
              <p className="text-xs text-slate-400">No columns yet. Add one below to get started.</p>
            )}
          </div>

          <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row gap-2.5 items-end">
            <div className="flex-1 w-full flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider" htmlFor="new-col-name">New Column</label>
              <input
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                id="new-col-name"
                type="text"
                placeholder="Column name"
                value={newColName}
                onChange={e => setNewColName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddColumn(); } }}
              />
            </div>
            <div className="w-full sm:w-36 flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider" htmlFor="new-col-type">Type</label>
              <select
                className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500 cursor-pointer"
                id="new-col-type"
                value={newColType}
                onChange={e => setNewColType(e.target.value as ColumnType)}
              >
                {COLUMN_TYPES.map(t => (
                  <option key={t.value} value={t.value} className="bg-[#18181f] text-white">{t.icon} {t.label}</option>
                ))}
              </select>
            </div>
            {newColType === 'select' && (
              <div className="flex-1 w-full flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider" htmlFor="new-col-options">Options</label>
                <input
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                  id="new-col-options"
                  type="text"
                  placeholder="e.g. Low, Medium, High"
                  value={newColOptions}
                  onChange={e => setNewColOptions(e.target.value)}
                />
              </div>
            )}
            <button className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white transition-colors cursor-pointer shrink-0" onClick={handleAddColumn} id="add-column-btn">
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
              <button className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors cursor-pointer" onClick={() => setConfirmDelete(null)}>Cancel</button>
              {confirmDelete.type === 'unlink' ? (
                <button className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-xl bg-violet-600 hover:bg-violet-500 text-white shadow-md shadow-violet-900/30 transition-colors cursor-pointer" onClick={handleConfirmDelete} id="confirm-delete-btn">Unlink</button>
              ) : (
                <button className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-900/30 transition-colors cursor-pointer" onClick={handleConfirmDelete} id="confirm-delete-btn">Delete</button>
              )}
            </>
          }
        >
          <p className="text-sm text-slate-300 leading-relaxed">
            {confirmDelete.type === 'work' ? (
              <>Are you sure you want to delete this work? <strong className="text-white">All rows and columns inside it will also be deleted.</strong> This action cannot be undone.</>
            ) : confirmDelete.type === 'unlink' ? (
              <>This stops syncing with Google Sheets. The current columns and data stay, and <strong className="text-white">every column becomes editable</strong> — you can add and delete rows again. You can’t re-link automatically afterwards.</>
            ) : (
              <>Are you sure you want to delete this column? <strong className="text-white">Its data will be removed from every row.</strong> This action cannot be undone.</>
            )}
          </p>
        </Modal>
      )}
    </div>
  );
}
