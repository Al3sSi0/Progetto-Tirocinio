import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Trash2, Pencil, Tag, ClipboardCheck, Inbox, Check, Square } from 'lucide-react';
import pb from '../../lib/pocketbase';
import { classifyBloomCouncil } from '../../lib/classifyBloom';
import { C, font, serif } from '../../styles/theme';
import AddQuestionModal from './AddQuestionModal';
import EditQuestionModal from './EditQuestionModal';
import Navbar from '../common/Navbar';
import Spinner from '../common/Spinner';
import EmptyState from '../common/EmptyState';
import ConfirmModal from '../common/ConfirmModal';
import { ProgressBar } from '../common/GenerationUI';
import SelectDot from '../common/SelectDot';
import ActionBtn from '../common/ActionBtn';
import BloomTag from '../common/BloomTag';
import ListToolbar, { SelectionBar, BulkDeleteBtn } from '../common/ListToolbar';
import SubjectSidebar, { PageStyles, SubjectTopic } from '../common/SubjectSidebar';
import { subjectOf, topicOf } from '../../lib/grouping';

function parseOptions(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string' && raw) { try { const p = JSON.parse(raw); return Array.isArray(p) ? p : [raw]; } catch { return [raw]; } }
  return [];
}

function QuestionCard({ q, selected, onToggle, onEdit, onDelete, onClassify, classifying, classifyDisabled }) {
  const options = parseOptions(q.options);
  return (
    <div style={{
      background: C.surface, borderRadius: 14, padding: '18px 20px 16px',
      border: `1px solid ${selected ? C.green : C.border}`,
      boxShadow: selected ? `0 0 0 3px ${C.expandBg}` : 'none',
      transition: 'border-color 0.15s, box-shadow 0.15s',
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      {/* Riga superiore: materia/argomento + selezione */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <SubjectTopic subject={q.subject} topic={q.topic} />
        <SelectDot selected={selected} onToggle={onToggle} />
      </div>

      {/* Testo della domanda */}
      <div style={{ fontFamily: serif, fontSize: 16.5, color: C.text, lineHeight: 1.5, fontWeight: 500 }}>
        {q.content || '—'}
      </div>

      {/* Opzioni */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
        {options.map((opt, i) => {
          const correct = opt === q.correct_answer;
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, fontSize: 13.5,
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

      {/* Footer: bloom + azioni */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, paddingTop: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {classifying ? <><Spinner size={13} /><span style={{ fontSize: 13.5, color: C.textFaint }}>Classificazione…</span></> : <BloomTag level={q.bloom_level} />}
          {!q.bloom_level && !classifying && (
            <button
              onClick={onClassify}
              disabled={classifyDisabled}
              style={{ background: 'none', border: 'none', color: C.greenLight, fontFamily: font, fontSize: 13.5, fontWeight: 500, cursor: classifyDisabled ? 'not-allowed' : 'pointer', textDecoration: 'underline', opacity: classifyDisabled ? 0.45 : 1 }}
            >
              Classifica con l'AI
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <ActionBtn icon={Pencil} label="Modifica" onClick={onEdit} />
          {q.bloom_level && <ActionBtn icon={Tag} label="Riclassifica" onClick={onClassify} disabled={classifyDisabled || classifying} />}
          <ActionBtn icon={Trash2} label="Elimina" onClick={onDelete} danger />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData]                     = useState([]);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState('');
  const [globalFilter, setGlobalFilter]     = useState('');
  const [subjectFilter, setSubjectFilter]   = useState('');
  const [topicFilter, setTopicFilter]       = useState('');
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
    setLoading(true); setError('');
    setSelectedIds(new Set());
    try {
      const records = await pb.collection('Question').getFullList({ sort: '-created', filter: `owner = "${pb.authStore.model.id}"` });
      setData(records);
    } catch {
      setError('Errore nel caricamento delle domande.');
    } finally {
      setLoading(false);
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

  const filtered = useMemo(() => {
    const t = globalFilter.trim().toLowerCase();
    return data.filter(q => {
      if (subjectFilter && subjectOf(q) !== subjectFilter) return false;
      if (topicFilter && topicOf(q) !== topicFilter) return false;
      if (!t) return true;
      return q.subject?.toLowerCase().includes(t) || q.topic?.toLowerCase().includes(t) ||
             q.content?.toLowerCase().includes(t) || q.bloom_level?.toLowerCase().includes(t);
    });
  }, [data, globalFilter, subjectFilter, topicFilter]);

  const unclassified = filtered.filter(q => !q.bloom_level);
  const allShownSelected = filtered.length > 0 && filtered.every(q => selectedIds.has(q.id));
  const hasFilters = !!(globalFilter || subjectFilter || topicFilter);

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

      <div style={{ minHeight: '100vh', background: C.bg, fontFamily: font }}>
        <Navbar />

        <main style={{ padding: '2rem 2rem 4rem', maxWidth: 1360, margin: '0 auto' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h1 style={{ fontFamily: serif, fontSize: 26, color: C.text, fontWeight: 500, margin: '0 0 4px' }}>Le tue domande</h1>
            <p style={{ fontSize: 14, color: C.textMuted, margin: 0 }}>
              {filtered.length} {filtered.length === 1 ? 'domanda' : 'domande'}{hasFilters ? ' trovate' : ' nel tuo archivio'}
            </p>
          </div>

          <div className="q-layout">
            {/* ── Barra laterale: materie e argomenti ── */}
            {data.length > 0 && (
              <SubjectSidebar
                records={data}
                allLabel="Tutte le domande"
                subjectFilter={subjectFilter}
                topicFilter={topicFilter}
                onSubjectChange={setSubjectFilter}
                onTopicChange={setTopicFilter}
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

              {/* Barra selezione */}
              {filtered.length > 0 && (
                <SelectionBar allSelected={allShownSelected} onToggleAll={toggleAllShown} allLabel="Seleziona tutte" selectedCount={selectedIds.size} selectedLabel="selezionate">
                  <button
                    onClick={() => navigate('/tests/new', { state: { preselectedQuestions: data.filter(q => selectedIds.has(q.id)) } })}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: '#E6EEF6', border: '1px solid #B8CDE0', borderRadius: 8, cursor: 'pointer', color: '#2A5C8A', fontFamily: font, fontSize: 13, fontWeight: 500 }}
                  >
                    <ClipboardCheck size={14} /> Crea un test con queste
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

              {!bulk && unclassified.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14, padding: '10px 14px', background: C.surface, border: `1px dashed ${C.border}`, borderRadius: 10, fontSize: 13, color: C.textMuted }}>
                  <Tag size={14} />
                  <span style={{ flex: 1 }}>
                    {unclassified.length} {unclassified.length === 1 ? 'domanda non classificata' : 'domande non classificate'}{hasFilters ? ' tra quelle mostrate' : ''}
                  </span>
                  <button
                    onClick={() => requestClassify(unclassified)}
                    disabled={classifyingIds.size > 0}
                    style={{ background: 'none', border: 'none', padding: 0, color: C.greenLight, fontFamily: font, fontSize: 13, fontWeight: 600, cursor: classifyingIds.size > 0 ? 'not-allowed' : 'pointer', textDecoration: 'underline', opacity: classifyingIds.size > 0 ? 0.5 : 1 }}
                  >
                    {unclassified.length === 1 ? "Classificala con l'AI" : "Classificale tutte con l'AI"}
                  </button>
                </div>
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

              {loading ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: C.textFaint }}>
                  <Spinner size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Caricamento…
                </div>
              ) : filtered.length === 0 ? (
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14 }}>
                  <EmptyState
                    icon={Inbox}
                    message={hasFilters ? 'Nessuna domanda corrisponde ai filtri.' : 'Non hai ancora nessuna domanda. Creane una per iniziare.'}
                    actionLabel={!hasFilters ? '+ Crea la tua prima domanda' : 'Azzera i filtri'}
                    onAction={() => hasFilters ? (setGlobalFilter(''), setSubjectFilter(''), setTopicFilter('')) : setShowAddModal(true)}
                  />
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(440px, 100%), 1fr))', gap: 16 }}>
                  {filtered.map(q => (
                    <QuestionCard
                      key={q.id}
                      q={q}
                      selected={selectedIds.has(q.id)}
                      onToggle={() => toggleSelect(q.id)}
                      onEdit={() => setEditQuestion(q)}
                      onDelete={() => { setSelectedIds(new Set([q.id])); setShowDeleteModal(true); }}
                      onClassify={() => classifyMany([q])}
                      classifying={classifyingIds.has(q.id)}
                      classifyDisabled={classifyingIds.size > 0}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>

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
