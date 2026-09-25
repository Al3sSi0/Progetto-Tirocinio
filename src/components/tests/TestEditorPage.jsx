import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Trash2, Plus, X, Pencil, Check, GripVertical, Download, Library, Sparkles, PenLine, ClipboardList, AlertTriangle } from 'lucide-react';
import pb from '../../lib/pocketbase';
import { C, font, serif, inputStyle, labelStyle } from '../../styles/theme';
import Navbar from '../common/Navbar';
import SuggestInput from '../dashboard/SuggestInput';
import { useAllSuggestions } from '../../lib/useAllSuggestions';
import Spinner from '../common/Spinner';
import ConfirmModal from '../common/ConfirmModal';
import BloomPicker from '../common/BloomPicker';
import BloomTag from '../common/BloomTag';
import BloomDistribution from './BloomDistribution';
import ExportTestModal from './ExportTestModal';
import { ManualTab, GenerateTab, MineTab } from './AddQuestionTabs';

// Pagina di creazione (/tests/new) e modifica (/tests/:id) di un test.
// A sinistra il test (dettagli + domande riordinabili), a destra il pannello "Aggiungi domande".

const ADD_TABS = [
  { id: 'mine',     label: "Dall'archivio", Icon: Library },
  { id: 'generate', label: 'Genera con AI', Icon: Sparkles },
  { id: 'manual',   label: 'Scrivi nuova',  Icon: PenLine },
];

const card = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16 };
const sectionTitle = { fontFamily: serif, fontSize: 19, fontWeight: 500, color: C.text, margin: 0 };

function EditorStyles() {
  return (
    <style>{`
      @keyframes spin { to { transform: rotate(360deg); } }
      .te-grid { display: grid; grid-template-columns: minmax(0, 1fr) 470px; gap: 28px; align-items: start; }
      .te-side { position: sticky; top: 88px; }
      .te-side-body { max-height: calc(100vh - 280px); overflow-y: auto; }
      .te-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
      @media (max-width: 1080px) {
        .te-grid { grid-template-columns: 1fr; }
        .te-side { position: static; }
        .te-side-body { max-height: none; }
      }
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
  const [editQForm, setEditQForm]             = useState({ subject: '', topic: '', content: '', options: [''], bloom_level: '' });
  const [editQCorrectIdx, setEditQCorrectIdx] = useState(null);
  const [savingEdit, setSavingEdit]           = useState(false);
  const [editError, setEditError]             = useState('');

  // ── Drag & drop ───────────────────────────────────────────────────────────
  const [dragIdx, setDragIdx]         = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);

  // ── Pannello "Aggiungi domande" ──────────────────────────────────────────
  const [addMode, setAddMode]           = useState('mine');
  const [tabKey, setTabKey]             = useState(0);   // rimonta la scheda dopo un inserimento (form puliti)
  const [allQuestions, setAllQuestions] = useState([]);
  const [loadingAll, setLoadingAll]     = useState(true);
  const [subBusy, setSubBusy]           = useState(false);
  const [addedNotice, setAddedNotice]   = useState('');
  const noticeTimer = useRef(null);

  const { subjects: subjectSuggestions, topics: topicSuggestions } = useAllSuggestions(form.subject, []);
  const existingIds = useMemo(() => new Set(questions.map(q => q.id)), [questions]);
  const busy = saving || subBusy;

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
    pb.collection('Question').getFullList({ sort: '-created', filter: `owner = "${pb.authStore.model.id}"` })
      .then(setAllQuestions).catch(() => {}).finally(() => setLoadingAll(false));
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

  function handleQuestionsAdded(newQs, fromArchive) {
    const fresh = newQs.filter(q => !existingIds.has(q.id));
    changeQuestions(prev => [...prev, ...fresh]);
    if (!fromArchive) {
      setAllQuestions(prev => [...newQs, ...prev]);
      setTabKey(k => k + 1);
    }
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

  function openEditQ(q) {
    const options = Array.isArray(q.options) ? [...q.options] : [''];
    const initialIdx = options.findIndex(o => o === q.correct_answer);
    setEditingQId(q.id);
    setEditQForm({ subject: q.subject || '', topic: q.topic || '', content: q.content || '', options, bloom_level: q.bloom_level || '' });
    setEditQCorrectIdx(initialIdx >= 0 ? initialIdx : null);
    setEditError('');
  }

  function removeEditQOption(idx) {
    setEditQForm(f => { const options = f.options.filter((_, i) => i !== idx); return { ...f, options: options.length ? options : [''] }; });
    setEditQCorrectIdx(prev => (prev === null ? prev : idx === prev ? null : idx < prev ? prev - 1 : prev));
  }

  async function confirmEditQ() {
    const opts = editQForm.options.filter(o => o.trim() !== '');
    if (!editQForm.content.trim() || !opts.length) { setEditError('Testo e opzioni sono obbligatori.'); return; }
    const rawCorrect = (editQCorrectIdx !== null ? (editQForm.options[editQCorrectIdx] || '') : '').trim();
    const correct_answer = opts.includes(rawCorrect) ? rawCorrect : opts[0];
    setSavingEdit(true); setEditError('');
    try {
      const updated = await pb.collection('Question').update(editingQId, {
        subject: editQForm.subject.trim(), topic: editQForm.topic.trim(), content: editQForm.content.trim(),
        options: opts, correct_answer, bloom_level: editQForm.bloom_level,
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

  return (
    <>
      <EditorStyles />
      <div style={{ minHeight: '100vh', background: C.bg, fontFamily: font, display: 'flex', flexDirection: 'column' }}>
        <Navbar />

        <main style={{ flex: 1, width: '100%', maxWidth: 1360, margin: '0 auto', padding: '1.75rem 2rem 2.5rem', boxSizing: 'border-box' }}>
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
                Dai un nome al test e scegli le domande dal pannello a destra. Trascinale per cambiarne l'ordine.
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

          <div className="te-grid">
            {/* ── Colonna sinistra: il test ── */}
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
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
                  <h2 style={sectionTitle}>Domande nel test</h2>
                  <span style={{ fontSize: 14, color: C.textMuted, fontWeight: 500 }}>{qCount} {qCount === 1 ? 'domanda' : 'domande'}</span>
                </div>
                <BloomDistribution questions={questions} />

                {qCount === 0 ? (
                  <div style={{ border: `2px dashed ${C.border}`, borderRadius: 14, padding: '40px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 52, height: 52, borderRadius: 14, background: C.expandBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textFaint }}>
                      <ClipboardList size={24} />
                    </div>
                    <div style={{ fontFamily: serif, fontSize: 17, color: C.text }}>Il test è ancora vuoto</div>
                    <p style={{ fontSize: 14, color: C.textMuted, margin: 0, maxWidth: 420, lineHeight: 1.6 }}>
                      Scegli le domande dal tuo archivio, generale con l'AI da un documento oppure scrivine una nuova dal pannello «Aggiungi domande».
                    </p>
                  </div>
                ) : (
                  <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {questions.map((q, i) => editingQId === q.id ? (
                      <li key={q.id} style={{ border: `2px solid ${C.green}`, borderRadius: 12, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div className="te-fields">
                          <div><label style={labelStyle}>Materia</label><input value={editQForm.subject} onChange={e => setEditQForm(f => ({ ...f, subject: e.target.value }))} style={inputStyle} /></div>
                          <div><label style={labelStyle}>Argomento</label><input value={editQForm.topic} onChange={e => setEditQForm(f => ({ ...f, topic: e.target.value }))} style={inputStyle} /></div>
                        </div>
                        <div><label style={labelStyle}>Testo della domanda</label><textarea value={editQForm.content} onChange={e => setEditQForm(f => ({ ...f, content: e.target.value }))} rows={3} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.55 }} /></div>
                        <div>
                          <label style={labelStyle}>Opzioni <span style={{ fontWeight: 400, color: C.textFaint }}>— seleziona il pallino della risposta corretta</span></label>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {editQForm.options.map((opt, oi) => (
                              <div key={oi} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <input type="radio" name={`editor-editq-${q.id}`} checked={editQCorrectIdx === oi} onChange={() => setEditQCorrectIdx(oi)} disabled={!opt.trim()} aria-label="Risposta corretta"
                                  style={{ width: 17, height: 17, accentColor: C.green, flexShrink: 0, cursor: opt.trim() ? 'pointer' : 'not-allowed' }} />
                                <input value={opt} onChange={e => setEditQForm(f => { const options = [...f.options]; options[oi] = e.target.value; return { ...f, options }; })} style={{ ...inputStyle, flex: 1 }} />
                                <button onClick={() => removeEditQOption(oi)} aria-label="Rimuovi opzione" style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, cursor: 'pointer', color: C.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, flexShrink: 0 }}><X size={14} /></button>
                              </div>
                            ))}
                            <button onClick={() => setEditQForm(f => ({ ...f, options: [...f.options, ''] }))} style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', background: 'none', border: `1px dashed ${C.border}`, borderRadius: 9, cursor: 'pointer', color: C.textMuted, fontFamily: font, fontSize: 13.5 }}><Plus size={13} /> Aggiungi opzione</button>
                          </div>
                        </div>
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
                        <span style={{ width: 28, height: 28, borderRadius: 8, background: C.expandBg, color: C.textMuted, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
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
                    ))}
                  </ol>
                )}
              </section>
            </div>

            {/* ── Colonna destra: aggiungi domande ── */}
            <aside className="te-side" style={{ ...card, overflow: 'hidden' }}>
              <div style={{ padding: '22px 24px 16px', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, minHeight: 28 }}>
                  <h2 style={sectionTitle}>Aggiungi domande</h2>
                  {addedNotice && (
                    <span role="status" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: C.greenLight, fontWeight: 600, background: '#EFF5E6', padding: '4px 10px', borderRadius: 20 }}>
                      <Check size={14} /> {addedNotice}
                    </span>
                  )}
                </div>
                <div role="tablist" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, padding: 4, background: C.expandBg, borderRadius: 12, border: `1px solid ${C.borderLight}` }}>
                  {ADD_TABS.map(({ id: tabId, label, Icon }) => {
                    const active = addMode === tabId;
                    return (
                      <button
                        key={tabId}
                        role="tab"
                        aria-selected={active}
                        onClick={() => { if (!subBusy) setAddMode(tabId); }}
                        disabled={subBusy && !active}
                        style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '10px 6px',
                          background: active ? C.surface : 'transparent', border: 'none', borderRadius: 9,
                          boxShadow: active ? '0 1px 4px rgba(0,0,0,0.10)' : 'none',
                          color: active ? C.green : C.textMuted, fontFamily: font, fontSize: 13, fontWeight: active ? 600 : 500,
                          cursor: subBusy && !active ? 'not-allowed' : 'pointer', opacity: subBusy && !active ? 0.5 : 1,
                        }}
                      >
                        <Icon size={18} /> {label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="te-side-body">
                {addMode === 'mine' && (
                  <MineTab
                    allQuestions={allQuestions}
                    loadingAll={loadingAll}
                    existingIds={existingIds}
                    emptyMessage={allQuestions.length ? 'Tutte le tue domande sono già nel test.' : 'Il tuo archivio è vuoto: genera o scrivi una domanda.'}
                    onAdd={qs => handleQuestionsAdded(qs, true)}
                  />
                )}
                {addMode === 'generate' && (
                  <GenerateTab
                    key={tabKey}
                    testQuestions={questions}
                    archive={allQuestions}
                    onAdd={qs => handleQuestionsAdded(qs, false)}
                    onUseExisting={q => handleQuestionsAdded([q], true)}
                    onBusyChange={setSubBusy}
                  />
                )}
                {addMode === 'manual'   && <ManualTab   key={tabKey} allQuestions={allQuestions} onAdd={qs => handleQuestionsAdded(qs, false)} onBusyChange={setSubBusy} />}
              </div>
            </aside>
          </div>
        </main>

        {/* ── Barra di salvataggio fissa in basso ── */}
        <div style={{ position: 'sticky', bottom: 0, zIndex: 20, background: C.surface, borderTop: `1px solid ${C.border}`, boxShadow: '0 -4px 16px rgba(0,0,0,0.06)' }}>
          <div style={{ maxWidth: 1360, margin: '0 auto', padding: '14px 2rem', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', boxSizing: 'border-box' }}>
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

      {showExport && savedTest && (
        <ExportTestModal test={{ ...savedTest, ...form, expand: { questions } }} onClose={() => setShowExport(false)} />
      )}
    </>
  );
}
