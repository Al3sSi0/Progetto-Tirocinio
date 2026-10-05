import { useState } from 'react';
import { X, FileText, FileCode, File, AlignLeft, Download, Check, Minus, Plus, Shuffle, Info, FileArchive } from 'lucide-react';
import { C, font, serif } from '../../styles/theme';
import { exportTest, plannedFiles, versionLabel, PLATFORM_FORMATS, MAX_VERSIONS } from '../../lib/exportTest';
import { questionType } from '../../lib/questionTypes';
import Spinner from '../common/Spinner';
import { useEscape } from '../../lib/useEscape';
import { shouldAskFeedback } from '../../lib/sus';
import SusSurveyModal from './SusSurveyModal';

const FORMATS = {
  word:   { label: 'Word',       ext: '.docx', description: 'Modificabile prima di stampare', Icon: FileText,  color: '#2B579A' },
  pdf:    { label: 'PDF',        ext: '.pdf',  description: 'Pronto da stampare',             Icon: File,      color: '#C0392B' },
  moodle: { label: 'Moodle XML', ext: '.xml',  description: 'Tutti i tipi di domanda',        Icon: FileCode,  color: '#E87722' },
  aiken:  { label: 'Aiken',      ext: '.txt',  description: 'Solo domande a scelta',          Icon: AlignLeft, color: '#27AE60' },
};

const GROUPS = [
  { title: '', formats: ['word', 'pdf', 'aiken'] },
  { title: 'Da importare in Moodle', formats: ['moodle'] },
];

const NUMBER_WORDS = ['', 'una', 'due', 'tre', 'quattro', 'cinque', 'sei', 'sette', 'otto', 'nove', 'dieci'];

const sectionTitle = { fontSize: 11, fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase', color: C.textFaint, margin: '0 0 8px' };

function FormatCard({ id, selected, disabled, onSelect }) {
  const { label, ext, description, Icon, color } = FORMATS[id];
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={() => onSelect(id)}
      disabled={disabled}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 8, padding: '11px 12px', width: '100%',
        background: selected ? C.expandBg : C.surface,
        border: `1.5px solid ${selected ? C.green : C.border}`,
        borderRadius: 10, cursor: disabled ? 'not-allowed' : 'pointer', textAlign: 'left', fontFamily: font,
        transition: 'border-color 0.15s, background 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: color + '1A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} color={color} />
        </div>
        <div style={{
          width: 18, height: 18, borderRadius: '50%',
          border: `1.5px solid ${selected ? C.green : C.dot}`, background: selected ? C.green : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {selected && <Check size={11} color="#FFF" strokeWidth={3} />}
        </div>
      </div>
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: C.text }}>
          {label} <span style={{ fontWeight: 400, color: C.textFaint, fontSize: 12 }}>{ext}</span>
        </div>
        <div style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.35 }}>{description}</div>
      </div>
    </button>
  );
}

function CheckRow({ checked, onChange, disabled, label, hint }) {
  return (
    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 9, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={e => onChange(e.target.checked)}
        style={{ marginTop: 2, accentColor: C.green, width: 15, height: 15, flexShrink: 0 }}
      />
      <span>
        <span style={{ fontSize: 13.5, color: C.text }}>{label}</span>
        {hint && <span style={{ display: 'block', fontSize: 12.5, color: C.textMuted, lineHeight: 1.4 }}>{hint}</span>}
      </span>
    </label>
  );
}

function Stepper({ value, min, max, onChange, disabled }) {
  const btn = off => ({
    width: 30, height: 30, border: 'none', background: 'transparent', color: off ? C.dot : C.text,
    cursor: off ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  });
  const atMin = disabled || value <= min;
  const atMax = disabled || value >= max;
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', border: `1px solid ${C.border}`, borderRadius: 8, background: C.surface }}>
      <button type="button" onClick={() => onChange(value - 1)} disabled={atMin} style={btn(atMin)} aria-label="Una fila in meno"><Minus size={14} /></button>
      <span style={{ minWidth: 28, textAlign: 'center', fontSize: 14, fontWeight: 600, color: C.text }}>{value}</span>
      <button type="button" onClick={() => onChange(value + 1)} disabled={atMax} style={btn(atMax)} aria-label="Una fila in più"><Plus size={14} /></button>
    </div>
  );
}

function KeyFormatSwitch({ value, onChange, disabled }) {
  return (
    <div role="radiogroup" aria-label="Formato delle correzioni" style={{ display: 'inline-flex', border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden', background: C.surface }}>
      {['pdf', 'word'].map(id => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={value === id}
          onClick={() => onChange(id)}
          disabled={disabled}
          style={{
            padding: '5px 12px', border: 'none', fontSize: 12.5, fontFamily: font, cursor: disabled ? 'not-allowed' : 'pointer',
            background: value === id ? C.green : 'transparent', color: value === id ? '#FFF' : C.textBody, fontWeight: value === id ? 600 : 400,
          }}
        >
          {FORMATS[id].label}
        </button>
      ))}
    </div>
  );
}

function Notice({ tone = 'info', children }) {
  const s = tone === 'warning'
    ? { background: C.warning.bg, border: `1px solid ${C.warning.border}`, color: C.warning.text }
    : { background: C.expandBg, border: `1px solid ${C.borderLight}`, color: C.textBody };
  return (
    <div style={{ ...s, display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12.5, lineHeight: 1.45, borderRadius: 8, padding: '8px 11px' }}>
      <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
      <div>{children}</div>
    </div>
  );
}

export default function ExportTestModal({ test, onClose }) {
  const [format, setFormat] = useState('pdf');
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleAnswers, setShuffleAnswers] = useState(false);
  const [versions, setVersions] = useState(1);
  const [answerKey, setAnswerKey] = useState(false);
  const [keyFormat, setKeyFormat] = useState('pdf'); // formato delle correzioni per Moodle XML / Aiken
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [survey, setSurvey] = useState(null); // { format } → questionario di feedback dopo un'esportazione riuscita
  useEscape(onClose, exporting);

  const questions = test.expand?.questions
    ? (Array.isArray(test.expand.questions) ? test.expand.questions : [test.expand.questions])
    : [];

  const isPlatform = PLATFORM_FORMATS.includes(format);
  const settings = isPlatform ? { answerKey, keyFormat } : { versions, shuffleQuestions, shuffleAnswers, answerKey, keyFormat };
  const plan = plannedFiles(test, format, settings);

  // Aiken non supporta le domande aperte: vengono escluse dal file.
  const openCount = questions.filter(q => questionType(q) === 'open').length;
  const multipleCount = questions.filter(q => questionType(q) === 'multiple').length;
  const identicalVersions = versions > 1 && !shuffleQuestions && !(shuffleAnswers && multipleCount > 0);

  async function handleExport() {
    setExporting(true);
    setError('');
    try {
      await exportTest(test, questions, format, settings);
      if (await shouldAskFeedback()) setSurvey({ format });
    } catch (e) {
      setError("Errore durante l'esportazione: " + e.message);
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div
        style={{ position: 'fixed', inset: 0, background: C.overlay, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}
        onClick={() => { if (!exporting) onClose(); }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="export-title"
          style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, maxWidth: 560, width: '92%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 32px rgba(0,0,0,0.14)', fontFamily: font }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '22px 26px 16px', borderBottom: `1px solid ${C.borderLight}` }}>
            <div style={{ minWidth: 0 }}>
              <h2 id="export-title" style={{ fontFamily: serif, fontSize: 18, fontWeight: 500, color: C.text, margin: '0 0 4px' }}>
                Esporta test
              </h2>
              <p style={{ fontSize: 13, color: C.textMuted, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {test.description || '—'} · {questions.length} {questions.length === 1 ? 'domanda' : 'domande'}
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={exporting}
              style={{ background: 'none', border: 'none', cursor: exporting ? 'not-allowed' : 'pointer', color: C.textFaint, padding: 4, borderRadius: 4, display: 'flex', flexShrink: 0, marginLeft: 12, opacity: exporting ? 0.4 : 1 }}
              aria-label="Chiudi">
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: '18px 26px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* 1. Formato */}
            <div role="radiogroup" aria-label="Formato">
              <p style={sectionTitle}>Formato</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {GROUPS.map(g => (
                  <div key={g.formats.join()}>
                    {g.title && <div style={{ fontSize: 12.5, color: C.textMuted, marginBottom: 6 }}>{g.title}</div>}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
                      {g.formats.map(id => (
                        <FormatCard key={id} id={id} selected={format === id} disabled={exporting} onSelect={setFormat} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Opzioni */}
            {isPlatform ? (
              <div>
                <p style={sectionTitle}>Opzioni</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Notice>
                    Non serve mescolare qui: Moodle mescola domande e risposte da solo, in modo diverso per ogni studente.
                    Attiva <strong>Mescola le domande</strong> nelle impostazioni del quiz dopo averle importate.
                  </Notice>
                  <div style={{ border: `1px solid ${C.borderLight}`, borderRadius: 10, background: C.expandBg, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <CheckRow
                      checked={answerKey}
                      onChange={setAnswerKey}
                      disabled={exporting}
                      label="Aggiungi le correzioni"
                      hint="Un file a parte con ogni domanda e la sua risposta corretta, da tenere per te: il file per Moodle resta invariato."
                    />
                    {answerKey && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 24 }}>
                        <span style={{ fontSize: 12.5, color: C.textMuted }}>Formato delle correzioni</span>
                        <KeyFormatSwitch value={keyFormat} onChange={setKeyFormat} disabled={exporting} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <p style={sectionTitle}>Opzioni aggiuntive</p>
                {format === 'aiken' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
                    {openCount > 0 && (
                      <Notice tone="warning">
                        {openCount === 1 ? '1 domanda aperta verrà esclusa' : `${openCount} domande aperte verranno escluse`}: Aiken non le supporta. Usa Moodle XML per includerle.
                      </Notice>
                    )}
                    <Notice>
                      Se in Moodle è attivo <strong>Mescola le scelte</strong>, all'importazione le risposte verranno rimescolate comunque.
                    </Notice>
                  </div>
                )}
                <div style={{ border: `1px solid ${C.borderLight}`, borderRadius: 10, background: C.expandBg }}>
                  {/* Mescola */}
                  <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, fontWeight: 600, color: C.text }}>
                      <Shuffle size={14} color={C.textMuted} /> Mescola
                    </div>
                    <CheckRow checked={shuffleQuestions} onChange={setShuffleQuestions} disabled={exporting} label="Ordine delle domande" />
                    <CheckRow
                      checked={shuffleAnswers}
                      onChange={setShuffleAnswers}
                      disabled={exporting}
                      label="Ordine delle risposte"
                      hint="Solo per le domande a risposta multipla: le Vero/Falso restano Vero – Falso."
                    />
                  </div>

                  {/* File */}
                  <div style={{ padding: '12px 14px', borderTop: `1px solid ${C.borderLight}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: C.text }}>Divisione in file</div>
                        <div style={{ fontSize: 12.5, color: C.textMuted }}>
                          {versions === 1 ? 'Test in una sola fila' : `Test diviso in ${NUMBER_WORDS[versions] || versions} file: ${Array.from({ length: versions }, (_, i) => versionLabel(i)).join(' · ')}`}
                        </div>
                      </div>
                      <Stepper value={versions} min={1} max={MAX_VERSIONS} onChange={setVersions} disabled={exporting} />
                    </div>
                    {identicalVersions && (
                      <Notice tone="warning">
                        Senza mescolare, le {versions} file saranno identiche. Scegli cosa mescolare qui sopra.
                      </Notice>
                    )}
                  </div>

                  {/* Correzioni */}
                  <div style={{ padding: '12px 14px', borderTop: `1px solid ${C.borderLight}` }}>
                    <CheckRow
                      checked={answerKey}
                      onChange={setAnswerKey}
                      disabled={exporting}
                      label="Aggiungi le correzioni"
                      hint={versions > 1 ? 'Un documento con le risposte corrette di ogni fila, per correggere più in fretta.' : 'Un documento separato con le risposte corrette.'}
                    />
                    {answerKey && format === 'aiken' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 24, marginTop: 10 }}>
                        <span style={{ fontSize: 12.5, color: C.textMuted }}>Formato delle correzioni</span>
                        <KeyFormatSwitch value={keyFormat} onChange={setKeyFormat} disabled={exporting} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div style={{ background: C.error.bg, border: `1px solid ${C.error.border}`, color: C.error.text, fontSize: 13, borderRadius: 8, padding: '10px 14px' }}>
                {error}
              </div>
            )}
          </div>

          {/* Footer: riepilogo file + azioni */}
          <div style={{ padding: '14px 26px 18px', borderTop: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 220px', minWidth: 0, fontSize: 12.5, color: C.textMuted, lineHeight: 1.45 }}>
              {plan.zip ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: C.textBody }}>
                    <FileArchive size={13} /> <strong style={{ fontWeight: 600 }}>{plan.zip}</strong>
                  </div>
                  <div title={plan.files.join('\n')} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {plan.files.length} file: {plan.files.join(', ')}
                  </div>
                </>
              ) : (
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  Scaricherai <strong style={{ fontWeight: 600, color: C.textBody }}>{plan.files[0]}</strong>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
              <button
                type="button"
                onClick={onClose}
                disabled={exporting}
                style={{ padding: '9px 16px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: C.textBody, fontSize: 13.5, fontFamily: font, cursor: exporting ? 'not-allowed' : 'pointer' }}
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleExport}
                disabled={exporting || questions.length === 0}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 8, border: 'none', background: C.green, color: '#FFF', fontSize: 13.5, fontWeight: 600, fontFamily: font, cursor: exporting || questions.length === 0 ? 'not-allowed' : 'pointer', opacity: questions.length === 0 ? 0.5 : 1 }}
              >
                {exporting ? <Spinner size={14} color="#FFF" trackColor="rgba(255,255,255,0.3)" /> : <Download size={15} />}
                {exporting ? 'Esportazione…' : 'Esporta'}
              </button>
            </div>
          </div>
        </div>
      </div>
      {survey && (
        <SusSurveyModal testId={test.id} exportFormat={survey.format} onClose={() => setSurvey(null)} />
      )}
    </>
  );
}
