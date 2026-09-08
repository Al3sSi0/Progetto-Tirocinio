/// <reference path="../pb_data/types.d.ts" />

// Crea le collection Question, Document, Test come descritte in CLAUDE.md.
migrate((app) => {
  const users = app.findCollectionByNameOrId("users");

  const ownerField = () => ({
    type: "relation",
    name: "owner",
    required: true,
    collectionId: users.id,
    cascadeDelete: true,
    maxSelect: 1,
  });

  const ownerRules = {
    listRule: "owner = @request.auth.id",
    viewRule: "owner = @request.auth.id",
    createRule: "@request.auth.id != ''",
    updateRule: "owner = @request.auth.id",
    deleteRule: "owner = @request.auth.id",
  };

  const autodateFields = () => [
    { type: "autodate", name: "created", onCreate: true },
    { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
  ];

  const question = new Collection({
    type: "base",
    name: "Question",
    ...ownerRules,
    fields: [
      { type: "text", name: "subject" },
      { type: "text", name: "topic" },
      { type: "text", name: "content", required: true },
      { type: "json", name: "options" },
      { type: "text", name: "correct_answer" },
      { type: "text", name: "bloom_level" },
      ownerField(),
      ...autodateFields(),
    ],
  });
  app.save(question);

  const document = new Collection({
    type: "base",
    name: "Document",
    ...ownerRules,
    fields: [
      { type: "text", name: "title" },
      { type: "text", name: "subject" },
      { type: "text", name: "topic" },
      { type: "file", name: "file", required: true, maxSelect: 1, maxSize: 52428800 },
      { type: "text", name: "text", max: 0 },
      ownerField(),
      ...autodateFields(),
    ],
  });
  app.save(document);

  const test = new Collection({
    type: "base",
    name: "Test",
    ...ownerRules,
    fields: [
      { type: "text", name: "description", required: true },
      { type: "text", name: "subject" },
      { type: "text", name: "topic" },
      {
        type: "relation",
        name: "questions",
        collectionId: question.id,
        maxSelect: 999,
      },
      ownerField(),
      { type: "autodate", name: "created", onCreate: true },
      { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
    ],
  });
  app.save(test);
}, (app) => {
  app.delete(app.findCollectionByNameOrId("Test"));
  app.delete(app.findCollectionByNameOrId("Document"));
  app.delete(app.findCollectionByNameOrId("Question"));
});
