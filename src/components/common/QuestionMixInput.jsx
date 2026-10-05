import { C, font, labelStyle } from '../../styles/theme';
import { MAX_GENERATED_QUESTIONS, countTotal } from '../../lib/generateQuestions';

const ROWS = [
  { key: 'multiple',  label: 'Risposta multipla', hint: '4 opzioni, una corretta' },
  { key: 'truefalse', label: 'Vero o falso',      hint: 'Affermazioni da giudicare' },
  { key: 'open',      label: 'Risposta aperta',   hint: 'Con la risposta attesa' },
];

// Quante domande generare per tipo ({ multiple, truefalse, open }); 0 = tipo escluso.
// Il totale non può superare MAX_GENERATED_QUESTIONS.
export default function QuestionMixInput({ value, onChange, disabled }) {
  const total = countTotal(value);

  function setCount(key, raw) {
    const others = total - value[key];
    const n = Math.max(0, Math.min(MAX_GENERATED_QUESTIONS - others, parseInt(raw, 10) || 0));
    onChange({ ...value, [key]: n });
  }

  return (
    <div>
      <label style={labelStyle}>Quante domande e di che tipo</label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 8 }}>
        {ROWS.map(r => {
          const active = value[r.key] > 0;
          return (
            <label key={r.key} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, cursor: disabled ? 'not-allowed' : 'text',
              background: active ? C.expandBg : C.surface, border: `1px solid ${active ? C.greenAccent : C.border}`,
            }}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: active ? C.text : C.textMuted }}>{r.label}</span>
                <span style={{ display: 'block', fontSize: 12, color: C.textFaint }}>{r.hint}</span>
              </span>
              <input
                type="number" min={0} max={MAX_GENERATED_QUESTIONS}
                value={value[r.key]}
                onChange={e => setCount(r.key, e.target.value)}
                onFocus={e => e.target.select()}
                disabled={disabled}
                aria-label={`Numero di domande: ${r.label}`}
                style={{ width: 62, height: 36, boxSizing: 'border-box', textAlign: 'center', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, fontFamily: font, fontSize: 15, fontWeight: 600, color: C.text, outline: 'none' }}
              />
            </label>
          );
        })}
      </div>
      <div style={{ fontSize: 13, color: total ? C.textMuted : C.error.text, marginTop: 6 }}>
        {total ? <>Totale: <strong style={{ color: C.text }}>{total}</strong> {total === 1 ? 'domanda' : 'domande'}</> : 'Indica almeno una domanda da generare.'}
      </div>
    </div>
  );
}
