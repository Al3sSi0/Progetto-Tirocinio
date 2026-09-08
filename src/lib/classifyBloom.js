import pb from './pocketbase';

const COUNCIL_MODELS = [
  "google/gemini-2.0-flash-001",
  "meta-llama/llama-3.1-8b-instruct",
  "nvidia/nemotron-3-super-120b-a12b:free",
];

const BLOOM_CATEGORIES = ["remember", "understand", "apply", "analyze", "evaluate", "create"];

export async function classifyBloomCouncil(q, apiKey) {
  const res = await fetch("/prompts/req_prompt.txt");
  const template = await res.text();
  const systemPrompt = template
    .replace("{example_en}", q.content)
    .replace("{answers_en}", (Array.isArray(q.options) ? q.options : []).map(o => `- ${o}`).join("\n"))
    .replace("{example_question_type}", "Multiple Choice");

  const userMessage = "Classify the item above.";

  const results = await Promise.allSettled(
    COUNCIL_MODELS.map(model =>
      fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          temperature: 0.0,
        }),
      }).then(r => r.json())
    )
  );

  const modelVotes = results.map((r, i) => {
    const model = COUNCIL_MODELS[i];
    if (r.status !== "fulfilled") return { model, vote: "unknown", reply: "" };
    const reply = r.value?.choices?.[0]?.message?.content ?? "";
    const upper = reply.toUpperCase();
    const match = BLOOM_CATEGORIES.find(cat => upper.includes(cat.toUpperCase()));
    return { model, vote: match ?? "unknown", reply };
  });

  const counts = {};
  for (const { vote } of modelVotes) {
    if (vote !== "unknown") counts[vote] = (counts[vote] ?? 0) + 1;
  }
  if (Object.keys(counts).length === 0) throw new Error("Nessun voto valido dai modelli.");

  const winner = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  await pb.collection('Question').update(q.id, { bloom_level: winner });
  return { winner, modelVotes };
}
