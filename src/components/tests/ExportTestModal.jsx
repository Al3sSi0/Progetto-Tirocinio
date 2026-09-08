import { useState } from 'react';
import { X, FileText, FileCode, File, AlignLeft, Download } from 'lucide-react';
import { C, font, serif } from '../../styles/theme';
import { exportMoodleXml, exportWord, exportPdf, exportAiken } from '../../lib/exportTest';

const FORMATS = [
  {
    id: 'word',
    label: 'Word',
    ext: '.docx',
    description: 'Documento Word con domande e opzioni',
    Icon: FileText,
    color: '#2B579A',
    available: true,
  },
  {
    id: 'moodle',
    label: 'Moodle XML',
    ext: '.xml',
    description: 'Formato XML importabile in Moodle',
    Icon: FileCode,
    color: '#E87722',
    available: true,
  },
  {
    id: 'pdf',
    label: 'PDF',
    ext: '.pdf',
    description: 'Documento PDF stampabile (senza risposta corretta)',
    Icon: File,
    color: '#C0392B',
    available: true,
  },
  {
    id: 'aiken',
    label: 'Aiken',
    ext: '.txt',
    description: 'Formato testo semplice importabile in Moodle',
    Icon: AlignLeft,
    color: '#27AE60',
    available: true,
  },
];

export default function ExportTestModal({ test, onClose }) {
  const [exporting, setExporting] = useState(null);
  const [error, setError] = useState('');

  const questions = test.expand?.questions
    ? (Array.isArray(test.expand.questions) ? test.expand.questions : [test.expand.questions])
    : [];

  async function handleExport(format) {
    setExporting(format.id);
    setError('');
    try {
      if (format.id === 'moodle') exportMoodleXml(test, questions);
      else if (format.id === 'word') await exportWord(test, questions);
      else if (format.id === 'pdf') await exportPdf(test, questions);
      else if (format.id === 'aiken') exportAiken(test, questions);
    } catch (e) {
      setError("Errore durante l'esportazione: " + e.message);
    } finally {
      setExporting(null);
    }
  }

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(28,43,29,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}
        onClick={onClose}
      >
        <div
          style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '28px 32px', maxWidth: 480, width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.14)', fontFamily: font }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22 }}>
            <div>
              <h2 style={{ fontFamily: serif, fontSize: 18, fontWeight: 500, color: C.text, margin: '0 0 4px' }}>
                Esporta test
              </h2>
              <p style={{ fontSize: 13, color: C.textMuted, margin: 0, maxWidth: 340, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {test.description || '—'}
              </p>
            </div>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textFaint, padding: 4, borderRadius: 4, display: 'flex', flexShrink: 0, marginLeft: 12 }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Error */}
          {error && (
            <div style={{ background: C.error.bg, border: `1px solid ${C.error.border}`, color: C.error.text, fontSize: 13, borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
              {error}
            </div>
          )}

          {/* Format grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {FORMATS.map(format => {
              const { Icon } = format;
              const isExporting = exporting === format.id;
              const isDisabled = !format.available || !!exporting;

              return (
                <button
                  key={format.id}
                  onClick={() => !isDisabled && handleExport(format)}
                  disabled={isDisabled}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10,
                    padding: 16,
                    background: format.available ? C.surface : C.headerBg,
                    border: `1px solid ${C.border}`,
                    borderRadius: 10,
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    opacity: !format.available ? 0.5 : exporting && !isExporting ? 0.65 : 1,
                    transition: 'border-color 0.15s, background 0.15s',
                    textAlign: 'left',
                    fontFamily: font,
                  }}
                  onMouseEnter={e => {
                    if (!isDisabled) {
                      e.currentTarget.style.borderColor = format.color;
                      e.currentTarget.style.background = C.expandBg;
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isDisabled) {
                      e.currentTarget.style.borderColor = C.border;
                      e.currentTarget.style.background = format.available ? C.surface : C.headerBg;
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: format.color + '1A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {isExporting
                        ? <span style={{ display: 'inline-block', width: 14, height: 14, border: `2px solid ${format.color}44`, borderTopColor: format.color, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                        : <Icon size={16} color={format.color} />
                      }
                    </div>
                    {!format.available && (
                      <span style={{ fontSize: 10, color: C.textFaint, background: C.headerBg, border: `1px solid ${C.borderLight}`, borderRadius: 10, padding: '2px 7px' }}>
                        Presto
                      </span>
                    )}
                    {format.available && !isExporting && (
                      <Download size={13} color={C.textFaint} />
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 2 }}>{format.label}</div>
                    <div style={{ fontSize: 11.5, color: C.textMuted, lineHeight: 1.4 }}>{format.description}</div>
                  </div>
                </button>
              );
            })}
          </div>

          <p style={{ fontSize: 11.5, color: C.textFaint, margin: '18px 0 0', textAlign: 'center' }}>
            {questions.length} {questions.length === 1 ? 'domanda' : 'domande'} nel test
          </p>
        </div>
      </div>
    </>
  );
}
