import { useState, useRef } from 'react';
import { X, Upload, FileText, File } from 'lucide-react';
import pb from '../../lib/pocketbase';
import { extractText } from '../../lib/extractText';
import { C, font, serif } from '../../styles/theme';
import SuggestInput from '../dashboard/SuggestInput';
import { useAllSuggestions } from '../../lib/useAllSuggestions';

const initialForm = { title: '', subject: '', topic: '', file: null };

export default function AddDocumentModal({ onClose, onSaved, data }) {
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [warning, setWarning] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [extractStatus, setExtractStatus] = useState(''); // '' | 'Estrazione testo…' | 'OCR pagina X di Y…'
  const [extractedText, setExtractedText] = useState('');
  const fileInputRef = useRef(null);

  const { subjects: subjectSuggestions, topics: topicSuggestions } = useAllSuggestions(form.subject, data);

  function setField(key, val) { setForm(f => ({ ...f, [key]: val })); setFormError(''); setWarning(''); }

  async function handleFile(file) {
    if (!file) return;
    const nameWithoutExt = file.name.replace(/\.[^.]+$/, '');
    setForm(f => ({ ...f, file, title: f.title.trim() ? f.title : nameWithoutExt }));
    setFormError('');
    setWarning('');
    setExtractedText('');

    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pdf', 'txt'].includes(ext)) return;

    setExtractStatus('Estrazione testo…');
    try {
      const text = await extractText(file, (type, cur, tot) => {
        if (type === 'ocr') setExtractStatus(`OCR pagina ${cur} di ${tot}…`);
      });
      setExtractedText(text);
    } catch {
      // estrazione fallita — non bloccante, si salva senza testo
    } finally {
      setExtractStatus('');
    }
  }

  function handleDragOver(e) { e.preventDefault(); setDragOver(true); }
  function handleDragLeave() { setDragOver(false); }
  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  async function handleSubmit() {
    const subject = form.subject.trim();
    const topic   = form.topic.trim();

    if (!form.file) { setFormError('Seleziona un file da caricare.'); setWarning(''); return; }
    if (!subject && topic) { setFormError('Inserisci la materia prima di specificare un argomento.'); setWarning(''); return; }

    const warnMsg = !subject && !topic
      ? 'Sicuro di voler salvare il documento senza materia e senza argomento?'
      : subject && !topic
        ? 'Sicuro di voler salvare il documento senza argomento?'
        : '';
    if (warnMsg && warning !== warnMsg) { setWarning(warnMsg); setFormError(''); return; }

    setSaving(true); setFormError(''); setWarning('');
    try {
      const formData = new FormData();
      formData.append('title',   form.title.trim());
      formData.append('subject', subject);
      formData.append('topic',   topic);
      formData.append('file',    form.file);
      formData.append('text',    extractedText);
      formData.append('owner',   pb.authStore.model.id);
      await pb.collection('Document').create(formData);
      onSaved();
    } catch (err) {
      console.error('Errore salvataggio documento:', JSON.stringify(err?.data, null, 2));
      setFormError('Errore durante il salvataggio. Riprova.');
      setSaving(false);
    }
  }

  const isBusy = saving || extractStatus !== '';
  const labelStyle = { display: 'block', fontSize: 12, fontWeight: 500, color: C.textMuted, marginBottom: 4 };
  const ext = form.file?.name?.split('.').pop()?.toLowerCase() ?? '';

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(28,43,29,0.40)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
      onClick={() => { if (!isBusy) onClose(); }}
    >
      <div
        style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, width: 'min(600px, 90vw)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 32px rgba(0,0,0,0.14)', fontFamily: font }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: `1px solid ${C.borderLight}` }}>
          <h2 style={{ fontFamily: serif, fontSize: 17, fontWeight: 500, color: C.text, margin: 0 }}>Nuovo documento</h2>
          <button onClick={onClose} disabled={isBusy}
            style={{ background: 'none', border: 'none', cursor: isBusy ? 'not-allowed' : 'pointer', color: C.textMuted, padding: 4, display: 'flex', opacity: isBusy ? 0.4 : 1 }}>
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
              style={{ width: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 12px', fontSize: 13, color: C.text, fontFamily: font, outline: 'none', boxSizing: 'border-box' }}
              onFocus={e => e.target.style.borderColor = '#5C7A5E'}
              onBlur={e => e.target.style.borderColor = C.border}
            />
          </div>
          <SuggestInput label="Materia" value={form.subject} onChange={v => setField('subject', v)} suggestions={subjectSuggestions} />
          <SuggestInput label="Argomento" value={form.topic} onChange={v => setField('topic', v)} suggestions={topicSuggestions} />

          <div>
            <label style={labelStyle}>File *</label>
            {form.file ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: C.expandBg, border: `1px solid ${C.border}`, borderRadius: 10 }}>
                  {['pdf', 'txt', 'doc', 'docx'].includes(ext)
                    ? <FileText size={18} color={C.textMuted} />
                    : <File size={18} color={C.textMuted} />
                  }
                  <span style={{ flex: 1, fontSize: 13, color: C.textBody, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {form.file.name}
                  </span>
                  <button
                    onClick={() => { setForm(f => ({ ...f, file: null })); setExtractedText(''); }}
                    disabled={extractStatus !== ''}
                    style={{ background: 'none', border: 'none', cursor: extractStatus ? 'not-allowed' : 'pointer', color: C.textMuted, display: 'flex', padding: 2, opacity: extractStatus ? 0.4 : 1 }}
                    title="Rimuovi file"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Stato estrazione */}
                {extractStatus && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: C.textMuted }}>
                    <span style={{ display: 'inline-block', width: 10, height: 10, border: '2px solid #B8AD9A', borderTopColor: C.green, borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
                    {extractStatus}
                  </div>
                )}
                {!extractStatus && extractedText && (
                  <div style={{ fontSize: 12, color: '#1F6B4E' }}>
                    ✓ Testo estratto ({extractedText.trim().length} caratteri)
                  </div>
                )}
                {!extractStatus && !extractedText && ['pdf', 'txt'].includes(ext) && (
                  <div style={{ fontSize: 12, color: C.textMuted }}>
                    Nessun testo estraibile — la generazione domande non sarà disponibile per questo file.
                  </div>
                )}
              </div>
            ) : (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{
                  border: `2px dashed ${dragOver ? '#5C7A5E' : C.border}`,
                  borderRadius: 10,
                  background: dragOver ? '#EFF5E6' : C.bg,
                  padding: '32px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 10,
                  transition: 'border-color 0.15s, background 0.15s',
                  cursor: 'pointer',
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={22} color={C.textFaint} />
                <p style={{ margin: 0, fontSize: 13, color: C.textMuted, textAlign: 'center' }}>
                  Trascina un file qui oppure{' '}
                  <span style={{ color: C.greenLight, fontWeight: 500, textDecoration: 'underline', cursor: 'pointer' }}>sfoglia</span>
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="*/*"
              style={{ display: 'none' }}
              onChange={e => handleFile(e.target.files?.[0])}
            />
          </div>

          {warning && (
            <div style={{ background: '#FBF2DC', border: '1px solid #D4B84A', color: '#7A5010', fontSize: 13, borderRadius: 8, padding: '10px 14px' }}>
              {warning} Premi nuovamente "Salva" per confermare.
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
          <button onClick={onClose} disabled={isBusy}
            style={{ padding: '8px 18px', background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, cursor: isBusy ? 'not-allowed' : 'pointer', color: C.textMuted, fontFamily: font, fontSize: 13, opacity: isBusy ? 0.5 : 1 }}>
            Annulla
          </button>
          <button onClick={handleSubmit} disabled={isBusy}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', background: C.green, border: 'none', borderRadius: 8, cursor: isBusy ? 'not-allowed' : 'pointer', color: '#FFF', fontFamily: font, fontSize: 13, fontWeight: 500, opacity: isBusy ? 0.8 : 1 }}>
            {(saving || extractStatus) && <span style={{ display: 'inline-block', width: 12, height: 12, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#FFF', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />}
            {saving ? 'Salvataggio…' : extractStatus ? 'Attendere…' : 'Salva'}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
