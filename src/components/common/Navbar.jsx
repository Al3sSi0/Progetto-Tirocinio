import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BookOpen, FileText, ClipboardList, LogOut, HelpCircle } from 'lucide-react';
import pb from '../../lib/pocketbase';
import { C, font, serif } from '../../styles/theme';
import InfoModal from '../InfoModal';
import WelcomeOverlay from './WelcomeOverlay';

const TABS = [
  { path: '/',          label: 'Domande',   Icon: BookOpen },
  { path: '/documents', label: 'Documenti', Icon: FileText },
  { path: '/tests',     label: 'Test',      Icon: ClipboardList },
];

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showInfo, setShowInfo] = useState(false);
  const [showWelcome, setShowWelcome] = useState(() => {
    try { return sessionStorage.getItem('showWelcome') === '1'; } catch { return false; }
  });
  const user = pb.authStore.model;

  function closeWelcome() {
    try { sessionStorage.removeItem('showWelcome'); } catch { /* ignore */ }
    setShowWelcome(false);
  }

  function handleLogout() { pb.authStore.clear(); navigate('/login'); }

  const iconBtn = {
    display: 'flex', alignItems: 'center', gap: 8, height: 40, padding: '0 16px',
    background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 10,
    color: C.textMuted, cursor: 'pointer', fontFamily: font, fontSize: 14, fontWeight: 500,
  };

  return (
    <>
      <header style={{ position: 'sticky', top: 0, zIndex: 10, background: C.surface, borderBottom: `1px solid ${C.border}`, height: 68, padding: '0 1.5rem', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, background: C.green, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen size={17} color={C.greenAccent} />
          </div>
          <span style={{ fontFamily: serif, fontSize: 18, color: C.text, fontWeight: 500 }}>Portale Docenti</span>
        </div>

        <nav style={{ display: 'flex', gap: 8 }}>
          {TABS.map(({ path, label, Icon }) => {
            const active = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  height: 42, minWidth: 130, padding: '0 20px',
                  background: active ? C.green : 'transparent',
                  color: active ? '#FFF' : C.textMuted,
                  border: active ? '1px solid transparent' : `1px solid ${C.border}`,
                  borderRadius: 10, cursor: 'pointer', fontFamily: font, fontSize: 14.5, fontWeight: 500,
                  transition: 'background 0.15s, color 0.15s',
                }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = C.expandBg; e.currentTarget.style.color = C.text; } }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.textMuted; } }}
              >
                <Icon size={17} /> {label}
              </button>
            );
          })}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={() => setShowInfo(true)} style={{ ...iconBtn, padding: '0 12px' }} title="Guida"
            onMouseEnter={e => e.currentTarget.style.color = C.text}
            onMouseLeave={e => e.currentTarget.style.color = C.textMuted}>
            <HelpCircle size={17} />
          </button>
          <span style={{ fontSize: 13, color: C.textMuted, maxWidth: 190, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</span>
          <button onClick={handleLogout} style={iconBtn}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.error.text; e.currentTarget.style.color = C.error.text; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMuted; }}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>

      {showInfo && <InfoModal onClose={() => setShowInfo(false)} />}
      {showWelcome && <WelcomeOverlay onClose={closeWelcome} />}
    </>
  );
}
