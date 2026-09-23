import { C, font } from '../../styles/theme';

// Filtro a chip cliccabili al posto di un menu a tendina. value '' = "tutti".
export default function ChipSelect({ options, value, onChange, allLabel = 'Tutte', disabled }) {
  const chip = (active) => ({
    padding: '5px 12px', borderRadius: 20, fontFamily: font, fontSize: 12.5, fontWeight: 500,
    cursor: disabled ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
    background: active ? C.green : C.surface,
    color: active ? '#FFF' : C.textBody,
    border: `1px solid ${active ? C.green : C.border}`,
    opacity: disabled ? 0.5 : 1,
  });

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      <button type="button" disabled={disabled} onClick={() => onChange('')} style={chip(!value)}>{allLabel}</button>
      {options.map(o => (
        <button key={o} type="button" disabled={disabled} onClick={() => onChange(value === o ? '' : o)} style={chip(value === o)}>{o}</button>
      ))}
    </div>
  );
}
