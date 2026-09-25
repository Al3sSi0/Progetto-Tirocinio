import { C, BLOOM_STYLES, BLOOM_LEVELS, BLOOM_LABELS } from '../../styles/theme';

// Indicatore livello Bloom: 6 pallini + etichetta in italiano.
export default function BloomTag({ level }) {
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
        ? <span style={{ fontSize: 13.5, fontWeight: 600, color: style.color }}>{BLOOM_LABELS[BLOOM_LEVELS[idx]]}</span>
        : <span style={{ fontSize: 13.5, fontStyle: 'italic', color: C.textFaint }}>Non classificato</span>
      }
    </div>
  );
}
