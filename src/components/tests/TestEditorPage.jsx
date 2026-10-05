import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Trash2, Pencil, Check, GripVertical, Download, Plus, ClipboardList, AlertTriangle } from 'lucide-react';
import pb from '../../lib/pocketbase';
import { C, font, serif, inputStyle, labelStyle } from '../../styles/theme';
import Navbar from '../common/Navbar';
import SuggestInput from '../dashboard/SuggestInput';
import { useAllSuggestions } from '../../lib/useAllSuggestions';
import Spinner from '../common/Spinner';
import ConfirmModal from '../common/ConfirmModal';
import BloomPicker from '../common/BloomPicker';
import AnswerEditor from '../common/AnswerEditor';
import { emptyAnswer, answerFromQuestion, answerToFields } from '../../lib/questionTypes';
import BloomTag from '../common/BloomTag';
import BloomDistribution from './BloomDistribution';
import ExportTestModal from './ExportTestModal';
import AddQuestionsDialog from './AddQuestionsDialog';
import Pagination from '../common/Pagination';

// Pagina di creazione (/tests/new) e modifica (/tests/:id) di un test: dettagli + domande riordinabili.
// Le domande si aggiungono dall'archivio con il dialog AddQuestionsDialog (ricerca, filtri, selezione multipla).

// Domande del test per pagina: con centinaia di domande scorrere l'elenco intero diventa scomodo.
const Q_PAGE_SIZE = 10;

// Numero di posizione modificabile: scrivendo un altro numero la domanda si sposta lì (anche in un'altra pagina,
// dove il trascinamento non arriva). Invio o uscita dal campo confermano, Esc annulla.
function PositionInput({ index, total, onMove }) {
  const [value, setValue] = useState(String(index + 1));
  useEffect(() => { setValue(String(index + 1)); }, [index]);
  function commit() {
    const to = parseInt(value, 10);
    if (to >= 1 && to <= total && to !== index + 1) onMove(to - 1);
    else setValue(String(index + 1));
  }
  return (
    <input
      value={value}
      onChange={e => setValue(e.target.value.replace(/\D/g, ''))}
      onBlur={commit}
      onKeyDown={e => {
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'Escape') { e.stopPropagation(); setValue(String(index + 1)); }
      }}
      onMouseDown={e => e.stopPropagation()}
      draggable={false}
      onDragStart={e => { e.preventDefault(); e.stopPropagation(); }}
      inputMode="numeric"
      title="Posizione nel test: scrivi un altro numero per spostare la domanda"
      aria-label={`Posizione della domanda, ${index + 1} di ${total}`}
      style={{ width: 40, height: 30, boxSizing: 'border-box', textAlign: 'center', borderRadius: 8, background: C.expandBg, border: `1px solid ${C.borderLight}`, color: C.textMuted, fontFamily: font, fontSize: 13, fontWeight: 600, flexShrink: 0, outline: 'none', cursor: 'text' }}
      onFocus={e => { e.target.select(); e.target.style.borderColor = C.focusBorder; e.target.style.color = C.text; }}
    />
  );
}

const addBtn = { display: 'flex', alignItems: 'center', gap: 8, height: 42, padding: '0 18px', background: C.green, border: 'none', borderRadius: 10, color: '#FFF', fontFamily: font, fontSize: 14.5, fontWeight: 500, cursor: 'pointer' };
const card = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16 };
const sectionTitle = { fontFamily: serif, fontSize: 19, fontWeight: 500, color: C.text, margin: 0 };

function EditorStyles() {
  return (
    <style>{`
      @keyframes spin { to { transform: rotate(360deg); } }
      .te-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
      @media (max-width: 640px) { .te-fields { grid-template-columns: 1fr; } }
    `}</style>
  );
}

export default function TestEditorPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const location = useLocation();

  // ── Stato del test ────────────────────────────────────────────────────────
  const [loading, setLoading]     = useState(isEdit);
  const [loadError, setLoadError] = useState('');
  const [savedTest, setSavedTest] = useState(null); // record PocketBase (per l'esportazione)
  const [form, setForm]           = useState({ description: '', subject: '', topic: '' });
  const [questions, setQuestions] = useState(() => location.state?.preselectedQuestions || []);
  const [dirty, setDirty]         = useState(() => !!location.state?.preselectedQuestions?.length);
  const [saving, setSaving]       = useState(false);
  const [formError, setFormError] = useState('');
  const [warning, setWarning]     = useState('');
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [showExport, setShowExport]     = useState(false);

  // ── Modifica inline di una domanda del test ──────────────────────────────
  const [editingQId, setEditingQId]           = useState(null);
  const [editQForm, setEditQForm]             = useState({ subject: '', topic: '', content: '', bloom_level: '' });
  const [editQAnswer, setEditQAnswer]         = useState(emptyAnswer());
  const [savingEdit, setSavingEdit]           = useState(false);
  const [editError, setEditError]             = useState('');

  // ── Drag & drop ───────────────────────────────────────────────────────────
  const [dragIdx, setDragIdx]         = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);

  // ── Dialog "Aggiungi domande" ─────────────────────────────────────────────
  const [showAdd, setShowAdd]           = useState(false);
  const [allQuestions, setAllQuestions] = useState([]);
  const [documents, setDocuments]       = useState(new Map()); // id → { title, file } per il filtro "Fonte"
  const [loadingAll, setLoadingAll]     = useState(true);
  const [addedNotice, setAddedNotice]   = useState('');
  const [qPage, setQPage]               = useState(1);
  const noticeTimer = useRef(null);

  const { subjects: subjectSuggestions, topics: topicSuggestions } = useAllSuggestions(form.subject, []);
  const existingIds = useMemo(() => new Set(questions.map(q => q.id)), [questions]);
  const busy = saving;

  useEffect(() => {
    if (!isEdit) { window.history.replaceState({}, ''); return; }
    pb.collection('Test').getOne(id, { expand: 'questions' })
      .then(test => {
        const x = test.expand?.questions;
        setSavedTest(test);
        setForm({ description: test.description || '', subject: test.subject || '', topic: test.topic || '' });
        setQuestions(Array.isArray(x) ? x : x ? [x] : []);
      })
      .catch(() => setLoadError('Impossibile caricare il test. Potrebbe essere stato eliminato.'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    const owner = `owner = "${pb.authStore.model.id}"`;
    pb.collection('Question').getFullList({ sort: '-created', filter: owner })
      .then(setAllQuestions).catch(() => {}).finally(() => setLoadingAll(false));
    pb.collection('Document').getFullList({ filter: owner, fields: 'id,title,file' })
      .then(docs => setDocuments(new Map(docs.map(d => [d.id, d])))).catch(() => {});
    return () => clearTimeout(noticeTimer.current);
  }, []);

  // Avviso del browser se si chiude la scheda con modifiche non salvate
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = e => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  function setField(key, val) { setForm(f => ({ ...f, [key]: val })); setDirty(true); setFormError(''); setWarning(''); }

  function changeQuestions(updater) { setQuestions(updater); setDirty(true); setFormError(''); }

  function goBack() { if (dirty) setConfirmLeave(true); else navigate('/tests'); }

  function handleQuestionsAdded(newQs) {
    const fresh = newQs.filter(q => !existingIds.has(q.id));
    changeQuestions(prev => [...prev, ...fresh]);
    setShowAdd(false);
    // mostra la pagina con la prima delle domande appena aggiunte (in fondo al test)
    if (fresh.length) setQPage(Math.floor(questions.length / Q_PAGE_SIZE) + 1);
    setAddedNotice(fresh.length === 1 ? '1 domanda aggiunta al test' : `${fresh.length} domande aggiunte al test`);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setAddedNotice(''), 2600);
  }

  function removeQuestion(qid) {
    if (editingQId === qid) setEditingQId(null);
    changeQuestions(prev => prev.filter(q => q.id !== qid));
  }

  function handleDragStart(e, idx) { setDragIdx(idx); e.dataTransfer.effectAllowed = 'move'; }
  function handleDragOver(e, idx) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (idx !== dragIdx) setDragOverIdx(idx); }
  function handleDrop(e, idx) {
    e.preventDefault();
    if (dragIdx !== null && dragIdx !== idx) {
      changeQuestions(prev => { const next = [...prev]; const [moved] = next.splice(dragIdx, 1); next.splice(idx, 0, moved); return next; });
    }
    setDragIdx(null); setDragOverIdx(null);
  }
  function handleDragEnd() { setDragIdx(null); setDragOverIdx(null); }

  // Sposta una domanda in un'altra posizione e apre la pagina dove è finita.
  function moveQuestion(from, to) {
    changeQuestions(prev => { const next = [...prev]; const [moved] = next.splice(from, 1); next.splice(to, 0, moved); return next; });
    setQPage(Math.floor(to / Q_PAGE_SIZE) + 1);
  }

  function openEditQ(q) {
    setEditingQId(q.id);
    setEditQForm({ subject: q.subject || '', topic: q.topic || '', content: q.content || '', bloom_level: q.bloom_level || '' });
    setEditQAnswer(answerFromQuestion(q));
    setEditError('');
  }

  async function confirmEditQ() {
    if (!editQForm.content.trim()) { setEditError('Il testo della domanda è obbligatorio.'); return; }
    const fields = answerToFields(editQAnswer);
    if (fields.error) { setEditError(fields.error); return; }
    setSavingEdit(true); setEditError('');
    try {
      const updated = await pb.collection('Question').update(editingQId, {
        subject: editQForm.subject.trim(), topic: editQForm.topic.trim(), content: editQForm.content.trim(),
        options: fields.options, correct_answer: fields.correct_answer, bloom_level: editQForm.bloom_level,
      });
      setQuestions(prev => prev.map(q => q.id === editingQId ? { ...q, ...updated } : q));
      setAllQuestions(prev => prev.map(q => q.id === editingQId ? { ...q, ...updated } : q));
      setEditingQId(null);
    } catch {
      setEditError('Errore durante il salvataggio. Riprova.');
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleSubmit() {
    const description = form.description.trim();
    const subject     = form.subject.trim();
    const topic       = form.topic.trim();

    if (!description) { setFormError('Dai un nome al test prima di salvarlo.'); return; }
    if (!subject && topic) { setFormError('Inserisci la materia prima di specificare un argomento.'); setWarning(''); return; }
    const warnMsg = !subject && !topic
      ? 'Il test non ha materia né argomento.'
      : subject && !topic ? 'Il test non ha un argomento.' : '';
    if (warnMsg && warning !== warnMsg) { setWarning(warnMsg); setFormError(''); return; }

    setSaving(true); setFormError(''); setWarning('');
    const payload = { description, subject, topic, questions: questions.map(q => q.id) };
    try {
      if (isEdit) await pb.collection('Test').update(id, payload);
      else await pb.collection('Test').create({ ...payload, owner: pb.authStore.model.id });
      setDirty(false);
      navigate('/tests', { state: { notice: `Test “${description}” salvato.` } });
    } catch {
      setFormError('Errore durante il salvataggio. Riprova.');
      setSaving(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  if (loading || loadError) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, fontFamily: font }}>
        <EditorStyles />
        <Navbar />
        <div style={{ padding: '4rem 1.5rem', textAlign: 'center', color: loadError ? C.error.text : C.textFaint, fontSize: 15 }}>
          {loadError ? (
            <>
              <p style={{ margin: '0 0 16px' }}>{loadError}</p>
              <button onClick={() => navigate('/tests')} style={{ padding: '10px 20px', background: C.green, border: 'none', borderRadius: 10, color: '#FFF', fontFamily: font, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>Torna ai test</button>
            </>
          ) : <><Spinner size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Caricamento del test…</>}
        </div>
      </div>
    );
  }

  const qCount = questions.length;
  const qPageCount = Math.max(1, Math.ceil(qCount / Q_PAGE_SIZE));
  const currentQPage = Math.min(qPage, qPageCount); // eliminando domande l'ultima pagina può sparire
  const pageStart = (currentQPage - 1) * Q_PAGE_SIZE;
  const pageQuestions = questions.slice(pageStart, pageStart + Q_PAGE_SIZE);

  return (
    <>
      <EditorStyles />
      <div style={{ minHeight: '100vh', background: C.bg, fontFamily: font, display: 'flex', flexDirection: 'column' }}>
        <Navbar />

        <main style={{ flex: 1, width: '100%', maxWidth: 1040, margin: '0 auto', padding: '1.75rem 2rem 2.5rem', boxSizing: 'border-box' }}>
          {/* ── Intestazione ── */}
          <button onClick={goBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 2px', background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, fontFamily: font, fontSize: 14, fontWeight: 500, marginBottom: 10 }}>
            <ArrowLeft size={16} /> Torna ai test
          </button>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
            <div>
              <h1 style={{ fontFamily: serif, fontSize: 30, color: C.text, fontWeight: 500, margin: '0 0 6px' }}>
                {isEdit ? 'Modifica test' : 'Nuovo test'}
              </h1>
              <p style={{ fontSize: 15, color: C.textMuted, margin: 0 }}>
                Dai un nome al test e aggiungi le domande dal tuo archivio. Per cambiarne l'ordine trascinale o scrivi la nuova posizione nel numero.
              </p>
            </div>
            {isEdit && (
              <button
                onClick={() => setShowExport(true)}
                disabled={dirty || qCount === 0}
                title={dirty ? 'Salva le modifiche prima di esportare' : undefined}
                style={{ display: 'flex', alignItems: 'center', gap: 8, height: 44, padding: '0 20px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontFamily: font, fontSize: 14.5, fontWeight: 500, cursor: dirty || qCount === 0 ? 'not-allowed' : 'pointer', opacity: dirty || qCount === 0 ? 0.5 : 1 }}
              >
                <Download size={16} /> Esporta
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, minWidth: 0 }}>
              <section style={{ ...card, padding: '26px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                <h2 style={sectionTitle}>Dettagli</h2>
                <div>
                  <label style={labelStyle} htmlFor="test-name">Nome del test *</label>
                  <input
                    id="test-name"
                    type="text"
                    value={form.description}
                    onChange={e => setField('description', e.target.value)}
                    placeholder="Es. Verifica di Storia — Il Rinascimento"
                    autoFocus={!isEdit}
                    style={{ ...inputStyle, fontSize: 16, padding: '13px 16px', borderColor: formError && !form.description.trim() ? C.error.border : C.border }}
                    onFocus={e => e.target.style.borderColor = C.focusBorder}
                    onBlur={e => e.target.style.borderColor = C.border}
                  />
                </div>
                <div className="te-fields">
                  <SuggestInput label="Materia"   value={form.subject} onChange={v => setField('subject', v)} suggestions={subjectSuggestions} />
                  <SuggestInput label="Argomento" value={form.topic}   onChange={v => setField('topic', v)}   suggestions={topicSuggestions} />
                </div>
              </section>

              <section style={{ ...card, padding: '26px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                    <h2 style={sectionTitle}>Domande nel test</h2>
                    <span style={{ fontSize: 14, color: C.textMuted, fontWeight: 500 }}>{qCount} {qCount === 1 ? 'domanda' : 'domande'}</span>
                    {addedNotice && (
                      <span role="status" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: C.greenLight, fontWeight: 600, background: '#EFF5E6', padding: '4px 10px', borderRadius: 20 }}>
                        <Check size={14} /> {addedNotice}
                      </span>
                    )}
                  </div>
                  <button onClick={() => setShowAdd(true)} style={addBtn}>
                    <Plus size={16} /> Aggiungi domande
                  </button>
                </div>
                <BloomDistribution questions={questions} />

                {qCount === 0 ? (
                  <div style={{ border: `2px dashed ${C.border}`, borderRadius: 14, padding: '40px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 52, height: 52, borderRadius: 14, background: C.expandBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textFaint }}>
                      <ClipboardList size={24} />
                    </div>
                    <div style={{ fontFamily: serif, fontSize: 17, color: C.text }}>Il test è ancora vuoto</div>
                    <p style={{ fontSize: 14, color: C.textMuted, margin: 0, maxWidth: 420, lineHeight: 1.6 }}>
                      Cerca e scegli le domande dal tuo archivio: puoi filtrarle per materia, argomento, tipo e categoria di Bloom.
                    </p>
                    <button onClick={() => setShowAdd(true)} style={{ ...addBtn, marginTop: 6 }}>
                      <Plus size={16} /> Aggiungi domande
                    </button>
                  </div>
                ) : (
                  <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {pageQuestions.map((q, j) => { const i = pageStart + j; return editingQId === q.id ? (
                      <li key={q.id} style={{ border: `2px solid ${C.green}`, borderRadius: 12, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div className="te-fields">
                          <div><label style={labelStyle}>Materia</label><input value={editQForm.subject} onChange={e => setEditQForm(f => ({ ...f, subject: e.target.value }))} style={inputStyle} /></div>
                          <div><label style={labelStyle}>Argomento</label><input value={editQForm.topic} onChange={e => setEditQForm(f => ({ ...f, topic: e.target.value }))} style={inputStyle} /></div>
                        </div>
                        <div><label style={labelStyle}>Testo della domanda</label><textarea value={editQForm.content} onChange={e => setEditQForm(f => ({ ...f, content: e.target.value }))} rows={3} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.55 }} /></div>
                        <AnswerEditor value={editQAnswer} onChange={a => { setEditQAnswer(a); setEditError(''); }} name={`editor-editq-${q.id}`} />
                        <div><label style={labelStyle}>Livello Bloom</label><BloomPicker value={editQForm.bloom_level} onChange={v => setEditQForm(f => ({ ...f, bloom_level: v }))} /></div>
                        {editError && <div style={{ background: C.error.bg, border: `1px solid ${C.error.border}`, color: C.error.text, fontSize: 13.5, borderRadius: 8, padding: '10px 14px' }}>{editError}</div>}
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                          <button onClick={() => { setEditingQId(null); setEditError(''); }} disabled={savingEdit} style={{ padding: '10px 18px', background: 'none', border: `1px solid ${C.border}`, borderRadius: 9, cursor: savingEdit ? 'not-allowed' : 'pointer', color: C.textMuted, fontFamily: font, fontSize: 14 }}>Annulla</button>
                          <button onClick={confirmEditQ} disabled={savingEdit} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', background: C.green, border: 'none', borderRadius: 9, cursor: savingEdit ? 'not-allowed' : 'pointer', color: '#FFF', fontFamily: font, fontSize: 14, fontWeight: 500 }}>
                            {savingEdit ? <Spinner size={12} color="#FFF" trackColor="rgba(255,255,255,0.4)" /> : <Check size={15} />}
                            {savingEdit ? 'Salvataggio…' : 'Salva domanda'}
                          </button>
                        </div>
                      </li>
                    ) : (
                      <li
                        key={q.id}
                        draggable
                        onDragStart={e => handleDragStart(e, i)}
                        onDragOver={e => handleDragOver(e, i)}
                        onDrop={e => handleDrop(e, i)}
                        onDragEnd={handleDragEnd}
                        style={{
                          display: 'flex', alignItems: 'flex-start', gap: 12, padding: '16px 16px 16px 10px',
                          background: C.surface, borderRadius: 12,
                          border: `1px solid ${dragOverIdx === i && dragIdx !== i ? C.green : C.borderLight}`,
                          boxShadow: dragOverIdx === i && dragIdx !== i ? `0 -3px 0 ${C.green}` : 'none',
                          opacity: dragIdx === i ? 0.4 : 1, cursor: 'grab', transition: 'opacity 0.15s, border-color 0.15s',
                        }}
                      >
                        <GripVertical size={18} style={{ color: C.dot, flexShrink: 0, marginTop: 4 }} aria-hidden />
                        <PositionInput index={i} total={qCount} onMove={to => moveQuestion(i, to)} />
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ fontSize: 15, color: C.text, lineHeight: 1.5, fontWeight: 500, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{q.content || '—'}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                            {(q.subject || q.topic) && <span style={{ fontSize: 13, color: C.textFaint }}>{[q.subject, q.topic].filter(Boolean).join(' · ')}</span>}
                            <BloomTag level={q.bloom_level} />
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          <button onClick={() => openEditQ(q)} title="Modifica domanda" aria-label="Modifica domanda" style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 9, cursor: 'pointer', color: C.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38 }}><Pencil size={15} /></button>
                          <button onClick={() => removeQuestion(q.id)} title="Togli dal test (resta nell'archivio)" aria-label="Togli dal test" style={{ background: 'none', border: `1px solid ${C.error.border}`, borderRadius: 9, cursor: 'pointer', color: C.error.text, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38 }}><Trash2 size={15} /></button>
                        </div>
                      </li>
                    ); })}
                  </ol>
                )}
                {qCount > Q_PAGE_SIZE && (
                  <Pagination
                    page={currentQPage}
                    pageSize={Q_PAGE_SIZE}
                    total={qCount}
                    onPageChange={p => { setQPage(p); setEditingQId(null); }}
                    style={{ padding: '14px 0 0', borderTop: `1px solid ${C.borderLight}` }}
                  />
                )}
              </section>
          </div>
        </main>

        {/* ── Barra di salvataggio fissa in basso ── */}
        <div style={{ position: 'sticky', bottom: 0, zIndex: 20, background: C.surface, borderTop: `1px solid ${C.border}`, boxShadow: '0 -4px 16px rgba(0,0,0,0.06)' }}>
          <div style={{ maxWidth: 1040, margin: '0 auto', padding: '14px 2rem', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', boxSizing: 'border-box' }}>
            <div style={{ flex: 1, minWidth: 220, display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
              {formError ? (
                <span role="alert" style={{ color: C.error.text, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}><AlertTriangle size={16} /> {formError}</span>
              ) : warning ? (
                <span role="alert" style={{ color: C.warning.text, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}><AlertTriangle size={16} /> {warning} Premi di nuovo "Salva test" per confermare.</span>
              ) : (
                <>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: dirty ? C.warning.border : C.greenAccent, flexShrink: 0 }} />
                  <span style={{ color: C.textMuted }}>
                    <strong style={{ color: C.text, fontWeight: 600 }}>{qCount} {qCount === 1 ? 'domanda' : 'domande'}</strong>
                    {' · '}{dirty ? 'Modifiche non salvate' : isEdit ? 'Nessuna modifica' : 'Nuovo test'}
                  </span>
                </>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={goBack} disabled={busy} style={{ padding: '12px 22px', background: 'none', border: `1px solid ${C.border}`, borderRadius: 10, cursor: busy ? 'not-allowed' : 'pointer', color: C.textMuted, fontFamily: font, fontSize: 14.5, opacity: busy ? 0.5 : 1 }}>
                Annulla
              </button>
              <button onClick={handleSubmit} disabled={busy} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 26px', background: C.green, border: 'none', borderRadius: 10, cursor: busy ? 'not-allowed' : 'pointer', color: '#FFF', fontFamily: font, fontSize: 14.5, fontWeight: 500, opacity: busy ? 0.75 : 1 }}>
                {saving ? <Spinner size={13} color="#FFF" trackColor="rgba(255,255,255,0.4)" /> : <Check size={16} />}
                {saving ? 'Salvataggio…' : 'Salva test'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {confirmLeave && (
        <ConfirmModal
          icon={AlertTriangle}
          title="Uscire senza salvare?"
          message="Le modifiche a questo test andranno perse. Le domande create o modificate restano comunque nel tuo archivio."
          confirmLabel="Esci senza salvare"
          cancelLabel="Continua a modificare"
          onConfirm={() => navigate('/tests')}
          onCancel={() => setConfirmLeave(false)}
        />
      )}

      {showAdd && (
        <AddQuestionsDialog
          allQuestions={allQuestions}
          loading={loadingAll}
          existingIds={existingIds}
          documents={documents}
          onAdd={handleQuestionsAdded}
          onClose={() => setShowAdd(false)}
        />
      )}

      {showExport && savedTest && (
        <ExportTestModal test={{ ...savedTest, ...form, expand: { questions } }} onClose={() => setShowExport(false)} />
      )}
    </>
  );
}
