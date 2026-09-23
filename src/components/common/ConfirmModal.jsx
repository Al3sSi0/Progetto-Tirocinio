import { C, font, serif } from '../../styles/theme';
import Spinner from './Spinner';

// Modale di conferma generico (elimina/rimuovi), basato sul pattern già usato in Dashboard.
export default function ConfirmModal({
  icon: Icon,
  title,
  message,
  confirmLabel = 'Conferma',
  cancelLabel = 'Annulla',
  onConfirm,
  onCancel,
  loading = false,
  danger = true,
}) {
  const accent = danger ? C.error : { bg: C.expandBg, border: C.border, text: C.greenLight };
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: C.overlay, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
      onClick={() => { if (!loading) onCancel(); }}
    >
      <div
        style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '28px 32px', maxWidth: 420, width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', fontFamily: font }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          {Icon && (
            <div style={{ width: 36, height: 36, background: accent.bg, border: `1px solid ${accent.border}`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={16} color={accent.text} />
            </div>
          )}
          <h2 style={{ fontFamily: serif, fontSize: 17, fontWeight: 500, color: C.text, margin: 0 }}>{title}</h2>
        </div>
        <div style={{ fontSize: 14, color: C.textBody, lineHeight: 1.6, margin: '0 0 24px' }}>
          {message}
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            disabled={loading}
            style={{ padding: '8px 18px', background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer', color: C.textMuted, fontFamily: font, fontSize: 13, opacity: loading ? 0.5 : 1 }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', background: danger ? C.error.text : C.green, border: 'none', borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer', color: '#FFF', fontFamily: font, fontSize: 13, fontWeight: 500, opacity: loading ? 0.8 : 1 }}
          >
            {loading && <Spinner size={12} color="#FFF" trackColor="rgba(255,255,255,0.4)" />}
            {loading ? 'Attendere…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
