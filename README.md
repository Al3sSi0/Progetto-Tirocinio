# Portale Docenti

Applicazione web per la gestione di domande d'esame, documenti didattici e test. Pensata per docenti che vogliono costruire una banca domande strutturata, generare quiz a partire dai propri materiali e esportarli in formati pronti per Moodle o la stampa.

---

## Funzionalità principali

### Domande
- Crea, modifica ed elimina domande a risposta multipla
- Organizza automaticamente le domande per **materia** e **argomento**
- Classifica ogni domanda secondo la **Tassonomia di Bloom** con un click (classificazione automatica via AI con voto a maggioranza di 3 modelli)
- Seleziona più domande e cancellale in blocco
- Cerca in tempo reale per materia, argomento, testo o livello Bloom

### Documenti
- Carica file **PDF**, **DOCX** o **TXT** con drag & drop
- Il testo viene estratto automaticamente all'upload (con OCR per PDF scansionati)
- I documenti sono la base per la generazione automatica di domande

### Test
- Crea test raccogliendo domande dalla tua banca domande
- Aggiungi domande manualmente, generandole da un documento con l'AI, o pescando dalle domande esistenti
- Riordina le domande trascinandole
- Esporta il test in 4 formati:
  - **Word** (.docx) — per la stampa, senza risposta corretta
  - **PDF** — per la stampa, senza risposta corretta
  - **Moodle XML** — importazione diretta in Moodle
  - **Aiken** (.txt) — formato Moodle plain-text, con risposta corretta

---

## Struttura dell'interfaccia

L'app è divisa in tre schermate accessibili dalla barra di navigazione in alto:

| Schermata | Percorso | Descrizione |
|-----------|----------|-------------|
| Domande | `/` | Banca domande personale |
| Documenti | `/documents` | Materiali didattici caricati |
| Test | `/tests` | Test composti da più domande |

Ogni schermata mostra i dati organizzati su **tre livelli**: materia → argomento → elementi. Si espandono al click. Le azioni su ogni elemento (modifica, elimina, ecc.) sono accessibili dal menu a tre puntini sulla destra della riga.

---

## Come iniziare

### Requisiti

- [Node.js](https://nodejs.org/) v18+
- [PocketBase](https://pocketbase.io/) v0.23+
- Una chiave API [OpenRouter](https://openrouter.ai/) per le funzionalità AI

### Avvio in sviluppo

1. Avvia PocketBase:
   ```bash
   ./pocketbase serve
   ```
   PocketBase sarà disponibile su `http://127.0.0.1:8090`.

2. Crea il file `.env` nella root del progetto:
   ```
   VITE_OPENROUTER_API_KEY=sk-or-...
   ```

3. Installa le dipendenze e avvia il frontend:
   ```bash
   npm install
   npm run dev
   ```

4. Apri il browser su `http://localhost:5173`.

### Configurazione PocketBase

Nell'admin di PocketBase (`http://127.0.0.1:8090/_/`) devono esistere tre collection:

| Collection | Campi principali |
|------------|-----------------|
| `Question` | `subject`, `topic`, `content`, `options` (JSON), `correct_answer`, `bloom_level`, `owner` |
| `Document` | `title`, `subject`, `topic`, `file`, `text`, `owner` |
| `Test`     | `description`, `subject`, `topic`, `questions` (relation multi, maxSelect 999), `owner` |

La relation `questions` in `Test` deve avere **`maxSelect: 999`** — altrimenti PocketBase salva solo l'ultima domanda.

---

## Tecnologie utilizzate

| Scopo | Libreria |
|-------|----------|
| Frontend | React 19 + Vite |
| Routing | React Router DOM v7 |
| Backend / DB | PocketBase |
| Icone | lucide-react |
| Stile | CSS inline (nessun framework UI) |
| AI | OpenRouter API |
| Lettura PDF | pdfjs-dist + Tesseract.js (OCR fallback) |
| Export Word | docx |
| Export PDF | jsPDF |

---

## Flussi d'uso tipici

**Creare una domanda manualmente**
1. Schermata *Domande* → pulsante **+ Aggiungi**
2. Inserisci materia, argomento, testo della domanda e opzioni
3. Indica la risposta corretta
4. Salva — la domanda appare nella banca domande

**Generare domande da un documento**
1. Schermata *Documenti* → carica un PDF o DOCX
2. Schermata *Domande* → **+ Aggiungi** → tab **Genera da documento**
3. Seleziona il documento, scegli quante domande generare → **Genera**
4. Revisiona, modifica se necessario, seleziona quelle da salvare → **Salva**

**Creare un test ed esportarlo**
1. Schermata *Test* → **+ Nuovo test**
2. Aggiungi domande (manualmente, da documento AI, o dalla banca esistente)
3. Riordina trascinando le righe
4. Salva il test, poi apri il menu a tre puntini → **Esporta**
5. Scegli il formato e scarica

**Classificare una domanda con Bloom**
- Menu a tre puntini sulla riga della domanda → **Classifica**
- Tre modelli AI votano in parallelo; il livello vincitore viene salvato automaticamente

---

## Note per il testing

- Ogni utente vede **solo i propri dati** (filtro `owner` su tutte le query)
- Le funzionalità AI richiedono una chiave OpenRouter valida nel file `.env`
- L'estrazione testo da PDF scansionati (OCR) può richiedere qualche secondo
- L'export Word e PDF usa import dinamici: il primo export potrebbe essere leggermente più lento
