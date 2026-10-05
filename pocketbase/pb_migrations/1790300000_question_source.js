/// <reference path="../pb_data/types.d.ts" />

// Fonte delle domande generate: documento di origine e pagine (page_from–page_to, 0 = sconosciuta).
// Eliminando il documento la domanda resta, senza fonte.
migrate((app) => {
  const question = app.findCollectionByNameOrId("Question");
  const document = app.findCollectionByNameOrId("Document");

  question.fields.add(new Field({
    type: "relation",
    name: "document",
    collectionId: document.id,
    cascadeDelete: false,
    maxSelect: 1,
    required: false,
  }));
  question.fields.add(new Field({ type: "number", name: "page_from", onlyInt: true, min: 0 }));
  question.fields.add(new Field({ type: "number", name: "page_to",   onlyInt: true, min: 0 }));

  return app.save(question);
}, (app) => {
  const question = app.findCollectionByNameOrId("Question");
  question.fields.removeByName("document");
  question.fields.removeByName("page_from");
  question.fields.removeByName("page_to");
  return app.save(question);
});
