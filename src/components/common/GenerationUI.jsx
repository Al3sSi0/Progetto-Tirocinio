import { RefreshCw, Copy, ArrowRightLeft } from 'lucide-react';
import { C, font } from '../../styles/theme';

// Barra di avanzamento generica (generazione a blocchi, salvataggio a lotti, classificazione di gruppo).
export function ProgressBar({ done, total, label }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: C.textMuted }}>
        <span>{label}</span>
        <span>{done}/{total}</span>
      </div>
      <div style={{ height: 6, borderRadius: 4, background: C.borderLight, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: C.green, borderRadius: 4, transition: 'width 0.3s' }} />
      </div>
    </div>
  );
}

// Avviso dopo una generazione parziale: parti del documento senza risposta (con "Riprova") o documento troppo breve.
export function GenerationNotice({ failedCount, requested, capped, asked, got, onRetry, retrying }) {
  const short = !failedCount && !capped && got < asked;
  if (!failedCount && !capped && !short) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', background: C.warning.bg, border: `1px solid ${C.warning.border}`, color: C.warning.text, fontSize: 13, borderRadius: 8, padding: '10px 14px' }}>
      <span style={{ flex: 1, minWidth: 200 }}>
        {failedCount > 0 && <>{failedCount} {failedCount === 1 ? 'parte' : 'parti'} del documento su {requested} senza risposta valida (modelli occupati o risposta fuori formato). </>}
        {capped && <>Il documento è breve: generate meno domande di quelle richieste.</>}
        {short && <>Generate {got} domande su {asked} richieste: il modello ne ha prodotte meno del previsto.</>}
      </span>
      {failedCount > 0 && (
        <button
          onClick={onRetry}
          disabled={retrying}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: C.surface, border: `1px solid ${C.warning.border}`, borderRadius: 8, color: C.warning.text, fontFamily: font, fontSize: 13.5, fontWeight: 600, cursor: retrying ? 'not-allowed' : 'pointer', opacity: retrying ? 0.6 : 1 }}
        >
          <RefreshCw size={13} /> {retrying ? 'Nuovo tentativo…' : 'Riprova le parti mancanti'}
        </button>
      )}
    </div>
  );
}

// Intestazione della lista domande generate: conteggio + seleziona/deseleziona tutte.
export function GeneratedListHeader({ total, selected, onSelectAll, onSelectNone, disabled }) {
  const linkBtn = {
    background: 'none', border: 'none', padding: 0, fontFamily: font, fontSize: 13.5, fontWeight: 500,
    color: C.greenLight, cursor: disabled ? 'not-allowed' : 'pointer', textDecoration: 'underline', opacity: disabled ? 0.5 : 1,
  };
  return (
    <div style={{ position: 'sticky', top: -20, zIndex: 5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', padding: '8px 12px', background: C.headerBg, border: `1px solid ${C.borderLight}`, borderRadius: 8 }}>
      <span style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>
        {total} {total === 1 ? 'domanda generata' : 'domande generate'} · <span style={{ color: C.greenLight }}>{selected} {selected === 1 ? 'selezionata' : 'selezionate'}</span>
      </span>
      <span style={{ display: 'flex', gap: 14 }}>
        <button type="button" onClick={onSelectAll} disabled={disabled || selected === total} style={linkBtn}>Seleziona tutte</button>
        <button type="button" onClick={onSelectNone} disabled={disabled || selected === 0} style={linkBtn}>Deseleziona tutte</button>
      </span>
    </div>
  );
}

// Avviso sopra la lista: quante domande generate sembrano già presenti (e sono state deselezionate).
export function DuplicatesNotice({ count }) {
  if (!count) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: C.warning.bg, border: `1px solid ${C.warning.border}`, color: C.warning.text, fontSize: 13.5, borderRadius: 8, padding: '10px 14px', lineHeight: 1.5 }}>
      <Copy size={16} style={{ flexShrink: 0, marginTop: 2 }} />
      <span>
        {count === 1 ? '1 domanda sembra' : `${count} domande sembrano`} già presenti nel test o nel tuo archivio:
        {count === 1 ? ' l\'abbiamo deselezionata' : ' le abbiamo deselezionate'}. Puoi comunque riselezionarle.
      </span>
    </div>
  );
}

// Etichetta su una domanda generata doppia: mostra la domanda esistente e, se è in archivio, permette di usarla al suo posto.
export function DuplicateBadge({ dup, onUseExisting, disabled }) {
  if (!dup) return null;
  const inTest = dup.kind === 'test';
  const label = inTest
    ? (dup.exact ? 'Già nel test' : 'Simile a una già nel test')
    : (dup.exact ? 'Già nel tuo archivio' : 'Simile a una nel tuo archivio');
  return (
    <div onClick={e => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10, padding: '10px 12px', background: C.warning.bg, border: `1px solid ${C.warning.border}`, borderRadius: 8, cursor: 'default' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: C.warning.text }}>
          <Copy size={14} /> {label}
        </span>
        {!inTest && onUseExisting && (
          <button
            type="button"
            onClick={onUseExisting}
            disabled={disabled}
            title="Aggiunge al test la domanda che hai già, senza crearne una copia"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: C.surface, border: `1px solid ${C.warning.border}`, borderRadius: 8, color: C.warning.text, fontFamily: font, fontSize: 13, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1 }}
          >
            <ArrowRightLeft size={14} /> Usa quella dell'archivio
          </button>
        )}
      </div>
      <div style={{ fontSize: 13, color: C.textBody, lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        <span style={{ color: C.textFaint }}>{inTest ? 'Nel test: ' : "Nell'archivio: "}</span>«{dup.match.content}»
      </div>
    </div>
  );
}
