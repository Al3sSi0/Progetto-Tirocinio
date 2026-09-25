import { useMemo } from 'react';
import { Layers } from 'lucide-react';
import { C, font, colorForTag } from '../../styles/theme';
import { subjectOf, topicOf } from '../../lib/grouping';

// Stili condivisi dalle pagine elenco (Domande, Documenti, Test): layout sidebar + contenuto.
export function PageStyles() {
  return (
    <style>{`
      @keyframes spin { to { transform: rotate(360deg); } }
      .q-layout { display: grid; grid-template-columns: 230px 1fr; gap: 28px; align-items: start; }
      .q-layout > section:only-child { grid-column: 1 / -1; }  /* nessuna sidebar (archivio vuoto) */
      .q-side-list { display: flex; flex-direction: column; gap: 2px; }
      @media (max-width: 880px) {
        .q-layout { display: flex; flex-direction: column; }
        .q-side-list { flex-direction: row; flex-wrap: wrap; }
        .q-topics { flex-basis: 100%; }
      }
    `}</style>
  );
}

// Barra laterale con materie e argomenti; i conteggi sono calcolati su tutti i record.
export default function SubjectSidebar({ records, allLabel, subjectFilter, topicFilter, onSubjectChange, onTopicChange }) {
  const subjects = useMemo(() => {
    const bySubject = {};
    records.forEach(r => {
      const s = subjectOf(r), t = topicOf(r);
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
  }, [records]);

  function selectSubject(subject) {
    onSubjectChange(subjectFilter === subject ? '' : subject);
    onTopicChange('');
  }

  return (
    <aside>
      <div style={{ fontSize: 12.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.textFaint, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Layers size={13} /> Materie
      </div>
      <div className="q-side-list">
        <button
          onClick={() => { onSubjectChange(''); onTopicChange(''); }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
            padding: '10px 14px', borderRadius: 8, border: 'none', textAlign: 'left', cursor: 'pointer',
            background: !subjectFilter ? C.green : 'transparent',
            color: !subjectFilter ? '#FFF' : C.textBody,
            fontFamily: font, fontSize: 13.5, fontWeight: 500,
          }}
        >
          {allLabel}
          <span style={{ fontSize: 12.5, opacity: 0.8 }}>{records.length}</span>
        </button>

        {subjects.map(({ subject, count, topics }) => {
          const active = subjectFilter === subject;
          const sc = colorForTag(subject);
          return (
            <div key={subject}>
              <button
                onClick={() => selectSubject(subject)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, width: '100%',
                  padding: '10px 14px', borderRadius: 8, border: 'none', textAlign: 'left', cursor: 'pointer',
                  background: active ? sc.bg : 'transparent',
                  color: active ? sc.color : C.textBody,
                  fontFamily: font, fontSize: 13.5, fontWeight: active ? 600 : 500,
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = C.expandBg; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
              >
                {subject}
                <span style={{ fontSize: 12.5, opacity: 0.75 }}>{count}</span>
              </button>
              {active && topics.length > 1 && (
                <div className="q-topics" style={{ display: 'flex', flexDirection: 'column', gap: 2, margin: '2px 0 4px', paddingLeft: 14, borderLeft: `2px solid ${sc.bg}` }}>
                  {topics.map(({ topic, count: tc }) => {
                    const activeTopic = topicFilter === topic;
                    return (
                      <button
                        key={topic}
                        onClick={() => onTopicChange(activeTopic ? '' : topic)}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                          padding: '7px 12px', borderRadius: 6, border: 'none', textAlign: 'left', cursor: 'pointer',
                          background: activeTopic ? C.expandBg : 'transparent',
                          color: activeTopic ? C.green : C.textMuted,
                          fontFamily: font, fontSize: 13.5, fontWeight: activeTopic ? 600 : 400,
                        }}
                      >
                        {topic}
                        <span style={{ fontSize: 12, opacity: 0.75 }}>{tc}</span>
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
  );
}

// Materia (chip colorata) + argomento, in testa alle card.
export function SubjectTopic({ subject, topic }) {
  subject = (subject || '').trim();
  topic = (topic || '').trim();
  const sc = subject ? colorForTag(subject) : null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', columnGap: 18, rowGap: 6 }}>
      {subject && (
        <div>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: C.textFaint, marginBottom: 3 }}>Materia</div>
          <span style={{ background: sc.bg, color: sc.color, padding: '2px 10px', borderRadius: 20, fontSize: 13.5, fontWeight: 600 }}>{subject}</span>
        </div>
      )}
      {topic && (
        <div>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: C.textFaint, marginBottom: 3 }}>Argomento</div>
          <span style={{ fontSize: 13, color: C.textBody, fontWeight: 500 }}>{topic}</span>
        </div>
      )}
    </div>
  );
}
