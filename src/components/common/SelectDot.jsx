import { Check } from 'lucide-react';
import { C } from '../../styles/theme';

// Controllo di selezione rotondo per le card (al posto della checkbox nativa).
export default function SelectDot({ selected, onToggle }) {
  return (
    <button
      onClick={onToggle}
      title={selected ? 'Deseleziona' : 'Seleziona'}
      aria-label={selected ? 'Deseleziona' : 'Seleziona'}
      aria-pressed={selected}
      style={{
        width: 26, height: 26, borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: selected ? C.green : 'transparent',
        border: `2px solid ${selected ? C.green : C.border}`,
        transition: 'background 0.12s, border-color 0.12s',
      }}
    >
      {selected && <Check size={14} color="#FFF" strokeWidth={3} />}
    </button>
  );
}
