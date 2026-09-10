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
    <svg className="viz-donut" width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label="Spending share by category">
      {/* track */}
      <circle cx={center} cy={center} r={r} fill="none" stroke="var(--viz-track)" strokeWidth={STROKE} />
      {segments.map((seg, i) => {
        const dash = fracs[i] * c;
        const shown = Math.max(dash - GAP, 0.0001);
        return (
          <circle
            key={seg.label}
            className="viz-slice"
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

  // ---- Empty / guard states ----
  if (numericCols.length === 0 || categoryCols.length === 0) {
    return (
      <div className="work-charts">
        <div className="charts-head">
          <h3 className="charts-title">{barIcon} Spending breakdown</h3>
        </div>
        <p className="charts-empty">
          {numericCols.length === 0
            ? <>Add a <strong>Currency</strong> or <strong>Number</strong> column to chart where the money goes.</>
            : <>Add a <strong>Text</strong> or <strong>Dropdown</strong> column (e.g. Category) to group your spending.</>}
        </p>
      </div>
    );
  }

  const positives = groups.filter(g => g.value > 0);
  const positiveTotal = positives.reduce((s, g) => s + g.value, 0);

  if (groups.length === 0 || positiveTotal <= 0) {
    return (
      <div className="work-charts">
        <div className="charts-head">
          <h3 className="charts-title">{barIcon} Spending breakdown</h3>
          {controls()}
        </div>
        <p className="charts-empty">No amounts to chart yet — enter some values in <strong>{measureCol?.name}</strong> to see the breakdown.</p>
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

  function controls() {
    return (
      <div className="charts-controls">
        <label className="charts-control">
          <span>Group by</span>
          <select className="form-select" value={groupCol?.id ?? ''} onChange={e => setGroupId(e.target.value)} aria-label="Group spending by column">
            {categoryCols.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <label className="charts-control">
          <span>Measure</span>
          <select className="form-select" value={measureCol?.id ?? ''} onChange={e => setMeasureId(e.target.value)} aria-label="Amount column to sum">
            {numericCols.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
      </div>
    );
  }

  // ---- Single category: a chart would be a 1-bar chart / 1-slice pie (anti-pattern) ----
  if (groups.length === 1) {
    return (
      <div className="work-charts">
        <div className="charts-head">
          <h3 className="charts-title">{barIcon} Spending breakdown</h3>
          {controls()}
        </div>
        <p className="charts-single">
          All of your <strong>{measureCol?.name}</strong> so far is in{' '}
          <strong>{highest.label}</strong> — {formatValue(measureCol, highest.value)}.
        </p>
      </div>
    );
  }

  return (
    <div className="work-charts">
      <div className="charts-head">
        <h3 className="charts-title">{barIcon} Spending breakdown</h3>
        {controls()}
      </div>

      {/* Plain-language answer to "where much / where low" */}
      <p className="charts-insight">
        Most on <span className="viz-key" style={{ background: SERIES[0] }} /> <strong>{highest.label}</strong>{' '}
        ({formatValue(measureCol, highest.value)}, {formatPct(highest.value, positiveTotal)}) · least on{' '}
        <span className="viz-key viz-key-muted" /> <strong>{lowest.label}</strong>{' '}
        ({formatValue(measureCol, lowest.value)}, {formatPct(lowest.value, positiveTotal)}).
      </p>

      <div className="charts-grid">
        {/* Bar chart — ranked magnitude */}
        <section className="chart-panel">
          <h4 className="chart-subtitle">By {groupCol?.name} <span className="chart-subtitle-note">high → low</span></h4>
          <div className="viz-bars">
            {barGroups.map(g => {
              const w = Math.max((Math.abs(g.value) / barScaleMax) * 100, 1.5);
              return (
                <div className="viz-bar-row" key={g.label} title={`${g.label}: ${formatValue(measureCol, g.value)} (${formatPct(g.value, positiveTotal)})`}>
                  <span className="viz-bar-label" title={g.label}>{g.label}</span>
                  <div className="viz-bar-track">
                    <div className="viz-bar-fill" style={{ width: `${w}%` }} />
                  </div>
                  <span className="viz-bar-value viz-num">{formatValue(measureCol, g.value)}</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Donut — part-to-whole */}
        {showDonut && (
          <section className="chart-panel">
            <h4 className="chart-subtitle">Share of {measureCol?.name}</h4>
            <div className="viz-donut-wrap">
              <div className="viz-donut-holder">
                <Donut segments={donutSegments} total={donutTotal} colors={donutColors} />
                <div className="viz-donut-center">
                  <span className="viz-donut-center-label">Total</span>
                  <span className="viz-donut-center-value viz-num">{formatValue(measureCol, positiveTotal)}</span>
                </div>
              </div>
              <ul className="viz-legend">
                {donutSegments.map((seg, i) => (
                  <li className="viz-legend-row" key={seg.label}>
                    <span className="viz-legend-swatch" style={{ background: donutColors[i] }} />
                    <span className="viz-legend-label">{seg.label}</span>
                    <span className="viz-legend-value viz-num">{formatValue(measureCol, seg.value)}</span>
                    <span className="viz-legend-pct viz-num">{formatPct(seg.value, donutTotal)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </div>

      {/* Table view — every category, exact numbers (the accessible twin) */}
      <details className="charts-table-details">
        <summary>Full breakdown ({groups.length} categories)</summary>
        <div className="charts-table-wrap">
          <table className="charts-table">
            <thead>
              <tr>
                <th>{groupCol?.name}</th>
                <th className="num">{measureCol?.name}</th>
                <th className="num">Share</th>
              </tr>
            </thead>
            <tbody>
              {groups.map(g => (
                <tr key={g.label}>
                  <td>{g.label}</td>
                  <td className="num viz-num">{formatValue(measureCol, g.value)}</td>
                  <td className="num viz-num">{formatPct(g.value, positiveTotal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Total</td>
                <td className="num viz-num">{formatValue(measureCol, positiveTotal)}</td>
                <td className="num viz-num">100%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </details>
    </div>
  );
}

