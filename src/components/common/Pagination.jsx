import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { C, font } from '../../styles/theme';

// Numeri di pagina da mostrare: prima, ultima e una finestra attorno alla corrente; '…' per i salti.
function pageItems(page, pageCount) {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const from = Math.max(2, Math.min(page - 1, pageCount - 4));
  const to   = Math.min(pageCount - 1, Math.max(page + 1, 5));
  const items = [1];
  if (from > 2) items.push('…');
  for (let p = from; p <= to; p++) items.push(p);
  if (to < pageCount - 1) items.push('…');
  items.push(pageCount);
  return items;
}

// Paginazione: "1–10 di N" e barra delle pagine con frecce.
export default function Pagination({ page, pageSize, total, onPageChange, style }) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last  = Math.min(page * pageSize, total);

  const navBtn = (disabled) => ({
    width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8,
    background: 'transparent', border: `1px solid ${C.border}`, color: C.textBody,
    cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1,
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, padding: '12px 16px', fontFamily: font, fontSize: 13, color: C.textMuted, ...style }}>
      <span><strong style={{ color: C.text, fontWeight: 600 }}>{first}–{last}</strong> di {total}</span>

      <nav aria-label="Pagine" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button onClick={() => onPageChange(1)} disabled={page === 1} style={navBtn(page === 1)} aria-label="Prima pagina"><ChevronsLeft size={15} /></button>
        <button onClick={() => onPageChange(page - 1)} disabled={page === 1} style={navBtn(page === 1)} aria-label="Pagina precedente"><ChevronLeft size={15} /></button>
        {pageItems(page, pageCount).map((p, i) => p === '…' ? (
          <span key={`gap${i}`} style={{ width: 24, textAlign: 'center', color: C.textFaint }}>…</span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            aria-current={p === page ? 'page' : undefined}
            style={{
              minWidth: 32, height: 32, padding: '0 8px', borderRadius: 8, fontFamily: font, fontSize: 13, cursor: 'pointer',
              background: p === page ? C.green : 'transparent',
              border: `1px solid ${p === page ? C.green : C.border}`,
              color: p === page ? '#FFF' : C.textBody, fontWeight: p === page ? 600 : 500,
            }}
          >
            {p}
          </button>
        ))}
        <button onClick={() => onPageChange(page + 1)} disabled={page === pageCount} style={navBtn(page === pageCount)} aria-label="Pagina successiva"><ChevronRight size={15} /></button>
        <button onClick={() => onPageChange(pageCount)} disabled={page === pageCount} style={navBtn(page === pageCount)} aria-label="Ultima pagina"><ChevronsRight size={15} /></button>
      </nav>
    </div>
  );
}
