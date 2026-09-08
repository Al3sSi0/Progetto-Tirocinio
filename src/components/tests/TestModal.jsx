import { useState, useEffect, useMemo, useRef } from 'react';
import { X, Trash2, Plus, Pencil, Check, Search, GripVertical } from 'lucide-react';
import pb from '../../lib/pocketbase';
import { C, font, serif, BLOOM_STYLES, BLOOM_LABELS, BLOOM_LEVELS } from '../../styles/theme';
import SuggestInput from '../dashboard/SuggestInput';
import { useAllSuggestions } from '../../lib/useAllSuggestions';

// ── Parsing ───────────────────────────────────────────────────────────────────

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

const initialManualForm = {
  subject: '', topic: '', content: '', options: [''], correct_answer: '', bloom_level: '',
};

export default function TestModal({ test = null, data, onClose, onSaved, initialQuestions = [] }) {
  const isEdit = test !== null;

  // ── Dati principali del test ──────────────────────────────────────────────
  const [form, setForm] = useState({
    description: test?.description || '',
    subject:     test?.subject     || '',
    topic:       test?.topic       || '',
  });
  const [saving, setSaving]       = useState(false);
  const [formError, setFormError] = useState('');
  const [warning, setWarning]     = useState('');

  // ── Domande del test (oggetti completi) ───────────────────────────────────
  const [questions, setQuestions] = useState(() => {
    if (!test?.expand?.questions) return initialQuestions;
    return Array.isArray(test.expand.questions) ? test.expand.questions : [test.expand.questions];
  });
  const [removingIds, setRemovingIds] = useState(new Set());
  const [editingQId, setEditingQId]   = useState(null);
  const [editQForm, setEditQForm]     = useState({ subject: '', topic: '', content: '', options: [''], correct_answer: '', bloom_level: '' });
  const [savingEdit, setSavingEdit]   = useState(false);
  const [editError, setEditError]     = useState('');

  // ── Drag & drop riordino domande ──────────────────────────────────────────
  const [dragIdx, setDragIdx]         = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);

  function handleDragStart(e, idx) {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
  }
  function handleDragOver(e, idx) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (idx !== dragIdx) setDragOverIdx(idx);
  }
  function handleDrop(e, idx) {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) { setDragIdx(null); setDragOverIdx(null); return; }
    setQuestions(prev => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(idx, 0, moved);
      return next;
    });
    setDragIdx(null); setDragOverIdx(null);
  }
  function handleDragEnd() { setDragIdx(null); setDragOverIdx(null); }

  // ── Sezione inline "Aggiungi domanda" ─────────────────────────────────────
  const [showAdd, setShowAdd]   = useState(false);
  const [addMode, setAddMode]   = useState('manual'); // 'manual' | 'generate' | 'mine'

  // ── Tutte le domande dell'owner (per tab "Le mie domande" e suggerimenti) ─
  const [allQuestions, setAllQuestions]   = useState([]);
  const [loadingAll, setLoadingAll]       = useState(false);

  useEffect(() => {
    if (!showAdd) return;
    if (allQuestions.length > 0) return;
    setLoadingAll(true);
    pb.collection('Question').getFullList({
      sort: '-created', filter: `owner = "${pb.authStore.model.id}"`,
    }).then(recs => setAllQuestions(recs)).catch(() => {}).finally(() => setLoadingAll(false));
  }, [showAdd]);

  // ── Suggerimenti materia/argomento per il test ────────────────────────────
  const { subjects: subjectSuggestions, topics: topicSuggestions } = useAllSuggestions(form.subject, data);

  const existingIds = useMemo(() => new Set(questions.map(q => q.id)), [questions]);

  // ── Handlers principali ───────────────────────────────────────────────────
  function setField(key, val) { setForm(f => ({ ...f, [key]: val })); setFormError(''); setWarning(''); }

  function toggleRemove(id) {
    setRemovingIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }

  function removeSelected() {
    setQuestions(prev => prev.filter(q => !removingIds.has(q.id)));
    setRemovingIds(new Set());
  }

  function openEditQ(q) {
    setEditingQId(q.id);
    setEditQForm({
      subject:        q.subject       || '',
      topic:          q.topic         || '',
      content:        q.content       || '',
      options:        Array.isArray(q.options) ? [...q.options] : [''],
      correct_answer: q.correct_answer || '',
      bloom_level:    q.bloom_level   || '',
    });
    setEditError('');
  }

  async function confirmEditQ() {
    const opts = editQForm.options.filter(o => o.trim() !== '');
    if (!editQForm.content.trim() || !opts.length) { setEditError('Testo e opzioni sono obbligatori.'); return; }
    const correct_answer = opts.includes(editQForm.correct_answer) ? editQForm.correct_answer : opts[0];
    setSavingEdit(true); setEditError('');
    try {
      const updated = await pb.collection('Question').update(editingQId, {
        subject:        editQForm.subject.trim(),
        topic:          editQForm.topic.trim(),
        content:        editQForm.content.trim(),
        options:        opts,
        correct_answer,
        bloom_level:    editQForm.bloom_level,
      });
      setQuestions(prev => prev.map(q => q.id === editingQId ? { ...q, ...updated } : q));
      setEditingQId(null);
    } catch {
      setEditError('Errore durante il salvataggio. Riprova.');
    } finally {
      setSavingEdit(false);
    }
  }

  function handleQuestionsAdded(newQs) {
    setQuestions(prev => {
      const ids = new Set(prev.map(q => q.id));
      return [...prev, ...newQs.filter(q => !ids.has(q.id))];
    });
    setShowAdd(false);
  }

  async function handleSubmit() {
    const description = form.description.trim();
    const subject     = form.subject.trim();
    const topic       = form.topic.trim();

    if (!description) { setFormError('Inserisci un nome per il test.'); return; }
    if (!subject && topic) { setFormError('Inserisci la materia prima di specificare un argomento.'); setWarning(''); return; }

    const saveLabel = isEdit ? 'Salva modifiche' : 'Salva';
    const warnMsg = !subject && !topic
      ? 'Sicuro di voler salvare il test senza materia e senza argomento?'
      : subject && !topic ? 'Sicuro di voler salvare il test senza argomento?' : '';
    if (warnMsg && warning !== warnMsg) { setWarning(warnMsg); setFormError(''); return; }

    setSaving(true); setFormError(''); setWarning('');
    try {
      if (isEdit) {
        await pb.collection('Test').update(test.id, {
          description, subject, topic, questions: questions.map(q => q.id),
        });
      } else {
        await pb.collection('Test').create({
          description, subject, topic,
          questions: questions.map(q => q.id),
          owner: pb.authStore.model.id,
        });
      }
      onSaved();
    } catch {
      setFormError('Errore durante il salvataggio. Riprova.');
      setSaving(false);
    }
  }

  // ── Stili condivisi ───────────────────────────────────────────────────────
  const labelStyle  = { display: 'block', fontSize: 12, fontWeight: 500, color: C.textMuted, marginBottom: 4 };
  const inputStyle  = { width: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 12px', fontSize: 13, color: C.text, fontFamily: font, outline: 'none', boxSizing: 'border-box' };
  const tabBtnStyle = (active) => ({
    padding: '5px 12px', fontSize: 12.5, fontFamily: font, borderRadius: 7,
    cursor: 'pointer', fontWeight: active ? 500 : 400,
    background: active ? C.green : 'transparent',
    color: active ? '#FFF' : C.textMuted,
    border: active ? 'none' : `1px solid ${C.border}`,
  });

  const saveLabel = isEdit ? 'Salva modifiche' : 'Salva';

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(28,43,29,0.40)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
      onClick={() => { if (!saving) onClose(); }}
    >
      <div
        style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, width: 'min(640px, 90vw)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 32px rgba(0,0,0,0.14)', fontFamily: font }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: `1px solid ${C.borderLight}`, flexShrink: 0 }}>
          <h2 style={{ fontFamily: serif, fontSize: 17, fontWeight: 500, color: C.text, margin: 0 }}>
            {isEdit ? 'Modifica test' : 'Nuovo test'}
          </h2>
          <button onClick={onClose} disabled={saving} style={{ background: 'none', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', color: C.textMuted, padding: 4, display: 'flex', opacity: saving ? 0.4 : 1 }}>
            <X size={16} />
          </button>
        </div>

        {/* ── Body scrollabile ── */}
        <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column' }}>

          {/* Campi principali */}
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelStyle}>Nome test *</label>
              <input type="text" value={form.description} onChange={e => setField('description', e.target.value)} placeholder="Es. Verifica Matematica — Derivate" style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#5C7A5E'} onBlur={e => e.target.style.borderColor = C.border} />
            </div>
            <SuggestInput label="Materia"    value={form.subject} onChange={v => setField('subject', v)} suggestions={subjectSuggestions} />
            <SuggestInput label="Argomento"  value={form.topic}   onChange={v => setField('topic', v)}   suggestions={topicSuggestions} />
          </div>

          <div style={{ height: 1, background: C.borderLight, flexShrink: 0 }} />

          {/* Sezione domande */}
          <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Header sezione */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Domande nel test ({questions.length})
              </span>
              {removingIds.size > 0 && (
                <button onClick={removeSelected} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: C.error.bg, border: `1px solid ${C.error.border}`, borderRadius: 6, cursor: 'pointer', color: C.error.text, fontFamily: font, fontSize: 12, fontWeight: 500 }}>
                  <Trash2 size={12} /> Rimuovi {removingIds.size} {removingIds.size === 1 ? 'domanda' : 'domande'}
                </button>
              )}
            </div>

            {/* Lista domande correnti */}
            {questions.length === 0 ? (
              <div style={{ padding: '14px', background: C.surface, borderRadius: 8, border: `1px dashed ${C.border}`, textAlign: 'center', color: C.textFaint, fontSize: 13 }}>
                Nessuna domanda nel test.
              </div>
            ) : (
              <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
                {questions.map((q, i) => {
                  const isRemoving = removingIds.has(q.id);
                  const isEditing  = editingQId === q.id;
                  return (
                    <div
                      key={q.id}
                      draggable={!isEditing}
                      onDragStart={!isEditing ? e => handleDragStart(e, i) : undefined}
                      onDragOver={!isEditing ? e => handleDragOver(e, i) : undefined}
                      onDrop={!isEditing ? e => handleDrop(e, i) : undefined}
                      onDragEnd={!isEditing ? handleDragEnd : undefined}
                      style={{
                        borderBottom: isEditing ? `2px solid ${C.green}` : i < questions.length - 1 ? `1px solid ${C.borderLight}` : 'none',
                        borderTop: !isEditing && dragOverIdx === i && dragIdx !== i ? `2px solid ${C.green}` : undefined,
                        opacity: dragIdx === i ? 0.4 : 1,
                        transition: 'opacity 0.15s',
                      }}
                    >
                      {isEditing ? (
                        <div style={{ padding: '12px 14px', background: C.surface, display: 'flex', flexDirection: 'column', gap: 8, borderTop: `2px solid ${C.green}`, borderLeft: `2px solid ${C.green}`, borderRight: `2px solid ${C.green}` }}>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <div style={{ flex: 1 }}><label style={labelStyle}>Materia</label><input value={editQForm.subject} onChange={e => setEditQForm(f => ({ ...f, subject: e.target.value }))} style={inputStyle} /></div>
                            <div style={{ flex: 1 }}><label style={labelStyle}>Argomento</label><input value={editQForm.topic} onChange={e => setEditQForm(f => ({ ...f, topic: e.target.value }))} style={inputStyle} /></div>
                          </div>
                          <div><label style={labelStyle}>Testo della domanda</label><textarea value={editQForm.content} onChange={e => setEditQForm(f => ({ ...f, content: e.target.value }))} rows={2} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} /></div>
                          <div>
                            <label style={labelStyle}>Opzioni</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              {editQForm.options.map((opt, oi) => (
                                <div key={oi} style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                                  <input value={opt} onChange={e => setEditQForm(f => { const options = [...f.options]; options[oi] = e.target.value; return { ...f, options }; })} style={{ ...inputStyle, flex: 1 }} />
                                  <button onClick={() => setEditQForm(f => { const options = f.options.filter((_, j) => j !== oi); return { ...f, options: options.length ? options : [''] }; })} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 5, cursor: 'pointer', color: C.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, flexShrink: 0 }}><X size={11} /></button>
                                </div>
                              ))}
                              <button onClick={() => setEditQForm(f => ({ ...f, options: [...f.options, ''] }))} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', background: 'none', border: `1px dashed ${C.border}`, borderRadius: 6, cursor: 'pointer', color: C.textMuted, fontFamily: font, fontSize: 11 }}><Plus size={10} /> Aggiungi</button>
                            </div>
                          </div>
                          <div><label style={labelStyle}>Risposta corretta</label><select value={editQForm.correct_answer} onChange={e => setEditQForm(f => ({ ...f, correct_answer: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>{editQForm.options.filter(o => o.trim()).map((o, j) => <option key={j} value={o}>{o}</option>)}</select></div>
                          <div><label style={labelStyle}>Livello Bloom</label><select value={editQForm.bloom_level} onChange={e => setEditQForm(f => ({ ...f, bloom_level: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}><option value="">— nessuno —</option>{BLOOM_LEVELS.map(l => <option key={l} value={l}>{BLOOM_LABELS[l]}</option>)}</select></div>
                          {editError && <div style={{ background: C.error.bg, border: `1px solid ${C.error.border}`, color: C.error.text, fontSize: 12, borderRadius: 7, padding: '8px 12px' }}>{editError}</div>}
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            <button onClick={() => { setEditingQId(null); setEditError(''); }} disabled={savingEdit} style={{ padding: '4px 12px', background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, cursor: savingEdit ? 'not-allowed' : 'pointer', color: C.textMuted, fontFamily: font, fontSize: 12, opacity: savingEdit ? 0.5 : 1 }}>Annulla</button>
                            <button onClick={confirmEditQ} disabled={savingEdit} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 12px', background: C.green, border: 'none', borderRadius: 6, cursor: savingEdit ? 'not-allowed' : 'pointer', color: '#FFF', fontFamily: font, fontSize: 12, fontWeight: 500, opacity: savingEdit ? 0.8 : 1 }}>
                              {savingEdit ? <span style={{ display: 'inline-block', width: 10, height: 10, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#FFF', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> : <Check size={11} />}
                              {savingEdit ? 'Salvataggio…' : 'Conferma'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', background: isRemoving ? C.error.bg : C.surface, transition: 'background 0.15s', cursor: 'grab' }}>
                          <GripVertical size={14} style={{ color: C.dot, flexShrink: 0, marginTop: 3 }} />
                          <input type="checkbox" checked={isRemoving} onChange={() => toggleRemove(q.id)} title="Seleziona per rimuovere"
                            onMouseDown={e => e.stopPropagation()}
                            style={{ marginTop: 3, accentColor: C.error.text, flexShrink: 0, cursor: 'pointer' }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12.5, color: isRemoving ? C.error.text : C.text, lineHeight: 1.45, fontWeight: 500, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {q.content || '—'}
                            </div>
                            <div style={{ fontSize: 11, color: C.textFaint, marginTop: 3, display: 'flex', alignItems: 'center', gap: 8 }}>
                              {[q.subject, q.topic].filter(Boolean).join(' · ')}
                              {q.bloom_level && (
                                <span style={{ ...(BLOOM_STYLES[q.bloom_level] || {}), padding: '1px 7px', borderRadius: 20, fontSize: 10, fontWeight: 500 }}>
                                  {BLOOM_LABELS[q.bloom_level]}
                                </span>
                              )}
                            </div>
                          </div>
                          <button onClick={() => openEditQ(q)} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 5, cursor: 'pointer', color: C.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, flexShrink: 0, marginTop: 1 }}><Pencil size={11} /></button>
                          <span style={{ fontSize: 11, color: C.textFaint, flexShrink: 0, marginTop: 2 }}>#{i + 1}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pulsante aggiungi / chiudi sezione */}
            {!showAdd ? (
              <button onClick={() => { setShowAdd(true); setAddMode('manual'); }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '9px 14px', background: 'none', border: `1px dashed ${C.greenAccent}`, borderRadius: 8, cursor: 'pointer', color: C.greenLight, fontFamily: font, fontSize: 13, fontWeight: 500, justifyContent: 'center', marginTop: 8 }}
                onMouseEnter={e => e.currentTarget.style.background = '#EFF5E6'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <Plus size={14} /> Aggiungi domanda
              </button>
            ) : (
              /* ── Sezione inline aggiungi ── */
              <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden', background: C.bg, marginTop: 8 }}>

                {/* Header sezione inline */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: `1px solid ${C.borderLight}`, background: C.headerBg }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button style={tabBtnStyle(addMode === 'manual')}   onClick={() => setAddMode('manual')}>Manuale</button>
                    <button style={tabBtnStyle(addMode === 'generate')} onClick={() => setAddMode('generate')}>Genera da documento</button>
                    <button style={tabBtnStyle(addMode === 'mine')}     onClick={() => setAddMode('mine')}>Le mie domande</button>
                  </div>
                  <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, display: 'flex', padding: 2 }}>
                    <X size={14} />
                  </button>
                </div>

                {/* Contenuto tab */}
                {addMode === 'manual' && (
                  <ManualTab
                    allQuestions={allQuestions}
                    onAdd={handleQuestionsAdded}
                    inputStyle={inputStyle}
                    labelStyle={labelStyle}
                  />
                )}
                {addMode === 'generate' && (
                  <GenerateTab
                    onAdd={handleQuestionsAdded}
                    inputStyle={inputStyle}
                    labelStyle={labelStyle}
                  />
                )}
                {addMode === 'mine' && (
                  <MineTab
                    allQuestions={allQuestions}
                    loadingAll={loadingAll}
                    existingIds={existingIds}
                    emptyMessage={isEdit ? 'Tutte le tue domande sono già nel test.' : 'Nessuna domanda disponibile.'}
                    onAdd={handleQuestionsAdded}
                  />
                )}
              </div>
            )}
          </div>

          {/* Messaggi */}
          {(warning || formError) && (
            <div style={{ padding: '0 24px 16px' }}>
              {warning && <div style={{ background: '#FBF2DC', border: '1px solid #D4B84A', color: '#7A5010', fontSize: 13, borderRadius: 8, padding: '10px 14px' }}>{warning} Premi nuovamente "{saveLabel}" per confermare.</div>}
              {formError && <div style={{ background: C.error.bg, border: `1px solid ${C.error.border}`, color: C.error.text, fontSize: 13, borderRadius: 8, padding: '10px 14px' }}>{formError}</div>}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '16px 24px', borderTop: `1px solid ${C.borderLight}`, flexShrink: 0 }}>
          <button onClick={onClose} disabled={saving} style={{ padding: '8px 18px', background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer', color: C.textMuted, fontFamily: font, fontSize: 13, opacity: saving ? 0.5 : 1 }}>
            Annulla
          </button>
          <button onClick={handleSubmit} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', background: C.green, border: 'none', borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer', color: '#FFF', fontFamily: font, fontSize: 13, fontWeight: 500, opacity: saving ? 0.8 : 1 }}>
            {saving && <span style={{ display: 'inline-block', width: 12, height: 12, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#FFF', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />}
            {saving ? 'Salvataggio…' : saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Manuale
// ─────────────────────────────────────────────────────────────────────────────

function ManualTab({ allQuestions, onAdd, inputStyle, labelStyle }) {
  const [form, setForm]           = useState(initialManualForm);
  const [saving, setSaving]       = useState(false);
  const [formError, setFormError] = useState('');
  const [warning, setWarning]     = useState('');

  const { subjects: subjectSuggestions, topics: topicSuggestions } = useAllSuggestions(form.subject, allQuestions);

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
    const subject = form.subject.trim(), topic = form.topic.trim(), content = form.content.trim();
    const opts = form.options.filter(o => o.trim() !== '');
    if (!content) { setFormError('Il testo della domanda è obbligatorio.'); return; }
    if (!opts.length) { setFormError("Aggiungi almeno un'opzione di risposta."); return; }
    if (!form.correct_answer || !opts.includes(form.correct_answer)) { setFormError('Seleziona una risposta corretta.'); return; }
    if (!subject && topic) { setFormError('Inserisci la materia prima di specificare un argomento.'); setWarning(''); return; }
    const warnMsg = !subject && !topic ? 'Sicuro di voler salvare la domanda senza materia e senza argomento?'
      : subject && !topic ? 'Sicuro di voler salvare la domanda senza argomento?' : '';
    if (warnMsg && warning !== warnMsg) { setWarning(warnMsg); setFormError(''); return; }
    setSaving(true); setFormError(''); setWarning('');
    try {
      const record = await pb.collection('Question').create({ subject, topic, content, options: opts, correct_answer: form.correct_answer, bloom_level: form.bloom_level, owner: pb.authStore.model.id });
      onAdd([record]);
    } catch { setFormError('Errore durante il salvataggio. Riprova.'); setSaving(false); }
  }

  const spinnerStyle = { display: 'inline-block', width: 12, height: 12, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#FFF', borderRadius: '50%', animation: 'spin 0.7s linear infinite' };

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <SuggestInput label="Materia"   value={form.subject} onChange={v => setField('subject', v)} suggestions={subjectSuggestions} />
      <SuggestInput label="Argomento" value={form.topic}   onChange={v => setField('topic', v)}   suggestions={topicSuggestions} />
      <div>
        <label style={labelStyle}>Testo della domanda *</label>
        <textarea value={form.content} onChange={e => setField('content', e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} />
      </div>
      <div>
        <label style={labelStyle}>Opzioni di risposta *</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {form.options.map((opt, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input value={opt} onChange={e => setOption(idx, e.target.value)} placeholder={`Opzione ${idx + 1}`} style={{ ...inputStyle, flex: 1 }} />
              <button onClick={() => removeOption(idx)} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, cursor: 'pointer', color: C.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, flexShrink: 0 }}><X size={12} /></button>
            </div>
          ))}
          <button onClick={addOption} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', background: 'none', border: `1px dashed ${C.border}`, borderRadius: 7, cursor: 'pointer', color: C.textMuted, fontFamily: font, fontSize: 12 }}>
            <Plus size={11} /> Aggiungi opzione
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
      {warning  && <div style={{ background: '#FBF2DC', border: '1px solid #D4B84A', color: '#7A5010', fontSize: 12.5, borderRadius: 8, padding: '9px 12px' }}>{warning} Premi nuovamente "Salva e aggiungi" per confermare.</div>}
      {formError && <div style={{ background: C.error.bg, border: `1px solid ${C.error.border}`, color: C.error.text, fontSize: 12.5, borderRadius: 8, padding: '9px 12px' }}>{formError}</div>}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={handleSubmit} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: C.green, border: 'none', borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer', color: '#FFF', fontFamily: font, fontSize: 13, fontWeight: 500, opacity: saving ? 0.8 : 1 }}>
          {saving && <span style={spinnerStyle} />}{saving ? 'Salvataggio…' : 'Salva e aggiungi'}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Genera da documento
// ─────────────────────────────────────────────────────────────────────────────

function GenerateTab({ onAdd, inputStyle, labelStyle }) {
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
  const [editGenForm, setEditGenForm]       = useState({ content: '', options: [''], correct_answer: '', subject: '', topic: '' });
  const docSearchRef = useRef(null);

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
    setGenerating(true); setGenError(''); setGeneratedQuestions([]); setSelectedGenIdx(new Set());
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
        pb.collection('Question').create({ subject: q.subject || '', topic: q.topic || '', content: q.content, options: q.options, correct_answer: q.correct_answer, bloom_level: '', source_doc: selectedDocId, owner: pb.authStore.model.id })
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
  const spinnerStyle = { display: 'inline-block', width: 12, height: 12, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#FFF', borderRadius: '50%', animation: 'spin 0.7s linear infinite' };

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
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
              <ul style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 300, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, margin: '2px 0 0', padding: 0, listStyle: 'none', maxHeight: 180, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.10)' }}>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: C.textMuted }}>{generatedQuestions.length} domanda/e generata/e — seleziona quelle da aggiungere:</div>
            {generatedQuestions.map((q, idx) => {
              const selected = selectedGenIdx.has(idx);
              const isEditing = editingGenIdx === idx;
              return (
                <div key={idx} style={{ border: selected ? `2px solid ${C.greenAccent}` : `1px solid ${C.border}`, borderRadius: 8, padding: 10, background: selected ? 'rgba(168,197,160,0.18)' : C.surface }}>
                  {isEditing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <div style={{ flex: 1 }}><label style={labelStyle}>Materia</label><input value={editGenForm.subject} onChange={e => setEditGenForm(f => ({ ...f, subject: e.target.value }))} style={inputStyle} /></div>
                        <div style={{ flex: 1 }}><label style={labelStyle}>Argomento</label><input value={editGenForm.topic} onChange={e => setEditGenForm(f => ({ ...f, topic: e.target.value }))} style={inputStyle} /></div>
                      </div>
                      <div><label style={labelStyle}>Testo</label><textarea value={editGenForm.content} onChange={e => setEditGenForm(f => ({ ...f, content: e.target.value }))} rows={2} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} /></div>
                      <div>
                        <label style={labelStyle}>Opzioni</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {editGenForm.options.map((opt, oi) => (
                            <div key={oi} style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                              <input value={opt} onChange={e => setEditGenForm(f => { const options = [...f.options]; options[oi] = e.target.value; return { ...f, options }; })} style={{ ...inputStyle, flex: 1 }} />
                              <button onClick={() => setEditGenForm(f => { const options = f.options.filter((_, i) => i !== oi); return { ...f, options: options.length ? options : [''] }; })} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 5, cursor: 'pointer', color: C.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, flexShrink: 0 }}><X size={11} /></button>
                            </div>
                          ))}
                          <button onClick={() => setEditGenForm(f => ({ ...f, options: [...f.options, ''] }))} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', background: 'none', border: `1px dashed ${C.border}`, borderRadius: 6, cursor: 'pointer', color: C.textMuted, fontFamily: font, fontSize: 11 }}><Plus size={10} /> Aggiungi</button>
                        </div>
                      </div>
                      <div><label style={labelStyle}>Risposta corretta</label><select value={editGenForm.correct_answer} onChange={e => setEditGenForm(f => ({ ...f, correct_answer: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>{editGenForm.options.filter(o => o.trim()).map((o, i) => <option key={i} value={o}>{o}</option>)}</select></div>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button onClick={() => setEditingGenIdx(null)} style={{ padding: '4px 12px', background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, cursor: 'pointer', color: C.textMuted, fontFamily: font, fontSize: 12 }}>Annulla</button>
                        <button onClick={confirmEditGen} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 12px', background: C.green, border: 'none', borderRadius: 6, cursor: 'pointer', color: '#FFF', fontFamily: font, fontSize: 12, fontWeight: 500 }}><Check size={11} /> Conferma</button>
                      </div>
                    </div>
                  ) : (
                    <div onClick={() => toggleGenIdx(idx)} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }}>
                      <input type="checkbox" readOnly checked={selected} style={{ marginTop: 2, accentColor: C.green, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        {(q.subject || q.topic) && <div style={{ fontSize: 11, color: C.textFaint, marginBottom: 4 }}>{[q.subject, q.topic].filter(Boolean).join(' · ')}</div>}
                        <div style={{ fontSize: 12.5, color: C.text, fontWeight: 500, marginBottom: 5, lineHeight: 1.45 }}>{q.content}</div>
                        <ul style={{ margin: 0, paddingLeft: 14, display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {q.options.map((opt, oi) => <li key={oi} style={{ fontSize: 11.5, color: opt === q.correct_answer ? C.greenLight : C.textBody, fontWeight: opt === q.correct_answer ? 600 : 400 }}>{opt}{opt === q.correct_answer ? ' ✓' : ''}</li>)}
                        </ul>
                      </div>
                      <button onClick={e => { e.stopPropagation(); openEditGen(idx); }} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 5, cursor: 'pointer', color: C.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, flexShrink: 0 }}><Pencil size={11} /></button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {genError && <div style={{ background: C.error.bg, border: `1px solid ${C.error.border}`, color: C.error.text, fontSize: 12.5, borderRadius: 8, padding: '9px 12px' }}>{genError}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          {generatedQuestions.length === 0 ? (
            <button onClick={handleGenerate} disabled={isBusy || !selectedDocId} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: C.green, border: 'none', borderRadius: 8, cursor: (isBusy || !selectedDocId) ? 'not-allowed' : 'pointer', color: '#FFF', fontFamily: font, fontSize: 13, fontWeight: 500, opacity: (isBusy || !selectedDocId) ? 0.7 : 1 }}>
              {generating && <span style={spinnerStyle} />}{generating ? 'Generazione…' : 'Genera'}
            </button>
          ) : (
            <button onClick={handleSaveGenerated} disabled={savingGenerated || !selectedGenIdx.size} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: C.green, border: 'none', borderRadius: 8, cursor: (savingGenerated || !selectedGenIdx.size) ? 'not-allowed' : 'pointer', color: '#FFF', fontFamily: font, fontSize: 13, fontWeight: 500, opacity: (savingGenerated || !selectedGenIdx.size) ? 0.7 : 1 }}>
              {savingGenerated && <span style={spinnerStyle} />}{savingGenerated ? 'Salvataggio…' : `Aggiungi ${selectedGenIdx.size} domanda/e`}
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

function MineTab({ allQuestions, loadingAll, existingIds, emptyMessage, onAdd }) {
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

  function handleAdd() {
    const selected = allQuestions.filter(q => selectedIds.has(q.id));
    if (selected.length) onAdd(selected);
  }

  const selectStyle = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '6px 10px', fontSize: 12.5, color: C.text, fontFamily: font, outline: 'none', cursor: 'pointer', flex: 1 };

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <select value={subjectFilter} onChange={e => { setSubjectFilter(e.target.value); setTopicFilter(''); }} style={selectStyle}>
          <option value="">Tutte le materie</option>
          {subjectOptions.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={topicFilter} onChange={e => setTopicFilter(e.target.value)} disabled={!subjectFilter} style={{ ...selectStyle, opacity: subjectFilter ? 1 : 0.45, cursor: subjectFilter ? 'pointer' : 'not-allowed' }}>
          <option value="">Tutti gli argomenti</option>
          {topicOptions.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div style={{ position: 'relative' }}>
        <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: C.textFaint }} />
        <input value={qFilter} onChange={e => setQFilter(e.target.value)} placeholder="Cerca…"
          style={{ width: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '7px 12px 7px 28px', fontSize: 12.5, color: C.text, fontFamily: font, outline: 'none', boxSizing: 'border-box' }}
          onFocus={e => e.target.style.borderColor = '#5C7A5E'} onBlur={e => e.target.style.borderColor = C.border}
        />
      </div>
      {selectedIds.size > 0 && <div style={{ fontSize: 12, color: C.greenLight, fontWeight: 500 }}>{selectedIds.size} {selectedIds.size === 1 ? 'domanda selezionata' : 'domande selezionate'}</div>}
      <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden', maxHeight: 240, overflowY: 'auto' }}>
        {loadingAll ? (
          <div style={{ padding: 14, textAlign: 'center', color: C.textFaint, fontSize: 13 }}>Caricamento…</div>
        ) : available.length === 0 ? (
          <div style={{ padding: 14, textAlign: 'center', color: C.textFaint, fontSize: 13 }}>{emptyMessage}</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 14, textAlign: 'center', color: C.textFaint, fontSize: 13 }}>Nessuna domanda trovata.</div>
        ) : filtered.map((q, i) => (
          <label key={q.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 12px', borderBottom: i < filtered.length - 1 ? `1px solid ${C.borderLight}` : 'none', cursor: 'pointer', background: selectedIds.has(q.id) ? C.expandBg : C.surface }}>
            <input type="checkbox" checked={selectedIds.has(q.id)} onChange={() => toggle(q.id)} style={{ marginTop: 3, accentColor: C.green, flexShrink: 0, cursor: 'pointer' }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12.5, color: C.textBody, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{q.content || '—'}</div>
              <div style={{ fontSize: 11, color: C.textFaint, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                {[q.subject, q.topic].filter(Boolean).join(' · ')}
                {q.bloom_level && <span style={{ ...(BLOOM_STYLES[q.bloom_level] || {}), padding: '1px 6px', borderRadius: 20, fontSize: 10, fontWeight: 500 }}>{BLOOM_LABELS[q.bloom_level]}</span>}
              </div>
            </div>
          </label>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={handleAdd} disabled={!selectedIds.size} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: C.green, border: 'none', borderRadius: 8, cursor: !selectedIds.size ? 'not-allowed' : 'pointer', color: '#FFF', fontFamily: font, fontSize: 13, fontWeight: 500, opacity: !selectedIds.size ? 0.5 : 1 }}>
          <Plus size={14} /> Aggiungi {selectedIds.size > 0 ? selectedIds.size : ''} {selectedIds.size === 1 ? 'domanda' : 'domande'}
        </button>
      </div>
    </div>
  );
}
