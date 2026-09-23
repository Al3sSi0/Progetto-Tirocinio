import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BookOpen, FileText, ClipboardList, LogOut, Search, ChevronRight, Trash2, Plus, MoreVertical, Pencil, HelpCircle, FolderOpen } from 'lucide-react';
import pb from '../../lib/pocketbase';
import { C, font, serif } from '../../styles/theme';
import AddDocumentModal from './AddDocumentModal';
import EditDocumentModal from './EditDocumentModal';
import Navbar from '../common/Navbar';
import Spinner from '../common/Spinner';
import EmptyState from '../common/EmptyState';
import ConfirmModal from '../common/ConfirmModal';

// ── Helper stile th ───────────────────────────────────────────────────────────

function thStyle(width) {
  return {
    padding: '10px 14px',
    textAlign: 'left',
    fontSize: 10.5,
    fontWeight: 500,
    color: C.textMuted,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    borderBottom: `1px solid ${C.border}`,
    background: C.headerBg,
    whiteSpace: 'nowrap',
    userSelect: 'none',
    ...(width ? { width } : {}),
  };
}

// ── Badge tipo file ───────────────────────────────────────────────────────────

function TypeBadge({ ext }) {
  const e = (ext || '').toLowerCase();
  let bg, color;
  if (e === 'pdf')                      { ({ bg, color } = C.fileTypes.pdf); }
  else if (e === 'doc' || e === 'docx') { ({ bg, color } = C.fileTypes.doc); }
  else                                  { bg = C.headerBg; color = C.textMuted; }

  return (
    <span style={{ background: bg, color, display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
      {e || '—'}
    </span>
  );
}



// ── Componente principale ─────────────────────────────────────────────────────

export default function DocumentsPage() {
  const [data, setData]                         = useState([]);
  const [loading, setLoading]                   = useState(true);
  const [error, setError]                       = useState('');
  const [globalFilter, setGlobalFilter]         = useState('');
  const [expandedSubjects, setExpandedSubjects] = useState(new Set());
  const [expandedTopics, setExpandedTopics]     = useState(new Set());
  const [selectedIds, setSelectedIds]           = useState(new Set());
  const [showDeleteModal, setShowDeleteModal]   = useState(false);
  const [deleting, setDeleting]                 = useState(false);
  const [showAddModal, setShowAddModal]         = useState(false);
  const [editDoc, setEditDoc]                   = useState(null);
  const [openMenuId, setOpenMenuId]             = useState(null);

  const navigate = useNavigate();
  const location = useLocation();

  async function loadDocuments() {
    setLoading(true); setError('');
    setSelectedIds(new Set());
    try {
      const records = await pb.collection('Document').getFullList({ sort: '-created', filter: `owner = "${pb.authStore.model.id}"` });
      setData(records);
    } catch {
      setError('Errore nel caricamento dei documenti.');
    } finally {
      setLoading(false);
    }
  }

  function toggleSelect(id, e) {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function deleteSelected() {
    setDeleting(true);
    try {
      await Promise.all([...selectedIds].map(id => pb.collection('Document').delete(id)));
      setSelectedIds(new Set());
      setShowDeleteModal(false);
      await loadDocuments();
    } catch {
      setError("Errore durante l'eliminazione dei documenti.");
      setShowDeleteModal(false);
    } finally {
      setDeleting(false);
    }
  }

  useEffect(() => { loadDocuments(); }, []);
  useEffect(() => {
    if (location.state?.openUpload) {
      setShowAddModal(true);
      window.history.replaceState({}, '');
    }
  }, []);
  useEffect(() => {
    function closeMenu() { setOpenMenuId(null); }
    document.addEventListener('mousedown', closeMenu);
    return () => document.removeEventListener('mousedown', closeMenu);
  }, []);

  // ── Filtraggio ──
  const filtered = useMemo(() => {
    if (!globalFilter) return data;
    const q = globalFilter.toLowerCase();
    return data.filter(d =>
      d.subject?.toLowerCase().includes(q) ||
      d.topic?.toLowerCase().includes(q) ||
      d.title?.toLowerCase().includes(q) ||
      d.file?.toLowerCase().includes(q)
    );
  }, [data, globalFilter]);

  // ── Raggruppamento per materia → argomento ──
  const groupedData = useMemo(() => {
    const groups = {};
    filtered.forEach(doc => {
      const subject = (doc.subject || 'Senza materia').trim();
      const topic   = (doc.topic   || 'Senza argomento').trim();
      if (!groups[subject]) groups[subject] = {};
      if (!groups[subject][topic]) groups[subject][topic] = [];
      groups[subject][topic].push(doc);
    });
    return Object.entries(groups).map(([subject, topicsMap]) => ({
      subject,
      topics: Object.entries(topicsMap).map(([topic, docs]) => ({ topic, docs })),
    }));
  }, [filtered]);

  const totalGroups = groupedData.length;

  function toggleSubject(subject) {
    setExpandedSubjects(prev => { const next = new Set(prev); next.has(subject) ? next.delete(subject) : next.add(subject); return next; });
  }
  function toggleTopic(key) {
    setExpandedTopics(prev => { const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next; });
  }

  // ── Render ──
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;500&family=DM+Sans:wght@300;400;500&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        .tbl-row { cursor: pointer; transition: background 0.1s; }
        .tbl-row:hover > td { background: ${C.treeLevels[3]} !important; }
        .tbl-row-d:hover > td { background: ${C.treeLevels[3]} !important; }
      `}</style>

      <div style={{ minHeight: '100vh', background: C.bg, fontFamily: font }}>

        <Navbar />

        {/* ── Main ── */}
        <main style={{ padding: '2rem 1.5rem', maxWidth: 1200, margin: '0 auto' }}>

          {/* Intestazione */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h1 style={{ fontFamily: serif, fontSize: 22, color: C.text, fontWeight: 500, margin: '0 0 4px' }}>
              Documenti
            </h1>
            <p style={{ fontSize: 13, color: C.textMuted, margin: 0 }}>
              {filtered.length} {filtered.length === 1 ? 'documento' : 'documenti'}{globalFilter ? ' trovati' : ' totali'} · {totalGroups} {totalGroups === 1 ? 'materia' : 'materie'}
            </p>
          </div>

          {/* Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.25rem' }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: 340 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: C.textFaint }} />
              <input
                value={globalFilter}
                onChange={e => setGlobalFilter(e.target.value)}
                placeholder="Cerca per materia, argomento, nome file…"
                style={{ width: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 12px 8px 32px', fontSize: 13, color: C.text, fontFamily: font, outline: 'none', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = '#5C7A5E'}
                onBlur={e => e.target.style.borderColor = C.border}
              />
            </div>

            <button onClick={() => setShowAddModal(true)} title="Aggiungi documento"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: C.green, border: 'none', borderRadius: 8, cursor: 'pointer', color: '#FFF', fontFamily: font, fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' }}>
              <Plus size={14} /> Aggiungi
            </button>

            {selectedIds.size > 0 && (
              <button onClick={() => setShowDeleteModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: C.error.bg, border: `1px solid ${C.error.border}`, borderRadius: 8, cursor: 'pointer', color: C.error.text, fontFamily: font, fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' }}>
                <Trash2 size={14} />
                Elimina {selectedIds.size} {selectedIds.size === 1 ? 'documento' : 'documenti'}
              </button>
            )}
          </div>

          {/* Errore */}
          {error && (
            <div style={{ background: C.error.bg, border: `1px solid ${C.error.border}`, color: C.error.text, fontSize: 13, borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
              {error}
            </div>
          )}

          {/* Tabella */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={thStyle(72)}></th>
                    <th style={thStyle()}>Materia / Argomento / Documento</th>
                    <th style={thStyle(120)}>Tipo</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={3} style={{ padding: '3rem', textAlign: 'center', color: C.textFaint }}>
                        <Spinner size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                        Caricamento…
                      </td>
                    </tr>
                  ) : groupedData.length === 0 ? (
                    <tr>
                      <td colSpan={3}>
                        <EmptyState
                          icon={FolderOpen}
                          message={globalFilter ? `Nessun risultato per «${globalFilter}».` : 'Nessun documento ancora.'}
                          actionLabel={!globalFilter ? '+ Aggiungi documento' : undefined}
                          onAction={() => setShowAddModal(true)}
                        />
                      </td>
                    </tr>
                  ) : (
                    groupedData.flatMap(({ subject, topics }, gi) => {
                      const isSubjectExpanded = expandedSubjects.has(subject);
                      const groupBg = gi % 2 === 0 ? 'transparent' : C.treeLevels[0];

                      const allSubjectDocs = topics.flatMap(t => t.docs);
                      const selectedInSubject = allSubjectDocs.filter(d => selectedIds.has(d.id)).length;
                      const allInSubjectSelected = selectedInSubject === allSubjectDocs.length && allSubjectDocs.length > 0;

                      // ── Livello 1: riga materia ──
                      const subjectRow = (
                        <tr key={`subject-${subject}`} className="tbl-row"
                          onClick={() => toggleSubject(subject)}
                          style={{ borderBottom: `1px solid ${isSubjectExpanded ? C.border : C.borderLight}` }}
                        >
                          <td style={{ padding: '12px 14px', verticalAlign: 'middle', background: groupBg, width: 72 }}>
                            <ChevronRight size={14} style={{ transform: isSubjectExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: isSubjectExpanded ? C.green : C.textMuted, display: 'block' }} />
                          </td>
                          <td style={{ padding: '12px 14px', verticalAlign: 'middle', background: groupBg }}>
                            <span style={{ fontFamily: serif, fontWeight: 500, fontSize: 14, color: C.text }}>{subject}</span>
                          </td>
                          <td style={{ padding: '12px 14px', verticalAlign: 'middle', background: groupBg, textAlign: 'right' }}>
                            {selectedInSubject > 0 && (
                              <span style={{ fontSize: 11, color: C.error.text, background: C.error.bg, border: `1px solid ${C.error.border}`, borderRadius: 20, padding: '2px 8px', marginRight: 6, whiteSpace: 'nowrap' }}>
                                {allInSubjectSelected ? 'tutti selezionati' : `${selectedInSubject} selezionati`}
                              </span>
                            )}
                            <span style={{ fontSize: 12, color: C.textMuted, background: C.headerBg, border: `1px solid ${C.borderLight}`, borderRadius: 20, padding: '3px 10px', whiteSpace: 'nowrap' }}>
                              {allSubjectDocs.length} {allSubjectDocs.length === 1 ? 'documento' : 'documenti'}
                            </span>
                          </td>
                        </tr>
                      );

                      if (!isSubjectExpanded) return [subjectRow];

                      // ── Livello 2: righe argomento ──
                      const topicRows = topics.flatMap(({ topic, docs }) => {
                        const topicKey = `${subject}::${topic}`;
                        const isTopicExpanded = expandedTopics.has(topicKey);
                        const topicBg = C.treeLevels[1];
                        const selectedInTopic = docs.filter(d => selectedIds.has(d.id)).length;

                        const topicRow = (
                          <tr key={`topic-${topicKey}`} className="tbl-row"
                            onClick={() => toggleTopic(topicKey)}
                            style={{ borderBottom: `1px solid ${isTopicExpanded ? C.border : C.borderLight}` }}
                          >
                            <td style={{ padding: '10px 14px', verticalAlign: 'middle', background: topicBg, width: 72 }}>
                              <div style={{ paddingLeft: 20 }}>
                                <ChevronRight size={13} style={{ transform: isTopicExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: isTopicExpanded ? C.greenLight : C.textFaint, display: 'block' }} />
                              </div>
                            </td>
                            <td style={{ padding: '10px 14px 10px 34px', verticalAlign: 'middle', background: topicBg }}>
                              <span style={{ fontSize: 13, color: C.textBody, fontWeight: 500 }}>{topic}</span>
                            </td>
                            <td style={{ padding: '10px 14px', verticalAlign: 'middle', background: topicBg, textAlign: 'right' }}>
                              {selectedInTopic > 0 && (
                                <span style={{ fontSize: 11, color: C.error.text, background: C.error.bg, border: `1px solid ${C.error.border}`, borderRadius: 20, padding: '2px 8px', marginRight: 6, whiteSpace: 'nowrap' }}>
                                  {selectedInTopic} {selectedInTopic === 1 ? 'selezionato' : 'selezionati'}
                                </span>
                              )}
                              <span style={{ fontSize: 12, color: C.textMuted, background: C.headerBg, border: `1px solid ${C.borderLight}`, borderRadius: 20, padding: '3px 10px', whiteSpace: 'nowrap' }}>
                                {docs.length} {docs.length === 1 ? 'documento' : 'documenti'}
                              </span>
                            </td>
                          </tr>
                        );

                        if (!isTopicExpanded) return [topicRow];

                        // ── Livello 3: righe documento ──
                        const docRows = docs.map(doc => {
                          const docBg = C.treeLevels[2];
                          const ext = doc.file?.split('.').pop()?.toLowerCase() ?? '';
                          const fileUrl = pb.files.getURL(doc, doc.file);
                          const displayName = doc.title || doc.file || '—';

                          return (
                            <tr key={`doc-${doc.id}`} className="tbl-row-d"
                              style={{ borderBottom: `1px solid ${C.borderLight}` }}
                            >
                              <td style={{ padding: '10px 14px', verticalAlign: 'middle', background: docBg, width: 72 }}>
                                <div style={{ display: 'flex', alignItems: 'center', paddingLeft: 4 }}>
                                  <input
                                    type="checkbox"
                                    checked={selectedIds.has(doc.id)}
                                    onChange={e => toggleSelect(doc.id, e)}
                                    onClick={e => e.stopPropagation()}
                                    style={{ width: 14, height: 14, cursor: 'pointer', accentColor: C.green, flexShrink: 0 }}
                                  />
                                </div>
                              </td>
                              <td style={{ padding: '10px 14px 10px 48px', verticalAlign: 'middle', background: docBg }}>
                                <a
                                  href={fileUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={e => e.stopPropagation()}
                                  style={{ fontSize: 12.5, color: C.greenLight, fontWeight: 500, textDecoration: 'none', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                                >
                                  {displayName}
                                </a>
                              </td>
                              <td style={{ padding: '10px 14px', verticalAlign: 'middle', background: docBg }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                  <TypeBadge ext={ext} />
                                  <div style={{ position: 'relative' }} onMouseDown={e => e.stopPropagation()}>
                                    <button
                                      onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === doc.id ? null : doc.id); }}
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, display: 'flex', alignItems: 'center', padding: '2px 4px', borderRadius: 4 }}
                                      title="Azioni"
                                    >
                                      <MoreVertical size={14} />
                                    </button>
                                    {openMenuId === doc.id && (
                                      <div style={{ position: 'absolute', right: 0, top: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 50, minWidth: 140, overflow: 'hidden' }}>
                                        <button
                                          onClick={e => { e.stopPropagation(); setEditDoc(doc); setOpenMenuId(null); }}
                                          style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer', color: C.text, fontFamily: font, fontSize: 13, textAlign: 'left' }}
                                          onMouseEnter={e => e.currentTarget.style.background = C.headerBg}
                                          onMouseLeave={e => e.currentTarget.style.background = 'none'}
                                        >
                                          <Pencil size={13} /> Modifica
                                        </button>
                                        <button
                                          onClick={e => { e.stopPropagation(); setSelectedIds(new Set([doc.id])); setShowDeleteModal(true); setOpenMenuId(null); }}
                                          style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer', color: C.error.text, fontFamily: font, fontSize: 13, textAlign: 'left' }}
                                          onMouseEnter={e => e.currentTarget.style.background = C.error.bg}
                                          onMouseLeave={e => e.currentTarget.style.background = 'none'}
                                        >
                                          <Trash2 size={13} /> Elimina
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        });

                        return [topicRow, ...docRows];
                      });

                      return [subjectRow, ...topicRows];
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>


        </main>
      </div>

      {/* ── Modale modifica documento ── */}
      {editDoc && (
        <EditDocumentModal
          doc={editDoc}
          data={data}
          onClose={() => setEditDoc(null)}
          onSaved={() => { setEditDoc(null); loadDocuments(); }}
        />
      )}

      {/* ── Modale aggiunta documento ── */}
      {showAddModal && (
        <AddDocumentModal
          data={data}
          onClose={() => setShowAddModal(false)}
          onSaved={() => { setShowAddModal(false); loadDocuments(); }}
        />
      )}

      {/* ── Modale di conferma eliminazione ── */}

      {showDeleteModal && (
        <ConfirmModal
          icon={Trash2}
          title="Elimina documenti"
          message={<>Stai per eliminare <strong>{selectedIds.size} {selectedIds.size === 1 ? 'documento' : 'documenti'}</strong>. Questa azione è irreversibile.</>}
          confirmLabel="Elimina"
          loading={deleting}
          onConfirm={deleteSelected}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
    </>
  );
}
