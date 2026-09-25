import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Pencil, FileText, ExternalLink, Sparkles, Search, Check, AlertTriangle, X, UploadCloud } from 'lucide-react';
import pb from '../../lib/pocketbase';
import { C, font, serif, colorForTag, fileTypeStyle } from '../../styles/theme';
import { subjectOf } from '../../lib/grouping';
import UploadPanel from './UploadPanel';
import EditDocumentModal from './EditDocumentModal';
import Navbar from '../common/Navbar';
import Spinner from '../common/Spinner';
import ConfirmModal from '../common/ConfirmModal';
import ChipSelect from '../common/ChipSelect';

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso.replace(' ', 'T'));
  return isNaN(d) ? '' : d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
}

function IconBtn({ icon: Icon, title, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid transparent', borderRadius: 8, cursor: 'pointer', color: danger ? C.error.text : C.textMuted }}
      onMouseEnter={e => { e.currentTarget.style.background = danger ? C.error.bg : C.expandBg; e.currentTarget.style.borderColor = danger ? C.error.border : C.border; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
    >
      <Icon size={16} />
    </button>
  );
}

// ── Riga documento della libreria ─────────────────────────────────────────────
function DocumentRow({ doc, highlight, onGenerate, onEdit, onDelete }) {
  const ext = doc.file?.split('.').pop()?.toLowerCase() ?? '';
  const ts = fileTypeStyle(ext);
  const fileUrl = doc.file ? pb.files.getURL(doc, doc.file) : null;
  const hasText = !!(doc.text || '').trim();
  const subject = (doc.subject || '').trim();
  const topic = (doc.topic || '').trim();
  const sc = subject ? colorForTag(subject) : null;

  return (
    <div
      className="doc-row"
      style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
        background: highlight ? '#EFF5E6' : C.surface, border: `1px solid ${highlight ? C.greenAccent : C.border}`, borderRadius: 14,
        transition: 'background 0.6s, border-color 0.6s',
      }}
    >
      <div style={{ width: 44, height: 44, borderRadius: 11, background: ts.bg, color: ts.color, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <FileText size={17} />
        <span style={{ fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase', marginTop: 1 }}>{ext || '—'}</span>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {fileUrl ? (
          <a href={fileUrl} target="_blank" rel="noreferrer" className="doc-title"
            style={{ fontFamily: serif, fontSize: 15.5, fontWeight: 500, color: C.text, textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {doc.title || doc.file || '—'}
          </a>
        ) : (
          <span style={{ fontFamily: serif, fontSize: 15.5, fontWeight: 500, color: C.text }}>{doc.title || '—'}</span>
        )}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px 10px', marginTop: 5, fontSize: 13.5, color: C.textMuted }}>
          {subject
            ? <span style={{ background: sc.bg, color: sc.color, padding: '1px 9px', borderRadius: 20, fontWeight: 600, fontSize: 13 }}>{subject}</span>
            : <span style={{ fontStyle: 'italic', color: C.textFaint }}>Senza materia</span>}
          {topic && <span>{topic}</span>}
          <span style={{ color: C.dot }}>·</span>
          <span>{formatDate(doc.created)}</span>
          <span style={{ color: C.dot }}>·</span>
          {hasText
            ? <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#1F6B4E' }}><Check size={12} /> Testo letto</span>
            : <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: C.warning.text }} title="Senza testo non si possono generare domande"><AlertTriangle size={12} /> Nessun testo</span>}
        </div>
      </div>

      <div className="doc-actions" style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        <button
          onClick={onGenerate}
          disabled={!hasText}
          title={hasText ? 'Genera domande con l\'AI da questo documento' : 'Questo file non ha testo leggibile'}
          style={{ display: 'flex', alignItems: 'center', gap: 6, height: 34, padding: '0 12px', marginRight: 4, background: hasText ? C.green : C.borderLight, border: 'none', borderRadius: 8, cursor: hasText ? 'pointer' : 'not-allowed', color: hasText ? '#FFF' : C.textFaint, fontFamily: font, fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' }}
        >
          <Sparkles size={14} /> Genera domande
        </button>
        {fileUrl && <IconBtn icon={ExternalLink} title="Apri il file" onClick={() => window.open(fileUrl, '_blank', 'noopener')} />}
        <IconBtn icon={Pencil} title="Modifica nome, materia e argomento" onClick={onEdit} />
        <IconBtn icon={Trash2} title="Elimina" onClick={onDelete} danger />
      </div>
    </div>
  );
}

// ── Pagina ────────────────────────────────────────────────────────────────────

export default function DocumentsPage() {
  const [data, setData]                   = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState('');
  const [search, setSearch]               = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [editDoc, setEditDoc]             = useState(null);
  const [deleteDoc, setDeleteDoc]         = useState(null);
  const [deleting, setDeleting]           = useState(false);
  const [justUploaded, setJustUploaded]   = useState([]); // record appena caricati → banner + evidenziazione
  const [pageDrag, setPageDrag]           = useState(false);
  const dragDepth = useRef(0);
  const uploadRef = useRef(null);
  const navigate = useNavigate();

  async function loadDocuments() {
    setLoading(true); setError('');
    try {
      const records = await pb.collection('Document').getFullList({ sort: '-created', filter: `owner = "${pb.authStore.model.id}"` });
      setData(records);
    } catch {
      setError('Errore nel caricamento dei documenti.');
    } finally {
      setLoading(false);
    }
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      await pb.collection('Document').delete(deleteDoc.id);
      setDeleteDoc(null);
      await loadDocuments();
    } catch {
      setError("Errore durante l'eliminazione del documento.");
      setDeleteDoc(null);
    } finally {
      setDeleting(false);
    }
  }

  function handleUploaded(created) {
    setJustUploaded(created);
    loadDocuments();
  }

  function generateFrom(doc) {
    navigate('/', { state: { generateFromDoc: doc.id } });
  }

  useEffect(() => { loadDocuments(); }, []);

  // ── Drag & drop di file in qualsiasi punto della pagina ──
  const isFileDrag = e => [...(e.dataTransfer?.types || [])].includes('Files');
  const pageDragHandlers = {
    onDragEnter: e => { if (!isFileDrag(e)) return; dragDepth.current++; setPageDrag(true); },
    onDragLeave: e => { if (!isFileDrag(e)) return; dragDepth.current = Math.max(0, dragDepth.current - 1); if (!dragDepth.current) setPageDrag(false); },
    onDragOver:  e => { if (isFileDrag(e)) e.preventDefault(); },
    onDrop: e => {
      if (!isFileDrag(e)) return;
      dragDepth.current = 0; setPageDrag(false);
      if (e.defaultPrevented) return; // già gestito dal riquadro di caricamento
      e.preventDefault();
      uploadRef.current?.addFiles(e.dataTransfer.files);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
  };

  const subjects = useMemo(() => [...new Set(data.map(d => (d.subject || '').trim()).filter(Boolean))].sort(), [data]);

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    return data.filter(d => {
      if (subjectFilter && subjectOf(d) !== subjectFilter) return false;
      if (!t) return true;
      return d.subject?.toLowerCase().includes(t) || d.topic?.toLowerCase().includes(t) ||
             d.title?.toLowerCase().includes(t) || d.file?.toLowerCase().includes(t);
    });
  }, [data, search, subjectFilter]);

  const justIds = new Set(justUploaded.map(d => d.id));
  const firstJust = justUploaded.length === 1 && justUploaded[0];
  const hasFilters = !!(search || subjectFilter);

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
        .doc-row:hover { border-color: ${C.focusBorder} !important; }
        .doc-title:hover { color: ${C.greenLight} !important; text-decoration: underline !important; }
        @media (max-width: 640px) {
          .doc-row { flex-wrap: wrap; }
          .doc-actions { width: 100%; justify-content: flex-end; }
        }
      `}</style>

      <div style={{ minHeight: '100vh', background: C.bg, fontFamily: font }} {...pageDragHandlers}>
        <Navbar />

        <main style={{ padding: '2.5rem 1.25rem 4rem', maxWidth: 820, margin: '0 auto' }}>
          {/* Intestazione */}
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <h1 style={{ fontFamily: serif, fontSize: 28, color: C.text, fontWeight: 500, margin: '0 0 8px' }}>I tuoi documenti</h1>
            <p style={{ fontSize: 14.5, color: C.textMuted, margin: '0 auto', maxWidth: 520, lineHeight: 1.55 }}>
              Carica dispense e appunti: leggiamo il testo per te, così potrai generare domande con l'AI in un clic.
            </p>
          </div>

          {/* Blocco caricamento */}
          <UploadPanel ref={uploadRef} data={data} onUploaded={handleUploaded} />

          {/* Esito caricamento */}
          {justUploaded.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 14, padding: '12px 16px', background: '#E6F2ED', border: `1px solid ${C.greenAccent}`, borderRadius: 12, color: '#1F6B4E', fontSize: 13.5, animation: 'fadeIn 0.25s ease' }}>
              <Check size={16} />
              <span style={{ flex: 1, minWidth: 180 }}>
                {justUploaded.length === 1 ? <>Caricato <strong>{firstJust.title}</strong>.</> : <>Caricati <strong>{justUploaded.length} documenti</strong>.</>}
                {firstJust && (firstJust.text || '').trim() ? ' Vuoi creare subito delle domande?' : ''}
              </span>
              {firstJust && (firstJust.text || '').trim() && (
                <button
                  onClick={() => generateFrom(firstJust)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, height: 34, padding: '0 14px', background: C.green, border: 'none', borderRadius: 8, color: '#FFF', fontFamily: font, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
                >
                  <Sparkles size={14} /> Genera domande
                </button>
              )}
              <button onClick={() => setJustUploaded([])} title="Chiudi" style={{ background: 'none', border: 'none', color: '#1F6B4E', cursor: 'pointer', display: 'flex', padding: 4 }} aria-label="Chiudi">
                <X size={15} />
              </button>
            </div>
          )}

          {error && (
            <div style={{ background: C.error.bg, border: `1px solid ${C.error.border}`, color: C.error.text, fontSize: 13, borderRadius: 8, padding: '12px 16px', marginTop: 16 }}>
              {error}
            </div>
          )}

          {/* Libreria */}
          <section style={{ marginTop: '2.5rem' }}>
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: C.textFaint }}>
                <Spinner size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Caricamento…
              </div>
            ) : data.length === 0 ? null : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                  <h2 style={{ fontFamily: serif, fontSize: 19, color: C.text, fontWeight: 500, margin: 0 }}>
                    La tua libreria <span style={{ fontFamily: font, fontSize: 14, color: C.textFaint, fontWeight: 400 }}>· {data.length}</span>
                  </h2>
                  <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: 300 }}>
                    <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.textFaint }} />
                    <input
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Cerca per nome, materia…"
                      style={{ width: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '9px 14px 9px 36px', fontSize: 13.5, color: C.text, fontFamily: font, outline: 'none', boxSizing: 'border-box' }}
                      onFocus={e => e.target.style.borderColor = C.focusBorder}
                      onBlur={e => e.target.style.borderColor = C.border}
                    />
                  </div>
                </div>

                {subjects.length > 1 && (
                  <div style={{ marginBottom: 14 }}>
                    <ChipSelect options={subjects} value={subjectFilter} onChange={setSubjectFilter} allLabel="Tutte le materie" />
                  </div>
                )}

                {filtered.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: C.textFaint, fontSize: 13.5, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14 }}>
                    Nessun documento corrisponde alla ricerca.{' '}
                    {hasFilters && (
                      <button onClick={() => { setSearch(''); setSubjectFilter(''); }} style={{ background: 'none', border: 'none', color: C.greenLight, fontFamily: font, fontSize: 13.5, fontWeight: 500, cursor: 'pointer', textDecoration: 'underline' }}>
                        Azzera i filtri
                      </button>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {filtered.map(doc => (
                      <DocumentRow
                        key={doc.id}
                        doc={doc}
                        highlight={justIds.has(doc.id)}
                        onGenerate={() => generateFrom(doc)}
                        onEdit={() => setEditDoc(doc)}
                        onDelete={() => setDeleteDoc(doc)}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        </main>

        {/* Overlay drop a tutta pagina */}
        {pageDrag && (
          <div style={{ position: 'fixed', inset: 12, zIndex: 90, pointerEvents: 'none', border: `3px dashed ${C.focusBorder}`, borderRadius: 22, background: 'rgba(239,245,230,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, color: C.green }}>
              <UploadCloud size={44} />
              <span style={{ fontFamily: serif, fontSize: 22, fontWeight: 500 }}>Rilascia per caricare</span>
            </div>
          </div>
        )}
      </div>

      {editDoc && (
        <EditDocumentModal
          doc={editDoc}
          data={data}
          onClose={() => setEditDoc(null)}
          onSaved={() => { setEditDoc(null); loadDocuments(); }}
        />
      )}

      {deleteDoc && (
        <ConfirmModal
          icon={Trash2}
          title="Elimina documento"
          message={<>Stai per eliminare <strong>{deleteDoc.title || deleteDoc.file}</strong>. Le domande già generate da questo documento restano. Questa azione è irreversibile.</>}
          confirmLabel="Elimina"
          loading={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteDoc(null)}
        />
      )}
    </>
  );
}
