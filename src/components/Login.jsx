import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, LogIn, AlertCircle } from 'lucide-react';
import pb from '../lib/pocketbase';

const S = {
  page: {
    minHeight: '100vh',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
    background: '#F5F0E8',
    fontFamily: "'DM Sans', sans-serif",
    boxSizing: 'border-box',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    background: '#FEFCF7',
    border: '1px solid #DDD5C2',
    borderRadius: 16,
    padding: '2.5rem',
    boxSizing: 'border-box',
  },
  brandWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  iconBox: {
    width: 48,
    height: 48,
    background: '#2C3E2D',
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  title: {
    fontFamily: 'Lora, serif',
    fontSize: 24,
    fontWeight: 500,
    color: '#1C2B1D',
    margin: 0,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#7A7060',
    textAlign: 'center',
    lineHeight: 1.6,
    margin: '0 0 28px',
  },
  fieldWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: 500,
    color: '#7A7060',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
  },
  input: {
    width: '100%',
    background: '#F5F0E8',
    border: '1px solid #DDD5C2',
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 14,
    color: '#1C2B1D',
    fontFamily: "'DM Sans', sans-serif",
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s, background 0.15s',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: '#F7EDE6',
    border: '1px solid #E8C8B8',
    color: '#8A3A1A',
    fontSize: 13,
    borderRadius: 8,
    padding: '10px 14px',
    marginBottom: 16,
  },
  button: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    background: '#2C3E2D',
    color: '#D4E8D0',
    border: 'none',
    borderRadius: 8,
    padding: '12px',
    fontSize: 14,
    fontWeight: 500,
    fontFamily: "'DM Sans', sans-serif",
    cursor: 'pointer',
    marginTop: 8,
    transition: 'background 0.15s',
  },
  divider: {
    border: 'none',
    borderTop: '1px solid #DDD5C2',
    margin: '24px 0',
  },
  note: {
    fontSize: 12,
    color: '#9A9080',
    textAlign: 'center',
    margin: 0,
  },
  spinner: {
    width: 16,
    height: 16,
    border: '2px solid rgba(212,232,208,0.3)',
    borderTopColor: '#D4E8D0',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
    flexShrink: 0,
  },
};

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await pb.collection('users').authWithPassword(email, password);
      navigate('/');
    } catch {
      setError('Credenziali non valide. Riprova.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;500&family=DM+Sans:wght@300;400;500&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div style={S.page}>
        <div style={S.card}>

          <div style={S.brandWrap}>
            <div style={S.iconBox}>
              <BookOpen size={20} color="#A8C5A0" />
            </div>
            <h1 style={S.title}>Portale Docenti</h1>
          </div>

          <p style={S.subtitle}>
            Accedi con le tue credenziali istituzionali per gestire le domande d'esame.
          </p>

          <form onSubmit={handleSubmit}>
            <div style={S.fieldWrap}>
              <label style={S.label}>Email istituzionale</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="nome.cognome@univ.it"
                style={S.input}
                onFocus={e => { e.target.style.borderColor = '#5C7A5E'; e.target.style.background = '#FEFCF7'; }}
                onBlur={e => { e.target.style.borderColor = '#DDD5C2'; e.target.style.background = '#F5F0E8'; }}
              />
            </div>

            <div style={S.fieldWrap}>
              <label style={S.label}>Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={S.input}
                onFocus={e => { e.target.style.borderColor = '#5C7A5E'; e.target.style.background = '#FEFCF7'; }}
                onBlur={e => { e.target.style.borderColor = '#DDD5C2'; e.target.style.background = '#F5F0E8'; }}
              />
            </div>

            {error && (
              <div style={S.errorBox}>
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{ ...S.button, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#3A5C3C'; }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#2C3E2D'; }}
            >
              {loading ? <span style={S.spinner} /> : <LogIn size={15} />}
              {loading ? 'Accesso in corso…' : 'Accedi'}
            </button>
          </form>

          <hr style={S.divider} />
          <p style={S.note}>Accesso riservato al personale docente</p>
        </div>
      </div>
    </>
  );
}
