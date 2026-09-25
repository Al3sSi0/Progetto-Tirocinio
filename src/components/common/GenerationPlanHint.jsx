import { C } from '../../styles/theme';
import { planGeneration } from '../../lib/generateQuestions';

// Riepilogo sotto "Numero di domande": quante parti del documento verranno lette e quante richieste all'AI.
export default function GenerationPlanHint({ doc, numQuestions }) {
  const text = (doc?.text || '').trim();
  if (!doc) return null;
  if (!text) return <div style={{ fontSize: 13, color: C.warning.text, marginTop: 6 }}>Questo documento non ha testo leggibile: non si possono generare domande.</div>;
  const { requests, total, capped } = planGeneration(text, numQuestions);
  return (
    <div style={{ fontSize: 13, color: C.textMuted, marginTop: 6, lineHeight: 1.5 }}>
      Verrà letto tutto il documento ({Math.ceil(text.length / 3000)} pag. circa) con {requests.length} {requests.length === 1 ? 'richiesta' : 'richieste'} all'AI.
      {capped && <> Il testo è breve: al massimo {total} domande.</>}
    </div>
  );
}
