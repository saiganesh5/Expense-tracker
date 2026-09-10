import { Fragment, type ReactNode } from 'react';

/* =========================================
   MINIMAL MARKDOWN RENDERER
   -----------------------------------------
   Dependency-free and XSS-safe: output is built as React elements, so all
   text is escaped by React. Link hrefs are protocol-checked. Supports the
   common subset — headings, bold/italic/strikethrough, inline code, fenced
   code blocks, links, ordered/unordered lists, blockquotes, and rules.
   ========================================= */

/** Allow only safe link protocols; otherwise the link renders as plain text. */
function safeHref(url: string): string | null {
  const trimmed = url.trim();
  if (/^(https?:\/\/|mailto:)/i.test(trimmed)) return trimmed;
  if (/^(\/|#)/.test(trimmed)) return trimmed; // relative / in-page
  return null;
}

type InlineKind = 'code' | 'link' | 'bolditalic' | 'bold' | 'italic' | 'strike';

// Highest priority first — ties at the same position pick the earlier entry.
const INLINE_PATTERNS: { re: RegExp; kind: InlineKind }[] = [
  { re: /`([^`]+)`/, kind: 'code' },
  { re: /\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/, kind: 'link' },
  { re: /\*\*\*([^*]+?)\*\*\*/, kind: 'bolditalic' },
  { re: /___([^_]+?)___/, kind: 'bolditalic' },
  { re: /\*\*([^*]+?)\*\*/, kind: 'bold' },
  { re: /__([^_]+?)__/, kind: 'bold' },
  { re: /\*([^*]+?)\*/, kind: 'italic' },
  { re: /_([^_]+?)_/, kind: 'italic' },
  { re: /~~([^~]+?)~~/, kind: 'strike' },
];

function makeInline(kind: InlineKind, m: RegExpExecArray, key: number): ReactNode {
  switch (kind) {
    case 'code':
      return <code key={key} className="bg-white/10 text-violet-300 font-mono text-xs px-1.5 py-0.5 rounded border border-white/10">{m[1]}</code>;
    case 'link': {
      const href = safeHref(m[2]);
      const inner = parseInline(m[1]);
      if (!href) return <Fragment key={key}>{m[0]}</Fragment>;
      return (
        <a key={key} className="text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors" href={href} title={m[3]} target="_blank" rel="noopener noreferrer">
          {inner}
        </a>
      );
    }
    case 'bolditalic':
      return <strong key={key}><em>{parseInline(m[1])}</em></strong>;
    case 'bold':
      return <strong key={key}>{parseInline(m[1])}</strong>;
    case 'italic':
      return <em key={key}>{parseInline(m[1])}</em>;
    case 'strike':
      return <del key={key}>{parseInline(m[1])}</del>;
  }
}

/** Turn a single line/segment of text into React nodes with inline formatting. */
function parseInline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let rest = text;
  let key = 0;

  while (rest.length > 0) {
    let best: { idx: number; len: number; node: ReactNode } | null = null;

    for (const p of INLINE_PATTERNS) {
      const m = p.re.exec(rest);
      if (!m) continue;
      if (best === null || m.index < best.idx) {
        best = { idx: m.index, len: m[0].length, node: makeInline(p.kind, m, key) };
        if (m.index === 0) break; // nothing can start earlier
      }
    }

    if (!best) {
      out.push(rest);
      break;
    }
    if (best.idx > 0) out.push(rest.slice(0, best.idx));
    out.push(best.node);
    rest = rest.slice(best.idx + best.len);
    key++;
  }

  return out;
}

const HEADING_RE = /^(#{1,6})\s+(.*)$/;
const HR_RE = /^\s*(-{3,}|\*{3,}|_{3,})\s*$/;
const QUOTE_RE = /^\s*>\s?/;
const UL_RE = /^(\s*)[-*+]\s+(.*)$/;
const OL_RE = /^(\s*)\d+\.\s+(.*)$/;

function isBlockStart(line: string): boolean {
  return (
    /^```/.test(line) ||
    HEADING_RE.test(line) ||
    HR_RE.test(line) ||
    QUOTE_RE.test(line) ||
    UL_RE.test(line) ||
    OL_RE.test(line)
  );
}

function heading(level: number, children: ReactNode[]): ReactNode {
  switch (level) {
    case 1: return <h1 className="text-xl font-bold text-white mb-2 mt-3 pb-1 border-b border-white/10">{children}</h1>;
    case 2: return <h2 className="text-lg font-bold text-white mb-2 mt-3 pb-1 border-b border-white/10">{children}</h2>;
    case 3: return <h3 className="text-base font-semibold text-white mb-1.5 mt-2.5">{children}</h3>;
    case 4: return <h4 className="text-sm font-semibold text-white/90 mb-1 mt-2">{children}</h4>;
    case 5: return <h5 className="text-sm font-medium text-white/90 mb-1 mt-2">{children}</h5>;
    default: return <h6 className="text-xs font-medium text-white/70 mb-1 mt-2">{children}</h6>;
  }
}

function parseBlocks(src: string): ReactNode[] {
  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let key = 0;
  let i = 0;
  const push = (node: ReactNode) => blocks.push(<Fragment key={key++}>{node}</Fragment>);

  while (i < lines.length) {
    const line = lines[i];

    // Blank line
    if (/^\s*$/.test(line)) { i++; continue; }

    // Fenced code block
    const fence = line.match(/^```(.*)$/);
    if (fence) {
      const lang = fence[1].trim();
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) { code.push(lines[i]); i++; }
      i++; // consume closing fence (if present)
      push(
        <pre className="bg-black/50 border border-white/10 rounded-lg p-3 my-2.5 overflow-x-auto text-xs font-mono text-slate-200">
          <code className={lang ? `language-${lang}` : undefined}>{code.join('\n')}</code>
        </pre>
      );
      continue;
    }

    // Heading
    const h = line.match(HEADING_RE);
    if (h) {
      push(heading(h[1].length, parseInline(h[2].trim())));
      i++;
      continue;
    }

    // Horizontal rule
    if (HR_RE.test(line)) { push(<hr className="border-0 h-px bg-white/15 my-3" />); i++; continue; }

    // Blockquote (consecutive `>` lines, parsed recursively)
    if (QUOTE_RE.test(line)) {
      const quoted: string[] = [];
      while (i < lines.length && QUOTE_RE.test(lines[i])) {
        quoted.push(lines[i].replace(QUOTE_RE, ''));
        i++;
      }
      push(<blockquote className="border-l-2 border-violet-500/60 pl-3 my-2 italic text-slate-300 text-sm">{parseBlocks(quoted.join('\n'))}</blockquote>);
      continue;
    }

    // Lists (a run of same-kind items)
    const ordered = OL_RE.test(line);
    if (ordered || UL_RE.test(line)) {
      const itemRe = ordered ? OL_RE : UL_RE;
      const items: ReactNode[] = [];
      let li = 0;
      while (i < lines.length) {
        const m = lines[i].match(itemRe);
        if (!m) break;
        items.push(<li key={li++} className="leading-relaxed">{parseInline(m[2])}</li>);
        i++;
      }
      push(ordered ? <ol className="list-decimal list-inside my-2 space-y-1 text-slate-200 text-sm">{items}</ol> : <ul className="list-disc list-inside my-2 space-y-1 text-slate-200 text-sm">{items}</ul>);
      continue;
    }

    // Paragraph: gather until a blank line or the start of another block
    const para: string[] = [];
    while (i < lines.length && !/^\s*$/.test(lines[i]) && !isBlockStart(lines[i])) {
      para.push(lines[i]);
      i++;
    }
    const nodes: ReactNode[] = [];
    para.forEach((raw, idx) => {
      const hardBreak = /\s{2,}$/.test(raw);
      // Wrap each line so per-line inline keys don't collide across lines.
      nodes.push(<Fragment key={`l${idx}`}>{parseInline(raw.replace(/\s+$/, ''))}</Fragment>);
      if (idx < para.length - 1) {
        nodes.push(hardBreak ? <br key={`br${idx}`} /> : <Fragment key={`sp${idx}`}> </Fragment>);
      }
    });
    push(<p className="my-1.5 leading-relaxed text-sm text-slate-200">{nodes}</p>);
  }

  return blocks;
}

/** Render a Markdown string as safe, styled React output. */
export function Markdown({ source }: { source: string }) {
  return <div className="text-sm text-slate-200 leading-relaxed break-words">{parseBlocks(source ?? '')}</div>;
}
