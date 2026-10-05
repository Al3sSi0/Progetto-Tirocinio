// Tipi di domanda. Non c'è un campo "tipo" nella collection: si ricava da options/correct_answer.
//   multiple  → options con le risposte possibili, correct_answer = una di esse
//   truefalse → options = ['Vero', 'Falso'], correct_answer = 'Vero' | 'Falso'
//   open      → options = [], correct_answer = risposta attesa (può essere vuota)

export const QUESTION_TYPES = ['multiple', 'truefalse', 'open'];
export const TYPE_LABELS = { multiple: 'Risposta multipla', truefalse: 'Vero/Falso', open: 'Aperta' };
export const TRUE_FALSE = ['Vero', 'Falso'];

const isTrueWord  = s => /^(vero|true)$/i.test(String(s).trim());
const isFalseWord = s => /^(falso|false)$/i.test(String(s).trim());

// options può arrivare come array (SDK PocketBase) o come stringa JSON.
export function parseOptions(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string' && raw) { try { const p = JSON.parse(raw); return Array.isArray(p) ? p : [raw]; } catch { return [raw]; } }
  return [];
}

export function questionType(q) {
  const options = parseOptions(q.options).filter(o => String(o).trim());
  if (options.length === 0) return 'open';
  if (options.length === 2 && options.some(isTrueWord) && options.some(isFalseWord)) return 'truefalse';
  return 'multiple';
}

// ── Stato dell'editor della risposta (AnswerEditor) ──
// Tiene i dati di tutti i tipi, così cambiando tipo non si perde quello che si è scritto.

export const emptyAnswer = (type = 'multiple') => ({ type, options: [''], correctIdx: null, tf: null, expected: '' });

export function answerFromQuestion(q) {
  const type = questionType(q);
  const answer = emptyAnswer(type);
  if (type === 'multiple') {
    answer.options = [...parseOptions(q.options)];
    const idx = answer.options.findIndex(o => o === q.correct_answer);
    answer.correctIdx = idx >= 0 ? idx : null;
  } else if (type === 'truefalse') {
    answer.tf = isTrueWord(q.correct_answer) ? 'Vero' : isFalseWord(q.correct_answer) ? 'Falso' : null;
  } else {
    answer.expected = q.correct_answer || '';
  }
  return answer;
}

// Campi da salvare ({ options, correct_answer }) oppure { error }.
// lenient: senza risposta corretta indicata usa la prima opzione (per le domande generate modificate al volo).
export function answerToFields(answer, { lenient = false } = {}) {
  if (answer.type === 'open') return { options: [], correct_answer: answer.expected.trim() };
  if (answer.type === 'truefalse') {
    if (!answer.tf) return lenient ? { options: TRUE_FALSE, correct_answer: 'Vero' } : { error: "Indica se l'affermazione è vera o falsa." };
    return { options: TRUE_FALSE, correct_answer: answer.tf };
  }
  const options = answer.options.map(o => o.trim()).filter(Boolean);
  if (options.length === 0) return { error: "Aggiungi almeno un'opzione di risposta." };
  const correct = (answer.correctIdx !== null ? answer.options[answer.correctIdx] || '' : '').trim();
  if (!options.includes(correct)) {
    return lenient ? { options, correct_answer: options[0] } : { error: 'Seleziona la risposta corretta tra le opzioni.' };
  }
  return { options, correct_answer: correct };
}
