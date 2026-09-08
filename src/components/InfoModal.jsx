import { useState } from 'react';
import { X } from 'lucide-react';
import { C, font } from '../styles/theme';

const TABS = ['Domande', 'Documenti', 'Test'];

const CONTENT = {
  Domande: {
    intro: 'La schermata Domande è la tua banca domande personale. I dati sono organizzati su tre livelli: materia → argomento → domanda.',
    items: [
      'Clicca su una materia o un argomento per espanderlo.',
      'Clicca su una domanda per vedere testo completo, opzioni e risposta corretta.',
      '+ Aggiungi per creare una nuova domanda — scegli tra inserimento manuale o generazione automatica da un documento caricato.',
      'Il menu ⋯ su ogni domanda permette di modificarla, eliminarla o classificarla con la Tassonomia di Bloom.',
      'La classificazione Bloom è automatica: tre modelli AI votano in parallelo e il livello vincitore viene salvato.',
      'Usa la casella di ricerca per filtrare per materia, argomento, testo o livello Bloom.',
      'Seleziona più domande con le checkbox per eliminarle in blocco.',
    ],
  },
  Documenti: {
    intro: 'Carica i tuoi materiali didattici. Il testo viene estratto automaticamente e usato per generare domande con l\'AI.',
    items: [
      'Trascina un file nell\'area di upload oppure clicca "sfoglia" — formati supportati: PDF, DOCX, TXT.',
      'I PDF scansionati vengono elaborati con OCR automatico (può richiedere qualche secondo).',
      'Il titolo viene pre-compilato dal nome del file; puoi modificarlo prima di salvare.',
      'Clicca sul titolo di un documento per aprirlo direttamente.',
      'Il menu ⋯ permette di eliminare il documento.',
      'I documenti caricati diventano disponibili nella schermata Domande per la generazione AI.',
    ],
  },
  Test: {
    intro: 'Componi test a partire dalle tue domande e scaricali nel formato che preferisci.',
    items: [
      '+ Nuovo test per creare un test: assegnagli un nome, materia e argomento.',
      'Aggiungi domande in tre modi: manualmente una per una, generandole da un documento con l\'AI, oppure pescando dalla banca domande esistente.',
      'Trascina le righe per riordinare le domande nel test.',
      'Clicca su un test per vedere le domande che contiene.',
      'Il menu ⋯ permette di modificare, esportare o eliminare il test.',
      'Formati di esportazione disponibili: Word e PDF (senza risposta corretta, per gli studenti), Moodle XML e Aiken (con risposta corretta, per importare in Moodle).',
    ],
  },
};

export default function InfoModal({ onClose }) {
  const [activeTab, setActiveTab] = useState('Domande');
  const { intro, items } = CONTENT[activeTab];

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
      onClick={onClose}
    >
      <div
        style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, width: `min(640px, 92vw)`, maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 32px rgba(0,0,0,0.14)', fontFamily: font }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: C.text }}>Come funziona il portale</h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, display: 'flex', alignItems: 'center', padding: 4, borderRadius: 6 }}
            onMouseEnter={e => e.currentTarget.style.color = C.text}
            onMouseLeave={e => e.currentTarget.style.color = C.textMuted}
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 6, padding: '12px 24px 0', flexShrink: 0 }}>
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '5px 14px',
                background: activeTab === tab ? C.green : 'transparent',
                color: activeTab === tab ? '#fff' : C.textMuted,
                border: activeTab === tab ? 'none' : `1px solid ${C.border}`,
                borderRadius: 6,
                cursor: 'pointer',
                fontFamily: font,
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', padding: '20px 24px 28px', flex: 1 }}>
          <p style={{ margin: '0 0 16px', fontSize: 13.5, color: C.textBody, lineHeight: 1.65 }}>{intro}</p>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {items.map((item, i) => (
              <li key={i} style={{ display: 'flex', gap: 10, fontSize: 13.5, color: C.textBody, lineHeight: 1.6 }}>
                <span style={{ color: C.greenAccent, flexShrink: 0, marginTop: 2, fontSize: 16, lineHeight: 1 }}>·</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
