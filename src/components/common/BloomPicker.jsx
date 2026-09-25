import { useState } from 'react';
import { C, font, BLOOM_STYLES, BLOOM_LEVELS, BLOOM_LABELS, BLOOM_HINTS } from '../../styles/theme';

// Sostituisce il menu a tendina del livello Bloom con pulsanti colorati cliccabili.
export default function BloomPicker({ value, onChange, disabled }) {
  const [hover, setHover] = useState(null);
  const shown = hover || value;

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange('')}
          style={{
            padding: '6px 12px', borderRadius: 20, fontFamily: font, fontSize: 13.5, fontWeight: 500,
            cursor: disabled ? 'not-allowed' : 'pointer',
            background: !value ? C.headerBg : 'transparent',
            color: !value ? C.text : C.textFaint,
            border: `1px ${!value ? 'solid' : 'dashed'} ${C.border}`,
          }}
        >
          Nessuno
        </button>
        {BLOOM_LEVELS.map(l => {
          const s = BLOOM_STYLES[l];
          const active = value === l;
          return (
            <button
              key={l}
              type="button"
              disabled={disabled}
              onClick={() => onChange(active ? '' : l)}
              onMouseEnter={() => setHover(l)}
              onMouseLeave={() => setHover(null)}
              style={{
                padding: '6px 12px', borderRadius: 20, fontFamily: font, fontSize: 13.5, fontWeight: 500,
                cursor: disabled ? 'not-allowed' : 'pointer',
                background: active ? s.color : s.background,
                color: active ? '#FFF' : s.color,
                border: `1px solid ${active ? s.color : 'transparent'}`,
                transition: 'background 0.12s, color 0.12s',
              }}
            >
              {active ? '✓ ' : ''}{BLOOM_LABELS[l]}
            </button>
          );
        })}
      </div>
      <p style={{ fontSize: 13, color: C.textMuted, margin: '8px 0 0', minHeight: 18 }}>
        {shown ? `${BLOOM_LABELS[shown]}: ${BLOOM_HINTS[shown]}` : 'Facoltativo: indica che tipo di ragionamento richiede la domanda. Puoi anche lasciarlo vuoto e farlo classificare all\'AI.'}
      </p>
    </div>
  );
}
