import { C, BLOOM_STYLES, BLOOM_LEVELS, BLOOM_LABELS } from '../../styles/theme';

// Distribuzione dei livelli Bloom delle domande di un test: barra segmentata + legenda.
export default function BloomDistribution({ questions }) {
  const counts = BLOOM_LEVELS.map(l => questions.filter(q => (q.bloom_level || '').toLowerCase() === l).length);
  const unclassified = questions.length - counts.reduce((a, b) => a + b, 0);
  if (questions.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', background: C.borderLight }}>
        {BLOOM_LEVELS.map((l, i) => counts[i] > 0 && (
          <div key={l} title={`${BLOOM_LABELS[l]}: ${counts[i]}`} style={{ flex: counts[i], background: BLOOM_STYLES[l].color }} />
        ))}
        {unclassified > 0 && <div title={`Non classificate: ${unclassified}`} style={{ flex: unclassified, background: C.borderLight }} />}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', columnGap: 14, rowGap: 4 }}>
        {BLOOM_LEVELS.map((l, i) => counts[i] > 0 && (
          <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, color: BLOOM_STYLES[l].color, fontWeight: 500 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: BLOOM_STYLES[l].color }} />
            {BLOOM_LABELS[l]} {counts[i]}
          </span>
        ))}
        {unclassified > 0 && (
          <span style={{ fontSize: 13.5, color: C.textFaint, fontStyle: 'italic' }}>{unclassified} non {unclassified === 1 ? 'classificata' : 'classificate'}</span>
        )}
      </div>
    </div>
  );
}
