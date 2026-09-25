import { useState } from 'react';
import { X } from 'lucide-react';
import { C, font, serif } from '../styles/theme';
import { useEscape } from '../lib/useEscape';

const TABS = ['Domande', 'Documenti', 'Test'];

const CONTENT = {
  Domande: {
    intro: "La sezione Domande è il tuo archivio personale di domande a risposta multipla, divise per materia e argomento.",
    items: [
      'Usa la colonna a sinistra per mostrare solo una materia o un argomento, e la casella di ricerca per trovare una domanda.',
      '"Nuova domanda" ti fa scrivere una domanda a mano oppure generarne molte da un documento caricato, con l\'AI.',
      'Le domande generate vengono controllate: quelle che sembrano già nel tuo archivio partono deselezionate.',
      'Su ogni domanda trovi Modifica ed Elimina. "Classifica con l\'AI" assegna il livello di Bloom: tre modelli votano e vince la maggioranza.',
      'Seleziona più domande per crearci subito un test, classificarle o eliminarle tutte insieme.',
    ],
  },
  Documenti: {
    intro: 'Qui carichi i tuoi materiali didattici: sono la base da cui l\'AI genera le domande.',
    items: [
      'Trascina i file in qualsiasi punto della pagina, oppure usa "Scegli dal computer". Puoi caricarne più di uno insieme.',
      'Formati accettati: PDF, TXT, DOC e DOCX. Il testo viene letto solo da PDF e TXT (anche PDF scansionati, con qualche secondo in più): da un file Word non si possono generare domande.',
      'Prima di caricare puoi correggere il nome di ogni file e indicare materia e argomento.',
      '"Genera domande" su un documento ti porta alla generazione con quel documento già scelto.',
      'Su ogni documento puoi aprire il file, modificare nome, materia e argomento, oppure eliminarlo.',
    ],
  },
  Test: {
    intro: 'Componi test a partire dalle tue domande e scaricali pronti per la stampa o per Moodle.',
    items: [
      'Clicca su un test (o su Modifica) per aprirlo; "Anteprima" mostra le domande senza aprirlo.',
      '"Nuovo test" apre la pagina di composizione: in alto dai nome, materia e argomento.',
      'Dal pannello "Aggiungi domande" scegli le domande dall\'archivio (anche tutte insieme), generale con l\'AI da un documento oppure scrivine una nuova.',
      'Trascina le domande per riordinarle; con la matita le modifichi, con il cestino le togli dal test (restano nell\'archivio).',
      'Ricordati di premere "Salva test" nella barra in basso: se esci prima, il portale ti chiede conferma.',
      'Esporta: Word e PDF senza risposte corrette (per gli studenti), Moodle XML e Aiken con le risposte (da importare in Moodle).',
    ],
  },
};

export default function InfoModal({ onClose }) {
  const [activeTab, setActiveTab] = useState('Domande');
  const { intro, items } = CONTENT[activeTab];
  useEscape(onClose);

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: C.overlay, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
      onClick={onClose}
    >
      <div
        style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, width: `min(640px, 92vw)`, maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 32px rgba(0,0,0,0.14)', fontFamily: font }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontFamily: serif, fontSize: 20, fontWeight: 500, color: C.text }}>Come funziona il portale</h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, display: 'flex', alignItems: 'center', padding: 4, borderRadius: 6 }}
            onMouseEnter={e => e.currentTarget.style.color = C.text}
            onMouseLeave={e => e.currentTarget.style.color = C.textMuted}
           aria-label="Chiudi">
            <X size={18} />
          </button>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 6, padding: '12px 24px 0', flexShrink: 0 }}>
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 16px',
                background: activeTab === tab ? C.green : 'transparent',
                color: activeTab === tab ? '#fff' : C.textMuted,
                border: activeTab === tab ? 'none' : `1px solid ${C.border}`,
                borderRadius: 6,
                cursor: 'pointer',
                fontFamily: font,
                fontSize: 13,
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
