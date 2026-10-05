// Riconoscimento di domande doppie o quasi uguali (confronto sul testo della domanda).

// Parole troppo comuni per dire qualcosa sul contenuto della domanda.
const STOPWORDS = new Set([
  'il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'uno', 'una', 'di', 'a', 'da', 'in', 'con', 'su', 'per', 'tra', 'fra',
  'del', 'dello', 'della', 'dei', 'degli', 'delle', 'al', 'allo', 'alla', 'ai', 'agli', 'alle',
  'dal', 'dallo', 'dalla', 'dai', 'dagli', 'dalle', 'nel', 'nello', 'nella', 'nei', 'negli', 'nelle',
  'sul', 'sullo', 'sulla', 'sui', 'sugli', 'sulle', 'dell', 'all', 'nell', 'dall', 'sull', 'e', 'ed', 'o', 'od', 'che', 'chi', 'cui', 'non', 'si',
  'ha', 'hanno', 'fu', 'era', 'sono', 'quale', 'quali', 'come', 'cosa', 'quando', 'dove', 'perche',
]);

const SIMILARITY_THRESHOLD = 0.75; // quota di parole significative in comune oltre la quale due domande sono "simili"
const ANSWER_THRESHOLD = 0.5;      // per le domande solo simili, anche le risposte corrette devono somigliarsi

// Testo confrontabile: minuscolo, senza accenti, punteggiatura e spazi multipli.
export function normalizeText(text) {
  return (text || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function keywords(normalized) {
  return new Set(normalized.split(' ').filter(w => w.length > 1 && !STOPWORDS.has(w)));
}

// Quota di parole in comune tra due insiemi (indice di Jaccard).
function overlap(a, b) {
  if (!a.size || !b.size) return 0;
  let common = 0;
  for (const w of a) if (b.has(w)) common++;
  return common / (a.size + b.size - common);
}

// Le risposte corrette si somigliano? Se una delle due manca, decide solo il testo della domanda.
function answersMatch(a, b) {
  if (!a || !b) return true;
  if (a.norm === b.norm) return true;
  return overlap(a.words, b.words) >= ANSWER_THRESHOLD;
}

function answerKey(q) {
  const norm = normalizeText(q.correct_answer);
  return norm ? { norm, words: keywords(norm) } : null;
}

// Indice di un insieme di domande, da costruire una volta e interrogare con findDuplicate.
export function buildDuplicateIndex(questions) {
  return questions.map(q => {
    const norm = normalizeText(q.content);
    return { q, norm, words: keywords(norm), answer: answerKey(q) };
  });
}

/**
 * Cerca nell'indice la domanda più simile a `question` ({ content, correct_answer }).
 * Stesso testo (a meno di maiuscole/punteggiatura) → doppione. Testo solo simile → doppione
 * se anche la risposta corretta è simile: "definizione di linguaggio" e "definizione di espressione"
 * hanno frasi quasi uguali ma risposte diverse, quindi restano distinte.
 * @returns {{ match, exact: boolean } | null}
 */
export function findDuplicate(question, index) {
  const norm = normalizeText(question.content);
  if (!norm) return null;
  const words = keywords(norm);
  const answer = answerKey(question);
  let best = null, bestScore = 0;
  for (const item of index) {
    if (item.norm === norm) return { match: item.q, exact: true };
    const score = overlap(words, item.words);
    if (score >= SIMILARITY_THRESHOLD && score > bestScore && answersMatch(answer, item.answer)) { bestScore = score; best = item.q; }
  }
  return best ? { match: best, exact: false } : null;
}

/**
 * Classifica le domande generate rispetto a quelle del test e dell'archivio.
 * @returns {Array<null | { kind: 'test' | 'archive', match, exact }>}  un elemento per domanda generata
 */
export function detectDuplicates(generated, { testQuestions = [], archive = [] }) {
  const testIds = new Set(testQuestions.map(q => q.id));
  const testIndex = buildDuplicateIndex(testQuestions);
  const archiveIndex = buildDuplicateIndex(archive.filter(q => !testIds.has(q.id)));
  return generated.map(g => {
    const inTest = findDuplicate(g, testIndex);
    if (inTest) return { kind: 'test', ...inTest };
    const inArchive = findDuplicate(g, archiveIndex);
    return inArchive ? { kind: 'archive', ...inArchive } : null;
  });
}
