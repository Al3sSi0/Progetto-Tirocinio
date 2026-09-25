import { GENERATION_MODELS, modelFields } from './aiModels';

// Generazione domande da documento a blocchi: il testo completo (doc.text) viene diviso in blocchi,
// le domande richieste vengono distribuite tra i blocchi e ogni gruppo di blocchi è una richiesta all'AI.
// Così le domande coprono tutto il documento e non solo l'inizio.

export const MAX_GENERATED_QUESTIONS = 200;
const CHUNK_CHARS   = 12000; // blocco massimo: ~3-4 pagine
const MIN_CHUNK_CHARS = 2500; // blocco minimo: sotto, il testo è troppo poco per domande sensate
const MIN_CHARS_PER_QUESTION = 400; // tetto realistico: documento breve → meno domande
const TARGET_PER_REQUEST = 6;     // domande per richiesta: meno richieste = meno quota consumata
const MAX_CHUNKS_PER_REQUEST = 4; // testo per richiesta ≤ ~48k caratteri, per non diluire l'attenzione del modello
const CONCURRENCY   = 3;     // richieste in parallelo (i modelli :free vanno in 429 facilmente)

export function parseGeneratedQuestions(rawText) {
  const questions = [];
  const blocks = rawText.trim().split(/\n(?=> )/);
  for (const block of blocks) {
    try {
      const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length < 6) continue;
      const content = lines[0].replace(/^> /, '').trim();
      if (!content) continue;
      const opts = [1, 2, 3, 4].map(i => lines[i].replace(/^[a-d]\) /, ''));
      const ansMatch = block.match(/\* Correct Answer:\s*([a-d])\)?/i);
      const ansLetter = ansMatch ? ansMatch[1].toLowerCase() : 'a';
      const correct_answer = opts[['a', 'b', 'c', 'd'].indexOf(ansLetter)] || opts[0];
      questions.push({ content, options: opts, correct_answer });
    } catch { continue; }
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

// Piano delle richieste: tutto il testo è coperto da gruppi di blocchi contigui, ciascuno con il suo numero di domande.
// I blocchi si rimpiccioliscono quando servono molte domande (~6 per richiesta), così ogni richiesta resta
// focalizzata su un tratto di documento; con poche domande su un testo lungo i blocchi vengono accorpati.
export function planGeneration(text, numQuestions) {
  text = text.trim();
  if (!text) return { requests: [], total: 0, capped: false };

  const total = Math.min(numQuestions, Math.max(1, Math.floor(text.length / MIN_CHARS_PER_QUESTION)));
  const wanted = Math.ceil(total / TARGET_PER_REQUEST);
  const size = Math.min(CHUNK_CHARS, Math.max(MIN_CHUNK_CHARS, Math.ceil(text.length / wanted)));
  const chunks = splitIntoChunks(text, size);

  const groups = Math.min(
    total,
    chunks.length,
    Math.max(wanted, Math.ceil(chunks.length / MAX_CHUNKS_PER_REQUEST)),
  );
  const requests = Array.from({ length: groups }, (_, i) => {
    const from = Math.floor(i * chunks.length / groups);
    const to   = Math.floor((i + 1) * chunks.length / groups);
    return {
      index: i,
      text: chunks.slice(from, to).join('\n\n'),
      count: Math.floor(total / groups) + (i < total % groups ? 1 : 0),
    };
  });
  return { requests, total, capped: total < numQuestions };
}

function buildPrompt(count, text) {
  return `Crea un quiz di livello scuola superiore basato sul testo fornito.
Genera esattamente ${count} domande in lingua ITALIANA.
Rispetta rigorosamente questo formato per ogni domanda:

> [Testo della domanda]
a) [Opzione A]
b) [Opzione B]
c) [Opzione C]
d) [Opzione D]
* Correct Answer: [Lettera, esempio: a)]

Testo: ${text}`;
}

const wait = ms => new Promise(r => setTimeout(r, ms));

async function requestQuestions({ text, count }, apiKey) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...modelFields(GENERATION_MODELS),
        messages: [
          { role: 'system', content: 'Sei un esperto nella creazione di quiz educativi.' },
          { role: 'user', content: buildPrompt(count, text) },
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
  const questions = results.flatMap((r, i) => r.ok ? r.questions.map(q => ({ ...q, _part: requests[i].index })) : []);
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
export async function generateQuestionsFromText(text, numQuestions, apiKey, onProgress) {
  const { requests, capped } = planGeneration(text, numQuestions);
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
      owner:          pb.authStore.model.id,
    }))));
    onProgress?.(created.length, questions.length);
  }
  return created;
}
