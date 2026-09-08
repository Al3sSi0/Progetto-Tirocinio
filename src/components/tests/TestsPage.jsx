import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BookOpen, FileText, ClipboardList, LogOut, Search, ChevronRight, Trash2, Plus, MoreVertical, Pencil, Download, HelpCircle } from 'lucide-react';
import pb from '../../lib/pocketbase';
import { C, font, serif, BLOOM_STYLES, BLOOM_LABELS } from '../../styles/theme';
import ExportTestModal from './ExportTestModal';
import InfoModal from '../InfoModal';

// ── Badge livello Bloom ───────────────────────────────────────────────────────
function BloomBadge({ level }) {
  const style = BLOOM_STYLES[level] || { background: C.headerBg, color: C.textMuted };
  return (
    <span style={{ ...style, display: 'inline-block', padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap' }}>
      {BLOOM_LABELS[level] || level || '—'}
    </span>
  );
}
import TestModal from './TestModal';

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


// ── Componente principale ─────────────────────────────────────────────────────

export default function TestsPage() {
  const [data, setData]                         = useState([]);
  const [loading, setLoading]                   = useState(true);
  const [error, setError]                       = useState('');
  const [globalFilter, setGlobalFilter]         = useState('');
  const [expandedSubjects, setExpandedSubjects] = useState(new Set());
  const [expandedTopics, setExpandedTopics]     = useState(new Set());
  const [expandedTests, setExpandedTests]       = useState(new Set());
  const [selectedIds, setSelectedIds]           = useState(new Set());
  const [showDeleteModal, setShowDeleteModal]   = useState(false);
  const [deleting, setDeleting]                 = useState(false);
  const [showAddModal, setShowAddModal]         = useState(false);
  const [preselectedQuestions, setPreselectedQuestions] = useState([]);
  const [editTest, setEditTest]                 = useState(null);
  const [openMenuId, setOpenMenuId]             = useState(null);
  const [exportTest, setExportTest]             = useState(null);
  const [showInfo, setShowInfo]                 = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const user = pb.authStore.model;

  async function loadTests() {
    setLoading(true); setError('');
    setSelectedIds(new Set());
    try {
      const records = await pb.collection('Test').getFullList({ sort: '-created', filter: `owner = "${pb.authStore.model.id}"`, expand: 'questions' });
      setData(records);
    } catch {
      setError('Errore nel caricamento dei test.');
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
      await Promise.all([...selectedIds].map(id => pb.collection('Test').delete(id)));
      setSelectedIds(new Set());
      setShowDeleteModal(false);
      await loadTests();
    } catch {
      setError("Errore durante l'eliminazione dei test.");
      setShowDeleteModal(false);
    } finally {
      setDeleting(false);
    }
  }

  useEffect(() => { loadTests(); }, []);
  useEffect(() => {
    if (location.state?.preselectedQuestions?.length) {
      setPreselectedQuestions(location.state.preselectedQuestions);
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
    return data.filter(t =>
      t.subject?.toLowerCase().includes(q) ||
      t.topic?.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q)
    );
  }, [data, globalFilter]);

  // ── Raggruppamento per materia → argomento ──
  const groupedData = useMemo(() => {
    const groups = {};
    filtered.forEach(test => {
      const subject = (test.subject || 'Senza materia').trim();
      const topic   = (test.topic   || 'Senza argomento').trim();
      if (!groups[subject]) groups[subject] = {};
      if (!groups[subject][topic]) groups[subject][topic] = [];
      groups[subject][topic].push(test);
    });
    return Object.entries(groups).map(([subject, topicsMap]) => ({
      subject,
      topics: Object.entries(topicsMap).map(([topic, tests]) => ({ topic, tests })),
    }));
  }, [filtered]);

  const totalGroups = groupedData.length;

  function toggleSubject(subject) {
    setExpandedSubjects(prev => { const next = new Set(prev); next.has(subject) ? next.delete(subject) : next.add(subject); return next; });
  }
  function toggleTopic(key) {
    setExpandedTopics(prev => { const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next; });
  }
  function toggleTest(id) {
    setExpandedTests(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }
  function handleLogout() { pb.authStore.clear(); navigate('/login'); }

  const navTabStyle = (path) => ({
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '5px 12px',
    background: location.pathname === path ? C.green : 'transparent',
    color: location.pathname === path ? '#FFF' : C.textMuted,
    border: location.pathname === path ? 'none' : `1px solid ${C.border}`,
    borderRadius: 6, cursor: 'pointer', fontFamily: font, fontSize: 12, fontWeight: 500,
  });

  // ── Render ──
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;500&family=DM+Sans:wght@300;400;500&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        .tbl-row { cursor: pointer; transition: background 0.1s; }
        .tbl-row:hover > td { background: #EDE8DC !important; }
        .tbl-row-t:hover > td { background: #EDE8DC !important; }
      `}</style>

      <div style={{ minHeight: '100vh', background: C.bg, fontFamily: font }}>

        {/* ── Topbar ── */}
        <header style={{ position: 'sticky', top: 0, zIndex: 10, background: C.surface, borderBottom: `1px solid ${C.border}`, height: 56, padding: '0 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, background: C.green, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookOpen size={14} color="#A8C5A0" />
            </div>
            <span style={{ fontFamily: serif, fontSize: 16, color: C.text, fontWeight: 500 }}>Portale Docenti</span>
          </div>

          {/* Nav tabs */}
          <nav style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => navigate('/')} style={navTabStyle('/')}>
              <BookOpen size={13} /> Domande
            </button>
            <button onClick={() => navigate('/documents')} style={navTabStyle('/documents')}>
              <FileText size={13} /> Documenti
            </button>
            <button onClick={() => navigate('/tests')} style={navTabStyle('/tests')}>
              <ClipboardList size={13} /> Test
            </button>
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => setShowInfo(true)}
              style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 6, color: C.textMuted, cursor: 'pointer', padding: '6px 10px', display: 'flex', alignItems: 'center' }}
              onMouseEnter={e => e.currentTarget.style.color = C.text}
              onMouseLeave={e => e.currentTarget.style.color = C.textMuted}
              title="Guida"
            >
              <HelpCircle size={14} />
            </button>
            <span style={{ fontSize: 12, color: C.textMuted }}>{user?.email}</span>
            <button onClick={handleLogout}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.textMuted, background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontFamily: font }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#B05A3A'; e.currentTarget.style.color = '#B05A3A'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMuted; }}
            >
              <LogOut size={13} /> Logout
            </button>
          </div>
        </header>

        {/* ── Main ── */}
        <main style={{ padding: '2rem 1.5rem', maxWidth: 1200, margin: '0 auto' }}>

          {/* Intestazione */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h1 style={{ fontFamily: serif, fontSize: 22, color: C.text, fontWeight: 500, margin: '0 0 4px' }}>
              Test
            </h1>
            <p style={{ fontSize: 13, color: C.textMuted, margin: 0 }}>
              {filtered.length} {filtered.length === 1 ? 'test' : 'test'}{globalFilter ? ' trovati' : ' totali'} · {totalGroups} {totalGroups === 1 ? 'materia' : 'materie'}
            </p>
          </div>

          {/* Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.25rem' }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: 340 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: C.textFaint }} />
              <input
                value={globalFilter}
                onChange={e => setGlobalFilter(e.target.value)}
                placeholder="Cerca per materia, argomento, nome…"
                style={{ width: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 12px 8px 32px', fontSize: 13, color: C.text, fontFamily: font, outline: 'none', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = '#5C7A5E'}
                onBlur={e => e.target.style.borderColor = C.border}
              />
            </div>

            <button onClick={() => setShowAddModal(true)} title="Crea test"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: C.green, border: 'none', borderRadius: 8, cursor: 'pointer', color: '#FFF', fontFamily: font, fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' }}>
              <Plus size={14} /> Crea test
            </button>

            {selectedIds.size > 0 && (
              <button onClick={() => setShowDeleteModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: C.error.bg, border: `1px solid ${C.error.border}`, borderRadius: 8, cursor: 'pointer', color: C.error.text, fontFamily: font, fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' }}>
                <Trash2 size={14} />
                Elimina {selectedIds.size} {selectedIds.size === 1 ? 'test' : 'test'}
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
                    <th style={thStyle()}>Materia / Argomento / Test</th>
                    <th style={thStyle(140)}>Domande</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={3} style={{ padding: '3rem', textAlign: 'center', color: C.textFaint }}>
                        <span style={{ display: 'inline-block', width: 16, height: 16, border: `2px solid ${C.border}`, borderTopColor: '#5C7A5E', borderRadius: '50%', animation: 'spin 0.7s linear infinite', marginRight: 8, verticalAlign: 'middle' }} />
                        Caricamento…
                      </td>
                    </tr>
                  ) : groupedData.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ padding: '3rem', textAlign: 'center', color: C.textFaint, fontSize: 13 }}>
                        Nessun test trovato.
                      </td>
                    </tr>
                  ) : (
                    groupedData.flatMap(({ subject, topics }, gi) => {
                      const isSubjectExpanded = expandedSubjects.has(subject);
                      const groupBg = gi % 2 === 0 ? 'transparent' : '#FAF7F2';

                      const allSubjectTests = topics.flatMap(t => t.tests);
                      const selectedInSubject = allSubjectTests.filter(t => selectedIds.has(t.id)).length;
                      const allInSubjectSelected = selectedInSubject === allSubjectTests.length && allSubjectTests.length > 0;

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
                              {allSubjectTests.length} {allSubjectTests.length === 1 ? 'test' : 'test'}
                            </span>
                          </td>
                        </tr>
                      );

                      if (!isSubjectExpanded) return [subjectRow];

                      // ── Livello 2: righe argomento ──
                      const topicRows = topics.flatMap(({ topic, tests }) => {
                        const topicKey = `${subject}::${topic}`;
                        const isTopicExpanded = expandedTopics.has(topicKey);
                        const topicBg = '#F5F2EB';
                        const selectedInTopic = tests.filter(t => selectedIds.has(t.id)).length;

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
                                {tests.length} {tests.length === 1 ? 'test' : 'test'}
                              </span>
                            </td>
                          </tr>
                        );

                        if (!isTopicExpanded) return [topicRow];

                        // ── Livello 3 + 4: righe test ed espansione domande ──
                        const testRows = tests.flatMap(test => {
                          const testBg = '#F3EFE8';
                          const isTestExpanded = expandedTests.has(test.id);
                          // Le domande arrivano via expand; fallback ad array vuoto
                          const expandedQs = test.expand?.questions
                            ? (Array.isArray(test.expand.questions) ? test.expand.questions : [test.expand.questions])
                            : [];
                          const qCount = expandedQs.length || (Array.isArray(test.questions) ? test.questions.length : (test.questions ? 1 : 0));

                          const testRow = (
                            <tr key={`test-${test.id}`} className="tbl-row-t"
                              onClick={() => toggleTest(test.id)}
                              style={{ borderBottom: `1px solid ${isTestExpanded ? C.border : C.borderLight}`, cursor: 'pointer' }}
                            >
                              <td style={{ padding: '10px 14px', verticalAlign: 'middle', background: testBg, width: 72 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 4 }}>
                                  <input
                                    type="checkbox"
                                    checked={selectedIds.has(test.id)}
                                    onChange={e => toggleSelect(test.id, e)}
                                    onClick={e => e.stopPropagation()}
                                    style={{ width: 14, height: 14, cursor: 'pointer', accentColor: C.green, flexShrink: 0 }}
                                  />
                                  <ChevronRight size={12} style={{ transform: isTestExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: isTestExpanded ? C.greenLight : C.textFaint, flexShrink: 0 }} />
                                </div>
                              </td>
                              <td style={{ padding: '10px 14px 10px 48px', verticalAlign: 'middle', background: testBg }}>
                                <span style={{ fontSize: 12.5, color: C.text, fontWeight: 500, lineHeight: 1.5 }}>
                                  {test.description || '—'}
                                </span>
                              </td>
                              <td style={{ padding: '10px 14px', verticalAlign: 'middle', background: testBg }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                  <span style={{ fontSize: 12, color: C.textMuted, background: C.headerBg, border: `1px solid ${C.borderLight}`, borderRadius: 20, padding: '3px 10px', whiteSpace: 'nowrap' }}>
                                    {qCount} {qCount === 1 ? 'domanda' : 'domande'}
                                  </span>
                                  <div style={{ position: 'relative' }} onMouseDown={e => e.stopPropagation()}>
                                    <button
                                      onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === test.id ? null : test.id); }}
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, display: 'flex', alignItems: 'center', padding: '2px 4px', borderRadius: 4 }}
                                      title="Azioni"
                                    >
                                      <MoreVertical size={14} />
                                    </button>
                                    {openMenuId === test.id && (
                                      <div style={{ position: 'absolute', right: 0, top: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 50, minWidth: 140, overflow: 'hidden' }}>
                                        <button
                                          onClick={e => { e.stopPropagation(); setEditTest(test); setOpenMenuId(null); }}
                                          style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer', color: C.text, fontFamily: font, fontSize: 13, textAlign: 'left' }}
                                          onMouseEnter={e => e.currentTarget.style.background = C.headerBg}
                                          onMouseLeave={e => e.currentTarget.style.background = 'none'}
                                        >
                                          <Pencil size={13} /> Modifica
                                        </button>
                                        <button
                                          onClick={e => { e.stopPropagation(); setExportTest(test); setOpenMenuId(null); }}
                                          style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer', color: C.text, fontFamily: font, fontSize: 13, textAlign: 'left' }}
                                          onMouseEnter={e => e.currentTarget.style.background = C.headerBg}
                                          onMouseLeave={e => e.currentTarget.style.background = 'none'}
                                        >
                                          <Download size={13} /> Esporta
                                        </button>
                                        <button
                                          onClick={e => { e.stopPropagation(); setSelectedIds(new Set([test.id])); setShowDeleteModal(true); setOpenMenuId(null); }}
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

                          if (!isTestExpanded) return [testRow];

                          // ── Livello 4: dettaglio domande ──
                          const detailBg = '#EDE8DC';
                          const detailRow = (
                            <tr key={`detail-${test.id}`}>
                              <td colSpan={3} style={{ padding: 0, background: detailBg, borderBottom: `1px solid ${C.border}` }}>
                                {expandedQs.length === 0 ? (
                                  <div style={{ padding: '16px 24px 16px 64px', fontSize: 13, color: C.textFaint, fontStyle: 'italic' }}>
                                    Nessuna domanda associata a questo test.
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                                    {expandedQs.map((q, qi) => {
                                      const options = Array.isArray(q.options) ? q.options : (typeof q.options === 'string' ? (() => { try { return JSON.parse(q.options); } catch { return []; } })() : []);
                                      return (
                                        <div key={q.id} style={{ padding: '14px 24px 14px 64px', borderBottom: qi < expandedQs.length - 1 ? `1px solid ${C.borderLight}` : 'none' }}>
                                          {/* Numero + contenuto */}
                                          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
                                            <span style={{ fontSize: 11, fontWeight: 600, color: C.textFaint, minWidth: 20, marginTop: 1 }}>#{qi + 1}</span>
                                            <span style={{ fontSize: 13, color: C.text, lineHeight: 1.55, fontWeight: 500 }}>{q.content || '—'}</span>
                                          </div>
                                          {/* Opzioni */}
                                          {options.length > 0 && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 30, marginBottom: 8 }}>
                                              {options.filter(o => o?.trim()).map((opt, oi) => {
                                                const isCorrect = opt === q.correct_answer;
                                                return (
                                                  <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <span style={{ width: 18, height: 18, borderRadius: '50%', border: `1.5px solid ${isCorrect ? C.greenLight : C.border}`, background: isCorrect ? C.greenLight : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                      {isCorrect && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', display: 'block' }} />}
                                                    </span>
                                                    <span style={{ fontSize: 12.5, color: isCorrect ? C.greenLight : C.textBody, fontWeight: isCorrect ? 500 : 400 }}>{opt}</span>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          )}
                                          {/* Footer: bloom + materia/argomento */}
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 30 }}>
                                            {q.bloom_level && <BloomBadge level={q.bloom_level} />}
                                            {(q.subject || q.topic) && (
                                              <span style={{ fontSize: 11, color: C.textFaint }}>
                                                {[q.subject, q.topic].filter(Boolean).join(' · ')}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );

                          return [testRow, detailRow];
                        });

                        return [topicRow, ...testRows];
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

      {/* ── Modale modifica test ── */}
      {editTest && (
        <TestModal
          test={editTest}
          data={data}
          onClose={() => setEditTest(null)}
          onSaved={() => { setEditTest(null); loadTests(); }}
        />
      )}

      {/* ── Modale aggiunta test ── */}
      {showAddModal && (
        <TestModal
          data={data}
          onClose={() => { setShowAddModal(false); setPreselectedQuestions([]); }}
          onSaved={() => { setShowAddModal(false); setPreselectedQuestions([]); loadTests(); }}
          initialQuestions={preselectedQuestions}
        />
      )}

      {/* ── Modale esportazione ── */}
      {exportTest && (
        <ExportTestModal test={exportTest} onClose={() => setExportTest(null)} />
      )}

      {/* ── Modale di conferma eliminazione ── */}
      {showInfo && <InfoModal onClose={() => setShowInfo(false)} />}

      {showDeleteModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(28,43,29,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          onClick={() => { if (!deleting) setShowDeleteModal(false); }}
        >
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '28px 32px', maxWidth: 420, width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', fontFamily: font }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, background: C.error.bg, border: `1px solid ${C.error.border}`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Trash2 size={16} color={C.error.text} />
              </div>
              <h2 style={{ fontFamily: serif, fontSize: 17, fontWeight: 500, color: C.text, margin: 0 }}>Elimina test</h2>
            </div>
            <p style={{ fontSize: 14, color: C.textBody, lineHeight: 1.6, margin: '0 0 24px' }}>
              Stai per eliminare <strong>{selectedIds.size} {selectedIds.size === 1 ? 'test' : 'test'}</strong>. Questa azione è irreversibile.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowDeleteModal(false)} disabled={deleting}
                style={{ padding: '8px 18px', background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, cursor: deleting ? 'not-allowed' : 'pointer', color: C.textMuted, fontFamily: font, fontSize: 13, opacity: deleting ? 0.5 : 1 }}>
                Annulla
              </button>
              <button onClick={deleteSelected} disabled={deleting}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', background: C.error.text, border: 'none', borderRadius: 8, cursor: deleting ? 'not-allowed' : 'pointer', color: '#FFF', fontFamily: font, fontSize: 13, fontWeight: 500, opacity: deleting ? 0.8 : 1 }}>
                {deleting && <span style={{ display: 'inline-block', width: 12, height: 12, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#FFF', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />}
                {deleting ? 'Eliminazione…' : 'Elimina'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
