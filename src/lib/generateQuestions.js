import { GENERATION_MODELS, modelFields } from './aiModels';
import { QUESTION_TYPES, TRUE_FALSE, questionType } from './questionTypes';

// Generazione domande da documento a blocchi: il testo completo (doc.text) viene diviso in blocchi,
// le domande richieste vengono distribuite tra i blocchi e ogni gruppo di blocchi è una richiesta all'AI.
// Così le domande coprono tutto il documento e non solo l'inizio.

export const MAX_GENERATED_QUESTIONS = 200;

// Quante domande generare per tipo: { multiple, truefalse, open }.
export const DEFAULT_COUNTS = { multiple: 5, truefalse: 0, open: 0 };
export const countTotal = counts => QUESTION_TYPES.reduce((n, t) => n + (counts[t] || 0), 0);

// Separatore tra le pagine dei PDF nel testo salvato (doc.text, vedi extractText.js). Il form feed non si
// vede e .trim() lo tratta come spazio. I documenti caricati prima di questo separatore non hanno pagine.
export const PAGE_BREAK = '\f';
// Nel testo inviato all'AI ogni pagina inizia con questo segnaposto; il modello indica la pagina di ogni domanda.
const pageMarker = n => `[[Pagina ${n}]]`;
const PAGE_MARKER_RE = /\[\[Pagina (\d+)\]\]/g;
const CHUNK_CHARS   = 12000; // blocco massimo: ~3-4 pagine
const MIN_CHUNK_CHARS = 2500; // blocco minimo: sotto, il testo è troppo poco per domande sensate
const MIN_CHARS_PER_QUESTION = 400; // tetto realistico: documento breve → meno domande
const TARGET_PER_REQUEST = 6;     // domande per richiesta: meno richieste = meno quota consumata
const MAX_CHUNKS_PER_REQUEST = 4; // testo per richiesta ≤ ~48k caratteri, per non diluire l'attenzione del modello
const CONCURRENCY   = 3;     // richieste in parallelo (i modelli :free vanno in 429 facilmente)

const OPTION_RE = /^([a-f])\)\s*(.*)$/i;
const clean = str => str.replace(PAGE_MARKER_RE, '').trim();

// Legge le domande dalla risposta del modello; il tipo si riconosce dal contenuto del blocco:
// opzioni a)…  → risposta multipla (Vero/Falso se le opzioni sono proprio quelle), "* Risposta attesa:" → aperta.
export function parseGeneratedQuestions(rawText) {
  const questions = [];
  const blocks = rawText.trim().split(/\n(?=\s*> )/);
  for (const block of blocks) {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) continue;
    const content = clean(lines[0].replace(/^> /, ''));
    if (!content) continue;
    const pageMatch = block.match(/\* Pagina:\s*(\d+)/i);
    const page = pageMatch ? Number(pageMatch[1]) : null;
    const options = lines.slice(1).map(l => l.match(OPTION_RE)).filter(Boolean).map(m => clean(m[2])).filter(Boolean);

    if (options.length >= 2) {
      const letter = block.match(/\* Correct Answer:\s*([a-f])\)?/i)?.[1]?.toLowerCase();
      const word = block.match(/\* Correct Answer:\s*(vero|falso|true|false)/i)?.[1];
      let correct_answer = (letter && options['abcdef'.indexOf(letter)]) || options[0];
      let opts = options;
      if (questionType({ options }) === 'truefalse') {
        const saysTrue = /^(vero|true)$/i.test(word || correct_answer);
        opts = TRUE_FALSE;
        correct_answer = saysTrue ? 'Vero' : 'Falso';
      }
      questions.push({ content, options: opts, correct_answer, page });
      continue;
    }
    const expected = block.match(/\* Risposta attesa:\s*(.+)/i)?.[1];
    if (expected) questions.push({ content, options: [], correct_answer: clean(expected), page });
  }
  return questions;
}

// Divide il testo in blocchi di ~size caratteri, tagliando preferibilmente a fine paragrafo o frase.
export function splitIntoChunks(text, size = CHUNK_CHARS) {
  const chunks = [];
  let rest = text.trim();
  while (rest.length > size) {
    const window = rest.slice(0, size);
    let cut = window.lastIndexOf('\n\n');
    if (cut < size * 0.5) cut = Math.max(window.lastIndexOf('. '), window.lastIndexOf('.\n'));
    if (cut < size * 0.5) cut = window.lastIndexOf(' ');
    if (cut < size * 0.5) cut = size;
    chunks.push(rest.slice(0, cut + 1).trim());
    rest = rest.slice(cut + 1).trim();
  }
  if (rest) chunks.push(rest);
  return chunks;
}

// Testo con le pagine segnate: ogni pagina (non vuota) inizia con [[Pagina N]]. Senza separatori → testo invariato.
function markPages(text) {
  if (!text.includes(PAGE_BREAK)) return { text: text.trim(), paged: false };
  const pages = text.split(PAGE_BREAK)
    .map((p, i) => ({ n: i + 1, body: p.trim() }))
    .filter(p => p.body)
    .map(p => `${pageMarker(p.n)}\n${p.body}`);
  return { text: pages.join('\n\n'), paged: true };
}

// Un blocco che comincia a metà pagina riceve il segnaposto della pagina in corso, così il modello sa sempre dov'è.
function carryPageMarkers(chunks) {
  let current = null;
  return chunks.map(chunk => {
    const out = current && !chunk.startsWith('[[Pagina ') ? `${pageMarker(current)}\n${chunk}` : chunk;
    const pages = [...chunk.matchAll(PAGE_MARKER_RE)];
    if (pages.length) current = Number(pages[pages.length - 1][1]);
    return out;
  });
}

// Pagine coperte dal testo di una richiesta (0 = sconosciute).
function pageRange(text) {
  const nums = [...text.matchAll(PAGE_MARKER_RE)].map(m => Number(m[1]));
  return nums.length ? { pageFrom: Math.min(...nums), pageTo: Math.max(...nums) } : { pageFrom: 0, pageTo: 0 };
}

// Riduce i conteggi per tipo a `total` mantenendo le proporzioni (metodo dei resti maggiori).
function scaleCounts(counts, total) {
  const asked = countTotal(counts);
  const exact = QUESTION_TYPES.map(t => ({ t, v: (counts[t] || 0) * total / asked }));
  const out = Object.fromEntries(exact.map(({ t, v }) => [t, Math.floor(v)]));
  let rest = total - countTotal(out);
  [...exact].sort((a, b) => (b.v % 1) - (a.v % 1)).forEach(({ t }) => { if (rest > 0) { out[t]++; rest--; } });
  return out;
}

// Piano delle richieste: tutto il testo è coperto da gruppi di blocchi contigui, ciascuno con il suo numero di domande.
// I blocchi si rimpiccioliscono quando servono molte domande (~6 per richiesta), così ogni richiesta resta
// focalizzata su un tratto di documento; con poche domande su un testo lungo i blocchi vengono accorpati.
// I tipi di domanda sono mescolati in modo uniforme su tutto il documento.
export function planGeneration(rawText, counts) {
  const { text, paged } = markPages(rawText || '');
  const asked = countTotal(counts);
  if (!text || !asked) return { requests: [], total: 0, capped: false };

  const total = Math.min(asked, Math.max(1, Math.floor(text.length / MIN_CHARS_PER_QUESTION)));
  const scaled = total < asked ? scaleCounts(counts, total) : counts;
  const wanted = Math.ceil(total / TARGET_PER_REQUEST);
  const size = Math.min(CHUNK_CHARS, Math.max(MIN_CHUNK_CHARS, Math.ceil(text.length / wanted)));
  const chunks = paged ? carryPageMarkers(splitIntoChunks(text, size)) : splitIntoChunks(text, size);

  const groups = Math.min(
    total,
    chunks.length,
    Math.max(wanted, Math.ceil(chunks.length / MAX_CHUNKS_PER_REQUEST)),
  );
  // Ogni domanda ha una posizione ideale nel documento ((k + 0.5) / n per il suo tipo): ordinandole così i tipi
  // si alternano, e dividendole in parti uguali ogni richiesta riceve la sua quota di ciascun tipo.
  const items = QUESTION_TYPES
    .flatMap(t => Array.from({ length: scaled[t] || 0 }, (_, k) => ({ t, pos: (k + 0.5) / scaled[t] })))
    .sort((a, b) => a.pos - b.pos);
  const perGroup = Array.from({ length: groups }, () => ({ multiple: 0, truefalse: 0, open: 0 }));
  items.forEach((it, j) => { perGroup[Math.floor(j * groups / total)][it.t]++; });

  const requests = Array.from({ length: groups }, (_, i) => {
    const from = Math.floor(i * chunks.length / groups);
    const to   = Math.floor((i + 1) * chunks.length / groups);
    const requestText = chunks.slice(from, to).join('\n\n');
    return {
      index: i,
      text: requestText,
      counts: perGroup[i],
      count: countTotal(perGroup[i]),
      paged,
      ...pageRange(requestText),
    };
  });
  return { requests, total, capped: total < asked };
}

// Un formato per ogni tipo richiesto. Con le pagine segnate si chiede anche la riga "* Pagina: N" in fondo.
function buildPrompt(counts, text, paged) {
  const pageLine = paged ? `\n* Pagina: [Numero della pagina da cui è presa la domanda, esempio: 3]` : '';
  const parts = [], formats = [];
  if (counts.multiple) {
    parts.push(`${counts.multiple} a risposta multipla`);
    formats.push(`Domanda a risposta multipla (4 opzioni, una sola corretta):
> [Testo della domanda]
a) [Opzione A]
b) [Opzione B]
c) [Opzione C]
d) [Opzione D]
* Correct Answer: [Lettera, esempio: a)]${pageLine}`);
  }
  if (counts.truefalse) {
    parts.push(`${counts.truefalse} vero o falso`);
    formats.push(`Domanda vero o falso (un'affermazione da giudicare, vera o falsa secondo il testo):
> [Affermazione]
a) Vero
b) Falso
* Correct Answer: [a) se l'affermazione è vera, b) se è falsa]${pageLine}`);
  }
  if (counts.open) {
    parts.push(`${counts.open} a risposta aperta`);
    formats.push(`Domanda a risposta aperta:
> [Testo della domanda]
* Risposta attesa: [Risposta corretta in 1-3 frasi, su una sola riga]${pageLine}`);
  }
  const pageIntro = paged
    ? `\nIl testo è diviso in pagine: ogni pagina inizia con un segnaposto come [[Pagina 3]]. Non citare i segnaposto nelle domande.`
    : '';
  return `Crea un quiz di livello scuola superiore basato sul testo fornito.
Genera esattamente ${countTotal(counts)} domande in lingua ITALIANA: ${parts.join(', ')}.${pageIntro}
Scrivi formule e simboli con i caratteri Unicode (esempi: ≥, ≤, ≠, →, ∈, ε, π, x², aⁿ, x₁, xₙ₋₁), mai in notazione LaTeX (niente \\geq, ^{…}, _{…} o $…$).
Ogni domanda inizia con "> ". Rispetta rigorosamente questi formati:

${formats.join('\n\n')}

Testo: ${text}`;
}

const wait = ms => new Promise(r => setTimeout(r, ms));

async function requestQuestions({ text, counts, paged }, apiKey) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...modelFields(GENERATION_MODELS),
        messages: [
          { role: 'system', content: 'Sei un esperto nella creazione di quiz educativi.' },
          { role: 'user', content: buildPrompt(counts, text, paged) },
        ],
        temperature: 0.5,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) {
      const parsed = parseGeneratedQuestions(body.choices?.[0]?.message?.content || '');
      if (parsed.length) return parsed;
      // risposta fuori formato: conta come parte fallita (così si può riprovare)
      if (attempt === 0) continue;
      throw new Error('risposta del modello senza domande nel formato richiesto');
    }
    // modelli occupati: un secondo tentativo dopo qualche secondo
    if ((res.status === 429 || res.status >= 500) && attempt === 0) { await wait(4000); continue; }
    throw new Error(body?.error?.message || `HTTP ${res.status}`);
  }
}

// Pagine di origine di una domanda: quella indicata dal modello se cade nel testo della richiesta,
// altrimenti tutto l'intervallo della richiesta. page_from/page_to = 0 → pagine sconosciute.
function withSourcePages({ page, ...q }, request) {
  const exact = page && page >= request.pageFrom && page <= request.pageTo;
  return {
    ...q,
    _part: request.index,
    page_from: exact ? page : request.pageFrom,
    page_to:   exact ? page : request.pageTo,
  };
}

// Esegue un insieme di richieste (anche solo quelle fallite, per riprovarle).
// Restituisce le domande in ordine di documento (campo _part = indice della richiesta) e le richieste fallite.
export async function runGeneration(requests, apiKey, onProgress) {
  if (!apiKey?.trim()) throw new Error('manca la chiave OpenRouter (VITE_OPENROUTER_API_KEY nel file .env).');
  const results = new Array(requests.length);
  let next = 0, done = 0;
  onProgress?.(0, requests.length);
  async function worker() {
    while (next < requests.length) {
      const i = next++;
      try { results[i] = { ok: true, questions: await requestQuestions(requests[i], apiKey) }; }
      catch (err) { results[i] = { ok: false, error: err }; }
      onProgress?.(++done, requests.length);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, requests.length) }, worker));

  const failedRequests = requests.filter((_, i) => !results[i].ok);
  if (failedRequests.length === requests.length) throw results[0].error;
  const questions = results.flatMap((r, i) => r.ok ? r.questions.map(q => withSourcePages(q, requests[i])) : []);
  return { questions, failedRequests };
}

// Unisce domande nuove a quelle già presenti: ordine di documento, senza duplicati identici.
export function mergeQuestions(existing, incoming) {
  const seen = new Set(existing.map(q => q.content.trim().toLowerCase()));
  const fresh = incoming.filter(q => {
    const key = q.content.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return [...existing, ...fresh].sort((a, b) => (a._part ?? 0) - (b._part ?? 0));
}

/**
 * Genera domande da tutto il testo del documento.
 * @returns {{ questions, failedRequests, requested, capped }}
 */
export async function generateQuestionsFromText(text, counts, apiKey, onProgress) {
  const { requests, capped } = planGeneration(text, counts);
  if (!requests.length) throw new Error('il documento non contiene testo leggibile.');
  const { questions, failedRequests } = await runGeneration(requests, apiKey, onProgress);
  return { questions: mergeQuestions([], questions), failedRequests, requested: requests.length, capped };
}

// Salva le domande generate su PocketBase a lotti (evita centinaia di richieste simultanee).
export async function saveGeneratedQuestions(pb, questions, onProgress, batchSize = 20) {
  const created = [];
  for (let i = 0; i < questions.length; i += batchSize) {
    const batch = questions.slice(i, i + batchSize);
    created.push(...await Promise.all(batch.map(q => pb.collection('Question').create({
      subject:        q.subject || '',
      topic:          q.topic   || '',
      content:        q.content,
      options:        q.options,
      correct_answer: q.correct_answer,
      bloom_level:    '',
      document:       q.document  || '',
      page_from:      q.page_from || 0,
      page_to:        q.page_to   || 0,
      owner:          pb.authStore.model.id,
    }))));
    onProgress?.(created.length, questions.length);
  }
  return created;
}
