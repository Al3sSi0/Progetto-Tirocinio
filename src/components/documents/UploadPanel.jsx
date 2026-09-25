import { useState, useRef, useImperativeHandle } from 'react';
import { UploadCloud, FileText, X, Check, AlertTriangle, Plus } from 'lucide-react';
import pb from '../../lib/pocketbase';
import { extractText } from '../../lib/extractText';
import { C, font, serif, fileTypeStyle } from '../../styles/theme';
import SuggestInput from '../dashboard/SuggestInput';
import { useAllSuggestions } from '../../lib/useAllSuggestions';
import Spinner from '../common/Spinner';

const ACCEPTED = ['pdf', 'txt', 'doc', 'docx'];
const EXTRACTABLE = ['pdf', 'txt'];

const extOf = name => name.split('.').pop().toLowerCase();
let nextKey = 0;

// Blocco centrale della pagina Documenti: area di drop → lista file in coda (con estrazione testo) → salvataggio.
// Il genitore può passare file trascinati ovunque nella pagina con ref.current.addFiles(files).
export default function UploadPanel({ ref, data, onUploaded }) {
  const [items, setItems]       = useState([]); // { key, file, title, status: 'extracting'|'done', text, progress }
  const [subject, setSubject]   = useState('');
  const [topic, setTopic]       = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [formError, setFormError] = useState('');
  const [warning, setWarning]   = useState('');
  const fileInputRef = useRef(null);
  const queueRef = useRef(Promise.resolve()); // estrazioni una alla volta (l'OCR è pesante)

  const { subjects: subjectSuggestions, topics: topicSuggestions } = useAllSuggestions(subject, data);

  function updateItem(key, patch) {
    setItems(prev => prev.map(it => it.key === key ? { ...it, ...patch } : it));
  }

  function addFiles(fileList) {
    const files = [...(fileList || [])];
    if (!files.length) return;
    const rejected = files.filter(f => !ACCEPTED.includes(extOf(f.name)));
    const accepted = files.filter(f => ACCEPTED.includes(extOf(f.name)));
    setFormError(rejected.length ? `Formato non supportato: ${rejected.map(f => f.name).join(', ')}. Usa PDF, TXT o Word.` : '');
    setWarning('');

    const newItems = accepted.map(file => ({
      key: ++nextKey, file,
      title: file.name.replace(/\.[^.]+$/, ''),
      status: EXTRACTABLE.includes(extOf(file.name)) ? 'extracting' : 'done',
      text: '', progress: '',
    }));
    setItems(prev => [...prev, ...newItems]);

    newItems.filter(it => it.status === 'extracting').forEach(it => {
      queueRef.current = queueRef.current.then(async () => {
        try {
          const text = await extractText(it.file, (type, cur, tot) => {
            if (type === 'ocr') updateItem(it.key, { progress: `Scansione OCR, pagina ${cur} di ${tot}…` });
          });
          updateItem(it.key, { status: 'done', text: text.trim(), progress: '' });
        } catch {
          // estrazione fallita — non bloccante, si salva senza testo
          updateItem(it.key, { status: 'done', text: '', progress: '' });
        }
      });
    });
  }

  useImperativeHandle(ref, () => ({ addFiles }));

  function reset() {
    setItems([]); setSubject(''); setTopic(''); setFormError(''); setWarning('');
  }

  const extracting = items.some(it => it.status === 'extracting');

  async function handleUpload() {
    const s = subject.trim(), t = topic.trim();
    if (!s && t) { setFormError('Inserisci la materia prima di specificare un argomento.'); setWarning(''); return; }
    if (items.some(it => !it.title.trim())) { setFormError('Dai un nome a tutti i documenti.'); setWarning(''); return; }

    const warnMsg = !s && !t
      ? 'Stai caricando senza materia e senza argomento: sarà più difficile ritrovarli.'
      : s && !t
        ? 'Stai caricando senza argomento.'
        : '';
    if (warnMsg && warning !== warnMsg) { setWarning(warnMsg); setFormError(''); return; }

    setSaving(true); setFormError(''); setWarning('');
    try {
      const created = [];
      for (const it of items) {
        const formData = new FormData();
        formData.append('title',   it.title.trim());
        formData.append('subject', s);
        formData.append('topic',   t);
        formData.append('file',    it.file);
        formData.append('text',    it.text);
        formData.append('owner',   pb.authStore.model.id);
        created.push(await pb.collection('Document').create(formData));
      }
      reset();
      onUploaded(created);
    } catch (err) {
      console.error('Errore salvataggio documento:', JSON.stringify(err?.data, null, 2));
      setFormError('Errore durante il caricamento. Riprova.');
    } finally {
      setSaving(false);
    }
  }

  const dropHandlers = {
    onDragOver: e => { e.preventDefault(); setDragOver(true); },
    onDragLeave: () => setDragOver(false),
    onDrop: e => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }, // preventDefault segnala al genitore che il drop è già gestito
  };

  const hiddenInput = (
    <input
      ref={fileInputRef}
      type="file"
      multiple
      accept=".pdf,.txt,.doc,.docx"
      style={{ display: 'none' }}
      onChange={e => { addFiles(e.target.files); e.target.value = ''; }}
    />
  );

  const errorBox = formError && (
    <div style={{ background: C.error.bg, border: `1px solid ${C.error.border}`, color: C.error.text, fontSize: 13, borderRadius: 8, padding: '10px 14px' }}>
      {formError}
    </div>
  );

  // ── Stato vuoto: grande area di drop ──
  if (items.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div
          {...dropHandlers}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? C.focusBorder : C.border}`,
            background: dragOver ? '#EFF5E6' : C.surface,
            borderRadius: 18, padding: '48px 24px', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center',
            transition: 'border-color 0.15s, background 0.15s, transform 0.15s',
            transform: dragOver ? 'scale(1.01)' : 'none',
          }}
        >
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: dragOver ? C.green : C.expandBg, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}>
            <UploadCloud size={30} color={dragOver ? '#FFF' : C.greenLight} />
          </div>
          <div>
            <div style={{ fontFamily: serif, fontSize: 20, color: C.text, fontWeight: 500, marginBottom: 4 }}>
              {dragOver ? 'Rilascia per caricare' : 'Trascina qui i tuoi documenti'}
            </div>
            <div style={{ fontSize: 13.5, color: C.textMuted }}>oppure</div>
          </div>
          <button
            type="button"
            onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
            style={{ height: 42, padding: '0 22px', background: C.green, border: 'none', borderRadius: 10, color: '#FFF', fontFamily: font, fontSize: 14.5, fontWeight: 500, cursor: 'pointer' }}
          >
            Scegli dal computer
          </button>
          <div style={{ fontSize: 13.5, color: C.textFaint }}>PDF, TXT o Word · puoi caricarne più di uno insieme</div>
        </div>
        {errorBox}
        {hiddenInput}
      </div>
    );
  }

  // ── File in coda: nomi, stato lettura testo, materia/argomento comuni ──
  return (
    <div
      {...dropHandlers}
      style={{
        background: C.surface, border: `1px solid ${dragOver ? C.focusBorder : C.border}`, borderRadius: 18,
        padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 18,
        boxShadow: '0 6px 24px rgba(28,43,29,0.06)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <h2 style={{ fontFamily: serif, fontSize: 19, color: C.text, fontWeight: 500, margin: 0 }}>
          {items.length === 1 ? '1 documento da caricare' : `${items.length} documenti da caricare`}
        </h2>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={saving}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: C.greenLight, fontFamily: font, fontSize: 13.5, fontWeight: 500, cursor: 'pointer', padding: 0 }}
        >
          <Plus size={15} /> Aggiungi altri file
        </button>
      </div>

      {/* Lista file */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map(it => {
          const ext = extOf(it.file.name);
          const ts = fileTypeStyle(ext);
          return (
            <div key={it.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: C.expandBg, border: `1px solid ${C.borderLight}`, borderRadius: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: ts.bg, color: ts.color, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FileText size={16} />
                <span style={{ fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase', marginTop: 1 }}>{ext}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <input
                  value={it.title}
                  onChange={e => { updateItem(it.key, { title: e.target.value }); setFormError(''); }}
                  disabled={saving}
                  title="Nome del documento (modificabile)"
                  style={{ width: '100%', background: 'transparent', border: '1px solid transparent', borderRadius: 6, padding: '3px 6px', marginLeft: -6, fontSize: 14, fontWeight: 500, color: C.text, fontFamily: font, outline: 'none', boxSizing: 'border-box' }}
                  onFocus={e => { e.target.style.borderColor = C.focusBorder; e.target.style.background = C.surface; }}
                  onBlur={e => { e.target.style.borderColor = 'transparent'; e.target.style.background = 'transparent'; }}
                />
                <ExtractStatus item={it} ext={ext} />
              </div>
              <button
                onClick={() => setItems(prev => prev.filter(x => x.key !== it.key))}
                disabled={saving}
                title="Togli dalla lista"
                style={{ background: 'none', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', color: C.textMuted, display: 'flex', padding: 6, borderRadius: 6 }}
               aria-label="Togli dalla lista">
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Materia / argomento */}
      <div>
        <div style={{ fontSize: 13.5, color: C.textBody, fontWeight: 500, marginBottom: 10 }}>
          Dove vuoi archiviarli?
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <SuggestInput label="Materia" value={subject} onChange={v => { setSubject(v); setFormError(''); setWarning(''); }} suggestions={subjectSuggestions} />
          <SuggestInput label="Argomento" value={topic} onChange={v => { setTopic(v); setFormError(''); setWarning(''); }} suggestions={topicSuggestions} />
        </div>
      </div>

      {warning && (
        <div style={{ background: C.warning.bg, border: `1px solid ${C.warning.border}`, color: C.warning.text, fontSize: 13, borderRadius: 8, padding: '10px 14px' }}>
          {warning} Premi di nuovo "Carica" per confermare.
        </div>
      )}
      {errorBox}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
        <button
          onClick={reset}
          disabled={saving}
          style={{ height: 42, padding: '0 18px', background: 'none', border: `1px solid ${C.border}`, borderRadius: 10, cursor: saving ? 'not-allowed' : 'pointer', color: C.textMuted, fontFamily: font, fontSize: 14 }}
        >
          Annulla
        </button>
        <button
          onClick={handleUpload}
          disabled={saving || extracting}
          style={{ display: 'flex', alignItems: 'center', gap: 8, height: 42, padding: '0 22px', background: C.green, border: 'none', borderRadius: 10, cursor: saving || extracting ? 'not-allowed' : 'pointer', color: '#FFF', fontFamily: font, fontSize: 14.5, fontWeight: 500, opacity: saving || extracting ? 0.75 : 1 }}
        >
          {(saving || extracting) && <Spinner size={13} color="#FFF" trackColor="rgba(255,255,255,0.4)" />}
          {saving ? 'Caricamento…' : extracting ? 'Lettura dei file…' : items.length === 1 ? 'Carica documento' : `Carica ${items.length} documenti`}
        </button>
      </div>
      {hiddenInput}
    </div>
  );
}

function ExtractStatus({ item, ext }) {
  const row = { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5 };
  if (item.status === 'extracting') {
    return <div style={{ ...row, color: C.textMuted }}><Spinner size={11} color={C.green} trackColor={C.dot} /> {item.progress || 'Lettura del testo…'}</div>;
  }
  if (item.text) {
    return <div style={{ ...row, color: '#1F6B4E' }}><Check size={13} /> Testo letto · pronto per generare domande</div>;
  }
  return (
    <div style={{ ...row, color: C.warning.text }}>
      <AlertTriangle size={13} />
      {EXTRACTABLE.includes(ext) ? 'Nessun testo trovato: non potrai generare domande da questo file' : 'I file Word non vengono letti: non potrai generare domande'}
    </div>
  );
}
