import { C } from '../../styles/theme';

// Richiede @keyframes spin definito globalmente (già presente in ogni pagina).
export default function Spinner({ size = 16, color, trackColor, style }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        border: `2px solid ${trackColor || C.border}`,
        borderTopColor: color || C.focusBorder,
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
        flexShrink: 0,
        ...style,
      }}
    />
  );
}
