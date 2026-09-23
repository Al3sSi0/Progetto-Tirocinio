import { C, font } from '../../styles/theme';

// Stato vuoto unico per tutte le tabelle/liste dell'app (lista vuota o nessun risultato filtro).
export default function EmptyState({ icon: Icon, message, actionLabel, onAction }) {
  return (
    <div style={{ padding: '2.75rem 1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      {Icon && (
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: C.expandBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textFaint }}>
          <Icon size={18} />
        </div>
      )}
      <p style={{ fontSize: 13, color: C.textFaint, margin: 0 }}>{message}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          style={{ marginTop: 2, padding: '6px 14px', background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, cursor: 'pointer', color: C.greenLight, fontFamily: font, fontSize: 12.5, fontWeight: 500 }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
