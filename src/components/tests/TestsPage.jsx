import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Trash2, Pencil, Download, ClipboardX, ChevronDown, Check, X, CalendarDays, ListChecks, CheckCircle2 } from 'lucide-react';
import pb from '../../lib/pocketbase';
import { C, font, serif, colorForTag } from '../../styles/theme';
import ExportTestModal from './ExportTestModal';
import BloomDistribution from './BloomDistribution';
import Navbar from '../common/Navbar';
import Spinner from '../common/Spinner';
import EmptyState from '../common/EmptyState';
import ConfirmModal from '../common/ConfirmModal';
import SelectDot from '../common/SelectDot';
import BloomTag from '../common/BloomTag';
import ListToolbar, { SelectionBar, BulkDeleteBtn } from '../common/ListToolbar';
import SubjectSidebar, { PageStyles } from '../common/SubjectSidebar';
import { subjectOf, topicOf } from '../../lib/grouping';

function parseOptions(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string' && raw) { try { const p = JSON.parse(raw); return Array.isArray(p) ? p : [raw]; } catch { return [raw]; } }
  return [];
}

// Le domande arrivano via expand: possono essere undefined, oggetto singolo o array.
function questionsOf(test) {
  const x = test.expand?.questions;
  return Array.isArray(x) ? x : x ? [x] : [];
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso.replace(' ', 'T'));
  return isNaN(d) ? '' : d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Domanda compatta nell'anteprima del test ─────────────────────────────────
function TestQuestion({ q, index }) {
  const options = parseOptions(q.options).filter(o => o?.trim());
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '16px 0', borderTop: `1px solid ${C.borderLight}` }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: C.textFaint, minWidth: 24, marginTop: 2 }}>{index + 1}.</span>
        <span style={{ fontFamily: serif, fontSize: 15.5, color: C.text, lineHeight: 1.5, fontWeight: 500 }}>{q.content || '—'}</span>
      </div>
      {options.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8, paddingLeft: 36 }}>
          {options.map((opt, i) => {
            const correct = opt === q.correct_answer;
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 9, fontSize: 14,
                background: correct ? 'rgba(168,197,160,0.25)' : C.expandBg,
                border: `1px solid ${correct ? C.greenAccent : C.borderLight}`,
                color: correct ? C.green : C.textBody, fontWeight: correct ? 600 : 400,
              }}>
                <span style={{
                  width: 22, height: 22, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 600, background: correct ? C.green : C.borderLight, color: correct ? '#FFF' : C.textMuted,
                }}>
                  {correct ? <Check size={13} /> : String.fromCharCode(65 + i)}
                </span>
                <span>{opt}</span>
              </div>
            );
          })}
        </div>
      )}
      <div style={{ paddingLeft: 36 }}><BloomTag level={q.bloom_level} /></div>
    </div>
  );
}

// ── Riga test ─────────────────────────────────────────────────────────────────
function TestRow({ test, selected, onToggle, expanded, onToggleExpand, onOpen, onExport, onDelete }) {
  const questions = questionsOf(test);
  const qCount = questions.length || (Array.isArray(test.questions) ? test.questions.length : 0);
  const date = formatDate(test.updated || test.created);
  const stop = fn => e => { e.stopPropagation(); fn(); };

  return (
    <article
      onClick={onOpen}
      className="t-row"
      style={{
        background: C.surface, borderRadius: 16, cursor: 'pointer',
        border: `1px solid ${selected ? C.green : C.border}`,
        boxShadow: selected ? `0 0 0 3px ${C.expandBg}` : 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
    >
      <div className="t-row-main" style={{ padding: '22px 24px' }}>
        <div onClick={e => e.stopPropagation()} style={{ paddingTop: 2 }}>
          <SelectDot selected={selected} onToggle={onToggle} />
        </div>

        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h3 style={{ fontFamily: serif, fontSize: 19, color: C.text, lineHeight: 1.35, fontWeight: 500, margin: 0 }}>
            {test.description || 'Test senza titolo'}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px 14px', fontSize: 14, color: C.textMuted }}>
            {test.subject?.trim() && (() => { const sc = colorForTag(test.subject.trim()); return (
              <span style={{ background: sc.bg, color: sc.color, padding: '3px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600 }}>{test.subject.trim()}</span>
            ); })()}
            {test.topic?.trim() && <span style={{ color: C.textBody, fontWeight: 500 }}>{test.topic.trim()}</span>}
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><ListChecks size={15} /> {qCount} {qCount === 1 ? 'domanda' : 'domande'}</span>
            {date && <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><CalendarDays size={15} /> {date}</span>}
          </div>
          {qCount > 0 && <div style={{ maxWidth: 520, marginTop: 2 }}><BloomDistribution questions={questions} /></div>}
        </div>

        <div className="t-row-actions" onClick={e => e.stopPropagation()}>
          <button
            onClick={onExport}
            disabled={qCount === 0}
            title={qCount === 0 ? 'Aggiungi almeno una domanda per esportare' : 'Scarica in Word, PDF o per Moodle'}
            style={{ display: 'flex', alignItems: 'center', gap: 7, height: 40, padding: '0 16px', borderRadius: 10, background: C.green, border: 'none', color: '#FFF', fontFamily: font, fontSize: 14, fontWeight: 500, cursor: qCount === 0 ? 'not-allowed' : 'pointer', opacity: qCount === 0 ? 0.45 : 1 }}
          >
            <Download size={15} /> Esporta
          </button>
          <button
            onClick={onOpen}
            style={{ display: 'flex', alignItems: 'center', gap: 7, height: 40, padding: '0 16px', borderRadius: 10, background: 'transparent', border: `1px solid ${C.border}`, color: C.textBody, fontFamily: font, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
          >
            <Pencil size={15} /> Modifica
          </button>
          <button
            onClick={onDelete}
            title="Elimina test"
            aria-label="Elimina test"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 10, background: 'transparent', border: `1px solid ${C.error.border}`, color: C.error.text, cursor: 'pointer' }}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {qCount > 0 && (
        <div onClick={e => e.stopPropagation()} style={{ borderTop: `1px solid ${C.borderLight}`, padding: expanded ? '4px 24px 8px' : 0, cursor: 'default' }}>
          <button
            onClick={stop(onToggleExpand)}
            aria-expanded={expanded}
            style={{ display: 'flex', alignItems: 'center', gap: 8, width: expanded ? 'auto' : '100%', padding: expanded ? '12px 0' : '12px 24px', background: 'none', border: 'none', cursor: 'pointer', color: C.greenLight, fontFamily: font, fontSize: 14, fontWeight: 500 }}
          >
            <ChevronDown size={17} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            {expanded ? 'Nascondi anteprima' : `Anteprima delle ${qCount === 1 ? 'domanda' : `${qCount} domande`}`}
          </button>
          {expanded && questions.map((q, i) => <TestQuestion key={q.id} q={q} index={i} />)}
        </div>
      )}
    </article>
  );
}

// ── Componente principale ─────────────────────────────────────────────────────

export default function TestsPage() {
  const [data, setData]                       = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState('');
  const [globalFilter, setGlobalFilter]       = useState('');
  const [subjectFilter, setSubjectFilter]     = useState('');
  const [topicFilter, setTopicFilter]         = useState('');
  const [expandedTests, setExpandedTests]     = useState(new Set());
  const [selectedIds, setSelectedIds]         = useState(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting]               = useState(false);
  const [notice, setNotice]                   = useState('');
  const [exportTest, setExportTest]           = useState(null);

  const location = useLocation();
  const navigate = useNavigate();

  async function loadTests() {
    setLoading(true); setError('');
    setSelectedIds(new Set());
    try {
      const records = await pb.collection('Test').getFullList({ sort: '-created', filter: `owner = "${pb.authStore.model.id}"`, expand: 'questions' });
      setData(records);
    } catch {
      setError('Errore nel caricamento dei test.');
    } finally {
      setLoading(false);
    }
  }

  function toggleSelect(id) {
    setSelectedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }
  function toggleExpand(id) {
    setExpandedTests(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }

  async function deleteSelected() {
    setDeleting(true);
    try {
      await Promise.all([...selectedIds].map(id => pb.collection('Test').delete(id)));
      setSelectedIds(new Set());
      setShowDeleteModal(false);
      await loadTests();
    } catch {
      setError("Errore durante l'eliminazione dei test.");
      setShowDeleteModal(false);
    } finally {
      setDeleting(false);
    }
  }

  useEffect(() => { loadTests(); }, []);
  useEffect(() => {
    if (location.state?.notice) {
      setNotice(location.state.notice);
      window.history.replaceState({}, '');
    }
  }, []);

  const filtered = useMemo(() => {
    const t = globalFilter.trim().toLowerCase();
    return data.filter(test => {
      if (subjectFilter && subjectOf(test) !== subjectFilter) return false;
      if (topicFilter && topicOf(test) !== topicFilter) return false;
      if (!t) return true;
      return test.subject?.toLowerCase().includes(t) || test.topic?.toLowerCase().includes(t) ||
             test.description?.toLowerCase().includes(t);
    });
  }, [data, globalFilter, subjectFilter, topicFilter]);

  const allShownSelected = filtered.length > 0 && filtered.every(t => selectedIds.has(t.id));
  const hasFilters = !!(globalFilter || subjectFilter || topicFilter);

  function toggleAllShown() {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allShownSelected) filtered.forEach(t => next.delete(t.id));
      else filtered.forEach(t => next.add(t.id));
      return next;
    });
  }

  return (
    <>
      <PageStyles />
      <style>{`
        .t-row:hover { border-color: ${C.greenAccent} !important; box-shadow: 0 4px 18px rgba(0,0,0,0.06) !important; }
        .t-row-main { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 18px; align-items: start; }
        .t-row-actions { display: flex; gap: 8px; align-items: center; }
        @media (max-width: 760px) {
          .t-row-main { grid-template-columns: auto minmax(0, 1fr); }
          .t-row-actions { grid-column: 1 / -1; flex-wrap: wrap; }
        }
      `}</style>

      <div style={{ minHeight: '100vh', background: C.bg, fontFamily: font }}>
        <Navbar />

        <main style={{ padding: '2rem 2rem 4rem', maxWidth: 1360, margin: '0 auto' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h1 style={{ fontFamily: serif, fontSize: 30, color: C.text, fontWeight: 500, margin: '0 0 4px' }}>I tuoi test</h1>
            <p style={{ fontSize: 15, color: C.textMuted, margin: 0 }}>
              {filtered.length} test{hasFilters ? ' trovati' : ' nel tuo archivio'}
            </p>
          </div>

          <div className="q-layout">
            {data.length > 0 && (
              <SubjectSidebar
                records={data}
                allLabel="Tutti i test"
                subjectFilter={subjectFilter}
                topicFilter={topicFilter}
                onSubjectChange={setSubjectFilter}
                onTopicChange={setTopicFilter}
              />
            )}

            <section>
              <ListToolbar
                search={globalFilter}
                onSearch={setGlobalFilter}
                placeholder="Cerca un test…"
                addLabel="Nuovo test"
                onAdd={() => navigate('/tests/new')}
              />

              {filtered.length > 0 && (
                <SelectionBar allSelected={allShownSelected} onToggleAll={toggleAllShown} allLabel="Seleziona tutti" selectedCount={selectedIds.size} selectedLabel="selezionati">
                  <BulkDeleteBtn icon={Trash2} onClick={() => setShowDeleteModal(true)} />
                </SelectionBar>
              )}

              {notice && (
                <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#EFF5E6', border: `1px solid ${C.greenAccent}`, color: C.greenLight, fontSize: 14.5, fontWeight: 500, borderRadius: 12, padding: '12px 16px', marginBottom: 16 }}>
                  <CheckCircle2 size={18} />
                  <span style={{ flex: 1 }}>{notice}</span>
                  <button onClick={() => setNotice('')} aria-label="Chiudi" style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.greenLight, display: 'flex', padding: 4 }}><X size={16} /></button>
                </div>
              )}

              {error && (
                <div style={{ background: C.error.bg, border: `1px solid ${C.error.border}`, color: C.error.text, fontSize: 13, borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
                  {error}
                </div>
              )}

              {loading ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: C.textFaint }}>
                  <Spinner size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Caricamento…
                </div>
              ) : filtered.length === 0 ? (
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14 }}>
                  <EmptyState
                    icon={ClipboardX}
                    message={hasFilters ? 'Nessun test corrisponde ai filtri.' : 'Non hai ancora creato test. Componine uno a partire dalle tue domande.'}
                    actionLabel={!hasFilters ? '+ Crea il tuo primo test' : 'Azzera i filtri'}
                    onAction={() => hasFilters ? (setGlobalFilter(''), setSubjectFilter(''), setTopicFilter('')) : navigate('/tests/new')}
                  />
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {filtered.map(test => (
                    <TestRow
                      key={test.id}
                      test={test}
                      selected={selectedIds.has(test.id)}
                      onToggle={() => toggleSelect(test.id)}
                      expanded={expandedTests.has(test.id)}
                      onToggleExpand={() => toggleExpand(test.id)}
                      onOpen={() => navigate(`/tests/${test.id}`)}
                      onExport={() => setExportTest(test)}
                      onDelete={() => { setSelectedIds(new Set([test.id])); setShowDeleteModal(true); }}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>

      {exportTest && (
        <ExportTestModal test={exportTest} onClose={() => setExportTest(null)} />
      )}

      {showDeleteModal && (
        <ConfirmModal
          icon={Trash2}
          title="Elimina test"
          message={<>Stai per eliminare <strong>{selectedIds.size} test</strong>. Questa azione è irreversibile.</>}
          confirmLabel="Elimina"
          loading={deleting}
          onConfirm={deleteSelected}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
    </>
  );
}
