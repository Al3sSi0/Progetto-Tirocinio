import { useState, useEffect, useRef } from 'react';
import { Plus, X, Pencil, Check, Search } from 'lucide-react';
import pb from '../../lib/pocketbase';
import { C, font, serif, BLOOM_LEVELS, BLOOM_LABELS } from '../../styles/theme';
import SuggestInput from './SuggestInput';
import { useAllSuggestions } from '../../lib/useAllSuggestions';

const initialForm = {
  subject:        '',
  topic:          '',
  content:        '',
  options:        [''],
  correct_answer: '',
  bloom_level:    '',
};


function parseGeneratedQuestions(rawText) {
  const questions = [];
  const blocks = rawText.trim().split(/\n(?=> )/);
  for (const block of blocks) {
    try {
      const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length < 6) continue;
      const content = lines[0].replace(/^> /, '').trim();
      if (!content) continue;
      const opts = [1, 2, 3, 4].map(i => lines[i].replace(/^[a-d]\) /, ''));
      const ansMatch = block.match(/\* Correct Answer:\s*([a-d])\)?/i);
      const ansLetter = ansMatch ? ansMatch[1].toLowerCase() : 'a';
      const correct_answer = opts[['a', 'b', 'c', 'd'].indexOf(ansLetter)] || opts[0];
      questions.push({ content, options: opts, correct_answer });
    } catch { continue; }
  }
  return questions;
}

export default function AddQuestionModal({ onClose, onSaved, data }) {
  // --- Manual form state ---
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  // Refs per lo scroll ai campi obbligatori
  const subjectRef      = useRef(null);
  const topicRef        = useRef(null);
  const contentRef      = useRef(null);
  const optionsRef      = useRef(null);
  const correctAnswRef  = useRef(null);
  const scrollBodyRef   = useRef(null);

  // --- Mode ---
  const [mode, setMode] = useState('manual'); // 'manual' | 'generate'

  // --- Generate mode state ---
  const [documents, setDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState('');
  const [numQuestions, setNumQuestions] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [selectedGenIdx, setSelectedGenIdx] = useState(new Set());
  const [genError, setGenError] = useState('');
  const [savingGenerated, setSavingGenerated] = useState(false);
  const [docSearch, setDocSearch] = useState('');
  const [docSubjectFilter, setDocSubjectFilter] = useState('');
  const [docTopicFilter, setDocTopicFilter] = useState('');
  const [editingGenIdx, setEditingGenIdx] = useState(null);
  const [editGenForm, setEditGenForm] = useState({ content: '', options: [''], correct_answer: '' });

  // --- Manual form derived state ---
  const { subjects: subjectSuggestions, topics: topicSuggestions } = useAllSuggestions(form.subject, data);

  const validOptions = form.options.filter(o => o.trim() !== '');
  useEffect(() => {
    if (form.correct_answer && !validOptions.includes(form.correct_answer)) {
      setForm(f => ({ ...f, correct_answer: '' }));
    }
  }, [form.options]);

  // Load documents when switching to generate mode
  useEffect(() => {
    if (mode !== 'generate') return;
    if (documents.length > 0) return;
    setLoadingDocs(true);
    pb.collection('Document').getFullList({ sort: '-created', filter: `owner = "${pb.authStore.model.id}"` })
      .then(docs => setDocuments(docs))
      .catch(() => setGenError('Impossibile caricare i documenti.'))
      .finally(() => setLoadingDocs(false));
  }, [mode]);

  // --- Manual form handlers ---
  function setField(key, val) {
    setForm(f => ({ ...f, [key]: val }));
    setFormError('');
    setFieldErrors(fe => { const n = { ...fe }; delete n[key]; return n; });
  }
  function setOption(idx, val) {
    setForm(f => { const options = [...f.options]; options[idx] = val; return { ...f, options }; });
    setFormError('');
    setFieldErrors(fe => { const n = { ...fe }; delete n.options; delete n.correct_answer; return n; });
  }
  function addOption() { setForm(f => ({ ...f, options: [...f.options, ''] })); }
  function removeOption(idx) {
    setForm(f => { const options = f.options.filter((_, i) => i !== idx); return { ...f, options: options.length ? options : [''] }; });
  }

  function scrollToRef(ref) {
    if (!ref.current || !scrollBodyRef.current) return;
    const container = scrollBodyRef.current;
    const el = ref.current;
    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const offset = elRect.top - containerRect.top + container.scrollTop - 20;
    container.scrollTo({ top: offset, behavior: 'smooth' });
  }

  async function handleSubmit() {
    const subject = form.subject.trim();
    const topic   = form.topic.trim();
    const content = form.content.trim();
    const opts    = form.options.filter(o => o.trim() !== '');

    const errors = {};
    if (!subject)  errors.subject = 'La materia è obbligatoria.';
    if (!topic)    errors.topic   = "L'argomento è obbligatorio.";
    if (!content)  errors.content = 'Il testo della domanda è obbligatorio.';
    if (opts.length === 0) errors.options = "Aggiungi almeno un'opzione di risposta.";
    if (!form.correct_answer || !opts.includes(form.correct_answer))
      errors.correct_answer = 'Seleziona una risposta corretta tra le opzioni.';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      // Scroll al primo campo con errore
      const order = [
        { key: 'subject',       ref: subjectRef },
        { key: 'topic',         ref: topicRef },
        { key: 'content',       ref: contentRef },
        { key: 'options',       ref: optionsRef },
        { key: 'correct_answer',ref: correctAnswRef },
      ];
      const first = order.find(({ key }) => errors[key]);
      if (first) scrollToRef(first.ref);
      return;
    }

    setFieldErrors({});
    setSaving(true); setFormError('');
    try {
      await pb.collection('Question').create({
        subject, topic, content,
        options:        opts,
        correct_answer: form.correct_answer,
        bloom_level:    form.bloom_level,
        owner:          pb.authStore.model.id,
      });
      onSaved();
    } catch {
      setFormError('Errore durante il salvataggio. Riprova.');
      setSaving(false);
    }
  }

  // --- Generate mode handlers ---
  async function handleGenerate() {
    if (!selectedDocId) { setGenError('Seleziona un documento.'); return; }
    const doc = documents.find(d => d.id === selectedDocId);
    if (!doc) { setGenError('Documento non trovato.'); return; }

    setGenerating(true);
    setGenError('');
    setGeneratedQuestions([]);
    setSelectedGenIdx(new Set());

    try {
      const docText = (doc.text || '').trim();

      const prompt = `Crea un quiz di livello scuola superiore basato sul testo fornito.
    Genera esattamente ${numQuestions} domande in lingua ITALIANA.
    Rispetta rigorosamente questo formato per ogni domanda:

    > [Testo della domanda]
    a) [Opzione A]
    b) [Opzione B]
    c) [Opzione C]
    d) [Opzione D]
    * Correct Answer: [Lettera, esempio: a)]

    Testo: ${docText.slice(0, 4000)}`;

      const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-3.1-8b-instruct',
          messages: [
            { role: 'system', content: 'Sei un esperto nella creazione di quiz educativi.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.5,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`API error ${response.status}: ${err}`);
      }

      const json = await response.json();
      const rawText = json.choices?.[0]?.message?.content || '';
      const parsed = parseGeneratedQuestions(rawText);

      if (parsed.length === 0) {
        setGenError('Nessuna domanda riconosciuta nella risposta. Riprova.');
      } else {
        const docSubject = doc?.subject?.trim() || '';
        const docTopic   = doc?.topic?.trim()   || '';
        const withMeta   = parsed.map(q => ({ ...q, subject: docSubject, topic: docTopic }));
        setGeneratedQuestions(withMeta);
        // Pre-select all
        setSelectedGenIdx(new Set(withMeta.map((_, i) => i)));
      }
    } catch (err) {
      setGenError('Generazione fallita: ' + err.message);
    } finally {
      setGenerating(false);
    }
  }

  function openEditGen(idx) {
    const q = generatedQuestions[idx];
    setEditingGenIdx(idx);
    setEditGenForm({ subject: q.subject || '', topic: q.topic || '', content: q.content, options: [...q.options], correct_answer: q.correct_answer });
  }

  function confirmEditGen() {
    const opts = editGenForm.options.filter(o => o.trim() !== '');
    if (!editGenForm.content.trim() || opts.length === 0) return;
    const correct_answer = opts.includes(editGenForm.correct_answer) ? editGenForm.correct_answer : opts[0];
    setGeneratedQuestions(prev => prev.map((q, i) => i === editingGenIdx ? { ...q, subject: editGenForm.subject, topic: editGenForm.topic, content: editGenForm.content.trim(), options: opts, correct_answer } : q));
    setEditingGenIdx(null);
  }

  function setEditGenOption(idx, val) {
    setEditGenForm(f => { const options = [...f.options]; options[idx] = val; return { ...f, options }; });
  }

  function toggleGenIdx(idx) {
    setSelectedGenIdx(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  }

  async function handleSaveGenerated() {
    if (selectedGenIdx.size === 0) { setGenError('Seleziona almeno una domanda.'); return; }

    const selected = [...selectedGenIdx].sort().map(i => generatedQuestions[i]);

    // Save all selected directly
    setSavingGenerated(true);
    setGenError('');
    try {
      await Promise.all(selected.map(q =>
        pb.collection('Question').create({
          subject:        q.subject || '',
          topic:          q.topic   || '',
          content:        q.content,
          options:        q.options,
          correct_answer: q.correct_answer,
          bloom_level:    '',
          source_doc:     selectedDocId,
          owner:          pb.authStore.model.id,
        })
      ));
      onSaved();
    } catch {
      setGenError('Errore durante il salvataggio. Riprova.');
      setSavingGenerated(false);
    }
  }

  const isBusy = saving || generating || savingGenerated;

  const inputStyle = {
    width: '100%', background: C.surface, border: `1px solid ${C.border}`,
    borderRadius: 8, padding: '8px 12px', fontSize: 13, color: C.text,
    fontFamily: font, outline: 'none', boxSizing: 'border-box',
  };
  const labelStyle = { display: 'block', fontSize: 12, fontWeight: 500, color: C.textMuted, marginBottom: 4 };
  const tabStyle = (active) => ({
    padding: '6px 14px', fontSize: 13, fontFamily: font, borderRadius: 8,
    cursor: 'pointer', fontWeight: active ? 500 : 400,
    background: active ? C.green : 'transparent',
    color: active ? '#FFF' : C.textMuted,
    border: active ? 'none' : `1px solid ${C.border}`,
  });
  const spinnerStyle = {
    display: 'inline-block', width: 12, height: 12,
    border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#FFF',
    borderRadius: '50%', animation: 'spin 0.7s linear infinite',
  };

  const fieldErrorStyle = {
    fontSize: 12, color: C.error.text, background: C.error.bg,
    border: `1px solid ${C.error.border}`, borderRadius: 6,
    padding: '5px 10px', marginBottom: 6, animation: 'errorSlideIn 0.25s ease',
  };

  return (
    <>
    <style>{`
      @keyframes errorSlideIn {
        from { opacity: 0; transform: translateY(-6px); }
        to   { opacity: 1; transform: translateY(0); }
      }
    `}</style>
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(28,43,29,0.40)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
      onClick={() => { if (!isBusy) onClose(); }}
    >
      <div
        style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, width: `min(600px, 90vw)`, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 32px rgba(0,0,0,0.14)', fontFamily: font }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '18px 24px', borderBottom: `1px solid ${C.borderLight}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={{ fontFamily: serif, fontSize: 17, fontWeight: 500, color: C.text, margin: 0 }}>Nuova domanda</h2>
            <button onClick={onClose} disabled={isBusy}
              style={{ background: 'none', border: 'none', cursor: isBusy ? 'not-allowed' : 'pointer', color: C.textMuted, padding: 4, display: 'flex', opacity: isBusy ? 0.4 : 1 }}>
              <X size={16} />
            </button>
          </div>
          {/* Mode tabs */}
          <div style={{ display: 'flex', gap: 6 }}>
            <button style={tabStyle(mode === 'manual')} onClick={() => { if (!isBusy) setMode('manual'); }}>
              Manuale
            </button>
            <button style={tabStyle(mode === 'generate')} onClick={() => { if (!isBusy) setMode('generate'); }}>
              Genera da documento
            </button>
          </div>
        </div>

        {/* Body */}
        <div ref={scrollBodyRef} style={{ overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* ── MANUAL MODE ── */}
          {mode === 'manual' && (<>
            <div ref={subjectRef}>
              <SuggestInput label="Materia *" value={form.subject} onChange={v => setField('subject', v)} suggestions={subjectSuggestions} error={fieldErrors.subject} />
            </div>
            <div ref={topicRef}>
              <SuggestInput label="Argomento *" value={form.topic} onChange={v => setField('topic', v)} suggestions={topicSuggestions} error={fieldErrors.topic} />
            </div>

            <div ref={contentRef}>
              <label style={labelStyle}>Testo della domanda *</label>
              {fieldErrors.content && <div style={fieldErrorStyle}>{fieldErrors.content}</div>}
              <textarea value={form.content} onChange={e => setField('content', e.target.value)} rows={4}
                style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6, borderColor: fieldErrors.content ? C.error.border : C.border }} />
            </div>

            <div ref={optionsRef}>
              <label style={labelStyle}>Opzioni di risposta *</label>
              {fieldErrors.options && <div style={fieldErrorStyle}>{fieldErrors.options}</div>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {form.options.map((opt, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input value={opt} onChange={e => setOption(idx, e.target.value)} placeholder={`Opzione ${idx + 1}`} style={{ ...inputStyle, flex: 1 }} />
                    <button onClick={() => removeOption(idx)}
                      style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, cursor: 'pointer', color: C.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, flexShrink: 0 }}>
                      <X size={13} />
                    </button>
                  </div>
                ))}
                <button onClick={addOption}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'none', border: `1px dashed ${C.border}`, borderRadius: 8, cursor: 'pointer', color: C.textMuted, fontFamily: font, fontSize: 12, marginTop: 2 }}>
                  <Plus size={12} /> Aggiungi opzione
                </button>
              </div>
            </div>

            <div ref={correctAnswRef}>
              <label style={labelStyle}>Risposta corretta *</label>
              {fieldErrors.correct_answer && <div style={fieldErrorStyle}>{fieldErrors.correct_answer}</div>}
              <select value={form.correct_answer} onChange={e => setField('correct_answer', e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer', borderColor: fieldErrors.correct_answer ? C.error.border : C.border }}>
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

            {formError && (
              <div style={{ background: C.error.bg, border: `1px solid ${C.error.border}`, color: C.error.text, fontSize: 13, borderRadius: 8, padding: '10px 14px' }}>
                {formError}
              </div>
            )}
          </>)}

          {/* ── GENERATE MODE ── */}
          {mode === 'generate' && (<>
            {loadingDocs ? (
              <div style={{ color: C.textMuted, fontSize: 13, textAlign: 'center', padding: '24px 0' }}>
                Caricamento documenti…
              </div>
            ) : documents.length === 0 ? (
              <div style={{ color: C.textMuted, fontSize: 13, textAlign: 'center', padding: '24px 0' }}>
                Nessun documento disponibile. Carica un documento nella sezione Documenti.
              </div>
            ) : (<>
              <label style={labelStyle}>Documento *</label>
              {(() => {
                const subjectOptions = [...new Set(documents.map(d => (d.subject || '').trim()).filter(Boolean))].sort();
                const topicOptions = [...new Set(
                  (docSubjectFilter ? documents.filter(d => (d.subject || '').trim() === docSubjectFilter) : documents)
                    .map(d => (d.topic || '').trim()).filter(Boolean)
                )].sort();
                const selectStyle = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '6px 10px', fontSize: 12.5, color: C.text, fontFamily: font, outline: 'none', cursor: 'pointer', flex: 1 };
                return (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <select value={docSubjectFilter}
                      onChange={e => { setDocSubjectFilter(e.target.value); setDocTopicFilter(''); setSelectedDocId(''); setGeneratedQuestions([]); setSelectedGenIdx(new Set()); setGenError(''); }}
                      disabled={generating} style={selectStyle}>
                      <option value="">Tutte le materie</option>
                      {subjectOptions.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select value={docTopicFilter}
                      onChange={e => { setDocTopicFilter(e.target.value); setSelectedDocId(''); setGeneratedQuestions([]); setSelectedGenIdx(new Set()); setGenError(''); }}
                      disabled={generating || !docSubjectFilter}
                      style={{ ...selectStyle, opacity: docSubjectFilter ? 1 : 0.45, cursor: (generating || !docSubjectFilter) ? 'not-allowed' : 'pointer' }}>
                      <option value="">Tutti gli argomenti</option>
                      {topicOptions.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                );
              })()}
              <div style={{ position: 'relative' }}>
                <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: C.textFaint }} />
                <input
                  value={docSearch}
                  onChange={e => { setDocSearch(e.target.value); setSelectedDocId(''); setGeneratedQuestions([]); setSelectedGenIdx(new Set()); setGenError(''); }}
                  placeholder="Cerca per nome…"
                  disabled={generating}
                  style={{ ...inputStyle, paddingLeft: 28 }}
                />
              </div>
              {(() => {
                let filtered = documents;
                if (docSubjectFilter) filtered = filtered.filter(d => (d.subject || '').trim() === docSubjectFilter);
                if (docTopicFilter)   filtered = filtered.filter(d => (d.topic   || '').trim() === docTopicFilter);
                if (docSearch.trim()) filtered = filtered.filter(d => (d.title || d.file || '').toLowerCase().includes(docSearch.trim().toLowerCase()));
                return (
                  <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden', maxHeight: 200, overflowY: 'auto' }}>
                    {filtered.length === 0 ? (
                      <div style={{ padding: 12, textAlign: 'center', color: C.textFaint, fontSize: 13 }}>Nessun documento trovato.</div>
                    ) : filtered.map((doc, i) => {
                      const label = doc.title || doc.file || '—';
                      const isActive = doc.id === selectedDocId;
                      return (
                        <div key={doc.id}
                          onClick={() => { if (!generating) { setSelectedDocId(doc.id); setGeneratedQuestions([]); setSelectedGenIdx(new Set()); setGenError(''); } }}
                          style={{
                            padding: '9px 12px', fontSize: 13, cursor: generating ? 'default' : 'pointer',
                            borderBottom: i < filtered.length - 1 ? `1px solid ${C.borderLight}` : 'none',
                            background: isActive ? C.expandBg : C.surface,
                            color: isActive ? C.green : C.text,
                            fontWeight: isActive ? 600 : 400,
                          }}
                          onMouseEnter={e => { if (!isActive && !generating) e.currentTarget.style.background = C.expandBg; }}
                          onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = C.surface; }}
                        >
                          <div>{label}</div>
                          {(doc.subject || doc.topic) && (
                            <div style={{ fontSize: 11, color: C.textFaint, marginTop: 2 }}>
                              {[doc.subject, doc.topic].filter(Boolean).join(' · ')}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              <div>
                <label style={labelStyle}>Numero di domande</label>
                <input
                  type="number" min={1} max={5}
                  value={numQuestions}
                  onChange={e => {
                    const v = Math.max(1, Math.min(5, parseInt(e.target.value) || 1));
                    setNumQuestions(v);
                    setGeneratedQuestions([]);
                    setSelectedGenIdx(new Set());
                  }}
                  style={{ ...inputStyle, width: 80 }}
                  disabled={generating}
                />
              </div>

              {/* Generated question cards */}
              {generatedQuestions.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: C.textMuted }}>
                    {generatedQuestions.length} domanda/e generata/e — seleziona quelle da salvare:
                  </div>
                  {generatedQuestions.map((q, idx) => {
                    const selected = selectedGenIdx.has(idx);
                    const isEditing = editingGenIdx === idx;
                    return (
                      <div
                        key={idx}
                        style={{
                          border: selected ? `2px solid ${C.greenAccent}` : `1px solid ${C.border}`,
                          borderRadius: 8,
                          padding: 12,
                          background: selected ? 'rgba(168,197,160,0.18)' : C.expandBg,
                          transition: 'border 0.15s, background 0.15s',
                        }}
                      >
                        {isEditing ? (
                          /* ── Inline edit form ── */
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <div style={{ flex: 1 }}>
                                <label style={labelStyle}>Materia</label>
                                <input
                                  value={editGenForm.subject}
                                  onChange={e => setEditGenForm(f => ({ ...f, subject: e.target.value }))}
                                  placeholder="Materia"
                                  style={inputStyle}
                                />
                              </div>
                              <div style={{ flex: 1 }}>
                                <label style={labelStyle}>Argomento</label>
                                <input
                                  value={editGenForm.topic}
                                  onChange={e => setEditGenForm(f => ({ ...f, topic: e.target.value }))}
                                  placeholder="Argomento"
                                  style={inputStyle}
                                />
                              </div>
                            </div>
                            <div>
                              <label style={labelStyle}>Testo della domanda</label>
                              <textarea
                                value={editGenForm.content}
                                onChange={e => setEditGenForm(f => ({ ...f, content: e.target.value }))}
                                rows={3}
                                style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
                              />
                            </div>
                            <div>
                              <label style={labelStyle}>Opzioni</label>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                {editGenForm.options.map((opt, oi) => (
                                  <div key={oi} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                    <input
                                      value={opt}
                                      onChange={e => setEditGenOption(oi, e.target.value)}
                                      style={{ ...inputStyle, flex: 1 }}
                                    />
                                    <button
                                      onClick={() => setEditGenForm(f => { const options = f.options.filter((_, i) => i !== oi); return { ...f, options: options.length ? options : [''] }; })}
                                      style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, cursor: 'pointer', color: C.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, flexShrink: 0 }}
                                    >
                                      <X size={12} />
                                    </button>
                                  </div>
                                ))}
                                <button
                                  onClick={() => setEditGenForm(f => ({ ...f, options: [...f.options, ''] }))}
                                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', background: 'none', border: `1px dashed ${C.border}`, borderRadius: 7, cursor: 'pointer', color: C.textMuted, fontFamily: font, fontSize: 12 }}
                                >
                                  <Plus size={11} /> Aggiungi opzione
                                </button>
                              </div>
                            </div>
                            <div>
                              <label style={labelStyle}>Risposta corretta</label>
                              <select
                                value={editGenForm.correct_answer}
                                onChange={e => setEditGenForm(f => ({ ...f, correct_answer: e.target.value }))}
                                style={{ ...inputStyle, cursor: 'pointer' }}
                              >
                                {editGenForm.options.filter(o => o.trim()).map((o, i) => <option key={i} value={o}>{o}</option>)}
                              </select>
                            </div>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                              <button
                                onClick={() => setEditingGenIdx(null)}
                                style={{ padding: '5px 14px', background: 'none', border: `1px solid ${C.border}`, borderRadius: 7, cursor: 'pointer', color: C.textMuted, fontFamily: font, fontSize: 12 }}
                              >
                                Annulla
                              </button>
                              <button
                                onClick={confirmEditGen}
                                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 14px', background: C.green, border: 'none', borderRadius: 7, cursor: 'pointer', color: '#FFF', fontFamily: font, fontSize: 12, fontWeight: 500 }}
                              >
                                <Check size={12} /> Conferma
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* ── Read view ── */
                          <div
                            onClick={() => toggleGenIdx(idx)}
                            style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }}
                          >
                            <input
                              type="checkbox"
                              readOnly
                              checked={selected}
                              style={{ marginTop: 2, accentColor: C.green, flexShrink: 0 }}
                            />
                            <div style={{ flex: 1 }}>
                              {(q.subject || q.topic) && (
                                <div style={{ fontSize: 11, color: C.textFaint, marginBottom: 5 }}>
                                  {[q.subject, q.topic].filter(Boolean).join(' · ')}
                                </div>
                              )}
                              <div style={{ fontSize: 13, color: C.text, fontWeight: 500, marginBottom: 6, lineHeight: 1.5 }}>
                                {q.content}
                              </div>
                              <ul style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 3 }}>
                                {q.options.map((opt, oi) => (
                                  <li key={oi} style={{
                                    fontSize: 12,
                                    color: opt === q.correct_answer ? C.greenLight : C.textBody,
                                    fontWeight: opt === q.correct_answer ? 600 : 400,
                                  }}>
                                    {opt}{opt === q.correct_answer ? ' ✓' : ''}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <button
                              onClick={e => { e.stopPropagation(); openEditGen(idx); }}
                              title="Modifica"
                              style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, cursor: 'pointer', color: C.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, flexShrink: 0 }}
                            >
                              <Pencil size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {genError && (
                <div style={{ background: C.error.bg, border: `1px solid ${C.error.border}`, color: C.error.text, fontSize: 13, borderRadius: 8, padding: '10px 14px' }}>
                  {genError}
                </div>
              )}
            </>)}
          </>)}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '16px 24px', borderTop: `1px solid ${C.borderLight}` }}>
          <button onClick={onClose} disabled={isBusy}
            style={{ padding: '8px 18px', background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, cursor: isBusy ? 'not-allowed' : 'pointer', color: C.textMuted, fontFamily: font, fontSize: 13, opacity: isBusy ? 0.5 : 1 }}>
            Annulla
          </button>

          {mode === 'manual' && (
            <button onClick={handleSubmit} disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', background: C.green, border: 'none', borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer', color: '#FFF', fontFamily: font, fontSize: 13, fontWeight: 500, opacity: saving ? 0.8 : 1 }}>
              {saving && <span style={spinnerStyle} />}
              {saving ? 'Salvataggio…' : 'Salva'}
            </button>
          )}

          {mode === 'generate' && !loadingDocs && documents.length > 0 && (
            generatedQuestions.length === 0 ? (
              <button onClick={handleGenerate} disabled={generating || !selectedDocId}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', background: C.green, border: 'none', borderRadius: 8, cursor: (generating || !selectedDocId) ? 'not-allowed' : 'pointer', color: '#FFF', fontFamily: font, fontSize: 13, fontWeight: 500, opacity: (generating || !selectedDocId) ? 0.8 : 1 }}>
                {generating && <span style={spinnerStyle} />}
                {generating ? 'Generazione in corso…' : 'Genera'}
              </button>
            ) : (
              <button onClick={handleSaveGenerated} disabled={savingGenerated || selectedGenIdx.size === 0}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', background: C.green, border: 'none', borderRadius: 8, cursor: (savingGenerated || selectedGenIdx.size === 0) ? 'not-allowed' : 'pointer', color: '#FFF', fontFamily: font, fontSize: 13, fontWeight: 500, opacity: (savingGenerated || selectedGenIdx.size === 0) ? 0.8 : 1 }}>
                {savingGenerated && <span style={spinnerStyle} />}
                {savingGenerated ? 'Salvataggio…' : selectedGenIdx.size === 1 ? 'Salva domanda' : `Salva ${selectedGenIdx.size} domande`}
              </button>
            )
          )}
        </div>
      </div>
    </div>
    </>
  );
}
