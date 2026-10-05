/// <reference path="../pb_data/types.d.ts" />

// Questionario di feedback (SUS + domande aperte) proposto dopo l'esportazione di un test.
// Gli utenti possono solo inviare e rileggere le proprie risposte; modifica ed eliminazione solo da admin.
migrate((app) => {
  const users = app.findCollectionByNameOrId("users");
  const test  = app.findCollectionByNameOrId("Test");

  const ownerOnly = '@request.auth.id != "" && owner = @request.auth.id';
  const feedback = new Collection({
    type: "base",
    name: "Feedback",
    listRule:   ownerOnly,
    viewRule:   ownerOnly,
    createRule: '@request.auth.id != "" && @request.body.owner = @request.auth.id',
    updateRule: null,
    deleteRule: null,
    fields: [
      { type: "relation", name: "owner", required: true, collectionId: users.id, cascadeDelete: true, maxSelect: 1 },
      // test esportato prima di rispondere (resta anche se il test viene eliminato)
      { type: "relation", name: "test", collectionId: test.id, cascadeDelete: false, maxSelect: 1 },
      { type: "text", name: "export_format" },
      // risposte alle 10 affermazioni SUS, nell'ordine, valori 1–5
      { type: "json", name: "sus_answers", required: true },
      // punteggio SUS 0–100
      { type: "number", name: "sus_score", min: 0, max: 100 },
      // domande aperte: [{ question, answer }]
      { type: "json", name: "open_answers" },
      { type: "autodate", name: "created", onCreate: true },
      { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
    ],
  });
  return app.save(feedback);
}, (app) => {
  return app.delete(app.findCollectionByNameOrId("Feedback"));
});
