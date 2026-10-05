import { useState, useEffect, useMemo, useRef } from 'react';
import { C, inputStyle, labelStyle } from '../../styles/theme';

export default function SuggestInput({ label, value, onChange, suggestions, error }) {
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const wrapRef = useRef(null);

  const filtered = useMemo(() => {
    if (!value.trim()) return suggestions;
    const q = value.trim().toLowerCase();
    return suggestions.filter(s => s.toLowerCase().includes(q));
  }, [value, suggestions]);

  useEffect(() => {
    function onClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <label style={labelStyle}>{label}</label>
      {error && (
        <div style={{ fontSize: 13, color: C.error.text, background: C.error.bg, border: `1px solid ${C.error.border}`, borderRadius: 6, padding: '5px 10px', marginBottom: 6, animation: 'errorSlideIn 0.25s ease' }}>
          {error}
        </div>
      )}
      <input
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => { setOpen(true); setFocused(true); }}
        onBlur={() => setFocused(false)}
        style={{ ...inputStyle, border: `1px solid ${error ? C.error.border : focused ? C.focusBorder : C.border}` }}
        onMouseEnter={e => { if (!focused) e.target.style.borderColor = error ? C.error.border : C.focusBorder; }}
        onMouseLeave={e => { if (!focused) e.target.style.borderColor = error ? C.error.border : C.border; }}
      />
      {open && filtered.length > 0 && (
        <ul style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.10)', zIndex: 200, margin: '4px 0 0', padding: 0, listStyle: 'none', maxHeight: 180, overflowY: 'auto' }}>
          {filtered.map(s => (
            <li
              key={s}
              onMouseDown={e => { e.preventDefault(); onChange(s); setOpen(false); }}
              style={{ padding: '10px 14px', fontSize: 14, color: C.textBody, cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = C.expandBg}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
