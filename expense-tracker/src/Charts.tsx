import { useMemo, useState } from 'react';
import type { Work, Column, CellValue } from './types';
import { NUMERIC_TYPES } from './types';
import { toNumber } from './useWorks';

/* =========================================
   SPENDING VISUALIZATIONS
   -----------------------------------------
   Dependency-free charts (inline SVG + CSS bars) that break a work's rows down
   by a category column and sum a numeric column — so the user can see where the
   money goes (high) and where it doesn't (low).

   Colour follows the data-viz method:
     • Bar chart = one measure across categories = ONE series -> a single hue.
       Sorted high->low, so rank is read from position, not colour.
     • Donut = part-to-whole -> categorical. A donut is an "all-pairs" form, so it
       is capped at the 3 hues that stay colour-blind-distinct (validated), with
       the tail folded into a neutral "Other". Every slice is also labelled and
       listed in the table, so identity never rests on colour alone.
   ========================================= */

const SERIES = ['var(--viz-1)', 'var(--viz-2)', 'var(--viz-3)'];
const OTHER_COLOR = 'var(--viz-other)';
const DONUT_TOP = 3; // colour-blind-safe cap for an all-pairs form
const BAR_MAX = 10; // bars beyond this fold into a single "Other" bar (table keeps all)

const barIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="12" y1="20" x2="12" y2="10" />
    <line x1="18" y1="20" x2="18" y2="4" />
    <line x1="6" y1="20" x2="6" y2="16" />
  </svg>
);

interface Slice {
  label: string;
  value: number;
}

/* ----- formatting (self-contained) ----- */

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n);
}

function formatValue(col: Column | undefined, n: number): string {
  return col?.type === 'currency' ? formatCurrency(n) : formatNumber(n);
}

/** Whole-percent, but never a misleading "0%" for a real, tiny share. */
function formatPct(value: number, total: number): string {
  if (total <= 0) return '0%';
  const p = (value / total) * 100;
  if (p > 0 && p < 1) return '<1%';
  return `${Math.round(p)}%`;
}

/** Turn a category cell into a display label; blanks become "Uncategorized". */
function cellToLabel(col: Column, v: CellValue): string {
  if (col.type === 'checkbox') return v === true ? 'Yes' : 'No';
  const s = (v ?? '').toString().trim();
  return s === '' ? 'Uncategorized' : s;
}

/* ----- donut geometry ----- */

function Donut({ segments, total, colors }: { segments: Slice[]; total: number; colors: string[] }) {
  const SIZE = 184;
  const STROKE = 26;
  const r = (SIZE - STROKE) / 2;
  const c = 2 * Math.PI * r;
  const center = SIZE / 2;
  const GAP = 2; // surface gap between slices (px along the arc)

  // Prefix-sum the arc starts up front so the render stays pure (no mutation in map).
  const fracs = segments.map(s => (total > 0 ? s.value / total : 0));
  const starts = segments.map((_, i) => fracs.slice(0, i).reduce((a, b) => a + b, 0) * c);

  return (
    <svg className="w-[184px] h-[184px]" width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label="Spending share by category">
      {/* track */}
      <circle cx={center} cy={center} r={r} fill="none" stroke="var(--viz-track)" strokeWidth={STROKE} />
      {segments.map((seg, i) => {
        const dash = fracs[i] * c;
        const shown = Math.max(dash - GAP, 0.0001);
        return (
          <circle
            key={seg.label}
            className="transition-[filter] duration-200 cursor-default hover:brightness-115"
            cx={center}
            cy={center}
            r={r}
            fill="none"
            stroke={colors[i]}
            strokeWidth={STROKE}
            strokeDasharray={`${shown} ${c - shown}`}
            strokeDashoffset={-starts[i]}
            transform={`rotate(-90 ${center} ${center})`}
          >
            <title>{`${seg.label}: ${formatCurrency(seg.value)} (${formatPct(seg.value, total)})`}</title>
          </circle>
        );
      })}
    </svg>
  );
}

export function WorkCharts({ work }: { work: Work }) {
  const numericCols = useMemo(() => work.columns.filter(c => NUMERIC_TYPES.includes(c.type)), [work.columns]);
  const categoryCols = useMemo(
    () => work.columns.filter(c => c.type === 'text' || c.type === 'select' || c.type === 'checkbox'),
    [work.columns]
  );

  const [measureId, setMeasureId] = useState('');
  const [groupId, setGroupId] = useState('');

  // Resolve selections against the current columns; fall back to the first available.
  const measureCol = numericCols.find(c => c.id === measureId) ?? numericCols[0];
  const groupCol = categoryCols.find(c => c.id === groupId) ?? categoryCols[0];

  // Aggregate rows -> per-category totals, sorted high -> low.
  const groups = useMemo<Slice[]>(() => {
    if (!groupCol || !measureCol) return [];
    const map = new Map<string, number>();
    for (const row of work.rows) {
      const label = cellToLabel(groupCol, row.cells[groupCol.id] ?? null);
      map.set(label, (map.get(label) ?? 0) + toNumber(row.cells[measureCol.id]));
    }
    return [...map.entries()]
      .map(([label, value]) => ({ label, value }))
      .filter(g => g.value !== 0)
      .sort((a, b) => b.value - a.value);
  }, [work.rows, groupCol, measureCol]);

  function controls() {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex flex-col gap-1 text-[11px] font-semibold tracking-wider uppercase text-slate-400">
          <span>Group by</span>
          <select className="bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white min-w-[130px] focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors cursor-pointer" value={groupCol?.id ?? ''} onChange={e => setGroupId(e.target.value)} aria-label="Group spending by column">
            {categoryCols.map(c => (
              <option key={c.id} value={c.id} className="bg-[#18181f] text-white">{c.name}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[11px] font-semibold tracking-wider uppercase text-slate-400">
          <span>Measure</span>
          <select className="bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white min-w-[130px] focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors cursor-pointer" value={measureCol?.id ?? ''} onChange={e => setMeasureId(e.target.value)} aria-label="Amount column to sum">
            {numericCols.map(c => (
              <option key={c.id} value={c.id} className="bg-[#18181f] text-white">{c.name}</option>
            ))}
          </select>
        </label>
      </div>
    );
  }

  // ---- Empty / guard states ----
  if (numericCols.length === 0 || categoryCols.length === 0) {
    return (
      <div className="bg-[#111116] border border-white/10 rounded-2xl p-5 sm:p-6 mb-6 shadow-xl animate-fade-in">
        <div className="flex items-center justify-between flex-wrap gap-3 sm:gap-4 mb-4">
          <h3 className="flex items-center gap-2 text-base font-semibold text-white">
            <span className="text-violet-400">{barIcon}</span> Spending breakdown
          </h3>
        </div>
        <p className="text-sm text-slate-400 py-2">
          {numericCols.length === 0
            ? <>Add a <strong className="text-white">Currency</strong> or <strong className="text-white">Number</strong> column to chart where the money goes.</>
            : <>Add a <strong className="text-white">Text</strong> or <strong className="text-white">Dropdown</strong> column (e.g. Category) to group your spending.</>}
        </p>
      </div>
    );
  }

  const positives = groups.filter(g => g.value > 0);
  const positiveTotal = positives.reduce((s, g) => s + g.value, 0);

  if (groups.length === 0 || positiveTotal <= 0) {
    return (
      <div className="bg-[#111116] border border-white/10 rounded-2xl p-5 sm:p-6 mb-6 shadow-xl animate-fade-in">
        <div className="flex items-center justify-between flex-wrap gap-3 sm:gap-4 mb-4">
          <h3 className="flex items-center gap-2 text-base font-semibold text-white">
            <span className="text-violet-400">{barIcon}</span> Spending breakdown
          </h3>
          {controls()}
        </div>
        <p className="text-sm text-slate-400 py-2">No amounts to chart yet — enter some values in <strong className="text-white">{measureCol?.name}</strong> to see the breakdown.</p>
      </div>
    );
  }

  const highest = positives[0];
  const lowest = positives[positives.length - 1];

  // ---- Bar data (single hue, all categories, capped with an "Other" bar) ----
  const barGroups: Slice[] =
    groups.length > BAR_MAX
      ? [
          ...groups.slice(0, BAR_MAX - 1),
          {
            label: `Other (${groups.length - (BAR_MAX - 1)})`,
            value: groups.slice(BAR_MAX - 1).reduce((s, g) => s + g.value, 0),
          },
        ]
      : groups;
  const barScaleMax = Math.max(...barGroups.map(g => Math.abs(g.value)), 1);

  // ---- Donut data (categorical, top 3 + Other), only when it's worth a pie ----
  const showDonut = positives.length >= 3;
  const donutTop = positives.slice(0, DONUT_TOP);
  const donutRest = positives.slice(DONUT_TOP);
  const donutSegments: Slice[] = donutRest.length
    ? [...donutTop, { label: `Other (${donutRest.length})`, value: donutRest.reduce((s, g) => s + g.value, 0) }]
    : donutTop;
  const donutColors = donutSegments.map((_, i) => (i < DONUT_TOP ? SERIES[i] : OTHER_COLOR));
  const donutTotal = donutSegments.reduce((s, g) => s + g.value, 0);

  // ---- Single category: a chart would be a 1-bar chart / 1-slice pie (anti-pattern) ----
  if (groups.length === 1) {
    return (
      <div className="bg-[#111116] border border-white/10 rounded-2xl p-5 sm:p-6 mb-6 shadow-xl animate-fade-in">
        <div className="flex items-center justify-between flex-wrap gap-3 sm:gap-4 mb-4">
          <h3 className="flex items-center gap-2 text-base font-semibold text-white">
            <span className="text-violet-400">{barIcon}</span> Spending breakdown
          </h3>
          {controls()}
        </div>
        <p className="text-sm text-slate-300 py-2">
          All of your <strong className="text-white">{measureCol?.name}</strong> so far is in{' '}
          <strong className="text-white">{highest.label}</strong> — {formatValue(measureCol, highest.value)}.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#111116] border border-white/10 rounded-2xl p-5 sm:p-6 mb-6 shadow-xl animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3 sm:gap-4 mb-4">
        <h3 className="flex items-center gap-2 text-base font-semibold text-white">
          <span className="text-violet-400">{barIcon}</span> Spending breakdown
        </h3>
        {controls()}
      </div>

      {/* Plain-language answer to "where much / where low" */}
      <p className="flex items-center flex-wrap gap-2 text-xs sm:text-sm text-slate-300 bg-white/[0.03] border border-white/10 rounded-xl px-3.5 py-2.5 mb-5">
        Most on <span className="inline-block w-2.5 h-2.5 rounded-xs shrink-0" style={{ background: SERIES[0] }} /> <strong className="text-white">{highest.label}</strong>{' '}
        ({formatValue(measureCol, highest.value)}, {formatPct(highest.value, positiveTotal)}) · least on{' '}
        <span className="inline-block w-2.5 h-2.5 rounded-xs shrink-0 bg-[var(--viz-other)]" /> <strong className="text-white">{lowest.label}</strong>{' '}
        ({formatValue(measureCol, lowest.value)}, {formatPct(lowest.value, positiveTotal)}).
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Bar chart — ranked magnitude */}
        <section className="min-w-0">
          <h4 className="text-xs font-semibold text-slate-400 mb-3.5">
            By {groupCol?.name} <span className="font-normal text-slate-500 ml-1.5">high → low</span>
          </h4>
          <div className="flex flex-col gap-2.5">
            {barGroups.map(g => {
              const w = Math.max((Math.abs(g.value) / barScaleMax) * 100, 1.5);
              return (
                <div className="grid grid-cols-[minmax(80px,28%)_1fr_auto] items-center gap-3 group" key={g.label} title={`${g.label}: ${formatValue(measureCol, g.value)} (${formatPct(g.value, positiveTotal)})`}>
                  <span className="text-xs text-slate-300 truncate" title={g.label}>{g.label}</span>
                  <div className="relative h-4.5 flex items-center bg-white/[0.04] rounded overflow-hidden">
                    <div className="h-full bg-[var(--viz-1)] rounded-r min-w-[3px] transition-all duration-300 group-hover:brightness-115" style={{ width: `${w}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-white whitespace-nowrap font-mono tabular-nums">{formatValue(measureCol, g.value)}</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Donut — part-to-whole */}
        {showDonut && (
          <section className="min-w-0">
            <h4 className="text-xs font-semibold text-slate-400 mb-3.5">Share of {measureCol?.name}</h4>
            <div className="flex items-center gap-5 flex-wrap">
              <div className="relative w-[184px] h-[184px] shrink-0 mx-auto sm:mx-0">
                <Donut segments={donutSegments} total={donutTotal} colors={donutColors} />
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  <span className="text-[10px] tracking-widest uppercase text-slate-400 font-semibold">Total</span>
                  <span className="text-base font-bold text-white font-mono tabular-nums">{formatValue(measureCol, positiveTotal)}</span>
                </div>
              </div>
              <ul className="list-none flex flex-col gap-1 flex-1 min-w-[160px]">
                {donutSegments.map((seg, i) => (
                  <li className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-2.5 py-1 border-b border-white/5 last:border-b-0 text-xs" key={seg.label}>
                    <span className="w-2.5 h-2.5 rounded-xs shrink-0" style={{ background: donutColors[i] }} />
                    <span className="text-slate-300 truncate">{seg.label}</span>
                    <span className="font-semibold text-white font-mono tabular-nums">{formatValue(measureCol, seg.value)}</span>
                    <span className="text-[11px] text-slate-400 min-w-[2.5rem] text-right font-mono tabular-nums">{formatPct(seg.value, donutTotal)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </div>

      {/* Table view — every category, exact numbers (the accessible twin) */}
      <details className="mt-6 border-t border-white/10 pt-2 group">
        <summary className="cursor-pointer text-xs font-semibold text-slate-400 hover:text-white py-2 select-none transition-colors flex items-center gap-1.5">
          <span className="inline-block transition-transform duration-200 group-open:rotate-90">▸</span> Full breakdown ({groups.length} categories)
        </summary>
        <div className="max-h-80 overflow-y-auto mt-2 rounded-lg border border-white/10">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr>
                <th className="sticky top-0 bg-[#16161d] text-slate-400 font-semibold text-[11px] tracking-wider uppercase px-3 py-2 border-b border-white/10">{groupCol?.name}</th>
                <th className="sticky top-0 bg-[#16161d] text-slate-400 font-semibold text-[11px] tracking-wider uppercase px-3 py-2 border-b border-white/10 text-right font-mono tabular-nums">{measureCol?.name}</th>
                <th className="sticky top-0 bg-[#16161d] text-slate-400 font-semibold text-[11px] tracking-wider uppercase px-3 py-2 border-b border-white/10 text-right font-mono tabular-nums">Share</th>
              </tr>
            </thead>
            <tbody>
              {groups.map(g => (
                <tr key={g.label} className="hover:bg-white/[0.02]">
                  <td className="px-3 py-2 border-b border-white/5 text-slate-200">{g.label}</td>
                  <td className="px-3 py-2 border-b border-white/5 text-slate-200 text-right font-mono tabular-nums">{formatValue(measureCol, g.value)}</td>
                  <td className="px-3 py-2 border-b border-white/5 text-slate-200 text-right font-mono tabular-nums">{formatPct(g.value, positiveTotal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="px-3 py-2 border-t border-white/10 font-bold text-white bg-white/[0.02]">Total</td>
                <td className="px-3 py-2 border-t border-white/10 font-bold text-white bg-white/[0.02] text-right font-mono tabular-nums">{formatValue(measureCol, positiveTotal)}</td>
                <td className="px-3 py-2 border-t border-white/10 font-bold text-white bg-white/[0.02] text-right font-mono tabular-nums">100%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </details>
    </div>
  );
}

