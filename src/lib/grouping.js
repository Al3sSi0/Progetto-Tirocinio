// Chiavi di raggruppamento normalizzate (trim) per materia e argomento.
export const subjectOf = r => (r.subject || 'Senza materia').trim();
export const topicOf   = r => (r.topic   || 'Senza argomento').trim();
