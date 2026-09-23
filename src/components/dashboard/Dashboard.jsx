import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Trash2, Plus, Pencil, Tag, ClipboardCheck, Inbox, Check, Layers } from 'lucide-react';
import pb from '../../lib/pocketbase';
import { classifyBloomCouncil } from '../../lib/classifyBloom';
import { C, BLOOM_STYLES, BLOOM_LEVELS, BLOOM_LABELS, font, serif, colorForTag } from '../../styles/theme';
import AddQuestionModal from './AddQuestionModal';
import EditQuestionModal from './EditQuestionModal';
import Navbar from '../common/Navbar';
import Spinner from '../common/Spinner';
import EmptyState from '../common/EmptyState';
import ConfirmModal from '../common/ConfirmModal';

function parseOptions(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string' && raw) { try { const p = JSON.parse(raw); return Array.isArray(p) ? p : [raw]; } catch { return [raw]; } }
  return [];
}

// ── Indicatore livello Bloom: 6 pallini + etichetta in italiano ────────────────
function BloomTag({ level }) {
  const idx = BLOOM_LEVELS.indexOf((level || '').toLowerCase());
  const style = idx >= 0 ? BLOOM_STYLES[BLOOM_LEVELS[idx]] : null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ display: 'flex', gap: 3 }} title="Livello di ragionamento richiesto (Tassonomia di Bloom)">
        {BLOOM_LEVELS.map((_, i) => (
          <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: idx >= 0 && i <= idx ? style.color : C.borderLight, flexShrink: 0 }} />
        ))}
      </div>
      {idx >= 0
        ? <span style={{ fontSize: 12.5, fontWeight: 600, color: style.color }}>{BLOOM_LABELS[BLOOM_LEVELS[idx]]}</span>
        : <span style={{ fontSize: 12.5, fontStyle: 'italic', color: C.textFaint }}>Non classificato</span>
      }
    </div>
  );
}

// ── Controllo di selezione (al posto della checkbox nativa) ────────────────────
function SelectDot({ selected, onToggle }) {
  return (
    <button
      onClick={onToggle}
      title={selected ? 'Deseleziona' : 'Seleziona'}
      style={{
        width: 26, height: 26, borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: selected ? C.green : 'transparent',
        border: `2px solid ${selected ? C.green : C.border}`,
        transition: 'background 0.12s, border-color 0.12s',
      }}
    >
      {selected && <Check size={14} color="#FFF" strokeWidth={3} />}
    </button>
  );
}

function ActionBtn({ icon: Icon, label, onClick, disabled, danger }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8,
        background: 'transparent', border: `1px solid ${danger ? C.error.border : C.border}`,
        color: danger ? C.error.text : C.textBody, fontFamily: font, fontSize: 12.5, fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.45 : 1,
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = danger ? C.error.bg : C.expandBg; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
    >
      <Icon size={13} /> {label}
    </button>
  );
}

function QuestionCard({ q, selected, onToggle, onEdit, onDelete, onClassify, classifying, classifyDisabled }) {
  const options = parseOptions(q.options);
  const subject = (q.subject || '').trim();
  const topic = (q.topic || '').trim();
  const subjColor = subject ? colorForTag(subject) : null;

  return (
    <div style={{
      background: C.surface, borderRadius: 14, padding: '18px 20px 16px',
      border: `1px solid ${selected ? C.green : C.border}`,
      boxShadow: selected ? `0 0 0 3px ${C.expandBg}` : 'none',
      transition: 'border-color 0.15s, box-shadow 0.15s',
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      {/* Riga superiore: materia/argomento + selezione */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', columnGap: 18, rowGap: 6 }}>
          {subject && (
            <div>
              <div style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.07em', color: C.textFaint, marginBottom: 3 }}>Materia</div>
              <span style={{ background: subjColor.bg, color: subjColor.color, padding: '2px 10px', borderRadius: 20, fontSize: 12.5, fontWeight: 600 }}>{subject}</span>
            </div>
          )}
          {topic && (
            <div>
              <div style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.07em', color: C.textFaint, marginBottom: 3 }}>Argomento</div>
              <span style={{ fontSize: 13, color: C.textBody, fontWeight: 500 }}>{topic}</span>
            </div>
          )}
        </div>
        <SelectDot selected={selected} onToggle={onToggle} />
      </div>

      {/* Testo della domanda */}
      <div style={{ fontFamily: serif, fontSize: 16.5, color: C.text, lineHeight: 1.5, fontWeight: 500 }}>
        {q.content || '—'}
      </div>

      {/* Opzioni */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
        {options.map((opt, i) => {
          const correct = opt === q.correct_answer;
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, fontSize: 13.5,
              background: correct ? 'rgba(168,197,160,0.25)' : C.expandBg,
              border: `1px solid ${correct ? C.greenAccent : C.borderLight}`,
              color: correct ? C.green : C.textBody, fontWeight: correct ? 600 : 400,
            }}>
              <span style={{
                width: 22, height: 22, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11.5, fontWeight: 600, background: correct ? C.green : C.borderLight, color: correct ? '#FFF' : C.textMuted,
              }}>
                {correct ? <Check size={13} /> : String.fromCharCode(65 + i)}
              </span>
              <span>{opt}</span>
            </div>
          );
        })}
      </div>

      {/* Footer: bloom + azioni */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, paddingTop: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {classifying ? <><Spinner size={13} /><span style={{ fontSize: 12.5, color: C.textFaint }}>Classificazione…</span></> : <BloomTag level={q.bloom_level} />}
          {!q.bloom_level && !classifying && (
            <button
              onClick={onClassify}
              disabled={classifyDisabled}
              style={{ background: 'none', border: 'none', color: C.greenLight, fontFamily: font, fontSize: 12.5, fontWeight: 500, cursor: classifyDisabled ? 'not-allowed' : 'pointer', textDecoration: 'underline', opacity: classifyDisabled ? 0.45 : 1 }}
            >
              Classifica con l'AI
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <ActionBtn icon={Pencil} label="Modifica" onClick={onEdit} />
          {q.bloom_level && <ActionBtn icon={Tag} label="Riclassifica" onClick={onClassify} disabled={classifyDisabled || classifying} />}
          <ActionBtn icon={Trash2} label="Elimina" onClick={onDelete} danger />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData]                     = useState([]);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState('');
  const [globalFilter, setGlobalFilter]     = useState('');
  const [subjectFilter, setSubjectFilter]   = useState('');
  const [topicFilter, setTopicFilter]       = useState('');
  const [selectedIds, setSelectedIds]       = useState(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting]             = useState(false);
  const [showAddModal, setShowAddModal]     = useState(false);
  const [editQuestion, setEditQuestion]     = useState(null);
  const [classifyingId, setClassifyingId]   = useState(null);
  const navigate = useNavigate();

  async function loadQuestions() {
    setLoading(true); setError('');
    setSelectedIds(new Set());
    try {
      const records = await pb.collection('Question').getFullList({ sort: '-created', filter: `owner = "${pb.authStore.model.id}"` });
      setData(records);
    } catch {
      setError('Errore nel caricamento delle domande.');
    } finally {
      setLoading(false);
    }
  }

  function toggleSelect(id) {
    setSelectedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }

  async function deleteSelected() {
    setDeleting(true);
    try {
      await Promise.all([...selectedIds].map(id => pb.collection('Question').delete(id)));
      setSelectedIds(new Set());
      setShowDeleteModal(false);
      await loadQuestions();
    } catch {
      setError("Errore durante l'eliminazione delle domande.");
      setShowDeleteModal(false);
    } finally {
      setDeleting(false);
    }
  }

  async function handleClassify(q) {
    setClassifyingId(q.id);
    try {
      const { winner, modelVotes } = await classifyBloomCouncil(q, import.meta.env.VITE_OPENROUTER_API_KEY);
      console.log(`[Bloom council] domanda: "${q.content.slice(0, 60)}…"`);
      console.table(modelVotes.map(({ model, vote, reply }) => ({ model, vote, reply: reply.slice(0, 120) })));
      console.log(`[Bloom council] winner → ${winner}`);
      await loadQuestions();
    } catch (err) {
      setError('Classificazione fallita: ' + err.message);
    } finally {
      setClassifyingId(null);
    }
  }

  useEffect(() => { loadQuestions(); }, []);

  const subjectOf = q => (q.subject || 'Senza materia').trim();
  const topicOf   = q => (q.topic   || 'Senza argomento').trim();

  // ── Conteggi per la barra laterale (calcolati su tutto l'archivio) ──
  const sidebarData = useMemo(() => {
    const bySubject = {};
    data.forEach(q => {
      const s = subjectOf(q), t = topicOf(q);
      if (!bySubject[s]) bySubject[s] = { count: 0, topics: {} };
      bySubject[s].count++;
      bySubject[s].topics[t] = (bySubject[s].topics[t] || 0) + 1;
    });
    return Object.entries(bySubject)
      .map(([subject, v]) => ({
        subject, count: v.count,
        topics: Object.entries(v.topics).map(([topic, count]) => ({ topic, count })).sort((a, b) => a.topic.localeCompare(b.topic)),
      }))
      .sort((a, b) => a.subject.localeCompare(b.subject));
  }, [data]);

  const filtered = useMemo(() => {
    const t = globalFilter.trim().toLowerCase();
    return data.filter(q => {
      if (subjectFilter && subjectOf(q) !== subjectFilter) return false;
      if (topicFilter && topicOf(q) !== topicFilter) return false;
      if (!t) return true;
      return q.subject?.toLowerCase().includes(t) || q.topic?.toLowerCase().includes(t) ||
             q.content?.toLowerCase().includes(t) || q.bloom_level?.toLowerCase().includes(t);
    });
  }, [data, globalFilter, subjectFilter, topicFilter]);

  const allShownSelected = filtered.length > 0 && filtered.every(q => selectedIds.has(q.id));
  const hasFilters = !!(globalFilter || subjectFilter || topicFilter);

  function toggleAllShown() {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allShownSelected) filtered.forEach(q => next.delete(q.id));
      else filtered.forEach(q => next.add(q.id));
      return next;
    });
  }

  function selectSubject(subject) {
    setSubjectFilter(prev => prev === subject ? '' : subject);
    setTopicFilter('');
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;500&family=DM+Sans:wght@300;400;500&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        .q-layout { display: grid; grid-template-columns: 230px 1fr; gap: 28px; align-items: start; }
        .q-side-list { display: flex; flex-direction: column; gap: 2px; }
        @media (max-width: 880px) {
          .q-layout { display: flex; flex-direction: column; }
          .q-side-list { flex-direction: row; flex-wrap: wrap; }
          .q-topics { flex-basis: 100%; }
        }
      `}</style>

      <div style={{ minHeight: '100vh', background: C.bg, fontFamily: font }}>
        <Navbar />

        <main style={{ padding: '2rem 2rem 4rem', maxWidth: 1360, margin: '0 auto' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h1 style={{ fontFamily: serif, fontSize: 26, color: C.text, fontWeight: 500, margin: '0 0 4px' }}>Le tue domande</h1>
            <p style={{ fontSize: 14, color: C.textMuted, margin: 0 }}>
              {filtered.length} {filtered.length === 1 ? 'domanda' : 'domande'}{hasFilters ? ' trovate' : ' nel tuo archivio'}
            </p>
          </div>

          <div className="q-layout">
            {/* ── Barra laterale: materie e argomenti ── */}
            {data.length > 0 && (
              <aside>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.textFaint, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Layers size={13} /> Materie
                </div>
                <div className="q-side-list">
                  <button
                    onClick={() => { setSubjectFilter(''); setTopicFilter(''); }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                      padding: '8px 12px', borderRadius: 8, border: 'none', textAlign: 'left', cursor: 'pointer',
                      background: !subjectFilter ? C.green : 'transparent',
                      color: !subjectFilter ? '#FFF' : C.textBody,
                      fontFamily: font, fontSize: 13.5, fontWeight: 500,
                    }}
                  >
                    Tutte le domande
                    <span style={{ fontSize: 11, opacity: 0.8 }}>{data.length}</span>
                  </button>

                  {sidebarData.map(({ subject, count, topics }) => {
                    const active = subjectFilter === subject;
                    const sc = colorForTag(subject);
                    return (
                      <div key={subject}>
                        <button
                          onClick={() => selectSubject(subject)}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, width: '100%',
                            padding: '8px 12px', borderRadius: 8, border: 'none', textAlign: 'left', cursor: 'pointer',
                            background: active ? sc.bg : 'transparent',
                            color: active ? sc.color : C.textBody,
                            fontFamily: font, fontSize: 13.5, fontWeight: active ? 600 : 500,
                          }}
                          onMouseEnter={e => { if (!active) e.currentTarget.style.background = C.expandBg; }}
                          onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                        >
                          {subject}
                          <span style={{ fontSize: 11, opacity: 0.75 }}>{count}</span>
                        </button>
                        {active && topics.length > 1 && (
                          <div className="q-topics" style={{ display: 'flex', flexDirection: 'column', gap: 2, margin: '2px 0 4px', paddingLeft: 14, borderLeft: `2px solid ${sc.bg}` }}>
                            {topics.map(({ topic, count: tc }) => {
                              const activeTopic = topicFilter === topic;
                              return (
                                <button
                                  key={topic}
                                  onClick={() => setTopicFilter(prev => prev === topic ? '' : topic)}
                                  style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                                    padding: '5px 10px', borderRadius: 6, border: 'none', textAlign: 'left', cursor: 'pointer',
                                    background: activeTopic ? C.expandBg : 'transparent',
                                    color: activeTopic ? C.green : C.textMuted,
                                    fontFamily: font, fontSize: 12.5, fontWeight: activeTopic ? 600 : 400,
                                  }}
                                >
                                  {topic}
                                  <span style={{ fontSize: 10.5, opacity: 0.75 }}>{tc}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </aside>
            )}

            {/* ── Contenuto principale ── */}
            <section>
              {/* Toolbar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 220, maxWidth: 380 }}>
                  <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.textFaint }} />
                  <input
                    value={globalFilter}
                    onChange={e => setGlobalFilter(e.target.value)}
                    placeholder="Cerca una domanda…"
                    style={{ width: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px 10px 36px', fontSize: 14, color: C.text, fontFamily: font, outline: 'none', boxSizing: 'border-box' }}
                    onFocus={e => e.target.style.borderColor = C.focusBorder}
                    onBlur={e => e.target.style.borderColor = C.border}
                  />
                </div>
                <button
                  onClick={() => setShowAddModal(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, height: 42, padding: '0 20px', background: C.green, border: 'none', borderRadius: 10, cursor: 'pointer', color: '#FFF', fontFamily: font, fontSize: 14.5, fontWeight: 500, whiteSpace: 'nowrap' }}
                >
                  <Plus size={16} /> Nuova domanda
                </button>
              </div>

              {/* Barra selezione */}
              {filtered.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: C.textMuted, cursor: 'pointer' }}>
                    <input type="checkbox" checked={allShownSelected} onChange={toggleAllShown} style={{ width: 15, height: 15, accentColor: C.green, cursor: 'pointer' }} />
                    Seleziona tutte
                  </label>
                  {selectedIds.size > 0 && (
                    <>
                      <span style={{ fontSize: 13, color: C.greenLight, fontWeight: 500 }}>{selectedIds.size} selezionate</span>
                      <button
                        onClick={() => navigate('/tests', { state: { preselectedQuestions: data.filter(q => selectedIds.has(q.id)) } })}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: '#E6EEF6', border: '1px solid #B8CDE0', borderRadius: 8, cursor: 'pointer', color: '#2A5C8A', fontFamily: font, fontSize: 13, fontWeight: 500 }}
                      >
                        <ClipboardCheck size={14} /> Crea un test con queste
                      </button>
                      <button
                        onClick={() => setShowDeleteModal(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: C.error.bg, border: `1px solid ${C.error.border}`, borderRadius: 8, cursor: 'pointer', color: C.error.text, fontFamily: font, fontSize: 13, fontWeight: 500 }}
                      >
                        <Trash2 size={14} /> Elimina
                      </button>
                    </>
                  )}
                </div>
              )}

              {error && (
                <div style={{ background: C.error.bg, border: `1px solid ${C.error.border}`, color: C.error.text, fontSize: 13, borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
                  {error}
                </div>
              )}

              {loading ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: C.textFaint }}>
                  <Spinner size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Caricamento…
                </div>
              ) : filtered.length === 0 ? (
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14 }}>
                  <EmptyState
                    icon={Inbox}
                    message={hasFilters ? 'Nessuna domanda corrisponde ai filtri.' : 'Non hai ancora nessuna domanda. Creane una per iniziare.'}
                    actionLabel={!hasFilters ? '+ Crea la tua prima domanda' : 'Azzera i filtri'}
                    onAction={() => hasFilters ? (setGlobalFilter(''), setSubjectFilter(''), setTopicFilter('')) : setShowAddModal(true)}
                  />
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(440px, 1fr))', gap: 16 }}>
                  {filtered.map(q => (
                    <QuestionCard
                      key={q.id}
                      q={q}
                      selected={selectedIds.has(q.id)}
                      onToggle={() => toggleSelect(q.id)}
                      onEdit={() => setEditQuestion(q)}
                      onDelete={() => { setSelectedIds(new Set([q.id])); setShowDeleteModal(true); }}
                      onClassify={() => handleClassify(q)}
                      classifying={classifyingId === q.id}
                      classifyDisabled={classifyingId !== null}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>

      {editQuestion && (
        <EditQuestionModal
          question={editQuestion}
          data={data}
          onClose={() => setEditQuestion(null)}
          onSaved={() => { setEditQuestion(null); loadQuestions(); }}
        />
      )}

      {showAddModal && (
        <AddQuestionModal
          data={data}
          onClose={() => setShowAddModal(false)}
          onSaved={() => { setShowAddModal(false); loadQuestions(); }}
        />
      )}

      {showDeleteModal && (
        <ConfirmModal
          icon={Trash2}
          title="Elimina domande"
          message={<>Stai per eliminare <strong>{selectedIds.size} {selectedIds.size === 1 ? 'domanda' : 'domande'}</strong>. Questa azione è irreversibile.</>}
          confirmLabel="Elimina"
          loading={deleting}
          onConfirm={deleteSelected}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
    </>
  );
}
