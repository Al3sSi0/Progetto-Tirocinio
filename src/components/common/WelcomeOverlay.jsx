import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, PenLine, BookOpen, X } from 'lucide-react';
import { C, font, serif } from '../../styles/theme';

const CHOICES = [
  {
    id: 'ai',
    Icon: Sparkles,
    title: 'Carica un documento',
    text: "Carichi le dispense e l'AI ti aiuta a creare le domande del test.",
    go: nav => nav('/documents', { state: { openUpload: true } }),
  },
  {
    id: 'manual',
    Icon: PenLine,
    title: 'Crea un test a mano',
    text: 'Componi il test scrivendo tu le domande, una alla volta.',
    go: nav => nav('/tests', { state: { openCreate: true } }),
  },
  {
    id: 'review',
    Icon: BookOpen,
    title: 'Rivedi le tue domande',
    text: 'Guarda, modifica e organizza le domande che hai già.',
    go: nav => nav('/'),
  },
];

export default function WelcomeOverlay({ onClose }) {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  function handleClose() {
    setVisible(false);
    setTimeout(onClose, 220);
  }

  function choose(c) {
    setVisible(false);
    setTimeout(() => c.go(navigate), 180);
  }

  return (
    <div
      onClick={handleClose}
      style={{ position: 'fixed', inset: 0, zIndex: 150, background: 'rgba(20,32,22,0.72)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: font, opacity: visible ? 1 : 0, transition: 'opacity 0.28s ease' }}
    >
      <div onClick={e => e.stopPropagation()} style={{ width: 'min(880px, 100%)', textAlign: 'center', position: 'relative', transform: visible ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.98)', transition: 'transform 0.28s ease' }}>
        <button
          onClick={handleClose}
          title="Chiudi"
          style={{ position: 'absolute', top: -8, right: -8, background: 'none', border: 'none', cursor: 'pointer', color: C.greenText, opacity: 0.8, padding: 8, display: 'flex' }}
        >
          <X size={22} />
        </button>

        <h1 style={{ fontFamily: serif, fontSize: 32, fontWeight: 500, color: '#FFF', margin: '0 0 8px' }}>Cosa vuoi fare oggi?</h1>
        <p style={{ fontSize: 15, color: C.greenText, margin: '0 0 32px', opacity: 0.9 }}>Scegli da dove partire. Potrai sempre cambiare sezione dalla barra in alto.</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 18 }}>
          {CHOICES.map(c => (
            <button
              key={c.id}
              onClick={() => choose(c)}
              style={{ background: C.surface, border: '2px solid transparent', borderRadius: 18, padding: '30px 22px', cursor: 'pointer', fontFamily: font, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, transition: 'transform 0.15s, border-color 0.15s, box-shadow 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = C.greenAccent; e.currentTarget.style.boxShadow = '0 12px 28px rgba(0,0,0,0.25)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div style={{ width: 62, height: 62, borderRadius: 16, background: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <c.Icon size={28} color={C.greenAccent} />
              </div>
              <span style={{ fontFamily: serif, fontSize: 19, fontWeight: 500, color: C.text }}>{c.title}</span>
              <span style={{ fontSize: 13.5, color: C.textMuted, lineHeight: 1.5 }}>{c.text}</span>
            </button>
          ))}
        </div>

        <button onClick={handleClose} style={{ marginTop: 28, background: 'none', border: 'none', color: C.greenText, opacity: 0.85, cursor: 'pointer', fontFamily: font, fontSize: 14, textDecoration: 'underline' }}>
          Salta, esplorerò da solo
        </button>
      </div>
    </div>
  );
}
