import pb from './pocketbase';

// System Usability Scale (Brooke, 1996), versione italiana validata (Borsci, Federici, Lauriola, 2009).
// Risposte da 1 (fortemente in disaccordo) a 5 (fortemente d'accordo).
// Le affermazioni dispari sono positive, le pari negative: non cambiare ordine né testo, altrimenti il punteggio
// non è più confrontabile con quello standard.
export const SUS_STATEMENTS = [
  'Penso che mi piacerebbe utilizzare questo sistema frequentemente.',
  'Ho trovato il sistema inutilmente complesso.',
  'Ho trovato il sistema molto semplice da usare.',
  'Penso che avrei bisogno del supporto di una persona già in grado di utilizzare il sistema.',
  'Ho trovato le varie funzionalità del sistema bene integrate.',
  'Ho trovato incoerenze tra le varie funzionalità del sistema.',
  'Penso che la maggior parte delle persone potrebbe imparare a utilizzare il sistema molto velocemente.',
  'Ho trovato il sistema molto macchinoso da utilizzare.',
  'Ho avuto molta confidenza con il sistema durante l\'uso.',
  'Ho avuto bisogno di imparare molti processi prima di riuscire a utilizzare al meglio il sistema.',
];

export const SUS_SCALE = [
  { value: 1, label: 'Fortemente in disaccordo' },
  { value: 2, label: 'In disaccordo' },
  { value: 3, label: 'Né d\'accordo né in disaccordo' },
  { value: 4, label: 'D\'accordo' },
  { value: 5, label: 'Fortemente d\'accordo' },
];

// Domande aperte (facoltative) dopo il SUS.
export const OPEN_QUESTIONS = [
  'Cosa ti è stato più utile del portale?',
  'Cosa hai trovato difficile, lento o poco chiaro?',
  'Cosa miglioreresti o aggiungeresti?',
];

// Punteggio SUS 0–100: dispari (valore − 1), pari (5 − valore), somma × 2,5.
export function susScore(answers) {
  const sum = answers.reduce((acc, v, i) => acc + (i % 2 === 0 ? v - 1 : 5 - v), 0);
  return sum * 2.5;
}

// "Non ora": il questionario non viene riproposto fino al prossimo accesso (ricaricamento della pagina).
let dismissedThisSession = false;
export function dismissFeedbackForSession() { dismissedThisSession = true; }

// Il questionario si propone dopo un'esportazione riuscita, finché l'utente non lo ha compilato una volta.
export async function shouldAskFeedback() {
  if (dismissedThisSession) return false;
  try {
    const res = await pb.collection('Feedback').getList(1, 1, { filter: `owner = "${pb.authStore.model.id}"`, fields: 'id' });
    return res.totalItems === 0;
  } catch {
    return false; // collection non ancora creata (PocketBase da riavviare) o rete: non disturbare
  }
}

export async function saveFeedback({ susAnswers, openAnswers, testId, exportFormat }) {
  return pb.collection('Feedback').create({
    owner:         pb.authStore.model.id,
    test:          testId || '',
    export_format: exportFormat || '',
    sus_answers:   susAnswers,
    sus_score:     susScore(susAnswers),
    open_answers:  OPEN_QUESTIONS.map((question, i) => ({ question, answer: (openAnswers[i] || '').trim() })),
  });
}
