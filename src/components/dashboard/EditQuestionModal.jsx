import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import pb from '../../lib/pocketbase';
import { C, font, serif, BLOOM_LEVELS, BLOOM_LABELS } from '../../styles/theme';
import SuggestInput from './SuggestInput';
import { useAllSuggestions } from '../../lib/useAllSuggestions';
import Spinner from '../common/Spinner';
import BloomPicker from '../common/BloomPicker';
import ChipSelect from '../common/ChipSelect';

function parseOptions(raw) {
  if (Array.isArray(raw)) return raw.length ? raw : [''];
  if (typeof raw === 'string' && raw) {
    try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : [raw]; } catch { return [raw]; }
  }
  return [''];
}

export default function EditQuestionModal({ question, onClose, onSaved, data }) {
  const initialOptions = parseOptions(question.options);
  const [form, setForm] = useState({
    subject:        question.subject || '',
    topic:          question.topic || '',
    content:        question.content || '',
    options:        initialOptions,
    bloom_level:    question.bloom_level || '',
  });
  const initialCorrectIdx = initialOptions.findIndex(o => o === question.correct_answer);
  const [correctIdx, setCorrectIdx] = useState(initialCorrectIdx >= 0 ? initialCorrectIdx : null);
  const [saving, setSaving]       = useState(false);
  const [formError, setFormError] = useState('');
  const [warning, setWarning]     = useState('');

  const { subjects: subjectSuggestions, topics: topicSuggestions } = useAllSuggestions(form.subject, data);

  function setField(key, val) { setForm(f => ({ ...f, [key]: val })); setFormError(''); setWarning(''); }
  function setOption(idx, val) {
    setForm(f => { const options = [...f.options]; options[idx] = val; return { ...f, options }; });
    setFormError('');
  }
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
    const subject = form.subject.trim();
    const topic   = form.topic.trim();
    const content = form.content.trim();
    const opts    = form.options.filter(o => o.trim() !== '');
    const correct_answer = (correctIdx !== null ? (form.options[correctIdx] || '') : '').trim();

    if (!content) { setFormError('Il testo della domanda è obbligatorio.'); setWarning(''); return; }
    if (opts.length === 0) { setFormError("Aggiungi almeno un'opzione di risposta."); setWarning(''); return; }
    if (!correct_answer || !opts.includes(correct_answer)) {
      setFormError('Seleziona la risposta corretta tra le opzioni.'); setWarning(''); return;
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
        correct_answer,
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
      style={{ position: 'fixed', inset: 0, background: C.overlay, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
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
            <label style={labelStyle}>Opzioni di risposta * <span style={{ fontWeight: 400, color: C.textFaint }}>— seleziona il pallino per indicare quella corretta</span></label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {form.options.map((opt, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="radio"
                    name="edit-question-correct-answer"
                    checked={correctIdx === idx}
                    onChange={() => setCorrectIdx(idx)}
                    disabled={!opt.trim()}
                    title="Segna come risposta corretta"
                    style={{ width: 15, height: 15, accentColor: C.green, flexShrink: 0, cursor: opt.trim() ? 'pointer' : 'not-allowed' }}
                  />
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
            <label style={labelStyle}>Livello Bloom</label>
            <BloomPicker value={form.bloom_level} onChange={v => setField('bloom_level', v)} />
          </div>

          {warning && (
            <div style={{ background: C.warning.bg, border: `1px solid ${C.warning.border}`, color: C.warning.text, fontSize: 13, borderRadius: 8, padding: '10px 14px' }}>
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
            {saving && <Spinner size={12} color="#FFF" trackColor="rgba(255,255,255,0.4)" />}
            {saving ? 'Salvataggio…' : 'Salva modifiche'}
          </button>
        </div>
      </div>
    </div>
  );
}
