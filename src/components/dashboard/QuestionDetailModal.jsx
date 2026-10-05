import { X, Check, FileText, ExternalLink, Pencil, Tag, Trash2 } from 'lucide-react';
import pb from '../../lib/pocketbase';
import { C, font, serif, colorForTag } from '../../styles/theme';
import { questionType, parseOptions, TYPE_LABELS } from '../../lib/questionTypes';
import { useEscape } from '../../lib/useEscape';
import BloomTag from '../common/BloomTag';
import Spinner from '../common/Spinner';

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso.replace(' ', 'T'));
  return isNaN(d) ? '—' : d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
}

const sectionLabel = { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: C.textFaint, marginBottom: 8 };

// Documento di origine con le pagine; il link apre il PDF alla prima pagina.
function SourceLink({ doc, from, to }) {
  const url = doc.file ? pb.files.getURL(doc, doc.file) : null;
  const pages = !from ? '' : from === to || !to ? `pag. ${from}` : `pagg. ${from}–${to}`;
  const href = url && from ? `${url}#page=${from}` : url;
  const label = <>{doc.title || doc.file}{pages && <span style={{ fontWeight: 500, color: C.textMuted }}> · {pages}</span>}</>;
  return href ? (
    <a href={href} target="_blank" rel="noreferrer"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: C.greenLight, fontWeight: 600, textDecoration: 'none', borderBottom: `1px solid ${C.greenAccent}` }}>
      <FileText size={14} /> {label} <ExternalLink size={12} />
    </a>
  ) : (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: C.text, fontWeight: 600 }}><FileText size={14} /> {label}</span>
  );
}

// Una risposta possibile: lettera (o ✓ se corretta) + testo.
function AnswerOption({ letter, text, correct }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, fontSize: 14.5,
      background: correct ? 'rgba(168,197,160,0.25)' : C.expandBg,
      border: `1px solid ${correct ? C.greenAccent : C.borderLight}`,
      color: correct ? C.green : C.textBody, fontWeight: correct ? 600 : 400,
    }}>
      <span style={{
        width: 24, height: 24, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 600, background: correct ? C.green : C.borderLight, color: correct ? '#FFF' : C.textMuted,
      }}>
        {correct ? <Check size={14} /> : letter}
      </span>
      <span style={{ flex: 1 }}>{text}</span>
      {correct && <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Corretta</span>}
    </div>
  );
}

// Dialog con tutti i dettagli di una domanda (si apre cliccando una riga della tabella).
// source = documento di origine ({ id, title, file, … }) se la domanda è stata generata da un documento.
export default function QuestionDetailModal({ question: q, source, onClose, onEdit, onDelete, onClassify, classifying, classifyDisabled }) {
  useEscape(onClose);
  const type = questionType(q);
  const options = parseOptions(q.options).filter(o => String(o).trim());
  const subject = (q.subject || '').trim();
  const topic = (q.topic || '').trim();
  const sc = subject ? colorForTag(subject) : null;

  const details = [
    { label: 'Materia', value: subject ? <span style={{ background: sc.bg, color: sc.color, padding: '2px 10px', borderRadius: 20, fontSize: 13, fontWeight: 600 }}>{subject}</span> : <em style={{ color: C.textFaint }}>Nessuna</em> },
    { label: 'Argomento', value: topic || <em style={{ color: C.textFaint }}>Nessuno</em> },
    { label: 'Tipo', value: TYPE_LABELS[type] },
    { label: 'Categoria di Bloom', value: classifying ? <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.textFaint }}><Spinner size={13} /> Classificazione…</span> : <BloomTag level={q.bloom_level} /> },
    { label: 'Data di creazione', value: formatDate(q.created) },
    { label: 'Fonte', value: source ? <SourceLink doc={source} from={q.page_from} to={q.page_to} /> : <em style={{ color: C.textFaint }}>Scritta a mano</em>, wide: true },
  ];

  const footerBtn = { display: 'flex', alignItems: 'center', gap: 6, height: 40, padding: '0 16px', borderRadius: 9, fontFamily: font, fontSize: 14, fontWeight: 500, cursor: 'pointer' };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: C.overlay, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="question-detail-title"
        onClick={e => e.stopPropagation()}
        style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, width: 'min(760px, 100%)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 12px 40px rgba(0,0,0,0.16)', fontFamily: font }}
      >
        {/* Intestazione */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '18px 24px', borderBottom: `1px solid ${C.borderLight}` }}>
          <h2 id="question-detail-title" style={{ fontFamily: serif, fontSize: 19, fontWeight: 500, color: C.text, margin: 0 }}>Dettagli della domanda</h2>
          <button onClick={onClose} aria-label="Chiudi" title="Chiudi"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, padding: 4, display: 'flex' }}>
            <X size={18} />
          </button>
        </div>

        {/* Corpo */}
        <div style={{ overflowY: 'auto', padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 22 }}>
          {/* Domanda */}
          <div>
            <div style={sectionLabel}>Domanda</div>
            <div style={{ fontFamily: serif, fontSize: 18, lineHeight: 1.5, color: C.text, fontWeight: 500 }}>{q.content || '—'}</div>
          </div>

          {/* Risposte */}
          <div>
            <div style={sectionLabel}>{type === 'open' ? 'Risposta attesa' : type === 'truefalse' ? "L'affermazione è" : 'Risposte'}</div>
            {type === 'open' ? (
              <div style={{ padding: '12px 14px', borderRadius: 10, fontSize: 14.5, lineHeight: 1.55, background: 'rgba(168,197,160,0.18)', border: `1px solid ${C.greenAccent}`, color: C.text }}>
                {q.correct_answer || <em style={{ color: C.textFaint }}>Risposta attesa non indicata.</em>}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: type === 'truefalse' ? 'repeat(2, minmax(0, 1fr))' : '1fr', gap: 8 }}>
                {options.map((opt, i) => (
                  <AnswerOption key={i} letter={String.fromCharCode(65 + i)} text={opt} correct={opt === q.correct_answer} />
                ))}
              </div>
            )}
            {type === 'multiple' && !options.includes(q.correct_answer) && (
              <div style={{ fontSize: 13, color: C.warning.text, marginTop: 8 }}>La risposta corretta non è indicata: usa "Modifica" per sceglierla.</div>
            )}
          </div>

          {/* Dettagli */}
          <div>
            <div style={sectionLabel}>Dettagli</div>
            <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px 20px', margin: 0, padding: '14px 16px', background: C.expandBg, border: `1px solid ${C.borderLight}`, borderRadius: 12 }}>
              {details.map(d => (
                <div key={d.label} style={{ gridColumn: d.wide ? '1 / -1' : undefined, minWidth: 0 }}>
                  <dt style={{ fontSize: 12, color: C.textMuted, marginBottom: 4 }}>{d.label}</dt>
                  <dd style={{ margin: 0, fontSize: 14, color: C.text, overflowWrap: 'anywhere' }}>{d.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* Azioni */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '14px 24px', borderTop: `1px solid ${C.borderLight}` }}>
          <button onClick={onDelete} style={{ ...footerBtn, background: 'transparent', border: `1px solid ${C.error.border}`, color: C.error.text }}>
            <Trash2 size={15} /> Elimina
          </button>
          <span style={{ flex: 1 }} />
          <button onClick={onClassify} disabled={classifyDisabled || classifying}
            style={{ ...footerBtn, background: 'transparent', border: `1px solid ${C.border}`, color: C.textBody, cursor: classifyDisabled || classifying ? 'not-allowed' : 'pointer', opacity: classifyDisabled || classifying ? 0.5 : 1 }}>
            <Tag size={15} /> {q.bloom_level ? 'Riclassifica' : "Classifica con l'AI"}
          </button>
          <button onClick={onEdit} style={{ ...footerBtn, background: C.green, border: 'none', color: '#FFF' }}>
            <Pencil size={15} /> Modifica
          </button>
        </div>
      </div>
    </div>
  );
}
