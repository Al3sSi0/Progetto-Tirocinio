// Modelli AI usati via OpenRouter. Ogni voce è una lista [principale, riserve…]:
// OpenRouter prova il primo e, se non disponibile (es. 429 sui modelli :free), passa al successivo.
// Per passare a modelli a pagamento basta cambiare gli id qui.

// Council per la classificazione Bloom: 3 posti, famiglie di modelli diverse per un voto più indipendente.
export const COUNCIL_MODELS = [
  ['qwen/qwen3.8-27b:free',                  'z-ai/glm-5.2:free', 'nvidia/nemotron-3-ultra-550b-a55b:free'],
  ['google/gemma-4-31b-it:free',             'nvidia/nemotron-3-ultra-550b-a55b:free'],
  ['nvidia/nemotron-3-super-120b-a12b:free', 'nvidia/nemotron-3-ultra-550b-a55b:free'],
];

// Generazione domande da documento.
export const GENERATION_MODELS = [
  'qwen/qwen3.8-27b:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'nvidia/nemotron-3-ultra-550b-a55b:free',
];

// Campi del body OpenRouter per una lista di modelli con fallback.
export function modelFields(models) {
  const [model, ...fallbacks] = models;
  return fallbacks.length ? { model, models } : { model };
}
