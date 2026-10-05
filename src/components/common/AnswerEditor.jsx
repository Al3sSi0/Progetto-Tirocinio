import { Plus, X, Check } from 'lucide-react';
import { C, font, inputStyle, labelStyle } from '../../styles/theme';
import { QUESTION_TYPES, TYPE_LABELS, TRUE_FALSE } from '../../lib/questionTypes';

// Editor della risposta di una domanda, per tutti i tipi: scelta del tipo + opzioni (risposta multipla),
// Vero/Falso, oppure risposta attesa (aperta). value/onChange = stato di emptyAnswer()/answerFromQuestion().
// name: nome univoco del gruppo di radio. error: messaggio mostrato sopra i campi.
export default function AnswerEditor({ value, onChange, name, disabled, error, showTypePicker = true }) {
  const set = patch => onChange({ ...value, ...patch });

  function setOption(idx, text) {
    const options = [...value.options]; options[idx] = text;
    set({ options });
  }
  function removeOption(idx) {
    const options = value.options.filter((_, i) => i !== idx);
    const c = value.correctIdx;
    set({ options: options.length ? options : [''], correctIdx: c === null || idx === c ? null : idx < c ? c - 1 : c });
  }

  const chip = active => ({
    padding: '6px 13px', borderRadius: 20, fontFamily: font, fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap',
    cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1,
    background: active ? C.green : C.surface, color: active ? '#FFF' : C.textBody,
    border: `1px solid ${active ? C.green : C.border}`,
  });
  const errorBox = error && (
    <div style={{ fontSize: 13, color: C.error.text, background: C.error.bg, border: `1px solid ${C.error.border}`, borderRadius: 6, padding: '5px 10px', marginBottom: 6 }}>{error}</div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {showTypePicker && (
        <div>
          <label style={labelStyle}>Tipo di domanda</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {QUESTION_TYPES.map(t => (
              <button key={t} type="button" disabled={disabled} onClick={() => set({ type: t })} style={chip(value.type === t)}>
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>
      )}

      {value.type === 'multiple' && (
        <div>
          <label style={labelStyle}>Opzioni di risposta * <span style={{ fontWeight: 400, color: C.textFaint }}>— seleziona il pallino per indicare quella corretta</span></label>
          {errorBox}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {value.options.map((opt, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="radio"
                  name={name}
                  checked={value.correctIdx === idx}
                  onChange={() => set({ correctIdx: idx })}
                  disabled={disabled || !opt.trim()}
                  title="Segna come risposta corretta"
                  aria-label="Risposta corretta"
                  style={{ width: 17, height: 17, accentColor: C.green, flexShrink: 0, cursor: opt.trim() ? 'pointer' : 'not-allowed' }}
                />
                <input value={opt} onChange={e => setOption(idx, e.target.value)} disabled={disabled} placeholder={`Opzione ${idx + 1}`} style={{ ...inputStyle, flex: 1 }} />
                <button type="button" onClick={() => removeOption(idx)} disabled={disabled} aria-label="Rimuovi opzione" title="Rimuovi opzione"
                  style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, cursor: disabled ? 'not-allowed' : 'pointer', color: C.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, flexShrink: 0 }}>
                  <X size={13} />
                </button>
              </div>
            ))}
            <button type="button" onClick={() => set({ options: [...value.options, ''] })} disabled={disabled}
              style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', background: 'none', border: `1px dashed ${C.border}`, borderRadius: 9, cursor: disabled ? 'not-allowed' : 'pointer', color: C.textMuted, fontFamily: font, fontSize: 13, marginTop: 2 }}>
              <Plus size={12} /> Aggiungi opzione
            </button>
          </div>
        </div>
      )}

      {value.type === 'truefalse' && (
        <div>
          <label style={labelStyle}>L'affermazione è… *</label>
          {errorBox}
          <div style={{ display: 'flex', gap: 8 }}>
            {TRUE_FALSE.map(v => {
              const active = value.tf === v;
              return (
                <button key={v} type="button" disabled={disabled} onClick={() => set({ tf: v })} aria-pressed={active}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '9px 22px', borderRadius: 9, fontFamily: font, fontSize: 14, fontWeight: 600,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    background: active ? C.green : C.surface, color: active ? '#FFF' : C.textBody,
                    border: `1px solid ${active ? C.green : C.border}`,
                  }}>
                  {active && <Check size={14} />} {v}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {value.type === 'open' && (
        <div>
          <label style={labelStyle}>Risposta attesa <span style={{ fontWeight: 400, color: C.textFaint }}>— facoltativa, utile per correggere</span></label>
          {errorBox}
          <textarea value={value.expected} onChange={e => set({ expected: e.target.value })} disabled={disabled} rows={3}
            placeholder="Cosa deve contenere una risposta corretta"
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.55 }} />
        </div>
      )}
    </div>
  );
}

// Anteprima compatta della risposta (liste di domande generate): opzioni con la corretta, V/F, o risposta attesa.
export function AnswerPreview({ q, type }) {
  if (type === 'open') {
    return (
      <div style={{ fontSize: 13, color: C.textBody, lineHeight: 1.5 }}>
        <span style={{ fontWeight: 600, color: C.greenLight }}>Risposta attesa: </span>{q.correct_answer || <em style={{ color: C.textFaint }}>non indicata</em>}
      </div>
    );
  }
  return (
    <ul style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 3 }}>
      {(q.options || []).map((opt, oi) => (
        <li key={oi} style={{ fontSize: 13, color: opt === q.correct_answer ? C.greenLight : C.textBody, fontWeight: opt === q.correct_answer ? 600 : 400 }}>
          {opt}{opt === q.correct_answer ? ' ✓' : ''}
        </li>
      ))}
    </ul>
  );
}

// Etichetta del tipo di domanda (liste di domande generate).
export function TypeBadge({ type }) {
  return (
    <span style={{ display: 'inline-block', fontSize: 11.5, fontWeight: 600, color: C.textMuted, background: C.headerBg, border: `1px solid ${C.borderLight}`, borderRadius: 20, padding: '1px 8px', whiteSpace: 'nowrap' }}>
      {TYPE_LABELS[type]}
    </span>
  );
}
