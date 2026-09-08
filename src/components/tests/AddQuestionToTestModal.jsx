import { useState, useEffect, useMemo, useRef } from 'react';
import { X, Plus, Pencil, Check, Search } from 'lucide-react';
import pb from '../../lib/pocketbase';
import { C, font, serif, BLOOM_LEVELS, BLOOM_LABELS, BLOOM_STYLES } from '../../styles/theme';
import SuggestInput from '../dashboard/SuggestInput';

const initialManualForm = {
  subject: '', topic: '', content: '', options: [''], correct_answer: '', bloom_level: '',
};

function parseGeneratedQuestions(rawText) {
  const questions = [];
  const blocks = rawText.trim().split(/\n(?=> )/);
  for (const block of blocks) {
    try {
      const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length < 6) continue;
      const content = lines[0].replace(/^> /, '').trim();
      const opts = [1, 2, 3, 4].map(i => lines[i].replace(/^[a-d]\) /, ''));
      const ansMatch = block.match(/\* Correct Answer:\s*([a-d])\)?/i);
      const ansLetter = ansMatch ? ansMatch[1].toLowerCase() : 'a';
      const correct_answer = opts[['a', 'b', 'c', 'd'].indexOf(ansLetter)] || opts[0];
      questions.push({ content, options: opts, correct_answer });
    } catch { continue; }
  }
  return questions;
}

// ─────────────────────────────────────────────────────────────────────────────

export default function AddQuestionToTestModal({ existingIds, onAdd, onClose }) {
  const [mode, setMode] = useState('manual'); // 'manual' | 'generate' | 'mine'

  // ── Shared: all owner questions (for suggestions in manual + "mine" tab) ──
  const [allQuestions, setAllQuestions] = useState([]);
  const [loadingAll, setLoadingAll]     = useState(true);

  useEffect(() => {
    pb.collection('Question').getFullList({
      sort: '-created',
      filter: `owner = "${pb.authStore.model.id}"`,
    }).then(recs => setAllQuestions(recs)).catch(() => {}).finally(() => setLoadingAll(false));
  }, []);

  const subjectSuggestions = useMemo(() => {
    const set = new Set(allQuestions.map(q => (q.subject || '').trim()).filter(Boolean));
    return [...set].sort();
  }, [allQuestions]);

  const isBusy = false; // overridden per-tab

  const tabStyle = (active) => ({
    padding: '6px 14px', fontSize: 13, fontFamily: font, borderRadius: 8,
    cursor: 'pointer', fontWeight: active ? 500 : 400,
    background: active ? C.green : 'transparent',
    color: active ? '#FFF' : C.textMuted,
    border: active ? 'none' : `1px solid ${C.border}`,
  });

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(28,43,29,0.50)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
      onClick={onClose}
    >
      <div
        style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, width: 'min(620px, 92vw)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 12px 40px rgba(0,0,0,0.18)', fontFamily: font }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '18px 24px', borderBottom: `1px solid ${C.borderLight}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={{ fontFamily: serif, fontSize: 17, fontWeight: 500, color: C.text, margin: 0 }}>Aggiungi domanda</h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, padding: 4, display: 'flex' }}>
              <X size={16} />
            </button>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button style={tabStyle(mode === 'manual')}   onClick={() => setMode('manual')}>Manuale</button>
            <button style={tabStyle(mode === 'generate')} onClick={() => setMode('generate')}>Genera da documento</button>
            <button style={tabStyle(mode === 'mine')}     onClick={() => setMode('mine')}>Le mie domande</button>
          </div>
        </div>

        {/* Body: delegated to sub-components */}
        {mode === 'manual' && (
          <ManualTab
            subjectSuggestions={subjectSuggestions}
            allQuestions={allQuestions}
            onAdd={onAdd}
            onClose={onClose}
          />
        )}
        {mode === 'generate' && (
          <GenerateTab
            onAdd={onAdd}
            onClose={onClose}
          />
        )}
        {mode === 'mine' && (
          <MineTab
            allQuestions={allQuestions}
            loadingAll={loadingAll}
            existingIds={existingIds}
            onAdd={onAdd}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Manuale
// ─────────────────────────────────────────────────────────────────────────────

function ManualTab({ subjectSuggestions, allQuestions, onAdd, onClose }) {
  const [form, setForm]           = useState(initialManualForm);
  const [saving, setSaving]       = useState(false);
  const [formError, setFormError] = useState('');
  const [warning, setWarning]     = useState('');

  const topicSuggestions = useMemo(() => {
    const subj = form.subject.trim().toLowerCase();
    if (!subj) return [];
    const set = new Set(
      allQuestions
        .filter(q => (q.subject || '').trim().toLowerCase() === subj)
        .map(q => (q.topic || '').trim())
        .filter(Boolean)
    );
    return [...set].sort();
  }, [allQuestions, form.subject]);

  const validOptions = form.options.filter(o => o.trim() !== '');
  useEffect(() => {
    if (form.correct_answer && !validOptions.includes(form.correct_answer))
      setForm(f => ({ ...f, correct_answer: '' }));
  }, [form.options]);

  function setField(key, val) { setForm(f => ({ ...f, [key]: val })); setFormError(''); setWarning(''); }
  function setOption(idx, val) { setForm(f => { const options = [...f.options]; options[idx] = val; return { ...f, options }; }); setFormError(''); }
  function addOption() { setForm(f => ({ ...f, options: [...f.options, ''] })); }
  function removeOption(idx) { setForm(f => { const options = f.options.filter((_, i) => i !== idx); return { ...f, options: options.length ? options : [''] }; }); }

  async function handleSubmit() {
    const subject = form.subject.trim();
    const topic   = form.topic.trim();
    const content = form.content.trim();
    const opts    = form.options.filter(o => o.trim() !== '');

    if (!content)  { setFormError('Il testo della domanda è obbligatorio.'); return; }
    if (!opts.length) { setFormError("Aggiungi almeno un'opzione di risposta."); return; }
    if (!form.correct_answer || !opts.includes(form.correct_answer)) { setFormError('Seleziona una risposta corretta.'); return; }
    if (!subject && topic) { setFormError('Inserisci la materia prima di specificare un argomento.'); setWarning(''); return; }

    const warnMsg = !subject && !topic ? 'Sicuro di voler salvare la domanda senza materia e senza argomento?'
      : subject && !topic ? 'Sicuro di voler salvare la domanda senza argomento?' : '';
    if (warnMsg && warning !== warnMsg) { setWarning(warnMsg); setFormError(''); return; }

    setSaving(true); setFormError(''); setWarning('');
    try {
      const record = await pb.collection('Question').create({
        subject, topic, content, options: opts,
        correct_answer: form.correct_answer, bloom_level: form.bloom_level,
        owner: pb.authStore.model.id,
      });
      onAdd([record]);
    } catch {
      setFormError('Errore durante il salvataggio. Riprova.');
      setSaving(false);
    }
  }

  const inputStyle = { width: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 12px', fontSize: 13, color: C.text, fontFamily: font, outline: 'none', boxSizing: 'border-box' };
  const labelStyle = { display: 'block', fontSize: 12, fontWeight: 500, color: C.textMuted, marginBottom: 4 };
  const spinnerStyle = { display: 'inline-block', width: 12, height: 12, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#FFF', borderRadius: '50%', animation: 'spin 0.7s linear infinite' };

  return (
    <>
      <div style={{ overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <SuggestInput label="Materia" value={form.subject} onChange={v => setField('subject', v)} suggestions={subjectSuggestions} />
        <SuggestInput label="Argomento" value={form.topic} onChange={v => setField('topic', v)} suggestions={topicSuggestions} />
        <div>
          <label style={labelStyle}>Testo della domanda *</label>
          <textarea value={form.content} onChange={e => setField('content', e.target.value)} rows={4} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} />
        </div>
        <div>
          <label style={labelStyle}>Opzioni di risposta *</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {form.options.map((opt, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input value={opt} onChange={e => setOption(idx, e.target.value)} placeholder={`Opzione ${idx + 1}`} style={{ ...inputStyle, flex: 1 }} />
                <button onClick={() => removeOption(idx)} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, cursor: 'pointer', color: C.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, flexShrink: 0 }}>
                  <X size={13} />
                </button>
              </div>
            ))}
            <button onClick={addOption} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'none', border: `1px dashed ${C.border}`, borderRadius: 8, cursor: 'pointer', color: C.textMuted, fontFamily: font, fontSize: 12, marginTop: 2 }}>
              <Plus size={12} /> Aggiungi opzione
            </button>
          </div>
        </div>
        <div>
          <label style={labelStyle}>Risposta corretta *</label>
          <select value={form.correct_answer} onChange={e => setField('correct_answer', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
            <option value="">— seleziona —</option>
            {validOptions.map((o, i) => <option key={i} value={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Livello Bloom</label>
          <select value={form.bloom_level} onChange={e => setField('bloom_level', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
            <option value="">— nessuno —</option>
            {BLOOM_LEVELS.map(l => <option key={l} value={l}>{BLOOM_LABELS[l]}</option>)}
          </select>
        </div>
        {warning && <div style={{ background: '#FBF2DC', border: '1px solid #D4B84A', color: '#7A5010', fontSize: 13, borderRadius: 8, padding: '10px 14px' }}>{warning} Premi nuovamente "Salva" per confermare.</div>}
        {formError && <div style={{ background: C.error.bg, border: `1px solid ${C.error.border}`, color: C.error.text, fontSize: 13, borderRadius: 8, padding: '10px 14px' }}>{formError}</div>}
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '16px 24px', borderTop: `1px solid ${C.borderLight}` }}>
        <button onClick={onClose} disabled={saving} style={{ padding: '8px 18px', background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer', color: C.textMuted, fontFamily: font, fontSize: 13, opacity: saving ? 0.5 : 1 }}>Annulla</button>
        <button onClick={handleSubmit} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', background: C.green, border: 'none', borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer', color: '#FFF', fontFamily: font, fontSize: 13, fontWeight: 500, opacity: saving ? 0.8 : 1 }}>
          {saving && <span style={spinnerStyle} />}{saving ? 'Salvataggio…' : 'Salva e aggiungi'}
        </button>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Genera da documento
// ─────────────────────────────────────────────────────────────────────────────

function GenerateTab({ onAdd, onClose }) {
  const [documents, setDocuments]           = useState([]);
  const [loadingDocs, setLoadingDocs]       = useState(true);
  const [selectedDocId, setSelectedDocId]   = useState('');
  const [numQuestions, setNumQuestions]     = useState(1);
  const [generating, setGenerating]         = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [selectedGenIdx, setSelectedGenIdx] = useState(new Set());
  const [genError, setGenError]             = useState('');
  const [savingGenerated, setSavingGenerated] = useState(false);
  const [docSearch, setDocSearch]           = useState('');
  const [showDocList, setShowDocList]       = useState(false);
  const [editingGenIdx, setEditingGenIdx]   = useState(null);
  const [editGenForm, setEditGenForm]       = useState({ content: '', options: [''], correct_answer: '' });
  const docSearchRef = useRef(null);

  useEffect(() => {
    pb.collection('Document').getFullList({ sort: '-created', filter: `owner = "${pb.authStore.model.id}"` })
      .then(docs => setDocuments(docs))
      .catch(() => setGenError('Impossibile caricare i documenti.'))
      .finally(() => setLoadingDocs(false));
  }, []);

  useEffect(() => {
    function handleMouseDown(e) {
      if (docSearchRef.current && !docSearchRef.current.contains(e.target)) setShowDocList(false);
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  async function handleGenerate() {
    if (!selectedDocId) { setGenError('Seleziona un documento.'); return; }
    const doc = documents.find(d => d.id === selectedDocId);
    if (!doc) return;
    setGenerating(true); setGenError(''); setGeneratedQuestions([]); setSelectedGenIdx(new Set());
    try {
      const docText = (doc.text || '').trim();

      const prompt = `Crea un quiz di livello scuola superiore basato sul testo fornito.\nGenera esattamente ${numQuestions} domande in lingua ITALIANA.\nRispetta rigorosamente questo formato per ogni domanda:\n\n> [Testo della domanda]\na) [Opzione A]\nb) [Opzione B]\nc) [Opzione C]\nd) [Opzione D]\n* Correct Answer: [Lettera, esempio: a)]\n\nTesto: ${docText.slice(0, 4000)}`;
      const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'meta-llama/llama-3.1-8b-instruct', messages: [{ role: 'system', content: 'Sei un esperto nella creazione di quiz educativi.' }, { role: 'user', content: prompt }], temperature: 0.5 }),
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const json = await res.json();
      const parsed = parseGeneratedQuestions(json.choices?.[0]?.message?.content || '');
      if (!parsed.length) { setGenError('Nessuna domanda riconosciuta. Riprova.'); }
      else {
        const withMeta = parsed.map(q => ({ ...q, subject: doc.subject?.trim() || '', topic: doc.topic?.trim() || '' }));
        setGeneratedQuestions(withMeta);
        setSelectedGenIdx(new Set(withMeta.map((_, i) => i)));
      }
    } catch (err) { setGenError('Generazione fallita: ' + err.message); }
    finally { setGenerating(false); }
  }

  async function handleSaveGenerated() {
    if (!selectedGenIdx.size) { setGenError('Seleziona almeno una domanda.'); return; }
    const selected = [...selectedGenIdx].sort().map(i => generatedQuestions[i]);
    setSavingGenerated(true); setGenError('');
    try {
      const records = await Promise.all(selected.map(q =>
        pb.collection('Question').create({ subject: q.subject || '', topic: q.topic || '', content: q.content, options: q.options, correct_answer: q.correct_answer, bloom_level: '', owner: pb.authStore.model.id })
      ));
      onAdd(records);
    } catch { setGenError('Errore durante il salvataggio. Riprova.'); setSavingGenerated(false); }
  }

  function openEditGen(idx) { const q = generatedQuestions[idx]; setEditingGenIdx(idx); setEditGenForm({ subject: q.subject || '', topic: q.topic || '', content: q.content, options: [...q.options], correct_answer: q.correct_answer }); }
  function confirmEditGen() {
    const opts = editGenForm.options.filter(o => o.trim() !== '');
    if (!editGenForm.content.trim() || !opts.length) return;
    const correct_answer = opts.includes(editGenForm.correct_answer) ? editGenForm.correct_answer : opts[0];
    setGeneratedQuestions(prev => prev.map((q, i) => i === editingGenIdx ? { ...q, ...editGenForm, options: opts, correct_answer } : q));
    setEditingGenIdx(null);
  }
  function toggleGenIdx(idx) { setSelectedGenIdx(prev => { const next = new Set(prev); next.has(idx) ? next.delete(idx) : next.add(idx); return next; }); }

  const isBusy = generating || savingGenerated;
  const inputStyle = { width: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 12px', fontSize: 13, color: C.text, fontFamily: font, outline: 'none', boxSizing: 'border-box' };
  const labelStyle = { display: 'block', fontSize: 12, fontWeight: 500, color: C.textMuted, marginBottom: 4 };
  const spinnerStyle = { display: 'inline-block', width: 12, height: 12, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#FFF', borderRadius: '50%', animation: 'spin 0.7s linear infinite' };

  return (
    <>
      <div style={{ overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {loadingDocs ? (
          <div style={{ color: C.textMuted, fontSize: 13, textAlign: 'center', padding: '24px 0' }}>Caricamento documenti…</div>
        ) : documents.length === 0 ? (
          <div style={{ color: C.textMuted, fontSize: 13, textAlign: 'center', padding: '24px 0' }}>Nessun documento disponibile. Carica prima un documento.</div>
        ) : (<>
          <div ref={docSearchRef} style={{ position: 'relative' }}>
            <label style={labelStyle}>Documento *</label>
            <input value={docSearch} onChange={e => { setDocSearch(e.target.value); setShowDocList(true); }} onFocus={() => setShowDocList(true)} placeholder="Cerca documento…" disabled={isBusy} style={inputStyle} />
            {showDocList && (() => {
              const q = docSearch.trim().toLowerCase();
              const filtered = q ? documents.filter(d => (d.title || d.file || '').toLowerCase().includes(q)) : documents;
              if (!filtered.length) return null;
              return (
                <ul style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, margin: '2px 0 0', padding: 0, listStyle: 'none', maxHeight: 200, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.10)' }}>
                  {filtered.map(doc => {
                    const label = doc.title || doc.file || '—';
                    const isActive = doc.id === selectedDocId;
                    return (
                      <li key={doc.id} onMouseDown={e => { e.preventDefault(); setSelectedDocId(doc.id); setDocSearch(label); setShowDocList(false); setGeneratedQuestions([]); setSelectedGenIdx(new Set()); setGenError(''); }}
                        style={{ padding: '8px 12px', fontSize: 13, cursor: 'pointer', color: isActive ? C.green : C.text, fontWeight: isActive ? 600 : 400, background: isActive ? C.expandBg : 'transparent' }}
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
            <input type="number" min={1} max={5} value={numQuestions} onChange={e => { setNumQuestions(Math.max(1, Math.min(5, parseInt(e.target.value) || 1))); setGeneratedQuestions([]); setSelectedGenIdx(new Set()); }} style={{ ...inputStyle, width: 80 }} disabled={isBusy} />
          </div>
          {generatedQuestions.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: C.textMuted }}>{generatedQuestions.length} domanda/e generata/e — seleziona quelle da aggiungere:</div>
              {generatedQuestions.map((q, idx) => {
                const selected = selectedGenIdx.has(idx);
                const isEditing = editingGenIdx === idx;
                return (
                  <div key={idx} style={{ border: selected ? `2px solid ${C.greenAccent}` : `1px solid ${C.border}`, borderRadius: 8, padding: 12, background: selected ? 'rgba(168,197,160,0.18)' : C.expandBg }}>
                    {isEditing ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <div style={{ flex: 1 }}><label style={labelStyle}>Materia</label><input value={editGenForm.subject} onChange={e => setEditGenForm(f => ({ ...f, subject: e.target.value }))} style={inputStyle} /></div>
                          <div style={{ flex: 1 }}><label style={labelStyle}>Argomento</label><input value={editGenForm.topic} onChange={e => setEditGenForm(f => ({ ...f, topic: e.target.value }))} style={inputStyle} /></div>
                        </div>
                        <div><label style={labelStyle}>Testo</label><textarea value={editGenForm.content} onChange={e => setEditGenForm(f => ({ ...f, content: e.target.value }))} rows={3} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} /></div>
                        <div>
                          <label style={labelStyle}>Opzioni</label>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            {editGenForm.options.map((opt, oi) => (
                              <div key={oi} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                <input value={opt} onChange={e => setEditGenForm(f => { const options = [...f.options]; options[oi] = e.target.value; return { ...f, options }; })} style={{ ...inputStyle, flex: 1 }} />
                                <button onClick={() => setEditGenForm(f => { const options = f.options.filter((_, i) => i !== oi); return { ...f, options: options.length ? options : [''] }; })} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, cursor: 'pointer', color: C.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, flexShrink: 0 }}><X size={12} /></button>
                              </div>
                            ))}
                            <button onClick={() => setEditGenForm(f => ({ ...f, options: [...f.options, ''] }))} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', background: 'none', border: `1px dashed ${C.border}`, borderRadius: 7, cursor: 'pointer', color: C.textMuted, fontFamily: font, fontSize: 12 }}><Plus size={11} /> Aggiungi opzione</button>
                          </div>
                        </div>
                        <div><label style={labelStyle}>Risposta corretta</label><select value={editGenForm.correct_answer} onChange={e => setEditGenForm(f => ({ ...f, correct_answer: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>{editGenForm.options.filter(o => o.trim()).map((o, i) => <option key={i} value={o}>{o}</option>)}</select></div>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                          <button onClick={() => setEditingGenIdx(null)} style={{ padding: '5px 14px', background: 'none', border: `1px solid ${C.border}`, borderRadius: 7, cursor: 'pointer', color: C.textMuted, fontFamily: font, fontSize: 12 }}>Annulla</button>
                          <button onClick={confirmEditGen} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 14px', background: C.green, border: 'none', borderRadius: 7, cursor: 'pointer', color: '#FFF', fontFamily: font, fontSize: 12, fontWeight: 500 }}><Check size={12} /> Conferma</button>
                        </div>
                      </div>
                    ) : (
                      <div onClick={() => toggleGenIdx(idx)} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }}>
                        <input type="checkbox" readOnly checked={selected} style={{ marginTop: 2, accentColor: C.green, flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          {(q.subject || q.topic) && <div style={{ fontSize: 11, color: C.textFaint, marginBottom: 5 }}>{[q.subject, q.topic].filter(Boolean).join(' · ')}</div>}
                          <div style={{ fontSize: 13, color: C.text, fontWeight: 500, marginBottom: 6, lineHeight: 1.5 }}>{q.content}</div>
                          <ul style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {q.options.map((opt, oi) => <li key={oi} style={{ fontSize: 12, color: opt === q.correct_answer ? C.greenLight : C.textBody, fontWeight: opt === q.correct_answer ? 600 : 400 }}>{opt}{opt === q.correct_answer ? ' ✓' : ''}</li>)}
                          </ul>
                        </div>
                        <button onClick={e => { e.stopPropagation(); openEditGen(idx); }} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, cursor: 'pointer', color: C.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, flexShrink: 0 }}><Pencil size={12} /></button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {genError && <div style={{ background: C.error.bg, border: `1px solid ${C.error.border}`, color: C.error.text, fontSize: 13, borderRadius: 8, padding: '10px 14px' }}>{genError}</div>}
        </>)}
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '16px 24px', borderTop: `1px solid ${C.borderLight}` }}>
        <button onClick={onClose} disabled={isBusy} style={{ padding: '8px 18px', background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, cursor: isBusy ? 'not-allowed' : 'pointer', color: C.textMuted, fontFamily: font, fontSize: 13, opacity: isBusy ? 0.5 : 1 }}>Annulla</button>
        {!loadingDocs && documents.length > 0 && (
          generatedQuestions.length === 0 ? (
            <button onClick={handleGenerate} disabled={generating || !selectedDocId} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', background: C.green, border: 'none', borderRadius: 8, cursor: (generating || !selectedDocId) ? 'not-allowed' : 'pointer', color: '#FFF', fontFamily: font, fontSize: 13, fontWeight: 500, opacity: (generating || !selectedDocId) ? 0.8 : 1 }}>
              {generating && <span style={spinnerStyle} />}{generating ? 'Generazione…' : 'Genera'}
            </button>
          ) : (
            <button onClick={handleSaveGenerated} disabled={savingGenerated || !selectedGenIdx.size} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', background: C.green, border: 'none', borderRadius: 8, cursor: (savingGenerated || !selectedGenIdx.size) ? 'not-allowed' : 'pointer', color: '#FFF', fontFamily: font, fontSize: 13, fontWeight: 500, opacity: (savingGenerated || !selectedGenIdx.size) ? 0.8 : 1 }}>
              {savingGenerated && <span style={spinnerStyle} />}{savingGenerated ? 'Salvataggio…' : `Aggiungi ${selectedGenIdx.size} domanda/e`}
            </button>
          )
        )}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Le mie domande
// ─────────────────────────────────────────────────────────────────────────────

function MineTab({ allQuestions, loadingAll, existingIds, onAdd, onClose }) {
  const [qFilter, setQFilter]         = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Escludi domande già presenti nel test
  const available = useMemo(() => {
    return allQuestions.filter(q => !existingIds.has(q.id));
  }, [allQuestions, existingIds]);

  const filtered = useMemo(() => {
    if (!qFilter.trim()) return available;
    const q = qFilter.trim().toLowerCase();
    return available.filter(q_ =>
      q_.subject?.toLowerCase().includes(q) ||
      q_.topic?.toLowerCase().includes(q) ||
      q_.content?.toLowerCase().includes(q)
    );
  }, [available, qFilter]);

  function toggle(id) {
    setSelectedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }

  function handleAdd() {
    const selected = allQuestions.filter(q => selectedIds.has(q.id));
    onAdd(selected);
  }

  return (
    <>
      <div style={{ overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: C.textFaint }} />
          <input
            value={qFilter}
            onChange={e => setQFilter(e.target.value)}
            placeholder="Filtra per materia, argomento, contenuto…"
            style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '7px 12px 7px 30px', fontSize: 12.5, color: C.text, fontFamily: font, outline: 'none', boxSizing: 'border-box' }}
            onFocus={e => e.target.style.borderColor = '#5C7A5E'}
            onBlur={e => e.target.style.borderColor = C.border}
          />
        </div>

        {selectedIds.size > 0 && (
          <div style={{ fontSize: 12, color: C.greenLight, fontWeight: 500 }}>
            {selectedIds.size} {selectedIds.size === 1 ? 'domanda selezionata' : 'domande selezionate'}
          </div>
        )}

        {/* List */}
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden', background: C.bg }}>
          {loadingAll ? (
            <div style={{ padding: 16, textAlign: 'center', color: C.textFaint, fontSize: 13 }}>Caricamento…</div>
          ) : available.length === 0 ? (
            <div style={{ padding: 16, textAlign: 'center', color: C.textFaint, fontSize: 13 }}>Tutte le tue domande sono già nel test.</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 16, textAlign: 'center', color: C.textFaint, fontSize: 13 }}>Nessuna domanda trovata.</div>
          ) : (
            filtered.map((q, i) => (
              <label key={q.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderBottom: i < filtered.length - 1 ? `1px solid ${C.borderLight}` : 'none', cursor: 'pointer', background: selectedIds.has(q.id) ? C.expandBg : 'transparent' }}>
                <input type="checkbox" checked={selectedIds.has(q.id)} onChange={() => toggle(q.id)} style={{ marginTop: 3, accentColor: C.green, flexShrink: 0, cursor: 'pointer' }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: C.textBody, lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{q.content || '—'}</div>
                  <div style={{ fontSize: 11, color: C.textFaint, marginTop: 3 }}>
                    {[q.subject, q.topic].filter(Boolean).join(' · ')}
                    {q.bloom_level && <span style={{ ...BLOOM_STYLES[q.bloom_level], marginLeft: 8, padding: '1px 7px', borderRadius: 20, fontSize: 10, fontWeight: 500 }}>{BLOOM_LABELS[q.bloom_level]}</span>}
                  </div>
                </div>
              </label>
            ))
          )}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '16px 24px', borderTop: `1px solid ${C.borderLight}` }}>
        <button onClick={onClose} style={{ padding: '8px 18px', background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, cursor: 'pointer', color: C.textMuted, fontFamily: font, fontSize: 13 }}>Annulla</button>
        <button onClick={handleAdd} disabled={!selectedIds.size} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', background: C.green, border: 'none', borderRadius: 8, cursor: !selectedIds.size ? 'not-allowed' : 'pointer', color: '#FFF', fontFamily: font, fontSize: 13, fontWeight: 500, opacity: !selectedIds.size ? 0.5 : 1 }}>
          <Plus size={14} /> Aggiungi {selectedIds.size > 0 ? selectedIds.size : ''} {selectedIds.size === 1 ? 'domanda' : 'domande'}
        </button>
      </div>
    </>
  );
}
