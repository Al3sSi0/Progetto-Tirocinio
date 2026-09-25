import { useEffect, useLayoutEffect, useRef } from 'react';

// Pila delle finestre aperte: Esc chiude solo quella in primo piano (l'ultima aperta).
const stack = [];

function onKeyDown(e) {
  if (e.key !== 'Escape' || !stack.length) return;
  e.preventDefault();
  stack[stack.length - 1].current?.();
}

/**
 * Chiude una modale/overlay con il tasto Esc.
 * @param {Function} onClose  - chiamata alla pressione di Esc
 * @param {boolean}  disabled - true durante operazioni in corso (salvataggio, generazione…): Esc viene ignorato
 */
export function useEscape(onClose, disabled = false) {
  const handler = useRef(null);
  useLayoutEffect(() => { handler.current = disabled ? null : onClose; });

  useEffect(() => {
    if (!stack.length) document.addEventListener('keydown', onKeyDown);
    stack.push(handler);
    return () => {
      stack.splice(stack.indexOf(handler), 1);
      if (!stack.length) document.removeEventListener('keydown', onKeyDown);
    };
  }, []);
}
