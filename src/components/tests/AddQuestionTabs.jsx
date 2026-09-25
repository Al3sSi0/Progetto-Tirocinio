import { useState, useEffect, useMemo, useRef } from 'react';
import { X, Plus, Pencil, Check, CheckCheck, Search } from 'lucide-react';
import pb from '../../lib/pocketbase';
import { generateQuestionsFromText, runGeneration, mergeQuestions, saveGeneratedQuestions, MAX_GENERATED_QUESTIONS } from '../../lib/generateQuestions';
import { ProgressBar, GenerationNotice, GeneratedListHeader, DuplicatesNotice, DuplicateBadge } from '../common/GenerationUI';
import { detectDuplicates } from '../../lib/duplicates';
import GenerationPlanHint from '../common/GenerationPlanHint';
import { C, font, inputStyle, labelStyle, BLOOM_STYLES, BLOOM_LABELS } from '../../styles/theme';
import SuggestInput from '../dashboard/SuggestInput';
import { useAllSuggestions } from '../../lib/useAllSuggestions';
import Spinner from '../common/Spinner';
import BloomPicker from '../common/BloomPicker';
import ChipSelect from '../common/ChipSelect';

// Schede del pannello "Aggiungi domande" dell'editor dei test (TestEditorPage).

const initialManualForm = {
  subject: '', topic: '', content: '', options: [''], bloom_level: '',
};

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Manuale
// ─────────────────────────────────────────────────────────────────────────────

export function ManualTab({ allQuestions, onAdd, onBusyChange }) {
  const [form, setForm]           = useState(initialManualForm);
  const [correctIdx, setCorrectIdx] = useState(null);
  const [saving, setSaving]       = useState(false);
  const [formError, setFormError] = useState('');
  const [warning, setWarning]     = useState('');

  const { subjects: subjectSuggestions, topics: topicSuggestions } = useAllSuggestions(form.subject, allQuestions);

  useEffect(() => { onBusyChange?.(saving); return () => onBusyChange?.(false); }, [saving]);

  function setField(key, val) { setForm(f => ({ ...f, [key]: val })); setFormError(''); setWarning(''); }
  function setOption(idx, val) { setForm(f => { const options = [...f.options]; options[idx] = val; return { ...f, options }; }); setFormError(''); }
  function addOption() { setForm(f => ({ ...f, options: [...f.options, ''] })); }
  function removeOption(idx) {
    setForm(f => { const options = f.options.filter((_, i) => i !== idx); return { ...f, options: options.length ? options : [''] }; });
    setCorrectIdx(prev => {
      if (prev === null) return prev;
      if (idx === prev) return null;
      if (idx < prev) return prev - 1;
      return prev;
    });
  }

  async function handleSubmit() {
    const subject = form.subject.trim(), topic = form.topic.trim(), content = form.content.trim();
    const opts = form.options.filter(o => o.trim() !== '');
    const correct_answer = (correctIdx !== null ? (form.options[correctIdx] || '') : '').trim();
    if (!content) { setFormError('Il testo della domanda è obbligatorio.'); return; }
    if (!opts.length) { setFormError("Aggiungi almeno un'opzione di risposta."); return; }
    if (!correct_answer || !opts.includes(correct_answer)) { setFormError('Seleziona la risposta corretta.'); return; }
    if (!subject && topic) { setFormError('Inserisci la materia prima di specificare un argomento.'); setWarning(''); return; }
    const warnMsg = !subject && !topic ? 'Sicuro di voler salvare la domanda senza materia e senza argomento?'
      : subject && !topic ? 'Sicuro di voler salvare la domanda senza argomento?' : '';
    if (warnMsg && warning !== warnMsg) { setWarning(warnMsg); setFormError(''); return; }
    setSaving(true); setFormError(''); setWarning('');
    try {
      const record = await pb.collection('Question').create({ subject, topic, content, options: opts, correct_answer, bloom_level: form.bloom_level, owner: pb.authStore.model.id });
      onAdd([record]);
    } catch { setFormError('Errore durante il salvataggio. Riprova.'); setSaving(false); }
  }

  return (
    <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <SuggestInput label="Materia"   value={form.subject} onChange={v => setField('subject', v)} suggestions={subjectSuggestions} />
      <SuggestInput label="Argomento" value={form.topic}   onChange={v => setField('topic', v)}   suggestions={topicSuggestions} />
      <div>
        <label style={labelStyle}>Testo della domanda *</label>
        <textarea value={form.content} onChange={e => setField('content', e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} />
      </div>
      <div>
        <label style={labelStyle}>Opzioni di risposta * <span style={{ fontWeight: 400, color: C.textFaint }}>— seleziona il pallino per indicare quella corretta</span></label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {form.options.map((opt, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                type="radio"
                name="testmodal-manual-correct-answer"
                checked={correctIdx === idx}
                onChange={() => setCorrectIdx(idx)}
                disabled={!opt.trim()}
                title="Segna come risposta corretta"
                style={{ width: 17, height: 17, accentColor: C.green, flexShrink: 0, cursor: opt.trim() ? 'pointer' : 'not-allowed' }}
              />
              <input value={opt} onChange={e => setOption(idx, e.target.value)} placeholder={`Opzione ${idx + 1}`} style={{ ...inputStyle, flex: 1 }} />
              <button onClick={() => removeOption(idx)} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, cursor: 'pointer', color: C.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, flexShrink: 0 }} aria-label="Rimuovi opzione"><X size={13} /></button>
            </div>
          ))}
          <button onClick={addOption} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '9px 14px', background: 'none', border: `1px dashed ${C.border}`, borderRadius: 9, cursor: 'pointer', color: C.textMuted, fontFamily: font, fontSize: 13 }}>
            <Plus size={12} /> Aggiungi opzione
          </button>
        </div>
      </div>
      <div>
        <label style={labelStyle}>Livello Bloom</label>
        <BloomPicker value={form.bloom_level} onChange={v => setField('bloom_level', v)} />
      </div>
      {warning  && <div style={{ background: C.warning.bg, border: `1px solid ${C.warning.border}`, color: C.warning.text, fontSize: 13.5, borderRadius: 8, padding: '9px 12px' }}>{warning} Premi nuovamente "Salva e aggiungi" per confermare.</div>}
      {formError && <div style={{ background: C.error.bg, border: `1px solid ${C.error.border}`, color: C.error.text, fontSize: 13.5, borderRadius: 8, padding: '9px 12px' }}>{formError}</div>}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={handleSubmit} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: C.green, border: 'none', borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer', color: '#FFF', fontFamily: font, fontSize: 14, fontWeight: 500, opacity: saving ? 0.8 : 1 }}>
          {saving && <Spinner size={12} color="#FFF" trackColor="rgba(255,255,255,0.4)" />}{saving ? 'Salvataggio…' : 'Salva e aggiungi'}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Genera da documento
// ─────────────────────────────────────────────────────────────────────────────

// testQuestions / archive: domande già nel test e nell'archivio, per segnalare i doppioni generati.
// onUseExisting(q): aggiunge al test la domanda d'archivio al posto di quella generata.
export function GenerateTab({ onAdd, onBusyChange, testQuestions = [], archive = [], onUseExisting }) {
  const [documents, setDocuments]           = useState([]);
  const [loadingDocs, setLoadingDocs]       = useState(true);
  const [selectedDocId, setSelectedDocId]   = useState('');
  const [numQuestions, setNumQuestions]     = useState(1);
  const [generating, setGenerating]         = useState(false);
  const [genProgress, setGenProgress]       = useState(null); // { done, total }
  const [failedRequests, setFailedRequests] = useState([]);   // parti del documento da riprovare
  const [genInfo, setGenInfo]               = useState({ requested: 0, capped: false });
  const [retrying, setRetrying]             = useState(false);
  const [saveProgress, setSaveProgress]     = useState(null);
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [selectedGenIdx, setSelectedGenIdx] = useState(new Set());
  const [genError, setGenError]             = useState('');
  const [savingGenerated, setSavingGenerated] = useState(false);
  const [docSearch, setDocSearch]           = useState('');
  const [showDocList, setShowDocList]       = useState(false);
  const [editingGenIdx, setEditingGenIdx]   = useState(null);
  const [editGenForm, setEditGenForm]       = useState({ content: '', options: [''], subject: '', topic: '' });
  const [editGenCorrectIdx, setEditGenCorrectIdx] = useState(null);
  const docSearchRef = useRef(null);

  const isBusy = generating || savingGenerated || retrying;
  useEffect(() => { onBusyChange?.(isBusy); return () => onBusyChange?.(false); }, [isBusy]);

  const dups = useMemo(() => detectDuplicates(generatedQuestions, { testQuestions, archive }), [generatedQuestions, testQuestions, archive]);
  const dupCount = dups.filter(Boolean).length;

  useEffect(() => {
    pb.collection('Document').getFullList({ sort: '-created', filter: `owner = "${pb.authStore.model.id}"` })
      .then(docs => setDocuments(docs)).catch(() => setGenError('Impossibile caricare i documenti.')).finally(() => setLoadingDocs(false));
  }, []);

  useEffect(() => {
    function onMouseDown(e) { if (docSearchRef.current && !docSearchRef.current.contains(e.target)) setShowDocList(false); }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  async function handleGenerate() {
    if (!selectedDocId) { setGenError('Seleziona un documento.'); return; }
    const doc = documents.find(d => d.id === selectedDocId);
    if (!doc) return;
    setGenerating(true); setGenError(''); setGeneratedQuestions([]); setSelectedGenIdx(new Set()); setFailedRequests([]); setGenInfo({ requested: 0, capped: false });
    try {
      const docText = (doc.text || '').trim();
      const { questions, failedRequests: failed, requested, capped } = await generateQuestionsFromText(
        docText, numQuestions, import.meta.env.VITE_OPENROUTER_API_KEY,
        (done, total) => setGenProgress({ done, total }),
      );
      if (!questions.length) { setGenError('Nessuna domanda riconosciuta. Riprova.'); }
      else {
        const withMeta = questions.map(q => ({ ...q, subject: doc.subject?.trim() || '', topic: doc.topic?.trim() || '' }));
        const flags = detectDuplicates(withMeta, { testQuestions, archive });
        setGeneratedQuestions(withMeta);
        setSelectedGenIdx(new Set(withMeta.map((_, i) => i).filter(i => !flags[i])));
      }
      setFailedRequests(failed);
      setGenInfo({ requested, capped, asked: numQuestions });
    } catch (err) { setGenError('Generazione fallita: ' + err.message); }
    finally { setGenerating(false); setGenProgress(null); }
  }

  // Riprova solo le parti del documento senza risposta; le nuove domande si aggiungono già selezionate.
  async function handleRetryFailed() {
    const doc = documents.find(d => d.id === selectedDocId);
    setRetrying(true); setGenError('');
    try {
      const { questions, failedRequests: stillFailed } = await runGeneration(
        failedRequests, import.meta.env.VITE_OPENROUTER_API_KEY, (done, total) => setGenProgress({ done, total }),
      );
      const withMeta = questions.map(q => ({ ...q, subject: doc?.subject?.trim() || '', topic: doc?.topic?.trim() || '' }));
      const prevSelected = new Set([...selectedGenIdx].map(i => generatedQuestions[i]));
      const merged = mergeQuestions(generatedQuestions, withMeta);
      const flags = detectDuplicates(merged, { testQuestions, archive });
      setGeneratedQuestions(merged);
      setSelectedGenIdx(new Set(merged.map((q, i) => (prevSelected.has(q) || (!generatedQuestions.includes(q) && !flags[i])) ? i : -1).filter(i => i >= 0)));
      setFailedRequests(stillFailed);
    } catch (err) { setGenError('Nuovo tentativo fallito: ' + err.message); }
    finally { setRetrying(false); setGenProgress(null); }
  }

  async function handleSaveGenerated() {
    if (!selectedGenIdx.size) { setGenError('Seleziona almeno una domanda.'); return; }
    const selected = [...selectedGenIdx].sort((a, b) => a - b).map(i => generatedQuestions[i]);
    setSavingGenerated(true); setGenError('');
    try {
      const records = await saveGeneratedQuestions(pb, selected, (done, total) => setSaveProgress({ done, total }));
      onAdd(records);
    } catch { setGenError('Errore durante il salvataggio. Riprova.'); setSavingGenerated(false); setSaveProgress(null); }
  }

  function openEditGen(idx) {
    const q = generatedQuestions[idx];
    const options = [...q.options];
    const initialIdx = options.findIndex(o => o === q.correct_answer);
    setEditingGenIdx(idx);
    setEditGenForm({ subject: q.subject || '', topic: q.topic || '', content: q.content, options });
    setEditGenCorrectIdx(initialIdx >= 0 ? initialIdx : null);
  }
  function removeEditGenOption(idx) {
    setEditGenForm(f => { const options = f.options.filter((_, i) => i !== idx); return { ...f, options: options.length ? options : [''] }; });
    setEditGenCorrectIdx(prev => {
      if (prev === null) return prev;
      if (idx === prev) return null;
      if (idx < prev) return prev - 1;
      return prev;
    });
  }
  function confirmEditGen() {
    const opts = editGenForm.options.filter(o => o.trim() !== '');
    if (!editGenForm.content.trim() || !opts.length) return;
    const rawCorrect = (editGenCorrectIdx !== null ? (editGenForm.options[editGenCorrectIdx] || '') : '').trim();
    const correct_answer = opts.includes(rawCorrect) ? rawCorrect : opts[0];
    setGeneratedQuestions(prev => prev.map((q, i) => i === editingGenIdx ? { ...q, subject: editGenForm.subject, topic: editGenForm.topic, content: editGenForm.content.trim(), options: opts, correct_answer } : q));
    setEditingGenIdx(null);
  }
  function pickExisting(idx) {
    onUseExisting?.(dups[idx].match);
    setSelectedGenIdx(prev => { const next = new Set(prev); next.delete(idx); return next; });
  }
  function toggleGenIdx(idx) { setSelectedGenIdx(prev => { const next = new Set(prev); next.has(idx) ? next.delete(idx) : next.add(idx); return next; }); }

  return (
    <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      {loadingDocs ? (
        <div style={{ color: C.textMuted, fontSize: 13, textAlign: 'center', padding: '16px 0' }}>Caricamento documenti…</div>
      ) : documents.length === 0 ? (
        <div style={{ color: C.textMuted, fontSize: 13, textAlign: 'center', padding: '16px 0' }}>Nessun documento disponibile.</div>
      ) : (<>
        <div ref={docSearchRef} style={{ position: 'relative' }}>
          <label style={labelStyle}>Documento *</label>
          <input value={docSearch} onChange={e => { setDocSearch(e.target.value); setShowDocList(true); }} onFocus={() => setShowDocList(true)} placeholder="Cerca documento…" disabled={isBusy} style={inputStyle} />
          {showDocList && (() => {
            const q = docSearch.trim().toLowerCase();
            const filtered = q ? documents.filter(d => (d.title || d.file || '').toLowerCase().includes(q)) : documents;
            if (!filtered.length) return null;
            return (
              <ul style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 300, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, margin: '2px 0 0', padding: 0, listStyle: 'none', maxHeight: 260, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.10)' }}>
                {filtered.map(doc => {
                  const label = doc.title || doc.file || '—';
                  const isActive = doc.id === selectedDocId;
                  return (
                    <li key={doc.id} onMouseDown={e => { e.preventDefault(); setSelectedDocId(doc.id); setDocSearch(label); setShowDocList(false); setGeneratedQuestions([]); setSelectedGenIdx(new Set()); setGenError(''); }}
                      style={{ padding: '11px 14px', fontSize: 14, cursor: 'pointer', color: isActive ? C.green : C.text, fontWeight: isActive ? 600 : 400, background: isActive ? C.expandBg : 'transparent' }}
                      onMouseEnter={e => e.currentTarget.style.background = C.expandBg}
                      onMouseLeave={e => e.currentTarget.style.background = isActive ? C.expandBg : 'transparent'}
                    >{label}</li>
                  );
                })}
              </ul>
            );
          })()}
        </div>
        <div>
          <label style={labelStyle}>Numero di domande</label>
          <input type="number" min={1} max={MAX_GENERATED_QUESTIONS} value={numQuestions} onChange={e => { setNumQuestions(Math.max(1, Math.min(MAX_GENERATED_QUESTIONS, parseInt(e.target.value) || 1))); setGeneratedQuestions([]); setSelectedGenIdx(new Set()); }} style={{ ...inputStyle, width: 110 }} disabled={isBusy} />
          <GenerationPlanHint doc={documents.find(d => d.id === selectedDocId)} numQuestions={numQuestions} />
        </div>
        {genProgress && genProgress.total > 1 && (
          <ProgressBar done={genProgress.done} total={genProgress.total} label={retrying ? 'Nuovo tentativo sulle parti mancanti' : 'Lettura del documento, parte per parte'} />
        )}
        {!generating && generatedQuestions.length > 0 && (
          <GenerationNotice failedCount={failedRequests.length} requested={genInfo.requested} capped={genInfo.capped} asked={genInfo.asked} got={generatedQuestions.length} onRetry={handleRetryFailed} retrying={retrying} />
        )}
        {generatedQuestions.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <DuplicatesNotice count={dupCount} />
            <GeneratedListHeader
              total={generatedQuestions.length}
              selected={selectedGenIdx.size}
              onSelectAll={() => setSelectedGenIdx(new Set(generatedQuestions.map((_, i) => i)))}
              onSelectNone={() => setSelectedGenIdx(new Set())}
              disabled={isBusy}
            />
            {generatedQuestions.map((q, idx) => {
              const selected = selectedGenIdx.has(idx);
              const isEditing = editingGenIdx === idx;
              return (
                <div key={idx} style={{ border: selected ? `2px solid ${C.greenAccent}` : `1px solid ${C.border}`, borderRadius: 10, padding: 14, background: selected ? 'rgba(168,197,160,0.18)' : C.surface }}>
                  {isEditing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <div style={{ flex: 1 }}><label style={labelStyle}>Materia</label><input value={editGenForm.subject} onChange={e => setEditGenForm(f => ({ ...f, subject: e.target.value }))} style={inputStyle} /></div>
                        <div style={{ flex: 1 }}><label style={labelStyle}>Argomento</label><input value={editGenForm.topic} onChange={e => setEditGenForm(f => ({ ...f, topic: e.target.value }))} style={inputStyle} /></div>
                      </div>
                      <div><label style={labelStyle}>Testo</label><textarea value={editGenForm.content} onChange={e => setEditGenForm(f => ({ ...f, content: e.target.value }))} rows={2} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} /></div>
                      <div>
                        <label style={labelStyle}>Opzioni <span style={{ fontWeight: 400, color: C.textFaint }}>— seleziona il pallino per la corretta</span></label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {editGenForm.options.map((opt, oi) => (
                            <div key={oi} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              <input
                                type="radio"
                                name={`testmodal-gen-correct-${editingGenIdx}`}
                                checked={editGenCorrectIdx === oi}
                                onChange={() => setEditGenCorrectIdx(oi)}
                                disabled={!opt.trim()}
                                title="Segna come risposta corretta"
                                style={{ width: 17, height: 17, accentColor: C.green, flexShrink: 0, cursor: opt.trim() ? 'pointer' : 'not-allowed' }}
                              />
                              <input value={opt} onChange={e => setEditGenForm(f => { const options = [...f.options]; options[oi] = e.target.value; return { ...f, options }; })} style={{ ...inputStyle, flex: 1 }} />
                              <button onClick={() => removeEditGenOption(oi)} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 5, cursor: 'pointer', color: C.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, flexShrink: 0 }} aria-label="Rimuovi opzione"><X size={13} /></button>
                            </div>
                          ))}
                          <button onClick={() => setEditGenForm(f => ({ ...f, options: [...f.options, ''] }))} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '9px 14px', background: 'none', border: `1px dashed ${C.border}`, borderRadius: 9, cursor: 'pointer', color: C.textMuted, fontFamily: font, fontSize: 13 }}><Plus size={12} /> Aggiungi</button>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button onClick={() => setEditingGenIdx(null)} style={{ padding: '8px 16px', background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, cursor: 'pointer', color: C.textMuted, fontFamily: font, fontSize: 13 }}>Annulla</button>
                        <button onClick={confirmEditGen} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 16px', background: C.green, border: 'none', borderRadius: 8, cursor: 'pointer', color: '#FFF', fontFamily: font, fontSize: 13, fontWeight: 500 }}><Check size={11} /> Conferma</button>
                      </div>
                    </div>
                  ) : (
                    <div onClick={() => toggleGenIdx(idx)} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }}>
                      <input type="checkbox" readOnly checked={selected} style={{ marginTop: 2, accentColor: C.green, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        {(q.subject || q.topic) && <div style={{ fontSize: 12.5, color: C.textFaint, marginBottom: 4 }}>{[q.subject, q.topic].filter(Boolean).join(' · ')}</div>}
                        <div style={{ fontSize: 14, color: C.text, fontWeight: 500, marginBottom: 6, lineHeight: 1.5 }}>{q.content}</div>
                        <ul style={{ margin: 0, paddingLeft: 14, display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {q.options.map((opt, oi) => <li key={oi} style={{ fontSize: 13, color: opt === q.correct_answer ? C.greenLight : C.textBody, fontWeight: opt === q.correct_answer ? 600 : 400 }}>{opt}{opt === q.correct_answer ? ' ✓' : ''}</li>)}
                        </ul>
                        <DuplicateBadge dup={dups[idx]} onUseExisting={onUseExisting ? () => pickExisting(idx) : undefined} disabled={isBusy} />
                      </div>
                      <button onClick={e => { e.stopPropagation(); openEditGen(idx); }} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 5, cursor: 'pointer', color: C.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, flexShrink: 0 }} aria-label="Modifica"><Pencil size={14} /></button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {genError && <div style={{ background: C.error.bg, border: `1px solid ${C.error.border}`, color: C.error.text, fontSize: 13.5, borderRadius: 8, padding: '9px 12px' }}>{genError}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          {generatedQuestions.length === 0 ? (
            <button onClick={handleGenerate} disabled={isBusy || !selectedDocId} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: C.green, border: 'none', borderRadius: 8, cursor: (isBusy || !selectedDocId) ? 'not-allowed' : 'pointer', color: '#FFF', fontFamily: font, fontSize: 14, fontWeight: 500, opacity: (isBusy || !selectedDocId) ? 0.7 : 1 }}>
              {generating && <Spinner size={12} color="#FFF" trackColor="rgba(255,255,255,0.4)" />}{generating ? `Generazione…${genProgress?.total > 1 ? ` ${genProgress.done}/${genProgress.total}` : ''}` : 'Genera'}
            </button>
          ) : (
            <button onClick={handleSaveGenerated} disabled={isBusy || !selectedGenIdx.size} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: C.green, border: 'none', borderRadius: 8, cursor: (savingGenerated || !selectedGenIdx.size) ? 'not-allowed' : 'pointer', color: '#FFF', fontFamily: font, fontSize: 14, fontWeight: 500, opacity: (savingGenerated || !selectedGenIdx.size) ? 0.7 : 1 }}>
              {savingGenerated && <Spinner size={12} color="#FFF" trackColor="rgba(255,255,255,0.4)" />}{savingGenerated ? `Salvataggio…${saveProgress?.total > 20 ? ` ${saveProgress.done}/${saveProgress.total}` : ''}` : selectedGenIdx.size === 1 ? 'Aggiungi 1 domanda' : `Aggiungi ${selectedGenIdx.size} domande`}
            </button>
          )}
        </div>
      </>)}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Le mie domande
// ─────────────────────────────────────────────────────────────────────────────

export function MineTab({ allQuestions, loadingAll, existingIds, emptyMessage, onAdd }) {
  const [qFilter, setQFilter]             = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [topicFilter, setTopicFilter]     = useState('');
  const [selectedIds, setSelectedIds]     = useState(new Set());

  const available = useMemo(() => allQuestions.filter(q => !existingIds.has(q.id)), [allQuestions, existingIds]);

  const subjectOptions = useMemo(() => {
    const set = new Set(available.map(q => (q.subject || '').trim()).filter(Boolean));
    return [...set].sort();
  }, [available]);

  const topicOptions = useMemo(() => {
    const base = subjectFilter
      ? available.filter(q => (q.subject || '').trim() === subjectFilter)
      : available;
    const set = new Set(base.map(q => (q.topic || '').trim()).filter(Boolean));
    return [...set].sort();
  }, [available, subjectFilter]);

  const filtered = useMemo(() => {
    let result = available;
    if (subjectFilter) result = result.filter(q => (q.subject || '').trim() === subjectFilter);
    if (topicFilter)   result = result.filter(q => (q.topic   || '').trim() === topicFilter);
    if (qFilter.trim()) {
      const q = qFilter.trim().toLowerCase();
      result = result.filter(q_ => q_.subject?.toLowerCase().includes(q) || q_.topic?.toLowerCase().includes(q) || q_.content?.toLowerCase().includes(q));
    }
    return result;
  }, [available, subjectFilter, topicFilter, qFilter]);

  function toggle(id) { setSelectedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; }); }

  // "Seleziona tutte" agisce sulle domande mostrate dai filtri correnti
  const allFilteredSelected = filtered.length > 0 && filtered.every(q => selectedIds.has(q.id));

  function toggleAllFiltered() {
    setSelectedIds(prev => {
      const next = new Set(prev);
      filtered.forEach(q => allFilteredSelected ? next.delete(q.id) : next.add(q.id));
      return next;
    });
  }

  function handleAdd() {
    const selected = allQuestions.filter(q => selectedIds.has(q.id));
    if (!selected.length) return;
    onAdd(selected);
    setSelectedIds(new Set());
  }

  return (
    <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <ChipSelect options={subjectOptions} value={subjectFilter} onChange={v => { setSubjectFilter(v); setTopicFilter(''); }} allLabel="Tutte le materie" />
        {subjectFilter && topicOptions.length > 0 && (
          <ChipSelect options={topicOptions} value={topicFilter} onChange={setTopicFilter} allLabel="Tutti gli argomenti" />
        )}
      </div>
      <div style={{ position: 'relative' }}>
        <Search size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: C.textFaint }} />
        <input value={qFilter} onChange={e => setQFilter(e.target.value)} placeholder="Cerca…"
          style={{ ...inputStyle, paddingLeft: 38 }}
          onFocus={e => e.target.style.borderColor = C.focusBorder} onBlur={e => e.target.style.borderColor = C.border}
        />
      </div>
      {!loadingAll && filtered.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ fontSize: 13, color: selectedIds.size ? C.greenLight : C.textMuted, fontWeight: selectedIds.size ? 500 : 400 }}>
            {selectedIds.size > 0
              ? `${selectedIds.size} ${selectedIds.size === 1 ? 'domanda selezionata' : 'domande selezionate'}`
              : `${filtered.length} ${filtered.length === 1 ? 'domanda disponibile' : 'domande disponibili'}`}
          </span>
          <button onClick={toggleAllFiltered} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: allFilteredSelected ? 'none' : '#EFF5E6', border: `1px solid ${allFilteredSelected ? C.border : C.greenAccent}`, borderRadius: 8, cursor: 'pointer', color: allFilteredSelected ? C.textMuted : C.greenLight, fontFamily: font, fontSize: 13, fontWeight: 500 }}>
            {allFilteredSelected ? <><X size={13} /> Deseleziona tutte</> : <><CheckCheck size={14} /> Seleziona tutte ({filtered.length})</>}
          </button>
        </div>
      )}
      <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden', maxHeight: 400, overflowY: 'auto' }}>
        {loadingAll ? (
          <div style={{ padding: 20, textAlign: 'center', color: C.textFaint, fontSize: 14 }}>Caricamento…</div>
        ) : available.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: C.textFaint, fontSize: 14 }}>{emptyMessage}</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: C.textFaint, fontSize: 14 }}>Nessuna domanda trovata.</div>
        ) : filtered.map((q, i) => (
          <label key={q.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '13px 16px', borderBottom: i < filtered.length - 1 ? `1px solid ${C.borderLight}` : 'none', cursor: 'pointer', background: selectedIds.has(q.id) ? C.expandBg : C.surface }}>
            <input type="checkbox" checked={selectedIds.has(q.id)} onChange={() => toggle(q.id)} style={{ width: 16, height: 16, marginTop: 2, accentColor: C.green, flexShrink: 0, cursor: 'pointer' }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, color: C.textBody, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{q.content || '—'}</div>
              <div style={{ fontSize: 13.5, color: C.textFaint, marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                {[q.subject, q.topic].filter(Boolean).join(' · ')}
                {q.bloom_level && <span style={{ ...(BLOOM_STYLES[q.bloom_level] || {}), padding: '2px 8px', borderRadius: 20, fontSize: 13, fontWeight: 500 }}>{BLOOM_LABELS[q.bloom_level]}</span>}
              </div>
            </div>
          </label>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={handleAdd} disabled={!selectedIds.size} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: C.green, border: 'none', borderRadius: 8, cursor: !selectedIds.size ? 'not-allowed' : 'pointer', color: '#FFF', fontFamily: font, fontSize: 14, fontWeight: 500, opacity: !selectedIds.size ? 0.5 : 1 }}>
          <Plus size={14} /> Aggiungi {selectedIds.size > 0 ? selectedIds.size : ''} {selectedIds.size === 1 ? 'domanda' : 'domande'}
        </button>
      </div>
    </div>
  );
}
