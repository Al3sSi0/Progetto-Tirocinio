import { Search, Plus } from 'lucide-react';
import { C, font } from '../../styles/theme';

// Barra superiore delle pagine elenco: ricerca + pulsante primario di creazione.
export default function ListToolbar({ search, onSearch, placeholder, addLabel, onAdd }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', flex: 1, minWidth: 220, maxWidth: 380 }}>
        <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.textFaint }} />
        <input
          value={search}
          onChange={e => onSearch(e.target.value)}
          placeholder={placeholder}
          style={{ width: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px 10px 36px', fontSize: 14, color: C.text, fontFamily: font, outline: 'none', boxSizing: 'border-box' }}
          onFocus={e => e.target.style.borderColor = C.focusBorder}
          onBlur={e => e.target.style.borderColor = C.border}
        />
      </div>
      <button
        onClick={onAdd}
        style={{ display: 'flex', alignItems: 'center', gap: 8, height: 42, padding: '0 20px', background: C.green, border: 'none', borderRadius: 10, cursor: 'pointer', color: '#FFF', fontFamily: font, fontSize: 14.5, fontWeight: 500, whiteSpace: 'nowrap' }}
      >
        <Plus size={16} /> {addLabel}
      </button>
    </div>
  );
}

// Barra "Seleziona tutti" + conteggio + azioni bulk (children), mostrate solo con selezione attiva.
export function SelectionBar({ allSelected, onToggleAll, allLabel, selectedCount, selectedLabel, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: C.textMuted, cursor: 'pointer' }}>
        <input type="checkbox" checked={allSelected} onChange={onToggleAll} style={{ width: 17, height: 17, accentColor: C.green, cursor: 'pointer' }} />
        {allLabel}
      </label>
      {selectedCount > 0 && (
        <>
          <span style={{ fontSize: 13, color: C.greenLight, fontWeight: 500 }}>{selectedCount} {selectedLabel}</span>
          {children}
        </>
      )}
    </div>
  );
}

// Pulsante bulk "Elimina" (stile distruttivo) per la SelectionBar.
export function BulkDeleteBtn({ icon: Icon, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: C.error.bg, border: `1px solid ${C.error.border}`, borderRadius: 8, cursor: 'pointer', color: C.error.text, fontFamily: font, fontSize: 13, fontWeight: 500 }}
    >
      <Icon size={14} /> Elimina
    </button>
  );
}
