import { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Trash2, Pencil, Tag, ClipboardCheck, Inbox, Check, Square, ArrowUp, ArrowDown, ArrowUpDown, X } from 'lucide-react';
import pb from '../../lib/pocketbase';
import { classifyBloomCouncil } from '../../lib/classifyBloom';
import { C, font, serif, colorForTag, BLOOM_LEVELS, BLOOM_LABELS, BLOOM_STYLES } from '../../styles/theme';
import AddQuestionModal from './AddQuestionModal';
import EditQuestionModal from './EditQuestionModal';
import QuestionDetailModal from './QuestionDetailModal';
import Navbar from '../common/Navbar';
import Spinner from '../common/Spinner';
import EmptyState from '../common/EmptyState';
import ConfirmModal from '../common/ConfirmModal';
import { ProgressBar } from '../common/GenerationUI';
import Pagination from '../common/Pagination';
import BloomTag from '../common/BloomTag';
import ListToolbar, { SelectionBar, BulkDeleteBtn } from '../common/ListToolbar';
import SubjectSidebar, { PageStyles } from '../common/SubjectSidebar';
import { subjectOf, topicOf } from '../../lib/grouping';
import { QUESTION_TYPES, TYPE_LABELS, questionType } from '../../lib/questionTypes';

const TYPES = QUESTION_TYPES.map(t => TYPE_LABELS[t]);
const DATE_RANGES = [
  { value: '1',   label: 'Oggi' },
  { value: '7',   label: 'Ultimi 7 giorni' },
  { value: '30',  label: 'Ultimi 30 giorni' },
  { value: '365', label: "Ultimo anno" },
];

// Tipo di domanda (etichetta) ricavato dalle opzioni: vedi lib/questionTypes.js.
const typeOf = q => TYPE_LABELS[questionType(q)];

// PocketBase restituisce "YYYY-MM-DD HH:mm:ss.sssZ": lo spazio va sostituito per un parsing affidabile.
function createdOf(q) {
  return q.created ? new Date(q.created.replace(' ', 'T')) : null;
}

// Altezza minima di una riga (contenuto al massimo: testo su 2 righe, argomento + materia su una riga ciascuno):
// serve a calcolare quante righe entrano nella tabella; lo spazio avanzato viene poi diviso tra le righe.
const ROW_HEIGHT = 62;
const WIDE_QUERY = '(min-width: 881px)';

const bloomRank = q => BLOOM_LEVELS.indexOf((q.bloom_level || '').toLowerCase());

const SORTERS = {
  topic:   (a, b) => topicOf(a).localeCompare(topicOf(b)),
  content: (a, b) => (a.content || '').localeCompare(b.content || ''),
  type:    (a, b) => typeOf(a).localeCompare(typeOf(b)),
  bloom:   (a, b) => bloomRank(a) - bloomRank(b),
  created: (a, b) => (createdOf(a)?.getTime() || 0) - (createdOf(b)?.getTime() || 0),
};

const filterInput = {
  display: 'block', width: '100%', height: 28, boxSizing: 'border-box', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 7,
  padding: '0 8px', fontFamily: font, fontSize: 12.5, color: C.text, outline: 'none',
};

function IconBtn({ icon: Icon, label, onClick, disabled, danger }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick(); }}
      disabled={disabled}
      title={label}
      aria-label={label}
      style={{
        width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 7,
        background: 'transparent', border: `1px solid ${danger ? C.error.border : C.border}`,
        color: danger ? C.error.text : C.textBody, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.45 : 1,
      }}
    >
      <Icon size={14} />
    </button>
  );
}

// Intestazione di colonna cliccabile per ordinare.
function SortTh({ label, sortKey, sort, onSort, width }) {
  const active = sort.key === sortKey;
  const Icon = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th style={{ ...headThStyle, width }}>
      <button
        onClick={() => onSort(sortKey)}
        style={{ display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: font, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: active ? C.text : C.textMuted }}
      >
        {label} <Icon size={12} style={{ opacity: active ? 1 : 0.5 }} />
      </button>
    </th>
  );
}

const thStyle = { textAlign: 'left', padding: '9px 12px', background: C.headerBg, borderBottom: `1px solid ${C.border}` };
// Celle della riga dei filtri: stesso spazio sopra e sotto, contenuto centrato.
const filterThStyle = { ...thStyle, padding: '3px 10px 7px', verticalAlign: 'middle', fontWeight: 400 };
// Riga dei titoli: senza bordo sotto, così titoli e filtri formano un'unica fascia bassa.
const headThStyle = { ...thStyle, padding: '7px 12px 3px', borderBottom: 'none', whiteSpace: 'nowrap' };
const tdStyle = { padding: '9px 12px', borderBottom: `1px solid ${C.borderLight}`, verticalAlign: 'top', fontSize: 13.5, color: C.textBody };

// Riga della tabella: il click apre il dialog con tutti i dettagli (QuestionDetailModal).
function QuestionRow({ q, height, selected, onToggle, onOpen, onEdit, onDelete, onClassify, classifying, classifyDisabled }) {
  const created = createdOf(q);
  const subject = (q.subject || '').trim();
  const sc = subject ? colorForTag(subject) : null;
  const rowBg = selected ? C.expandBg : C.surface;
  return (
    <tr className="q-row" onClick={onOpen} style={{ height, background: rowBg, cursor: 'pointer' }}>
      <td style={{ ...tdStyle, width: 36 }} onClick={e => e.stopPropagation()}>
        <input type="checkbox" checked={selected} onChange={onToggle} aria-label="Seleziona domanda" style={{ width: 16, height: 16, accentColor: C.green, cursor: 'pointer' }} />
      </td>
      <td style={tdStyle}>
        <div title={q.topic} style={{ color: C.text, fontWeight: 500, maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{(q.topic || '').trim() || '—'}</div>
        {subject && <span title={subject} style={{ display: 'inline-block', maxWidth: 200, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', verticalAlign: 'top', background: sc.bg, color: sc.color, padding: '1px 8px', borderRadius: 20, fontSize: 11.5, fontWeight: 600 }}>{subject}</span>}
      </td>
      <td style={{ ...tdStyle, color: C.text }}>
        <div style={{ fontFamily: serif, fontSize: 14.5, lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {q.content || '—'}
        </div>
      </td>
      <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{typeOf(q)}</td>
      <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
        {classifying
          ? <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.textFaint }}><Spinner size={13} /> Classificazione…</span>
          : <BloomTag level={q.bloom_level} />}
      </td>
      <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
        {created ? created.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
      </td>
      <td style={{ ...tdStyle, width: 1 }}>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
          <IconBtn icon={Pencil} label="Modifica" onClick={onEdit} />
          <IconBtn icon={Tag} label={q.bloom_level ? 'Riclassifica' : "Classifica con l'AI"} onClick={onClassify} disabled={classifyDisabled || classifying} />
          <IconBtn icon={Trash2} label="Elimina" onClick={onDelete} danger />
        </div>
      </td>
    </tr>
  );
}

// Riepilogo sopra la tabella: totale mostrato + quante domande per livello di Bloom.
// I conteggi seguono tutti i filtri tranne quello di Bloom, così si può passare da un livello all'altro;
// cliccando un livello si filtra la tabella.
function BloomSummary({ questions, shown, bloomFilter, onBloomFilter, onClassifyAll, classifyDisabled }) {
  const counts = Object.fromEntries(BLOOM_LEVELS.map(l => [l, 0]));
  let unclassified = 0;
  questions.forEach(q => { const i = bloomRank(q); if (i >= 0) counts[BLOOM_LEVELS[i]]++; else unclassified++; });
  const total = questions.length;

  const levels = [
    ...BLOOM_LEVELS.map(l => ({ key: l, label: BLOOM_LABELS[l], count: counts[l], color: BLOOM_STYLES[l].color, bg: BLOOM_STYLES[l].background })),
    { key: 'none', label: 'Non classificate', count: unclassified, color: C.textFaint, bg: C.headerBg },
  ];

  return (
    <div className="q-summary" style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '10px 14px', marginBottom: 12 }}>
      {/* Totale */}
      <div className="q-summary-total" style={{ display: 'flex', alignItems: 'baseline', gap: 6, paddingRight: 14, borderRight: `1px solid ${C.borderLight}`, whiteSpace: 'nowrap' }}>
        <span style={{ fontFamily: serif, fontSize: 24, fontWeight: 500, color: C.text, lineHeight: 1 }}>{shown}</span>
        <span style={{ fontSize: 12.5, color: C.textMuted }}>{shown === 1 ? 'domanda' : 'domande'}</span>
      </div>

      {/* Distribuzione Bloom: barra segmentata + un chip cliccabile per livello */}
      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
        <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', background: C.borderLight }}>
          {total > 0 && levels.map(l => l.count > 0 && (
            <div key={l.key} title={`${l.label}: ${l.count}`} style={{ flex: l.count, background: l.key === 'none' ? C.borderLight : l.color }} />
          ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {levels.map(l => {
            const active = bloomFilter === l.key;
            const dimmed = bloomFilter && !active;
            return (
              <button
                key={l.key}
                onClick={() => onBloomFilter(active ? '' : l.key)}
                aria-pressed={active}
                title={active ? 'Mostra tutti i livelli' : `Mostra solo: ${l.label}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 20, cursor: 'pointer',
                  background: active ? l.bg : 'transparent', border: `1px solid ${active ? l.color : C.borderLight}`,
                  opacity: dimmed || l.count === 0 ? 0.5 : 1, fontFamily: font, fontSize: 12.5, whiteSpace: 'nowrap',
                  color: l.key === 'none' ? C.textMuted : l.color, fontWeight: 500,
                }}
              >
                <span style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: l.key === 'none' ? C.dot : l.color }} />
                {l.label}
                <strong style={{ color: C.text, fontWeight: 700 }}>{l.count}</strong>
              </button>
            );
          })}
        </div>
      </div>

      {/* Classificazione delle domande non ancora classificate */}
      {unclassified > 0 && onClassifyAll ? (
        <button
          onClick={onClassifyAll}
          disabled={classifyDisabled}
          title={`Classifica con l'AI ${unclassified === 1 ? 'la domanda non classificata' : `le ${unclassified} domande non classificate`}`}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.greenLight, fontFamily: font, fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', cursor: classifyDisabled ? 'not-allowed' : 'pointer', opacity: classifyDisabled ? 0.5 : 1 }}
        >
          <Tag size={13} /> Classifica {unclassified} con l'AI
        </button>
      ) : <span />}
    </div>
  );
}

export default function Dashboard() {
  const [data, setData]                     = useState([]);
  const [documents, setDocuments]           = useState(new Map()); // id → documento (solo nome e file) per la fonte delle domande
  const [loaded, setLoaded]                 = useState(false); // primo caricamento concluso: da qui la pagina mantiene sempre la stessa struttura
  const [error, setError]                   = useState('');
  const [globalFilter, setGlobalFilter]     = useState('');
  const [subjectFilter, setSubjectFilter]   = useState('');
  const [topicFilter, setTopicFilter]       = useState('');
  const [textFilter, setTextFilter]         = useState('');   // filtri colonna della tabella
  const [typeFilter, setTypeFilter]         = useState('');
  const [bloomFilter, setBloomFilter]       = useState('');   // livello Bloom o 'none' = non classificate
  const [dateFilter, setDateFilter]         = useState('');   // giorni indietro da oggi
  const [sort, setSort]                     = useState({ key: 'created', dir: 'desc' });
  const [page, setPage]                     = useState(1);
  const [pageSize, setPageSize]             = useState(10);   // calcolata dall'altezza disponibile della tabella
  const [rowHeight, setRowHeight]           = useState(ROW_HEIGHT); // righe allungate per riempire la tabella
  const [detailId, setDetailId]             = useState(null); // domanda aperta nel dialog dei dettagli
  const [selectedIds, setSelectedIds]       = useState(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting]             = useState(false);
  const [showAddModal, setShowAddModal]     = useState(false);
  const [editQuestion, setEditQuestion]     = useState(null);
  const [classifyingIds, setClassifyingIds] = useState(new Set()); // domande in classificazione in questo momento
  const [bulk, setBulk]                     = useState(null);      // { done, total, failed } classificazione di gruppo
  const [confirmClassify, setConfirmClassify] = useState(null);    // domande da classificare in attesa di conferma
  const [notice, setNotice]                 = useState('');
  const stopBulk = useRef(false);
  const [generateDocId, setGenerateDocId]   = useState('');   // documento da cui generare (arrivo da /documents)
  const navigate = useNavigate();
  const location = useLocation();

  async function loadQuestions() {
    setError('');
    setSelectedIds(new Set());
    try {
      const owner = `owner = "${pb.authStore.model.id}"`;
      const [records, docs] = await Promise.all([
        pb.collection('Question').getFullList({ sort: '-created', filter: owner }),
        // senza il campo text (può essere molto grande); se fallisce le domande si vedono comunque, senza fonte
        pb.collection('Document').getFullList({ filter: owner, fields: 'id,collectionId,collectionName,title,file' }).catch(() => []),
      ]);
      setData(records);
      setDocuments(new Map(docs.map(d => [d.id, d])));
    } catch {
      setError('Errore nel caricamento delle domande.');
    } finally {
      setLoaded(true);
    }
  }

  function toggleSelect(id) {
    setSelectedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }

  async function deleteSelected() {
    setDeleting(true);
    try {
      await Promise.all([...selectedIds].map(id => pb.collection('Question').delete(id)));
      setSelectedIds(new Set());
      setShowDeleteModal(false);
      await loadQuestions();
    } catch {
      setError("Errore durante l'eliminazione delle domande.");
      setShowDeleteModal(false);
    } finally {
      setDeleting(false);
    }
  }

  // Classifica un gruppo di domande (anche una sola): 2 alla volta, ognuna usa 3 richieste AI.
  // Le domande non riuscite restano selezionate per poterle riprovare.
  async function classifyMany(list) {
    const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
    const failures = [];
    let next = 0, done = 0;
    stopBulk.current = false;
    setError(''); setNotice('');
    if (list.length > 1) setBulk({ done: 0, total: list.length, failed: 0 });

    async function worker() {
      while (next < list.length && !stopBulk.current) {
        const q = list[next++];
        setClassifyingIds(prev => new Set(prev).add(q.id));
        try {
          const { winner, modelVotes } = await classifyBloomCouncil(q, apiKey);
          console.log(`[Bloom council] "${q.content.slice(0, 60)}…" → ${winner}`);
          console.table(modelVotes.map(({ model, vote, reply }) => ({ model, vote, reply: reply.slice(0, 120) })));
          setData(prev => prev.map(x => x.id === q.id ? { ...x, bloom_level: winner } : x));
        } catch (err) {
          failures.push({ q, err });
        } finally {
          setClassifyingIds(prev => { const n = new Set(prev); n.delete(q.id); return n; });
          done++;
          if (list.length > 1) setBulk({ done, total: list.length, failed: failures.length });
        }
      }
    }
    await Promise.all([worker(), worker()]);
    setBulk(null);

    const skipped = list.length - done;
    const ok = done - failures.length;
    if (failures.length) {
      setSelectedIds(new Set(failures.map(f => f.q.id)));
      setError(`Classificazione fallita per ${failures.length} ${failures.length === 1 ? 'domanda' : 'domande'}: ${failures[0].err.message} ` +
        (list.length > 1 ? 'Le domande non classificate restano selezionate: premi "Classifica" per riprovare.' : ''));
    }
    if (list.length > 1 && ok > 0) {
      setNotice(`${ok} ${ok === 1 ? 'domanda classificata' : 'domande classificate'}${skipped ? ` · ${skipped} non avviate (interrotto)` : ''}.`);
      if (!failures.length) setSelectedIds(new Set());
    }
  }

  // Più domande: chiede conferma mostrando quante richieste AI verranno usate.
  function requestClassify(list) {
    if (list.length === 1) classifyMany(list);
    else if (list.length > 1) setConfirmClassify(list);
  }

  useEffect(() => { loadQuestions(); }, []);
  useEffect(() => {
    if (location.state?.generateFromDoc) {
      setGenerateDocId(location.state.generateFromDoc);
      setShowAddModal(true);
      window.history.replaceState({}, '');
    }
  }, []);

  // Tutti i filtri tranne il livello Bloom: su questa lista si calcola il riepilogo per livello.
  const baseFiltered = useMemo(() => {
    const t = globalFilter.trim().toLowerCase();
    const text = textFilter.trim().toLowerCase();
    const since = dateFilter ? (() => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (Number(dateFilter) - 1)); return d; })() : null;
    return data.filter(q => {
      if (subjectFilter && subjectOf(q) !== subjectFilter) return false;
      if (topicFilter && topicOf(q) !== topicFilter) return false;
      if (text && !q.content?.toLowerCase().includes(text)) return false;
      if (typeFilter && typeOf(q) !== typeFilter) return false;
      if (since && !(createdOf(q) >= since)) return false;
      if (!t) return true;
      return q.subject?.toLowerCase().includes(t) || q.topic?.toLowerCase().includes(t) ||
             q.content?.toLowerCase().includes(t) || q.bloom_level?.toLowerCase().includes(t);
    });
  }, [data, globalFilter, subjectFilter, topicFilter, textFilter, typeFilter, dateFilter]);

  const filtered = useMemo(() => {
    const list = baseFiltered.filter(q =>
      bloomFilter === 'none' ? bloomRank(q) < 0 : !bloomFilter || (q.bloom_level || '').toLowerCase() === bloomFilter);
    const dir = sort.dir === 'asc' ? 1 : -1;
    return list.sort((a, b) => SORTERS[sort.key](a, b) * dir);
  }, [baseFiltered, bloomFilter, sort]);

  // Argomenti proposti nel filtro colonna: quelli della materia selezionata nella barra laterale.
  const topicOptions = useMemo(() =>
    [...new Set(data.filter(q => !subjectFilter || subjectOf(q) === subjectFilter).map(topicOf))].sort((a, b) => a.localeCompare(b)),
  [data, subjectFilter]);

  // Qualsiasi cambio di filtro o ordinamento riporta alla prima pagina.
  useEffect(() => { setPage(1); }, [globalFilter, subjectFilter, topicFilter, textFilter, typeFilter, bloomFilter, dateFilter, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = useMemo(() => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize), [filtered, currentPage, pageSize]);

  // Cambiando pagina la tabella torna alla prima riga.
  const tableScrollRef = useRef(null);
  const theadRef = useRef(null);
  const tableRef = useRef(null);
  const pageSizeRef = useRef(pageSize);

  // Righe per pagina = quante ne entrano nello spazio della tabella (ricalcolate al ridimensionamento).
  // Su schermi stretti la pagina scorre normalmente e si usano 10 righe.
  // Al cambio si resta sulla pagina che contiene la prima riga mostrata finora.
  useEffect(() => {
    const el = tableScrollRef.current;
    if (!el) return;
    const wide = window.matchMedia(WIDE_QUERY);
    function update() {
      const available = el.clientHeight - (theadRef.current?.offsetHeight || 0);
      const next = wide.matches ? Math.max(3, Math.floor(available / (ROW_HEIGHT + 1))) : 10;
      setRowHeight(wide.matches ? Math.max(ROW_HEIGHT, available / next - 1) : ROW_HEIGHT);
      const prev = pageSizeRef.current;
      if (next === prev) return;
      pageSizeRef.current = next;
      setPageSize(next);
      setPage(p => Math.floor(((p - 1) * prev) / next) + 1);
    }
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    wide.addEventListener('change', update);
    return () => { observer.disconnect(); wide.removeEventListener('change', update); };
  }, [loaded]);

  // Correzione fine: su una pagina piena la tabella deve arrivare esattamente in fondo (bordi e
  // arrotondamenti del browser possono lasciare qualche pixel). Si misura e si ridistribuisce lo scarto.
  // Non si applica all'ultima pagina incompleta né quando una riga è aperta sul dettaglio.
  useLayoutEffect(() => {
    const el = tableScrollRef.current, table = tableRef.current;
    if (!el || !table || !window.matchMedia(WIDE_QUERY).matches) return;
    if (pageRows.length < pageSize) return;
    const diff = el.clientHeight - table.offsetHeight;
    if (Math.abs(diff) >= 1) setRowHeight(h => Math.max(ROW_HEIGHT, h + diff / pageSize));
  }, [pageRows, pageSize, rowHeight]);
  useEffect(() => { if (tableScrollRef.current) tableScrollRef.current.scrollTop = 0; }, [currentPage, pageSize]);

  const unclassified = baseFiltered.filter(q => bloomRank(q) < 0);
  const allShownSelected = filtered.length > 0 && filtered.every(q => selectedIds.has(q.id));
  const hasColumnFilters = !!(textFilter || typeFilter || bloomFilter || dateFilter || topicFilter);

  function clearFilters() {
    setGlobalFilter(''); setSubjectFilter(''); setTopicFilter('');
    setTextFilter(''); setTypeFilter(''); setBloomFilter(''); setDateFilter('');
  }

  function toggleSort(key) {
    setSort(prev => prev.key === key
      ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      : { key, dir: key === 'created' ? 'desc' : 'asc' });
  }

  // Il dialog legge la domanda da data: si aggiorna da solo (es. dopo la classificazione) e si chiude se viene eliminata.
  const detailQuestion = detailId ? data.find(q => q.id === detailId) : null;

  function toggleAllShown() {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allShownSelected) filtered.forEach(q => next.delete(q.id));
      else filtered.forEach(q => next.add(q.id));
      return next;
    });
  }

  return (
    <>
      <PageStyles />
      <style>{`
        .q-row:hover { background: ${C.expandBg} !important; }
        .q-summary { display: grid; grid-template-columns: auto 1fr auto; gap: 14px; align-items: center; }
        /* Su schermi larghi la pagina occupa esattamente lo schermo: le righe scorrono dentro la tabella
           e la paginazione resta sempre visibile in fondo. */
        @media (min-width: 881px) {
          .q-fit { height: 100vh; display: flex; flex-direction: column; }
          .q-fit > main { flex: 1; min-height: 0; width: 100%; box-sizing: border-box; display: flex; flex-direction: column; }
          .q-fit .q-layout { flex: 1; min-height: 0; grid-template-rows: minmax(0, 1fr); align-items: stretch; }
          .q-fit .q-layout > aside { min-height: 0; overflow-y: auto; }
          .q-fit .q-layout > section { min-height: 0; display: flex; flex-direction: column; }
          .q-fit .q-table-card { flex: 1; min-height: 0; display: flex; flex-direction: column; }
          .q-fit .q-table-scroll { flex: 1; min-height: 140px; overflow: auto; }
        }
        @media (max-width: 640px) {
          .q-summary { grid-template-columns: 1fr; }
          .q-summary-total { border-right: none !important; padding-right: 0 !important; }
        }
      `}</style>

      <div className="q-fit" style={{ minHeight: '100vh', background: C.bg, fontFamily: font }}>
        <Navbar />

        <main style={{ padding: '0.75rem 2rem 1rem', maxWidth: 1360, margin: '0 auto' }}>
          <div style={{ marginBottom: '0.6rem' }}>
            <h1 style={{ fontFamily: serif, fontSize: 21, color: C.text, fontWeight: 500, margin: 0, lineHeight: 1.3 }}>Le tue domande</h1>
            <p style={{ fontSize: 13.5, color: C.textMuted, margin: 0 }}>
              {data.length} {data.length === 1 ? 'domanda' : 'domande'} nel tuo archivio
            </p>
          </div>

          <div className="q-layout">
            {/* ── Barra laterale: materie e argomenti ── */}
            {loaded && (
              <SubjectSidebar
                records={data}
                allLabel="Tutte le domande"
                subjectFilter={subjectFilter}
                topicFilter={topicFilter}
                onSubjectChange={setSubjectFilter}
                onTopicChange={setTopicFilter}
                showAllTopics
              />
            )}

            {/* ── Contenuto principale ── */}
            <section>
              {/* Toolbar */}
              <ListToolbar
                search={globalFilter}
                onSearch={setGlobalFilter}
                placeholder="Cerca una domanda…"
                addLabel="Nuova domanda"
                onAdd={() => setShowAddModal(true)}
              />

              {/* Azioni sulla selezione (il "seleziona tutte" è la casella nell'intestazione della tabella) */}
              {selectedIds.size > 0 && (
                <SelectionBar allSelected={allShownSelected} onToggleAll={toggleAllShown} allLabel="Seleziona tutte" selectedCount={selectedIds.size} selectedLabel="selezionate">
                  <button
                    onClick={() => navigate('/tests/new', { state: { preselectedQuestions: data.filter(q => selectedIds.has(q.id)) } })}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: '#E6EEF6', border: '1px solid #B8CDE0', borderRadius: 8, cursor: 'pointer', color: '#2A5C8A', fontFamily: font, fontSize: 13, fontWeight: 500 }}
                  >
                    <ClipboardCheck size={14} /> Crea un test con le domande selezionate
                  </button>
                  <button
                    onClick={() => requestClassify(data.filter(q => selectedIds.has(q.id)))}
                    disabled={classifyingIds.size > 0}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, cursor: classifyingIds.size > 0 ? 'not-allowed' : 'pointer', color: C.textBody, fontFamily: font, fontSize: 13, fontWeight: 500, opacity: classifyingIds.size > 0 ? 0.5 : 1 }}
                  >
                    <Tag size={14} /> Classifica
                  </button>
                  <BulkDeleteBtn icon={Trash2} onClick={() => setShowDeleteModal(true)} />
                </SelectionBar>
              )}

              {loaded && (
                <BloomSummary
                  questions={baseFiltered}
                  shown={filtered.length}
                  bloomFilter={bloomFilter}
                  onBloomFilter={setBloomFilter}
                  onClassifyAll={bulk ? null : () => requestClassify(unclassified)}
                  classifyDisabled={classifyingIds.size > 0}
                />
              )}

              {bulk && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14, padding: '12px 16px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10 }}>
                  <div style={{ flex: 1 }}>
                    <ProgressBar done={bulk.done} total={bulk.total} label={`Classificazione in corso${bulk.failed ? ` · ${bulk.failed} non riuscite` : ''}`} />
                  </div>
                  <button
                    onClick={() => { stopBulk.current = true; }}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, color: C.textMuted, fontFamily: font, fontSize: 13.5, cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    <Square size={12} /> Interrompi
                  </button>
                </div>
              )}

              {notice && !bulk && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#E6F2ED', border: `1px solid ${C.greenAccent}`, color: '#1F6B4E', fontSize: 13, borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
                  <Check size={15} /> <span style={{ flex: 1 }}>{notice}</span>
                  <button onClick={() => setNotice('')} style={{ background: 'none', border: 'none', color: '#1F6B4E', cursor: 'pointer', fontSize: 16, lineHeight: 1 }} aria-label="Chiudi">×</button>
                </div>
              )}

              {error && (
                <div style={{ background: C.error.bg, border: `1px solid ${C.error.border}`, color: C.error.text, fontSize: 13, borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
                  {error}
                </div>
              )}

              {!loaded ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: C.textFaint }}>
                  <Spinner size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Caricamento…
                </div>
              ) : (
                <div className="q-table-card" style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
                  <div className="q-table-scroll" ref={tableScrollRef} style={{ overflowX: 'auto' }}>
                    <table ref={tableRef} style={{ width: '100%', minWidth: 880, borderCollapse: 'collapse', fontFamily: font }}>
                      <thead ref={theadRef} style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                        <tr>
                          <th style={{ ...headThStyle, width: 36 }}>
                            <input type="checkbox" checked={allShownSelected} onChange={toggleAllShown} aria-label="Seleziona tutte le domande filtrate" style={{ width: 16, height: 16, accentColor: C.green, cursor: 'pointer' }} />
                          </th>
                          <SortTh label="Argomento" sortKey="topic" sort={sort} onSort={toggleSort} width="18%" />
                          <SortTh label="Testo" sortKey="content" sort={sort} onSort={toggleSort} />
                          <SortTh label="Tipo" sortKey="type" sort={sort} onSort={toggleSort} width={150} />
                          <SortTh label="Categoria di Bloom" sortKey="bloom" sort={sort} onSort={toggleSort} width={185} />
                          <SortTh label="Data di creazione" sortKey="created" sort={sort} onSort={toggleSort} width={175} />
                          <th style={{ ...headThStyle, width: 1 }} />
                        </tr>
                        {/* Filtri di colonna */}
                        <tr>
                          <th style={filterThStyle} />
                          <th style={filterThStyle}>
                            <select value={topicFilter} onChange={e => setTopicFilter(e.target.value)} style={filterInput} aria-label="Filtra per argomento">
                              <option value="">Tutti</option>
                              {topicOptions.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </th>
                          <th style={filterThStyle}>
                            <input value={textFilter} onChange={e => setTextFilter(e.target.value)} placeholder="Filtra il testo…" style={filterInput} aria-label="Filtra per testo" />
                          </th>
                          <th style={filterThStyle}>
                            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={filterInput} aria-label="Filtra per tipo">
                              <option value="">Tutti</option>
                              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </th>
                          <th style={filterThStyle}>
                            <select value={bloomFilter} onChange={e => setBloomFilter(e.target.value)} style={filterInput} aria-label="Filtra per categoria di Bloom">
                              <option value="">Tutte</option>
                              {BLOOM_LEVELS.map(l => <option key={l} value={l}>{BLOOM_LABELS[l]}</option>)}
                              <option value="none">Non classificate</option>
                            </select>
                          </th>
                          <th style={filterThStyle}>
                            <select value={dateFilter} onChange={e => setDateFilter(e.target.value)} style={filterInput} aria-label="Filtra per data di creazione">
                              <option value="">Sempre</option>
                              {DATE_RANGES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                            </select>
                          </th>
                          <th style={{ ...filterThStyle, textAlign: 'right' }}>
                            {hasColumnFilters && (
                              <button
                                onClick={() => { setTopicFilter(''); setTextFilter(''); setTypeFilter(''); setBloomFilter(''); setDateFilter(''); }}
                                title="Azzera i filtri di colonna"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: C.greenLight, fontFamily: font, fontSize: 12.5, fontWeight: 500, whiteSpace: 'nowrap' }}
                              >
                                <X size={13} /> Azzera
                              </button>
                            )}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageRows.map(q => (
                          <QuestionRow
                            key={q.id}
                            q={q}
                            height={rowHeight}
                            selected={selectedIds.has(q.id)}
                            onToggle={() => toggleSelect(q.id)}
                            onOpen={() => setDetailId(q.id)}
                            onEdit={() => setEditQuestion(q)}
                            onDelete={() => { setSelectedIds(new Set([q.id])); setShowDeleteModal(true); }}
                            onClassify={() => classifyMany([q])}
                            classifying={classifyingIds.has(q.id)}
                            classifyDisabled={classifyingIds.size > 0}
                          />
                        ))}
                      </tbody>
                    </table>

                    {/* Archivio vuoto o nessun risultato: messaggio dentro la tabella, la struttura resta uguale */}
                    {filtered.length === 0 && (data.length === 0 ? (
                      <EmptyState icon={Inbox} message="Non hai ancora nessuna domanda. Creane una per iniziare." actionLabel="+ Crea la tua prima domanda" onAction={() => setShowAddModal(true)} />
                    ) : (
                      <EmptyState icon={Inbox} message="Nessuna domanda corrisponde ai filtri." actionLabel="Azzera i filtri" onAction={clearFilters} />
                    ))}
                  </div>

                  <Pagination
                    style={{ borderTop: `1px solid ${C.borderLight}` }}
                    page={currentPage}
                    pageSize={pageSize}
                    total={filtered.length}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </section>
          </div>
        </main>
      </div>

      {detailQuestion && (
        <QuestionDetailModal
          question={detailQuestion}
          source={documents.get(detailQuestion.document)}
          onClose={() => setDetailId(null)}
          onEdit={() => { setDetailId(null); setEditQuestion(detailQuestion); }}
          onDelete={() => { setDetailId(null); setSelectedIds(new Set([detailQuestion.id])); setShowDeleteModal(true); }}
          onClassify={() => classifyMany([detailQuestion])}
          classifying={classifyingIds.has(detailQuestion.id)}
          classifyDisabled={classifyingIds.size > 0}
        />
      )}

      {editQuestion && (
        <EditQuestionModal
          question={editQuestion}
          data={data}
          onClose={() => setEditQuestion(null)}
          onSaved={() => { setEditQuestion(null); loadQuestions(); }}
        />
      )}

      {showAddModal && (
        <AddQuestionModal
          data={data}
          initialMode={generateDocId ? 'generate' : 'manual'}
          initialDocId={generateDocId}
          onClose={() => { setShowAddModal(false); setGenerateDocId(''); }}
          onSaved={() => { setShowAddModal(false); setGenerateDocId(''); loadQuestions(); }}
        />
      )}

      {confirmClassify && (
        <ConfirmModal
          icon={Tag}
          danger={false}
          title="Classifica domande"
          message={<>Stai per classificare <strong>{confirmClassify.length} domande</strong> con l'AI. Userà circa <strong>{confirmClassify.length * 3} richieste</strong> (3 per domanda); con il piano gratuito ne hai 50 al giorno. Puoi interrompere in qualsiasi momento.</>}
          confirmLabel={`Classifica ${confirmClassify.length}`}
          onConfirm={() => { const list = confirmClassify; setConfirmClassify(null); classifyMany(list); }}
          onCancel={() => setConfirmClassify(null)}
        />
      )}

      {showDeleteModal && (
        <ConfirmModal
          icon={Trash2}
          title="Elimina domande"
          message={<>Stai per eliminare <strong>{selectedIds.size} {selectedIds.size === 1 ? 'domanda' : 'domande'}</strong>. Questa azione è irreversibile.</>}
          confirmLabel="Elimina"
          loading={deleting}
          onConfirm={deleteSelected}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
    </>
  );
}
