import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import pb from '../../lib/pocketbase';
import { C, font, serif, BLOOM_LEVELS, BLOOM_LABELS } from '../../styles/theme';
import SuggestInput from './SuggestInput';
import { useAllSuggestions } from '../../lib/useAllSuggestions';

function parseOptions(raw) {
  if (Array.isArray(raw)) return raw.length ? raw : [''];
  if (typeof raw === 'string' && raw) {
    try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : [raw]; } catch { return [raw]; }
  }
  return [''];
}

export default function EditQuestionModal({ question, onClose, onSaved, data }) {
  const [form, setForm] = useState({
    subject:        question.subject || '',
    topic:          question.topic || '',
    content:        question.content || '',
    options:        parseOptions(question.options),
    correct_answer: question.correct_answer || '',
    bloom_level:    question.bloom_level || '',
  });
  const [saving, setSaving]       = useState(false);
  const [formError, setFormError] = useState('');
  const [warning, setWarning]     = useState('');

  const { subjects: subjectSuggestions, topics: topicSuggestions } = useAllSuggestions(form.subject, data);

  const validOptions = form.options.filter(o => o.trim() !== '');

  function setField(key, val) { setForm(f => ({ ...f, [key]: val })); setFormError(''); setWarning(''); }
  function setOption(idx, val) {
    setForm(f => { const options = [...f.options]; options[idx] = val; return { ...f, options }; });
    setFormError('');
  }
  function addOption() { setForm(f => ({ ...f, options: [...f.options, ''] })); }
  function removeOption(idx) {
    setForm(f => { const options = f.options.filter((_, i) => i !== idx); return { ...f, options: options.length ? options : [''] }; });
  }

  async function handleSubmit() {
    const subject = form.subject.trim();
    const topic   = form.topic.trim();
    const content = form.content.trim();
    const opts    = form.options.filter(o => o.trim() !== '');

    if (!content) { setFormError('Il testo della domanda è obbligatorio.'); setWarning(''); return; }
    if (opts.length === 0) { setFormError("Aggiungi almeno un'opzione di risposta."); setWarning(''); return; }
    if (!form.correct_answer || !opts.includes(form.correct_answer)) {
      setFormError('Seleziona una risposta corretta tra le opzioni.'); setWarning(''); return;
    }
    if (!subject && topic) { setFormError('Inserisci la materia prima di specificare un argomento.'); setWarning(''); return; }

    const warnMsg = !subject && !topic
      ? 'Sicuro di voler salvare la domanda senza materia e senza argomento?'
      : subject && !topic
        ? 'Sicuro di voler salvare la domanda senza argomento?'
        : '';
    if (warnMsg && warning !== warnMsg) { setWarning(warnMsg); setFormError(''); return; }

    setSaving(true); setFormError(''); setWarning('');
    try {
      await pb.collection('Question').update(question.id, {
        subject,
        topic,
        content,
        options:        opts,
        correct_answer: form.correct_answer,
        bloom_level:    form.bloom_level,
      });
      onSaved();
    } catch {
      setFormError('Errore durante il salvataggio. Riprova.');
      setSaving(false);
    }
  }

  const inputStyle = { width: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 12px', fontSize: 13, color: C.text, fontFamily: font, outline: 'none', boxSizing: 'border-box' };
  const labelStyle = { display: 'block', fontSize: 12, fontWeight: 500, color: C.textMuted, marginBottom: 4 };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(28,43,29,0.40)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
      onClick={() => { if (!saving) onClose(); }}
    >
      <div
        style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, width: `min(600px, 90vw)`, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 32px rgba(0,0,0,0.14)', fontFamily: font }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: `1px solid ${C.borderLight}` }}>
          <h2 style={{ fontFamily: serif, fontSize: 17, fontWeight: 500, color: C.text, margin: 0 }}>Modifica domanda</h2>
          <button onClick={onClose} disabled={saving}
            style={{ background: 'none', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', color: C.textMuted, padding: 4, display: 'flex', opacity: saving ? 0.4 : 1 }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SuggestInput label="Materia" value={form.subject} onChange={v => setField('subject', v)} suggestions={subjectSuggestions} />
          <SuggestInput label="Argomento" value={form.topic} onChange={v => setField('topic', v)} suggestions={topicSuggestions} />

          <div>
            <label style={labelStyle}>Testo della domanda *</label>
            <textarea value={form.content} onChange={e => setField('content', e.target.value)} rows={4}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} />
          </div>

          <div>
            <label style={labelStyle}>Opzioni di risposta *</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {form.options.map((opt, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input value={opt} onChange={e => setOption(idx, e.target.value)} placeholder={`Opzione ${idx + 1}`} style={{ ...inputStyle, flex: 1 }} />
                  <button onClick={() => removeOption(idx)}
                    style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, cursor: 'pointer', color: C.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, flexShrink: 0 }}
                    title="Rimuovi opzione">
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

          {warning && (
            <div style={{ background: '#FBF2DC', border: '1px solid #D4B84A', color: '#7A5010', fontSize: 13, borderRadius: 8, padding: '10px 14px' }}>
              {warning} Premi nuovamente "Salva modifiche" per confermare.
            </div>
          )}
          {formError && (
            <div style={{ background: C.error.bg, border: `1px solid ${C.error.border}`, color: C.error.text, fontSize: 13, borderRadius: 8, padding: '10px 14px' }}>
              {formError}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '16px 24px', borderTop: `1px solid ${C.borderLight}` }}>
          <button onClick={onClose} disabled={saving}
            style={{ padding: '8px 18px', background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer', color: C.textMuted, fontFamily: font, fontSize: 13, opacity: saving ? 0.5 : 1 }}>
            Annulla
          </button>
          <button onClick={handleSubmit} disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', background: C.green, border: 'none', borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer', color: '#FFF', fontFamily: font, fontSize: 13, fontWeight: 500, opacity: saving ? 0.8 : 1 }}>
            {saving && <span style={{ display: 'inline-block', width: 12, height: 12, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#FFF', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />}
            {saving ? 'Salvataggio…' : 'Salva modifiche'}
          </button>
        </div>
      </div>
    </div>
  );
}
