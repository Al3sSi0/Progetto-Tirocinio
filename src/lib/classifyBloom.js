import pb from './pocketbase';
import { COUNCIL_MODELS, modelFields } from './aiModels';

const BLOOM_CATEGORIES = ["remember", "understand", "apply", "analyze", "evaluate", "create"];

// Legge il livello dalla riga "BLOOM_LEVEL : X"; se manca, prende la prima categoria che compare nel testo.
function parseVote(reply) {
  const tagged = reply.match(/BLOOM_LEVEL\s*:\s*\**\s*([A-Za-z]+)/i)?.[1]?.toLowerCase();
  if (BLOOM_CATEGORIES.includes(tagged)) return tagged;
  const lower = reply.toLowerCase();
  const found = BLOOM_CATEGORIES
    .map(cat => ({ cat, idx: lower.indexOf(cat) }))
    .filter(x => x.idx >= 0)
    .sort((a, b) => a.idx - b.idx)[0];
  return found?.cat ?? "unknown";
}

export async function classifyBloomCouncil(q, apiKey) {
  if (!apiKey?.trim()) {
    throw new Error("manca la chiave OpenRouter. Inseriscila in VITE_OPENROUTER_API_KEY nel file .env e riavvia npm run dev.");
  }

  const res = await fetch("/prompts/req_prompt.txt");
  if (!res.ok) throw new Error(`impossibile leggere il prompt (${res.status}).`);
  const template = await res.text();
  const systemPrompt = template
    .replace("{example_en}", q.content)
    .replace("{answers_en}", (Array.isArray(q.options) ? q.options : []).map(o => `- ${o}`).join("\n"))
    .replace("{example_question_type}", "Multiple Choice");

  const userMessage = "Classify the item above.";

  const results = await Promise.allSettled(
    COUNCIL_MODELS.map(models =>
      fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...modelFields(models),
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          temperature: 0.0,
        }),
      }).then(async r => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(`${models[0]}: ${body?.error?.message || `HTTP ${r.status}`}`);
        return body;
      })
    )
  );

  const modelVotes = results.map((r, i) => {
    // model = quello che ha risposto davvero (può essere una riserva)
    const model = r.status === "fulfilled" ? (r.value?.model ?? COUNCIL_MODELS[i][0]) : COUNCIL_MODELS[i][0];
    if (r.status !== "fulfilled") return { model, vote: "unknown", reply: "" };
    const reply = r.value?.choices?.[0]?.message?.content ?? "";
    return { model, vote: parseVote(reply), reply };
  });

  const counts = {};
  for (const { vote } of modelVotes) {
    if (vote !== "unknown") counts[vote] = (counts[vote] ?? 0) + 1;
  }
  if (Object.keys(counts).length === 0) {
    const reasons = results.filter(r => r.status === "rejected").map(r => r.reason?.message);
    throw new Error("nessun voto valido dai modelli." + (reasons.length ? " " + reasons.join(" · ") : ""));
  }

  const winner = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  await pb.collection('Question').update(q.id, { bloom_level: winner });
  return { winner, modelVotes };
}
