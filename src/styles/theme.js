export const BLOOM_STYLES = {
  remember:   { background: '#E6EEF6', color: '#2A5C8A' },
  understand: { background: '#E6F2ED', color: '#1F6B4E' },
  apply:      { background: '#EFF5E6', color: '#3F6B18' },
  analyze:    { background: '#FBF2DC', color: '#7A5010' },
  evaluate:   { background: '#F7EDE6', color: '#8A3A1A' },
  create:     { background: '#F3E8F0', color: '#6A2860' },
};

export const C = {
  bg:          '#F5F0E8',
  surface:     '#FEFCF7',
  border:      '#DDD5C2',
  borderLight: '#EDE8DC',
  headerBg:    '#F0EBE0',
  expandBg:    '#F8F5EF',
  green:       '#2C3E2D',
  greenLight:  '#3A5C3C',
  greenText:   '#D4E8D0',
  greenAccent: '#A8C5A0',
  text:        '#1C2B1D',
  textMuted:   '#7A7060',
  textFaint:   '#9A9080',
  textBody:    '#5A5040',
  dot:         '#B8AD9A',
  error:       { bg: '#F7EDE6', border: '#E8C8B8', text: '#8A3A1A' },
  warning:     { bg: '#FBF2DC', border: '#D4B84A', text: '#7A5010' },
  overlay:     'rgba(28,43,29,0.38)',
  focusBorder: '#5C7A5E',
  // Sfondi progressivi per i livelli di indentazione delle tabelle ad albero (materia → argomento → elemento → dettaglio)
  treeLevels:  ['#FAF7F2', '#F5F2EB', '#F3EFE8', '#EDE8DC'],
  bloomNeutral: { background: '#EDEAE3', color: '#5A5040' },
  fileTypes: {
    pdf: { bg: '#FAE8E8', color: '#8A1A1A' },
    doc: { bg: '#E6EEF6', color: '#2A5C8A' },
  },
  // Palette per etichettare le materie con un colore riconoscibile (assegnato per nome)
  tagPalette: [
    { bg: '#E6EEF6', color: '#2A5C8A' },
    { bg: '#E6F2ED', color: '#1F6B4E' },
    { bg: '#F3E8F0', color: '#6A2860' },
    { bg: '#FBF2DC', color: '#7A5010' },
    { bg: '#F7EDE6', color: '#8A3A1A' },
    { bg: '#EFF5E6', color: '#3F6B18' },
  ],
};

export function colorForTag(name) {
  const palette = C.tagPalette;
  let hash = 0;
  for (const ch of String(name)) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return palette[hash % palette.length];
}

export const font  = "'DM Sans', sans-serif";
export const serif = 'Lora, serif';

export const BLOOM_LEVELS = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'];
export const BLOOM_LABELS = {
  remember: 'Ricordare', understand: 'Capire', apply: 'Applicare',
  analyze: 'Analizzare', evaluate: 'Valutare', create: 'Creare',
};
export const BLOOM_HINTS = {
  remember:   'Richiamare un dato, una data, una definizione.',
  understand: 'Spiegare un concetto con parole proprie.',
  apply:      'Usare ciò che si sa in una situazione nuova.',
  analyze:    'Confrontare, trovare cause e relazioni.',
  evaluate:   'Giudicare e motivare una scelta.',
  create:     'Produrre qualcosa di nuovo e originale.',
};
