import { useState, useRef } from 'react';
import { X, CheckCircle2, MessageSquareHeart } from 'lucide-react';
import { C, font, serif, inputStyle } from '../../styles/theme';
import { SUS_STATEMENTS, SUS_SCALE, OPEN_QUESTIONS, saveFeedback, dismissFeedbackForSession } from '../../lib/sus';
import { useEscape } from '../../lib/useEscape';
import Spinner from '../common/Spinner';

// Questionario di feedback proposto dopo un'esportazione riuscita:
// invito → 10 affermazioni SUS (obbligatorie) + domande aperte (facoltative) → ringraziamento.
export default function SusSurveyModal({ testId, exportFormat, onClose }) {
  const [step, setStep]         = useState('invite'); // 'invite' | 'form' | 'thanks'
  const [answers, setAnswers]   = useState(Array(SUS_STATEMENTS.length).fill(null));
  const [openAnswers, setOpen]  = useState(OPEN_QUESTIONS.map(() => ''));
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [showMissing, setShowMissing] = useState(false);
  const itemRefs = useRef([]);

  const answered = answers.filter(Boolean).length;
  const complete = answered === SUS_STATEMENTS.length;

  function later() { dismissFeedbackForSession(); onClose(); }
  useEscape(step === 'form' || step === 'invite' ? later : onClose, saving);

  function setAnswer(i, v) {
    setAnswers(prev => prev.map((x, j) => j === i ? v : x));
    setError('');
  }

  async function submit() {
    if (!complete) {
      // porta alla prima affermazione senza risposta
      setShowMissing(true);
      const first = answers.findIndex(a => !a);
      itemRefs.current[first]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setSaving(true); setError('');
    try {
      await saveFeedback({ susAnswers: answers, openAnswers, testId, exportFormat });
      setStep('thanks');
    } catch {
      setError("Non è stato possibile inviare le risposte. Riprova tra poco.");
    } finally {
      setSaving(false);
    }
  }

  const primaryBtn = { display: 'flex', alignItems: 'center', gap: 8, height: 42, padding: '0 20px', background: C.green, border: 'none', borderRadius: 10, color: '#FFF', fontFamily: font, fontSize: 14.5, fontWeight: 500, cursor: 'pointer' };
  const secondaryBtn = { height: 42, padding: '0 18px', background: 'none', border: `1px solid ${C.border}`, borderRadius: 10, color: C.textMuted, fontFamily: font, fontSize: 14, cursor: 'pointer' };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: C.overlay, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 130, padding: 16 }}
      onClick={() => { if (!saving && step !== 'form') (step === 'invite' ? later() : onClose()); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sus-title"
        onClick={e => e.stopPropagation()}
        style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, width: step === 'form' ? 'min(780px, 100%)' : 'min(460px, 100%)', maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 12px 40px rgba(0,0,0,0.18)', fontFamily: font }}
      >
        {/* ── Invito ── */}
        {step === 'invite' && (
          <div style={{ padding: '28px 28px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 14 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#E6F2ED', color: '#1F6B4E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={28} />
            </div>
            <div>
              <h2 id="sus-title" style={{ fontFamily: serif, fontSize: 21, fontWeight: 500, color: C.text, margin: '0 0 6px' }}>Esportazione completata</h2>
              <p style={{ fontSize: 14.5, color: C.textMuted, lineHeight: 1.55, margin: 0 }}>
                Ci aiuti a migliorare il portale? Sono 10 affermazioni veloci e 3 domande facoltative: circa 3 minuti.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
              <button onClick={later} style={secondaryBtn}>Non ora</button>
              <button onClick={() => setStep('form')} style={primaryBtn}><MessageSquareHeart size={16} /> Rispondi al questionario</button>
            </div>
          </div>
        )}

        {/* ── Questionario ── */}
        {step === 'form' && (<>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, padding: '20px 26px 16px', borderBottom: `1px solid ${C.borderLight}` }}>
            <div>
              <h2 id="sus-title" style={{ fontFamily: serif, fontSize: 20, fontWeight: 500, color: C.text, margin: '0 0 4px' }}>Com'è stato usare il portale?</h2>
              <p style={{ fontSize: 13.5, color: C.textMuted, margin: 0, lineHeight: 1.5 }}>
                Indica quanto sei d'accordo con ogni affermazione. Rispondi d'istinto: non ci sono risposte giuste o sbagliate.
              </p>
            </div>
            <button onClick={later} disabled={saving} aria-label="Chiudi" title="Chiudi"
              style={{ background: 'none', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', color: C.textMuted, padding: 4, display: 'flex' }}>
              <X size={18} />
            </button>
          </div>

          <div style={{ overflowY: 'auto', padding: '18px 26px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Legenda della scala */}
            <div className="sus-legend" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.textFaint, padding: '0 4px' }}>
              <span>1 = {SUS_SCALE[0].label}</span>
              <span>5 = {SUS_SCALE[4].label}</span>
            </div>

            {SUS_STATEMENTS.map((text, i) => {
              const missing = showMissing && !answers[i];
              return (
                <div
                  key={i}
                  ref={el => { itemRefs.current[i] = el; }}
                  className="sus-item"
                  style={{ padding: '12px 14px', border: `1px solid ${missing ? C.error.border : C.borderLight}`, borderRadius: 12, background: missing ? C.error.bg : answers[i] ? C.surface : C.expandBg }}
                >
                  <div id={`sus-q-${i}`} className="sus-text" style={{ fontSize: 14.5, color: C.text, lineHeight: 1.45, display: 'flex', gap: 8 }}>
                    <span style={{ color: C.textFaint, fontWeight: 600, minWidth: 20 }}>{i + 1}.</span>
                    <span>{text}</span>
                  </div>
                  <div className="sus-scale" role="radiogroup" aria-labelledby={`sus-q-${i}`} style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    {SUS_SCALE.map(s => {
                      const active = answers[i] === s.value;
                      return (
                        <button
                          key={s.value}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          aria-label={`${s.value} — ${s.label}`}
                          title={s.label}
                          onClick={() => setAnswer(i, s.value)}
                          disabled={saving}
                          style={{
                            width: 40, height: 40, borderRadius: 10, fontFamily: font, fontSize: 15, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
                            background: active ? C.green : C.surface, color: active ? '#FFF' : C.textBody,
                            border: `1px solid ${active ? C.green : C.border}`, transition: 'background 0.12s, border-color 0.12s',
                          }}
                        >
                          {s.value}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            <div style={{ marginTop: 12, paddingTop: 16, borderTop: `1px solid ${C.borderLight}`, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: 13, color: C.textMuted }}>Qualche parola in più <span style={{ color: C.textFaint }}>(facoltativo)</span></div>
              {OPEN_QUESTIONS.map((q, i) => (
                <div key={i}>
                  <label htmlFor={`sus-open-${i}`} style={{ display: 'block', fontSize: 14, color: C.text, fontWeight: 500, marginBottom: 6 }}>{q}</label>
                  <textarea
                    id={`sus-open-${i}`}
                    value={openAnswers[i]}
                    onChange={e => setOpen(prev => prev.map((x, j) => j === i ? e.target.value : x))}
                    disabled={saving}
                    rows={2}
                    style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
                  />
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '14px 26px', borderTop: `1px solid ${C.borderLight}` }}>
            <span style={{ flex: 1, fontSize: 13, color: showMissing && !complete ? C.error.text : C.textMuted }}>
              {error || (complete
                ? 'Tutte le affermazioni hanno una risposta.'
                : `${answered} di ${SUS_STATEMENTS.length} affermazioni con risposta${showMissing ? ': completa quelle evidenziate' : ''}`)}
            </span>
            <button onClick={later} disabled={saving} style={secondaryBtn}>Non ora</button>
            <button onClick={submit} disabled={saving} style={{ ...primaryBtn, opacity: saving ? 0.8 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving && <Spinner size={13} color="#FFF" trackColor="rgba(255,255,255,0.4)" />}
              {saving ? 'Invio…' : 'Invia risposte'}
            </button>
          </div>
        </>)}

        {/* ── Ringraziamento ── */}
        {step === 'thanks' && (
          <div style={{ padding: '30px 28px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 12 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#E6F2ED', color: '#1F6B4E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageSquareHeart size={28} />
            </div>
            <h2 id="sus-title" style={{ fontFamily: serif, fontSize: 21, fontWeight: 500, color: C.text, margin: 0 }}>Grazie per il tuo feedback!</h2>
            <p style={{ fontSize: 14.5, color: C.textMuted, lineHeight: 1.55, margin: 0 }}>Le tue risposte ci aiutano a rendere il portale più semplice da usare.</p>
            <button onClick={onClose} style={{ ...primaryBtn, marginTop: 8 }}>Chiudi</button>
          </div>
        )}
      </div>

      <style>{`
        .sus-item { display: flex; align-items: center; gap: 16px; }
        .sus-item > .sus-text { flex: 1; }
        @media (max-width: 620px) {
          .sus-item { flex-direction: column; align-items: stretch; }
          .sus-scale { justify-content: space-between; }
        }
      `}</style>
    </div>
  );
}
