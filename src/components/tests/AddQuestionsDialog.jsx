import { useState, useMemo, useRef, useEffect } from 'react';
import { X, Search, Plus, Inbox } from 'lucide-react';
import { C, font, serif, colorForTag, BLOOM_LEVELS, BLOOM_LABELS } from '../../styles/theme';
import { subjectOf, topicOf } from '../../lib/grouping';
import { QUESTION_TYPES, TYPE_LABELS, questionType } from '../../lib/questionTypes';
import { useEscape } from '../../lib/useEscape';
import BloomTag from '../common/BloomTag';
import Spinner from '../common/Spinner';
import { TypeBadge } from '../common/AnswerEditor';

const EMPTY_FILTERS = { subject: '', topic: '', type: '', bloom: '', source: '' };

const selectStyle = {
  height: 36, boxSizing: 'border-box', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 9,
  padding: '0 10px', fontFamily: font, fontSize: 13.5, color: C.text, outline: 'none', cursor: 'pointer', minWidth: 0, width: '100%',
};

// Dialog per aggiungere al test domande dall'archivio: ricerca, filtri (materia, argomento, tipo, categoria di
// Bloom, fonte), selezione singola o di tutte le filtrate. La selezione resta cambiando filtro, così si possono
// comporre domande da gruppi diversi. Le domande già nel test non compaiono.
// documents: Map id → { title, file } per il filtro "Fonte".
export default function AddQuestionsDialog({ allQuestions, loading, existingIds, documents, onAdd, onClose }) {
  const [search, setSearch]       = useState('');
  const [filters, setFilters]     = useState(EMPTY_FILTERS);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const searchRef = useRef(null);
  useEscape(onClose);
  useEffect(() => { searchRef.current?.focus(); }, []);

  const available = useMemo(() => allQuestions.filter(q => !existingIds.has(q.id)), [allQuestions, existingIds]);
  const inTest = allQuestions.length - available.length;

  const subjects = useMemo(() => [...new Set(available.map(subjectOf))].sort((a, b) => a.localeCompare(b)), [available]);
  const topics = useMemo(() =>
    [...new Set(available.filter(q => !filters.subject || subjectOf(q) === filters.subject).map(topicOf))].sort((a, b) => a.localeCompare(b)),
  [available, filters.subject]);
  const sources = useMemo(() => {
    const ids = [...new Set(available.map(q => q.document).filter(Boolean))];
    return ids.map(id => ({ id, title: documents.get(id)?.title || documents.get(id)?.file || 'Documento eliminato' }))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [available, documents]);

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    return available.filter(q => {
      if (filters.subject && subjectOf(q) !== filters.subject) return false;
      if (filters.topic && topicOf(q) !== filters.topic) return false;
      if (filters.type && questionType(q) !== filters.type) return false;
      if (filters.bloom === 'none' ? !!q.bloom_level : filters.bloom && q.bloom_level !== filters.bloom) return false;
      if (filters.source === 'manual' ? !!q.document : filters.source && q.document !== filters.source) return false;
      if (!t) return true;
      return q.content?.toLowerCase().includes(t) || q.subject?.toLowerCase().includes(t) || q.topic?.toLowerCase().includes(t);
    });
  }, [available, filters, search]);

  const selectedShown = filtered.filter(q => selectedIds.has(q.id)).length;
  const allShownSelected = filtered.length > 0 && selectedShown === filtered.length;
  const hiddenSelected = selectedIds.size - selectedShown;
  const activeFilters = Object.values(filters).filter(Boolean).length + (search.trim() ? 1 : 0);

  function setFilter(key, value) {
    setFilters(f => ({ ...f, [key]: value, ...(key === 'subject' ? { topic: '' } : {}) }));
  }
  function toggle(id) {
    setSelectedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }
  function toggleAllShown() {
    setSelectedIds(prev => {
      const next = new Set(prev);
      filtered.forEach(q => allShownSelected ? next.delete(q.id) : next.add(q.id));
      return next;
    });
  }
  function add() {
    const selected = available.filter(q => selectedIds.has(q.id));
    if (selected.length) onAdd(selected);
  }

  const n = selectedIds.size;

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: C.overlay, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-q-title"
        onClick={e => e.stopPropagation()}
        style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, width: 'min(1040px, 100%)', height: 'min(860px, 92vh)', display: 'flex', flexDirection: 'column', boxShadow: '0 12px 40px rgba(0,0,0,0.18)', fontFamily: font }}
      >
        {/* Intestazione */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, padding: '20px 24px 14px' }}>
          <div>
            <h2 id="add-q-title" style={{ fontFamily: serif, fontSize: 21, fontWeight: 500, color: C.text, margin: '0 0 4px' }}>Aggiungi domande al test</h2>
            <p style={{ fontSize: 13.5, color: C.textMuted, margin: 0 }}>
              {available.length} {available.length === 1 ? 'domanda disponibile' : 'domande disponibili'} nel tuo archivio
              {inTest > 0 && <> · {inTest} già nel test (non mostrate)</>}
            </p>
          </div>
          <button onClick={onClose} aria-label="Chiudi" title="Chiudi" style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, padding: 4, display: 'flex' }}>
            <X size={18} />
          </button>
        </div>

        {/* Ricerca e filtri */}
        <div style={{ padding: '0 24px 14px', display: 'flex', flexDirection: 'column', gap: 10, borderBottom: `1px solid ${C.borderLight}` }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: C.textFaint }} />
            <input
              ref={searchRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cerca nel testo, nella materia o nell'argomento…"
              aria-label="Cerca domande"
              style={{ width: '100%', boxSizing: 'border-box', height: 42, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '0 14px 0 38px', fontFamily: font, fontSize: 14.5, color: C.text, outline: 'none' }}
              onFocus={e => e.target.style.borderColor = C.focusBorder}
              onBlur={e => e.target.style.borderColor = C.border}
            />
          </div>
          <div className="aq-filters">
            <select value={filters.subject} onChange={e => setFilter('subject', e.target.value)} style={selectStyle} aria-label="Materia">
              <option value="">Tutte le materie</option>
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={filters.topic} onChange={e => setFilter('topic', e.target.value)} style={selectStyle} aria-label="Argomento">
              <option value="">Tutti gli argomenti</option>
              {topics.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={filters.type} onChange={e => setFilter('type', e.target.value)} style={selectStyle} aria-label="Tipo">
              <option value="">Tutti i tipi</option>
              {QUESTION_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
            </select>
            <select value={filters.bloom} onChange={e => setFilter('bloom', e.target.value)} style={selectStyle} aria-label="Categoria di Bloom">
              <option value="">Tutte le categorie di Bloom</option>
              {BLOOM_LEVELS.map(l => <option key={l} value={l}>{BLOOM_LABELS[l]}</option>)}
              <option value="none">Non classificate</option>
            </select>
            <select value={filters.source} onChange={e => setFilter('source', e.target.value)} style={selectStyle} aria-label="Fonte">
              <option value="">Tutte le fonti</option>
              {sources.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
              <option value="manual">Scritte a mano</option>
            </select>
          </div>
        </div>

        {/* Barra di selezione */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '10px 24px', background: C.expandBg, borderBottom: `1px solid ${C.borderLight}`, fontSize: 13.5 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: filtered.length ? 'pointer' : 'not-allowed', color: C.text, fontWeight: 500 }}>
            <input
              type="checkbox"
              checked={allShownSelected}
              ref={el => { if (el) el.indeterminate = selectedShown > 0 && !allShownSelected; }}
              onChange={toggleAllShown}
              disabled={!filtered.length}
              style={{ width: 17, height: 17, accentColor: C.green, cursor: 'inherit' }}
            />
            {allShownSelected ? 'Deseleziona tutte' : 'Seleziona tutte'} ({filtered.length}{activeFilters ? ' filtrate' : ''})
          </label>
          <span style={{ flex: 1 }} />
          {activeFilters > 0 && (
            <button onClick={() => { setFilters(EMPTY_FILTERS); setSearch(''); }}
              style={{ background: 'none', border: 'none', padding: 0, color: C.greenLight, fontFamily: font, fontSize: 13.5, fontWeight: 500, cursor: 'pointer', textDecoration: 'underline' }}>
              Azzera filtri
            </button>
          )}
          {n > 0 && (
            <button onClick={() => setSelectedIds(new Set())}
              style={{ background: 'none', border: 'none', padding: 0, color: C.textMuted, fontFamily: font, fontSize: 13.5, cursor: 'pointer', textDecoration: 'underline' }}>
              Svuota selezione
            </button>
          )}
        </div>

        {/* Elenco */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: C.textFaint }}><Spinner size={15} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Caricamento delle domande…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, color: C.textFaint, fontSize: 14 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: C.expandBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Inbox size={22} /></div>
              {available.length === 0
                ? (allQuestions.length ? 'Tutte le tue domande sono già nel test.' : 'Il tuo archivio è vuoto: crea o genera domande dalla pagina Domande.')
                : 'Nessuna domanda corrisponde alla ricerca o ai filtri.'}
            </div>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {filtered.map(q => {
                const selected = selectedIds.has(q.id);
                const subject = (q.subject || '').trim();
                const sc = subject ? colorForTag(subject) : null;
                return (
                  <li key={q.id}>
                    <label className={selected ? 'aq-row aq-sel' : 'aq-row'} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '13px 24px', borderBottom: `1px solid ${C.borderLight}`, cursor: 'pointer', background: selected ? '#EFF5E6' : C.surface }}>
                      <input type="checkbox" checked={selected} onChange={() => toggle(q.id)} style={{ width: 17, height: 17, marginTop: 3, accentColor: C.green, flexShrink: 0, cursor: 'pointer' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: serif, fontSize: 15, color: C.text, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{q.content || '—'}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 6, fontSize: 13, color: C.textMuted }}>
                          {subject && <span style={{ background: sc.bg, color: sc.color, padding: '1px 9px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{subject}</span>}
                          {(q.topic || '').trim() && <span>{q.topic.trim()}</span>}
                          <TypeBadge type={questionType(q)} />
                          <BloomTag level={q.bloom_level} />
                        </div>
                      </div>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Azioni */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '14px 24px', borderTop: `1px solid ${C.borderLight}` }}>
          <span style={{ flex: 1, minWidth: 180, fontSize: 13.5, color: n ? C.text : C.textMuted }}>
            {n ? <><strong>{n}</strong> {n === 1 ? 'domanda selezionata' : 'domande selezionate'}</> : 'Seleziona le domande da aggiungere'}
            {hiddenSelected > 0 && <span style={{ color: C.textMuted }}> ({hiddenSelected} non visibili con i filtri attuali)</span>}
          </span>
          <button onClick={onClose} style={{ height: 42, padding: '0 18px', background: 'none', border: `1px solid ${C.border}`, borderRadius: 10, color: C.textMuted, fontFamily: font, fontSize: 14, cursor: 'pointer' }}>
            Annulla
          </button>
          <button onClick={add} disabled={!n}
            style={{ display: 'flex', alignItems: 'center', gap: 8, height: 42, padding: '0 20px', background: C.green, border: 'none', borderRadius: 10, color: '#FFF', fontFamily: font, fontSize: 14.5, fontWeight: 500, cursor: n ? 'pointer' : 'not-allowed', opacity: n ? 1 : 0.5 }}>
            <Plus size={16} /> {n ? `Aggiungi ${n} ${n === 1 ? 'domanda' : 'domande'}` : 'Aggiungi'}
          </button>
        </div>
      </div>

      <style>{`
        .aq-filters { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; }
        .aq-row:not(.aq-sel):hover { background: ${C.expandBg} !important; }
        @media (max-width: 860px) { .aq-filters { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
      `}</style>
    </div>
  );
}
