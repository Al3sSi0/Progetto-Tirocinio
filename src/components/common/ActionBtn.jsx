import { C, font } from '../../styles/theme';

// Pulsante azione secondaria nel footer delle card (Modifica, Elimina, …).
export default function ActionBtn({ icon: Icon, label, onClick, disabled, danger }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8,
        background: 'transparent', border: `1px solid ${danger ? C.error.border : C.border}`,
        color: danger ? C.error.text : C.textBody, fontFamily: font, fontSize: 13.5, fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.45 : 1,
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = danger ? C.error.bg : C.expandBg; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
    >
      <Icon size={15} /> {label}
    </button>
  );
}
