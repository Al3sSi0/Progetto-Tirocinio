# Portale Docenti — Specifiche progetto

## Stack tecnologico

| Layer    | Tecnologia                          |
|----------|-------------------------------------|
| Backend  | PocketBase (`http://127.0.0.1:8090`) |
| Frontend | React + Vite                        |
| Routing  | React Router DOM                    |
| Icone    | lucide-react                        |
| Stile    | Inline CSS (nessuna libreria UI)    |
| AI       | OpenRouter API (`VITE_OPENROUTER_API_KEY`) |
| PDF read | `pdfjs-dist` + `tesseract.js` (estrazione testo all'upload in `AddDocumentModal`) |
| PDF gen  | `jspdf` (generazione PDF export in `exportTest.js`)                               |

---

## Struttura file frontend

```
src/
  lib/
    pocketbase.js              # Istanza PocketBase singleton
    classifyBloom.js           # Classificazione Bloom via council di 3 modelli AI
    extractText.js             # Estrazione testo da file (pdfjs-dist + Tesseract OCR fallback)
    exportTest.js              # Funzioni export test: exportMoodleXml, exportWord, exportPdf, exportAiken
  components/
    Login.jsx                  # Pagina di login
    ProtectedRoute.jsx         # Guard per rotte autenticate
    dashboard/
      Dashboard.jsx            # Pagina principale (domande d'esame)
      AddQuestionModal.jsx     # Modale creazione domanda
      EditQuestionModal.jsx    # Modale modifica domanda
      SuggestInput.jsx         # Input testo con dropdown suggerimenti (riutilizzato anche in documents/)
    documents/
      DocumentsPage.jsx        # Schermata documenti (struttura identica a Dashboard)
      AddDocumentModal.jsx     # Modale upload documento con drag & drop
    tests/
      TestsPage.jsx            # Schermata test (struttura identica a Dashboard/DocumentsPage)
      TestModal.jsx            # Modale unica creazione/modifica test (inline add section, 3 tab, drag & drop riordino)
      ExportTestModal.jsx      # Modale esportazione test (Word, Moodle XML, PDF, Aiken)
  styles/
    theme.js                   # Palette colori, font, BLOOM_STYLES, BLOOM_LEVELS, BLOOM_LABELS
  App.jsx                      # Router principale
  main.jsx                     # Entry point React
public/
  prompts/
    req_prompt.txt             # Template prompt per classificazione Bloom (usato da classifyBloom.js)
```

**Route:**
- `/login` → `Login`
- `/` → `Dashboard` (protetta da `ProtectedRoute`)
- `/documents` → `DocumentsPage` (protetta da `ProtectedRoute`)
- `/tests` → `TestsPage` (protetta da `ProtectedRoute`)
- `*` → redirect a `/`

---

## PocketBase — Collection `Question`

| Campo           | Tipo         | Note                                                                 |
|-----------------|--------------|----------------------------------------------------------------------|
| `id`            | string       | ID univoco generato da PocketBase                                    |
| `subject`       | string       | Materia (ex: "Matematica") — **era `matter` nelle versioni precedenti** |
| `topic`         | string       | Argomento/sottoargomento (ex: "Derivate") — campo aggiunto di recente |
| `content`       | string       | Testo completo della domanda                                         |
| `options`       | JSON (array) | Opzioni di risposta                                                  |
| `correct_answer`| string       | Una delle opzioni (stringa, non array)                               |
| `bloom_level`   | string       | `remember`\|`understand`\|`apply`\|`analyze`\|`evaluate`\|`create` — oppure `""` |
| `owner`         | string       | ID utente autenticato (relation → collection `users`)                |

**Operazioni PocketBase usate:**
```js
// Caricamento — filtrare sempre per owner
pb.collection('Question').getFullList({ sort: '-created', filter: `owner = "${pb.authStore.model.id}"` })

// Cancellazione
pb.collection('Question').delete(id)

// Creazione
pb.collection('Question').create({
  subject, topic, content,
  options,        // array di stringhe non vuote
  correct_answer, // stringa singola
  bloom_level,    // può essere ""
  owner: pb.authStore.model.id,
})

// Modifica
pb.collection('Question').update(id, {
  subject, topic, content,
  options,        // array di stringhe non vuote
  correct_answer, // stringa singola
  bloom_level,    // può essere ""
  // owner NON va aggiornato
})
```

**Nota:** PocketBase JS SDK deserializza automaticamente i campi JSON (es. `options`) in oggetti/array JavaScript. Non serve `JSON.parse` sui record restituiti.

**IMPORTANTE — `subject` è una stringa plain:** NON convertire `subject` in una relation verso una collection separata. Rimane un campo stringa in tutte le collection (`Question`, `Test`, `Document`). I suggerimenti materia si derivano dai record esistenti, non da una collection dedicata.

---

## PocketBase — Collection `Test`

| Campo         | Tipo              | Note                                                    |
|---------------|-------------------|---------------------------------------------------------|
| `id`          | string            | ID univoco PocketBase                                   |
| `description` | string            | Nome/titolo del test                                    |
| `subject`     | string            | Materia                                                 |
| `topic`       | string            | Argomento                                               |
| `questions`   | relation (multi)  | Relazione multipla verso `Question`; `maxSelect: 999`   |
| `owner`       | string            | ID utente autenticato (relation → users)                |
| `created`     | autodate          | `onCreate: true, onUpdate: false`                       |
| `updated`     | autodate          | `onCreate: true, onUpdate: true`                        |

**Operazioni PocketBase usate:**
```js
// Caricamento con espansione relazione
pb.collection('Test').getFullList({ sort: '-created', filter: `owner = "${pb.authStore.model.id}"`, expand: 'questions' })

// Creazione
pb.collection('Test').create({ description, subject, topic, questions: [...selectedQIds], owner: pb.authStore.model.id })

// Modifica
pb.collection('Test').update(id, { description, subject, topic, questions: questions.map(q => q.id) })

// Cancellazione
pb.collection('Test').delete(id)
```

**Note critiche:**
- **`maxSelect: 999`** obbligatorio per multi-relazione reale; con `maxSelect: 0` o `maxSelect: 1` PocketBase salva solo l'ultimo elemento inviato
- **Campi autodate non sono aggiunti automaticamente in PocketBase v0.23+**: vanno creati esplicitamente con `type: "autodate"`, `onCreate`, `onUpdate`; senza di essi `sort: '-created'` restituisce 400
- Record espanso: `test.expand?.questions` può essere `undefined` (nessuna domanda), oggetto singolo, o array → normalizzare sempre: `Array.isArray(x) ? x : x ? [x] : []`

---

## PocketBase — Collection `Document`

| Campo     | Tipo   | Note                                                                 |
|-----------|--------|----------------------------------------------------------------------|
| `id`      | string | ID univoco PocketBase                                                |
| `title`   | string | Titolo leggibile del documento (mostrato nella lista al posto di `file`) |
| `subject` | string | Materia                                                              |
| `topic`   | string | Argomento                                                            |
| `file`    | file   | File caricato (campo file singolo PocketBase)                        |
| `text`    | string | Testo estratto dal file all'upload (via `extractText.js`)            |
| `owner`   | string | ID utente autenticato (relation → users)                             |

**Operazioni PocketBase usate:**
```js
// Caricamento — filtrare sempre per owner
pb.collection('Document').getFullList({ sort: '-created', filter: `owner = "${pb.authStore.model.id}"` })

// Creazione (upload file — obbligatorio FormData)
const formData = new FormData();
formData.append('title', title.trim());
formData.append('subject', subject.trim());
formData.append('topic', topic.trim());
formData.append('file', fileObject);
formData.append('text', extractedText);   // testo estratto da extractText(file)
formData.append('owner', pb.authStore.model.id);
await pb.collection('Document').create(formData);

// Cancellazione
await pb.collection('Document').delete(id);

// URL file
pb.files.getURL(record, record.file)
```

**Note:**
- `record.file` è il nome del file con suffisso random PocketBase (es. `"doc_daq6zy.pdf"`) — non usarlo come label visibile
- `record.title` è il nome leggibile da mostrare; fallback: `record.title || record.file`
- Estensione: `record.file?.split('.').pop()?.toLowerCase() ?? ''`
- Upload file richiede sempre `FormData`, non oggetto plain

---

## Dashboard — Comportamento attuale

### Struttura tabella a tre livelli di espansione

```
▶ Matematica                          (livello 1 — subject)
    ▶ Derivate                        (livello 2 — topic)
        ☐ ▶ Qual è la derivata di...  (livello 3 — domanda)
               Testo completo         (livello 4 — dettaglio, espanso al click)
               Opzioni
               Risposta corretta
```

**Gerarchia visiva:** indentazione (`paddingLeft`) crescente per livello.

### Stato React

```js
const [data, setData]                           = useState([]);
const [loading, setLoading]                     = useState(true);
const [error, setError]                         = useState('');
const [globalFilter, setGlobalFilter]           = useState('');
const [expandedSubjects,  setExpandedSubjects]  = useState(new Set()); // chiave: subject string
const [expandedTopics,    setExpandedTopics]    = useState(new Set()); // chiave: `${subject}::${topic}`
const [expandedQuestions, setExpandedQuestions] = useState(new Set()); // chiave: question id
const [selectedIds,       setSelectedIds]       = useState(new Set()); // chiave: question id
const [showDeleteModal, setShowDeleteModal]     = useState(false);
const [deleting, setDeleting]                   = useState(false);
const [showAddModal, setShowAddModal]           = useState(false);
const [openMenuId, setOpenMenuId]               = useState(null);      // id domanda con menu aperto
const [editQuestion, setEditQuestion]           = useState(null);      // record domanda in modifica
const [classifyingId, setClassifyingId]         = useState(null);      // id domanda in classificazione Bloom
```

### Selezione e cancellazione

- Checkbox su ogni riga domanda (livello 3)
- `e.stopPropagation()` sulla checkbox per non triggerare l'espansione della riga
- Pulsante `Elimina N domande` con icona `Trash2` nella toolbar, visibile solo se `selectedIds.size > 0`
- Modale di conferma con pulsanti Annulla / Elimina
- Cancellazione in parallelo:
  ```js
  await Promise.all([...selectedIds].map(id => pb.collection('Question').delete(id)));
  ```
- Dopo la cancellazione: svuotare `selectedIds`, chiudere la modale, ricaricare i dati

### Ricerca

- `globalFilter` filtra per `subject`, `topic`, `content`, `bloom_level`
- Tutti i gruppi vengono mostrati senza paginazione (`groupedData` usato direttamente nel render)
- Il refresh (`RefreshCw`) ricarica i dati e svuota la selezione
- Il pulsante `+ Aggiungi` (verde `C.green`, icona `Plus`) apre `AddQuestionModal`

---

## Classificazione Bloom — Council di modelli AI

La funzione `classifyBloomCouncil(q, apiKey)` in `src/lib/classifyBloom.js` classifica automaticamente il livello Bloom di una domanda tramite il voto a maggioranza di 3 modelli AI distinti.

### Modelli nel council

```js
const COUNCIL_MODELS = [
  "google/gemini-2.0-flash-001",
  "meta-llama/llama-3.1-8b-instruct",
  "nvidia/nemotron-3-super-120b-a12b:free",
];
```

### Flusso di classificazione

1. Carica il template del prompt da `/prompts/req_prompt.txt` (fetch a runtime)
2. Sostituisce i placeholder `{example_en}`, `{answers_en}`, `{example_question_type}` con i dati della domanda
3. Invia la richiesta a tutti e 3 i modelli in parallelo (`Promise.allSettled`) tramite OpenRouter API
4. Parla la risposta di ciascun modello: cerca il primo `BLOOM_CATEGORIES` che appare nel testo (case-insensitive)
5. Calcola il vincitore per maggioranza dei voti validi
6. Aggiorna il record PocketBase: `pb.collection('Question').update(q.id, { bloom_level: winner })`
7. Restituisce `{ winner, modelVotes }` (ogni voto ha `model`, `vote`, `reply`)

### API Key

L'API key OpenRouter viene passata da Dashboard come `import.meta.env.VITE_OPENROUTER_API_KEY` (variabile d'ambiente Vite, nel file `.env`).

### Stato durante la classificazione

- `classifyingId` tiene traccia dell'id della domanda in corso di classificazione
- Mentre `classifyingId === q.id`, la riga mostra `···` al posto del `BloomBadge`
- Il pulsante "Classifica" nel menu è disabilitato (`opacity: 0.4`, `cursor: not-allowed`) finché una classificazione è in corso
- Log in console: voti dei modelli (`console.table`) e vincitore (`console.log`)
- In caso di errore: `alert("Classificazione fallita: " + err.message)`

### Prompt template (`public/prompts/req_prompt.txt`)

Il template è un prompt in inglese che:
- Definisce la persona come esperto di pedagogia e tassonomia di Bloom (revisione Anderson & Krathwohl)
- Elenca i 6 livelli con definizioni operative
- Inietta la domanda (`{example_en}`), le opzioni (`{answers_en}`) e il tipo Moodle (`{example_question_type}`)
- Richiede output nel formato esatto:
  ```
  BLOOM_LEVEL : [nome del livello]
  RATIONALE: [motivazione]
  ```

---

## Palette colori e stile

Tutti i valori di stile sono esportati da `src/styles/theme.js` e importati nei componenti.

```js
// src/styles/theme.js
export const C = {
  bg:          '#F5F0E8',
  surface:     '#FEFCF7',
  border:      '#DDD5C2',
  borderLight: '#EDE8DC',
  headerBg:    '#F0EBE0',
  expandBg:    '#F8F5EF',
  green:       '#2C3E2D',
  greenLight:  '#3A5C3C',
  greenText:   '#D4E8D0',   // testo chiaro su sfondo verde
  greenAccent: '#A8C5A0',
  text:        '#1C2B1D',
  textMuted:   '#7A7060',
  textFaint:   '#9A9080',
  textBody:    '#5A5040',
  dot:         '#B8AD9A',
  error:       { bg: '#F7EDE6', border: '#E8C8B8', text: '#8A3A1A' },
};

export const font  = "'DM Sans', sans-serif";   // Google Fonts
export const serif = 'Lora, serif';             // Google Fonts

export const BLOOM_STYLES = {
  remember:   { background: '#E6EEF6', color: '#2A5C8A' },
  understand: { background: '#E6F2ED', color: '#1F6B4E' },
  apply:      { background: '#EFF5E6', color: '#3F6B18' },
  analyze:    { background: '#FBF2DC', color: '#7A5010' },
  evaluate:   { background: '#F7EDE6', color: '#8A3A1A' },
  create:     { background: '#F3E8F0', color: '#6A2860' },
};

export const BLOOM_LEVELS = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'];
export const BLOOM_LABELS = {
  remember: 'Remember', understand: 'Understand', apply: 'Apply',
  analyze: 'Analyze', evaluate: 'Evaluate', create: 'Create',
};
```

**Azioni distruttive:** `#8A3A1A` (testo), `#F7EDE6` (sfondo), `#E8C8B8` (bordo).

---

## Componenti

### Componenti interni a `Dashboard.jsx`

| Nome             | Tipo     | Descrizione                                                  |
|------------------|----------|--------------------------------------------------------------|
| `BloomBadge`     | componente | Badge colorato per il livello Bloom; fallback grigio se livello non riconosciuto |
| `JsonItems`      | componente | Renderizza un array JSON come lista puntata                  |
| `QuestionDetail` | componente | `<tr>` con testo completo, opzioni e risposta corretta       |
| `thStyle(w?)`    | funzione   | Restituisce lo stile inline per le celle `<th>`              |

### Componenti separati (`src/components/dashboard/`)

| File                  | Props                                      | Descrizione                                                                                       |
|-----------------------|--------------------------------------------|---------------------------------------------------------------------------------------------------|
| `SuggestInput.jsx`    | `label`, `value`, `onChange`, `suggestions` | Input testo + dropdown suggerimenti filtrati per sottostringa; chiude al click fuori (useRef + mousedown) |
| `AddQuestionModal.jsx`| `data`, `onClose`, `onSaved`              | Modale creazione domanda; modalità **Manuale** (form standard) e **Genera da documento** (AI); tab switch nell'header |
| `EditQuestionModal.jsx`| `question`, `data`, `onClose`, `onSaved` | Modale modifica domanda; pre-popola il form dal record, chiama `pb.collection('Question').update(id, ...)` |

### Componenti separati (`src/components/tests/`)

| File              | Props                              | Descrizione                                                                                   |
|-------------------|------------------------------------|-----------------------------------------------------------------------------------------------|
| `TestsPage.jsx`   | —                                  | Schermata test; struttura identica a Dashboard (3 livelli, bulk delete, no paginazione)       |
| `TestModal.jsx`   | `test?`, `data`, `onClose`, `onSaved`, `initialQuestions?` | Modale unica creazione/modifica test; `isEdit = test !== null`; lista domande riordinabile via drag & drop + sezione inline "Aggiungi domanda" (3 tab) |
| `ExportTestModal.jsx` | `test`, `onClose` | Modale esportazione test; supporta Word, Moodle XML, PDF (senza risposta corretta), Aiken (con risposta corretta) |

**Comportamento righe test (livello 3) in `TestsPage`:**
- Righe test sono espandibili: click apre il dettaglio con la lista delle domande del test
- Expand set: `expandedTests` — chiave: test `id`
- Domande nel dettaglio mostrano: contenuto (clamp 2 righe), subject/topic, BloomBadge, indicatore risposta corretta

### Componenti separati (`src/components/documents/`)

| File                   | Props                        | Descrizione                                                                              |
|------------------------|------------------------------|------------------------------------------------------------------------------------------|
| `DocumentsPage.jsx`    | —                            | Schermata documenti; struttura identica a Dashboard (3 livelli, paginazione, bulk delete) |
| `AddDocumentModal.jsx` | `data`, `onClose`, `onSaved` | Modale upload file con drag & drop; usa `SuggestInput` da `dashboard/`                   |

**Componenti interni a `DocumentsPage.jsx`:**
- `TypeBadge({ ext })` — badge colorato per tipo file: `pdf` rosso, `docx/doc` blu, `txt` grigio-beige, altri neutri
- `thStyle` — identico a Dashboard (pattern da replicare in nuove schermate)

**Comportamento righe documento (livello 3) in `DocumentsPage`:**
- Le righe documento NON sono espandibili (nessun `DocDetail`, nessun chevron)
- Il titolo è un `<a href={pb.files.getURL(doc, doc.file)} target="_blank">` che apre il file direttamente
- Label visibile: `doc.title || doc.file || '—'`
- Il filtro di ricerca include `title`, `subject`, `topic`, `file`

---

## Prompt per modifiche future

### Aggiungere un nuovo livello o campo

Quando modifichi la struttura della tabella tieni presente:
- Lo stato `expandedSubjects` / `expandedTopics` usa chiavi stringa; se aggiungi un livello, scegli una chiave composita univoca (es. `subject::topic::subtopic`)
- Tutti i gruppi vengono renderizzati direttamente da `groupedData` senza paginazione
- I campi del record PocketBase si leggono direttamente da `q.nomeCampo`

### Normalizzazione chiavi di raggruppamento

- Applicare sempre `.trim()` a `subject` e `topic` prima di usarli come chiavi nel `useMemo` di raggruppamento
- Previene duplicati causati da spazi iniziali/finali nei dati PocketBase
- Pattern:
  ```js
  const subject = (q.subject || 'Senza materia').trim();
  const topic   = (q.topic   || 'Senza argomento').trim();
  ```

### Struttura raggruppamento attesa

```js
// Struttura dati derivata (useMemo)
[
  {
    subject: 'Matematica',
    topics: [
      {
        topic: 'Derivate',
        questions: [ /* record PocketBase */ ]
      }
    ]
  }
]
```

### Aggiungere un'azione bulk (es. esporta, modifica)

1. Aggiungere il pulsante nella toolbar condizionato a `selectedIds.size > 0`
2. Raccogliere i record completi con: `data.filter(q => selectedIds.has(q.id))`
3. Gestire la logica in una funzione asincrona separata con stato `loading` dedicato

---

## Pattern riutilizzabili

### Dropdown suggerimenti (SuggestInput)
- `useRef` sul wrapper + listener `mousedown` su `document` per chiudere al click fuori
- Filtra per sottostringa case-insensitive; mostra solo se `value.trim()` non è vuoto
- `onMouseDown={e => e.preventDefault()}` sull'`<li>` per evitare `onBlur` prima del click

### Modale form con validazione
- Stato form separato (`initialForm` costante esterna per reset pulito)
- Validazione sincrona pre-submit → `setFormError(msg); return`
- Errore inline con stile `C.error`; modale non si chiude su errore
- Pulsante Salva disabilitato + spinner durante `saving`; testo "Salvataggio…"
- Overlay chiudibile al click (se non `saving`); `e.stopPropagation()` sul contenuto
- Larghezza: `min(600px, 90vw)`; body scrollabile con `overflowY: auto`

### Validazione a due step con warning (campi opzionali)
Pattern per campi che possono essere omessi ma richiedono conferma esplicita:
```js
const [warning, setWarning] = useState('');

// In handleSubmit, dopo gli errori bloccanti:
// Errore bloccante: argomento senza materia
if (!subject && topic) { setFormError('Inserisci la materia...'); setWarning(''); return; }

// Warning con conferma al secondo click
const warnMsg = !subject && !topic ? 'Messaggio A' : subject && !topic ? 'Messaggio B' : '';
if (warnMsg && warning !== warnMsg) { setWarning(warnMsg); setFormError(''); return; }

// Altrimenti procedi con il salvataggio
```
- `setField` deve resettare anche `warning` oltre a `formError`
- Warning visualizzato con stile ambra: `background:'#FBF2DC', border:'1px solid #D4B84A', color:'#7A5010'`
- Messaggio suggerisce: "Premi nuovamente 'Salva' per confermare."
- Regole subject/topic applicate in `AddQuestionModal` e `AddDocumentModal`

### Auto-fill titolo da file selezionato
Quando l'utente seleziona un file, pre-compilare il campo `title` se ancora vuoto:
```js
function handleFile(file) {
  if (!file) return;
  const nameWithoutExt = file.name.replace(/\.[^.]+$/, '');
  setForm(f => ({ ...f, file, title: f.title.trim() ? f.title : nameWithoutExt }));
}
```
- Non sovrascrive un titolo già inserito manualmente
- Applicato in `AddDocumentModal`

### Correct answer sincronizzata con options
- Usare `useEffect` su `[form.options]` **solo in `AddQuestionModal`** (dove `correct_answer` parte vuoto):
  ```js
  const validOptions = form.options.filter(o => o.trim() !== '');
  useEffect(() => {
    if (form.correct_answer && !validOptions.includes(form.correct_answer))
      setForm(f => ({ ...f, correct_answer: '' }));
  }, [form.options]);
  ```
- **Non usare questo `useEffect` in `EditQuestionModal`**: girerebbe al mount e svuoterebbe il valore pre-popolato. La validazione al submit è sufficiente a catturare risposte non più valide.

### Menu a 3 puntini per domanda (kebab menu)
- Stato: `openMenuId` (id domanda con menu aperto) — un solo menu aperto alla volta
- Chiusura: `mousedown` globale su `document` → `setOpenMenuId(null)`; il wrapper del menu usa `onMouseDown={e => e.stopPropagation()}` per non chiudersi al click interno
- Voci:
  - **Modifica** (`Pencil`) → `setEditQuestion(q); setOpenMenuId(null)`
  - **Elimina** (`Trash2`) → `setSelectedIds(new Set([q.id])); setShowDeleteModal(true); setOpenMenuId(null)`
  - **Classifica** (`Tag`) → `handleClassify(q)` — avvia la classificazione Bloom asincrona
- "Elimina" da menu riusa il modale di conferma bulk esistente con selezione singola
- "Classifica" disabilitato se `classifyingId !== null` (una classificazione già in corso)

### `correct_answer` come stringa plain in `QuestionDetail`
- Non usare `JsonItems` per `correct_answer`: è una stringa semplice, non un array
- Renderizzare direttamente: `{question.correct_answer || '—'}`
- `JsonItems` va usato solo per `options` (array JSON)

### Topic contestuale per subject
- I suggerimenti topic si filtrano per match esatto (case-insensitive) sulla subject corrente:
  ```js
  data.filter(q => q.subject.trim().toLowerCase() === subj).map(q => q.topic.trim())
  ```
- Se subject è vuota → array suggerimenti topic vuoto

### Nav tabs nella topbar (navigazione tra schermate)
- Usa `useNavigate` + `useLocation` da `react-router-dom`
- Tab attiva: `location.pathname === '/path'` → `background: C.green, color: '#FFF', border: 'none'`
- Tab inattiva: `background: 'transparent', color: C.textMuted, border: \`1px solid ${C.border}\``
- Posizionata nella topbar tra logo+titolo e info utente
- Pattern applicato in tutte e tre le schermate (Dashboard, DocumentsPage, TestsPage)
- Tab attuali: **Domande** (`/`), **Documenti** (`/documents`), **Test** (`/tests`)

### Modal con tab mode switch (es. Manuale / Genera)
- Stato: `const [mode, setMode] = useState('manual')` — stringa enum
- Tab nell'header del modale (sotto il titolo), stesso stile delle nav tab topbar
- `isBusy` = OR di tutti gli stati async (`saving || generating || savingGenerated`) — usare per disabilitare overlay-close, X, tab switch, pulsanti Annulla
- Body condizionale: `{mode === 'manual' && <> … </>}` / `{mode === 'generate' && <> … </> }`
- Footer adattivo: pulsante primario cambia in base a `mode` e allo stato della generazione

### Estrazione testo dai documenti (architettura)

**Regola fondamentale:** l'estrazione avviene **una sola volta all'upload** in `AddDocumentModal`, viene salvata nel campo `doc.text` su PocketBase, e riletta da tutti i modali di generazione.

- `src/lib/extractText.js` espone `extractText(file, onProgress)`:
  - `.txt` → `file.text()`
  - `.pdf` → `pdfjs-dist`; se testo `< 80 chars` (PDF scansionato) → fallback Tesseract OCR (`ita+eng`)
  - altri formati → stringa vuota
- Nei modali di generazione (`AddQuestionModal`, `TestModal`):
  ```js
  const docText = (doc.text || '').trim();
  ```
- **Non importare** `pdfjs-dist` o `tesseract.js` nei modali di generazione — usare sempre `doc.text`
- Troncare a 4000 caratteri prima di passare al prompt: `docText.slice(0, 4000)`

### Generazione domande AI da documento
- Modello: `meta-llama/llama-3.1-8b-instruct` via OpenRouter
- System message: `"Sei un esperto nella creazione di quiz educativi."`
- Temperature: `0.5`
- Prompt template (invariante):
  ```
  Crea un quiz di livello scuola superiore basato sul testo fornito.
  Genera esattamente {N} domande in lingua ITALIANA.
  Rispetta rigorosamente questo formato per ogni domanda:

  > [Testo della domanda]
  a) [Opzione A]
  b) [Opzione B]
  c) [Opzione C]
  d) [Opzione D]
  * Correct Answer: [Lettera, esempio: a)]

  Testo: {testo_troncato_4000}
  ```
- Parsing risposta con `parseGeneratedQuestions(rawText)`:
  - Split su `/\n(?=> )/` per separare i blocchi domanda
  - Testo domanda: `lines[0].replace(/^> /, '').trim()`
  - Opzioni: lette per **posizione** `lines[1..4]`, rimuovendo prefisso `a) `…`d) `
  - Risposta corretta: regex `/\* Correct Answer:\s*([a-d])\)?/i`
  - Blocchi con `lines.length < 6` o testo vuoto vengono scartati

### Salvataggio domande generate
- Tutte le domande selezionate (1 o N) vengono salvate direttamente con `Promise.all` → `onSaved()`; nessun comportamento biforcato per singola domanda
- `bloom_level` sempre `''` (classificare dopo con il council)
- `subject` e `topic` sono portati dalla domanda stessa (`q.subject`, `q.topic`), non riletti dal documento al momento del salvataggio
- Le domande generate vengono arricchite con `subject`/`topic` del documento sorgente **al momento del parsing**, non al salvataggio:
  ```js
  const withMeta = parsed.map(q => ({ ...q, subject: doc.subject.trim(), topic: doc.topic.trim() }));
  ```
- Struttura oggetto domanda generata: `{ content, options, correct_answer, subject, topic }`

### Filtro owner obbligatorio su tutte le query
- Ogni `getFullList` su `Question` e `Document` deve includere `filter: \`owner = "${pb.authStore.model.id}"\``
- Applicato in: `Dashboard.jsx`, `DocumentsPage.jsx`, `AddQuestionModal.jsx` (caricamento documenti per generazione)
- Garantisce che ogni utente veda solo i propri dati

### Dropdown ricercabile inline (senza SuggestInput)
Pattern per selezionare un record da una lista con ricerca testuale, quando serve tracciare anche l'`id` selezionato (diversamente da `SuggestInput` che gestisce solo stringhe):
```js
const [docSearch, setDocSearch]   = useState('');   // testo visibile
const [selectedDocId, setSelectedDocId] = useState(''); // id del record selezionato
const [showDocList, setShowDocList] = useState(false);
const docSearchRef = useRef(null);

// Click-outside
useEffect(() => {
  function handleMouseDown(e) {
    if (docSearchRef.current && !docSearchRef.current.contains(e.target)) setShowDocList(false);
  }
  document.addEventListener('mousedown', handleMouseDown);
  return () => document.removeEventListener('mousedown', handleMouseDown);
}, []);
```
- Filtra per sottostringa case-insensitive sul label (`title || file`); se ricerca vuota → mostra tutto
- `onMouseDown={e => e.preventDefault()}` sulle `<li>` per evitare blur prima del click
- Nessuna pre-selezione automatica al caricamento — l'utente sceglie esplicitamente
- Voce selezionata evidenziata con `color: C.green, fontWeight: 600, background: C.expandBg`

### Inline editing di card in lista (es. domande generate)
Pattern per editare un item di una lista direttamente nella card, senza modale separata:
```js
const [editingIdx, setEditingIdx] = useState(null);
const [editForm, setEditForm]     = useState({});

function openEdit(idx) {
  setEditingIdx(idx);
  setEditForm({ ...items[idx] });
}
function confirmEdit() {
  setItems(prev => prev.map((item, i) => i === editingIdx ? { ...item, ...editForm } : item));
  setEditingIdx(null);
}
```
- La card alterna tra read view (con pulsante `Pencil`) e form inline (con pulsanti Annulla / Conferma con `Check`)
- `onClick` sul wrapper della read view gestisce la selezione; `e.stopPropagation()` sul pulsante edit per non triggerare il click del wrapper
- Il form inline include tutti i campi editabili del record (inclusi `subject`, `topic`)

### Filtro owner obbligatorio su tutte le query (aggiornato)
- Applicato anche a `Test` oltre che `Question` e `Document`

### Sezione inline come alternativa alla sub-modale
Pattern per funzionalità secondarie (es. "aggiungi elemento") da mostrare dentro la stessa modale senza aprirne un'altra:
```js
const [showAdd, setShowAdd] = useState(false);
const [addMode, setAddMode] = useState('manual'); // enum tab

function handleItemsAdded(newItems) {
  setItems(prev => {
    const ids = new Set(prev.map(i => i.id));
    return [...prev, ...newItems.filter(i => !ids.has(i.id))]; // deduplication
  });
  setShowAdd(false);
}
```
- `showAdd` alterna tra pulsante dashed "Aggiungi" e sezione bordered con tab bar + contenuto
- La sezione inline ha header con tab (`manual` | `generate` | `mine`) + pulsante X di chiusura
- Lo stato della lista principale è gestito in-memory (ottimistico); la persistenza avviene solo al salvataggio finale
- Deduplica sempre per `id` prima di appendere nuovi elementi

### Lazy-load dati accessori su richiesta
Pattern per caricare dati necessari solo quando una sezione viene aperta (evita fetch inutili):
```js
const [items, setItems]   = useState([]);
const [loading, setLoading] = useState(false);

useEffect(() => {
  if (!showSection) return;      // non caricare se la sezione è chiusa
  if (items.length > 0) return;  // già caricati, non ricaricare
  setLoading(true);
  pb.collection('X').getFullList({ ... }).then(setItems).finally(() => setLoading(false));
}, [showSection]);
```
- Applicato in `TestModal` per `allQuestions` (caricato solo quando `showAdd` diventa `true`)

### `existingIds` per deduplicazione relazioni
Quando una modale gestisce una lista di record correlati, mantenere un `Set` degli id già presenti per filtrare i candidati aggiungibili:
```js
const existingIds = useMemo(() => new Set(items.map(i => i.id)), [items]);
// Uso in MineTab: available = allItems.filter(i => !existingIds.has(i.id))
```

### Drag & drop riordino lista (HTML5 nativo)
Pattern per riordinare una lista di item via trascinamento senza librerie esterne:
```js
const [dragIdx, setDragIdx]         = useState(null);
const [dragOverIdx, setDragOverIdx] = useState(null);

function handleDragStart(e, idx) { setDragIdx(idx); e.dataTransfer.effectAllowed = 'move'; }
function handleDragOver(e, idx)  { e.preventDefault(); if (idx !== dragIdx) setDragOverIdx(idx); }
function handleDrop(e, idx) {
  e.preventDefault();
  if (dragIdx === null || dragIdx === idx) { setDragIdx(null); setDragOverIdx(null); return; }
  setItems(prev => { const next = [...prev]; const [m] = next.splice(dragIdx, 1); next.splice(idx, 0, m); return next; });
  setDragIdx(null); setDragOverIdx(null);
}
function handleDragEnd() { setDragIdx(null); setDragOverIdx(null); }
```
- Ogni riga: `draggable={true}` + i 4 handler sopra
- Feedback visivo: `opacity: 0.4` sull'item trascinato; `borderTop: '2px solid C.green'` sull'item di destinazione
- Aggiungere icona `GripVertical` (lucide-react) come handle visivo sul lato sinistro della riga
- La checkbox deve avere `onMouseDown={e => e.stopPropagation()}` per non interferire col drag
- L'ordine aggiornato in-memory viene persistito al salvataggio finale (ottimistico)
- Applicato in `TestModal` per riordinare le domande del test

### Modale unica creazione/modifica (pattern `isEdit`)
Quando add e edit condividono la stessa UI, usare una singola modale con prop opzionale:
```js
export default function XModal({ record = null, ...rest }) {
  const isEdit = record !== null;
  // form pre-popolato: record?.field || ''
  // submit: isEdit ? pb.update(record.id, data) : pb.create(data)
}
```
- Label pulsante salva: `isEdit ? 'Salva modifiche' : 'Salva'`
- Titolo header: `isEdit ? 'Modifica X' : 'Nuovo X'`
- Applicato in `TestModal` (unifica `AddTestModal` + `EditTestModal`)

### File upload con drag & drop (AddDocumentModal)
- Area drop: bordo `2px dashed C.border`; al drag-over → bordo `#5C7A5E`, sfondo `#EFF5E6`
- Gestire `onDragOver` (preventDefault), `onDragLeave`, `onDrop` (legge `e.dataTransfer.files[0]`)
- `<input type="file" hidden ref={fileInputRef}>` attivato da click sull'area o sul link "sfoglia"
- Quando file selezionato: mostrare nome + icona + pulsante X per rimuovere
- Upload obbligatoriamente via `FormData` (non oggetto plain): `formData.append('file', fileObject)`
- Validazione: materia obbligatoria, file obbligatorio; errore inline con `C.error`

---

## Esportazione test (`src/lib/exportTest.js`)

Tutte le funzioni export usano `downloadBlob(blob, filename)` e `safeFilename(name)` definite nello stesso file.
Le librerie pesanti (`docx`, `jspdf`) vengono importate **dinamicamente** (`await import(...)`) per evitare di appesantire il bundle iniziale.

| Formato      | Funzione           | Risposta corretta | Note |
|--------------|--------------------|--------------------|------|
| Word (.docx) | `exportWord`       | No                 | `docx` lib, import dinamico |
| Moodle XML   | `exportMoodleXml`  | Sì (`fraction=100`) | sincrono |
| PDF (.pdf)   | `exportPdf`        | No                 | `jspdf` lib, import dinamico; paginazione automatica |
| Aiken (.txt) | `exportAiken`      | Sì (`ANSWER: X`)   | sincrono; formato Moodle plain-text |

### Formato Aiken
Struttura obbligatoria (Moodle rifiuta variazioni):
```
Testo della domanda
A) Opzione A
B) Opzione B
C) Opzione C
D) Opzione D
ANSWER: A
```
- Lettera `ANSWER` derivata dall'indice di `correct_answer` in `options`
- Riga vuota tra domande consecutive

### PDF con jsPDF
- `doc.splitTextToSize(text, maxWidth)` per wrapping manuale del testo
- `checkPage(needed)` controlla spazio residuo e chiama `doc.addPage()` se necessario
- Senza risposta corretta (come Word) — uso didattico/stampa per studenti
