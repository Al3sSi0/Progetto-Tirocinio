import { useState, useMemo } from 'react';
import { X } from 'lucide-react';
import pb from '../../lib/pocketbase';
import { C, font, serif } from '../../styles/theme';
import SuggestInput from '../dashboard/SuggestInput';

export default function EditDocumentModal({ doc, data, onClose, onSaved }) {
  const [form, setForm] = useState({
    title:   doc.title   || '',
    subject: doc.subject || '',
    topic:   doc.topic   || '',
  });
  const [saving, setSaving]       = useState(false);
  const [formError, setFormError] = useState('');
  const [warning, setWarning]     = useState('');

  const subjectSuggestions = useMemo(() => {
    const set = new Set(data.map(d => (d.subject || '').trim()).filter(Boolean));
    return [...set].sort();
  }, [data]);

  const topicSuggestions = useMemo(() => {
    const subj = form.subject.trim().toLowerCase();
    if (!subj) return [];
    const set = new Set(
      data
        .filter(d => (d.subject || '').trim().toLowerCase() === subj)
        .map(d => (d.topic || '').trim())
        .filter(Boolean)
    );
    return [...set].sort();
  }, [data, form.subject]);

  function setField(key, val) { setForm(f => ({ ...f, [key]: val })); setFormError(''); setWarning(''); }

  async function handleSubmit() {
    const subject = form.subject.trim();
    const topic   = form.topic.trim();

    if (!subject && topic) { setFormError('Inserisci la materia prima di specificare un argomento.'); setWarning(''); return; }

    const warnMsg = !subject && !topic
      ? 'Sicuro di voler salvare il documento senza materia e senza argomento?'
      : subject && !topic
        ? 'Sicuro di voler salvare il documento senza argomento?'
        : '';
    if (warnMsg && warning !== warnMsg) { setWarning(warnMsg); setFormError(''); return; }

    setSaving(true); setFormError(''); setWarning('');
    try {
      await pb.collection('Document').update(doc.id, {
        title: form.title.trim(),
        subject,
        topic,
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
        style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, width: 'min(600px, 90vw)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 32px rgba(0,0,0,0.14)', fontFamily: font }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: `1px solid ${C.borderLight}` }}>
          <h2 style={{ fontFamily: serif, fontSize: 17, fontWeight: 500, color: C.text, margin: 0 }}>Modifica documento</h2>
          <button onClick={onClose} disabled={saving}
            style={{ background: 'none', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', color: C.textMuted, padding: 4, display: 'flex', opacity: saving ? 0.4 : 1 }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>Nome documento</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setField('title', e.target.value)}
              placeholder="Es. Lezione 3 — Integrali"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#5C7A5E'}
              onBlur={e => e.target.style.borderColor = C.border}
            />
          </div>
          <SuggestInput label="Materia" value={form.subject} onChange={v => setField('subject', v)} suggestions={subjectSuggestions} />
          <SuggestInput label="Argomento" value={form.topic} onChange={v => setField('topic', v)} suggestions={topicSuggestions} />

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
