# Portale Docenti

Interfaccia web per professori universitari che vogliono costruire una banca di domande, generarle con l'AI a partire dai propri materiali didattici, classificarle secondo la Tassonomia di Bloom e comporre test da esportare per la stampa o per Moodle.

---

## Funzionalità principali

### Domande
- Tre tipi di domanda: **risposta multipla**, **vero/falso** e **aperta** (con risposta attesa)
- Creazione manuale o **generazione con l'AI** da un documento caricato, scegliendo quante domande di ciascun tipo generare
- Il documento viene diviso in blocchi, così tutto il testo è coperto; ogni domanda generata ricorda il documento e la **pagina di origine** (con link diretto al PDF)
- Prima del salvataggio le domande generate vengono confrontate con l'archivio: i possibili **doppioni** sono segnalati e partono deselezionati
- Classificazione secondo la **Tassonomia di Bloom** tramite il voto a maggioranza di 3 modelli AI, su una domanda o su tante insieme (con barra di avanzamento e possibilità di interrompere)
- Tabella impaginata con ordinamento e filtri per colonna (argomento, testo, tipo, livello Bloom, data), sidebar materie → argomenti e riepilogo della distribuzione Bloom

### Documenti
- Caricamento di più file **PDF**, **TXT**, **DOC** o **DOCX** insieme, con drag & drop in qualsiasi punto della pagina
- Il testo viene estratto una sola volta all'upload (con OCR per i PDF scansionati) e salvato con il documento
- Da ogni documento si avvia direttamente la generazione delle domande (il testo si estrae da PDF e TXT)

### Test
- Editor a pagina intera: dettagli del test, domande riordinabili trascinandole o indicando la posizione, modifica in linea
- Aggiunta di domande dall'archivio con ricerca e filtri per materia, argomento, tipo, livello Bloom e documento di origine
- Esportazione in 4 formati:
  - **Word** (.docx) e **PDF** — per la stampa, senza la risposta corretta
  - **Moodle XML** — importazione diretta in Moodle (risposta multipla, vero/falso, aperta)
  - **Aiken** (.txt) — formato testuale di Moodle (esclude le domande aperte)
- Opzioni di esportazione: mescolamento di domande e risposte, divisione in più file (Fila A, Fila B, … fino a 10), file con le **correzioni**; più file vengono scaricati in un unico `.zip`
- La notazione matematica LaTeX viene convertita in simboli Unicode (es. `x^{2}` → x², `\geq` → ≥)

### Questionario SUS
Dopo la prima esportazione riuscita viene proposto un breve questionario di usabilità (System Usability Scale, versione italiana validata, più 3 domande aperte facoltative). Le risposte si consultano dal pannello admin di PocketBase (collection `Feedback`).

---

## Struttura dell'interfaccia

| Schermata | Percorso | Descrizione |
|-----------|----------|-------------|
| Domande | `/` | Banca domande personale |
| Documenti | `/documents` | Materiali didattici caricati |
| Test | `/tests` | Elenco dei test |
| Editor test | `/tests/new`, `/tests/:id` | Creazione e modifica di un test |

Ogni utente vede **solo i propri dati**: tutte le query sono filtrate per `owner`.

---

## Come iniziare

### Requisiti

- [Node.js](https://nodejs.org/) v18+
- [PocketBase](https://pocketbase.io/) v0.23+ (l'eseguibile va messo in `pocketbase/`)
- Una chiave API [OpenRouter](https://openrouter.ai/) per le funzionalità AI

### Avvio in sviluppo

1. Avvia PocketBase dalla cartella `pocketbase/`:
   ```bash
   cd pocketbase
   ./pocketbase serve
   ```
   Le migration in `pb_migrations/` creano automaticamente le collection. PocketBase è disponibile su `http://127.0.0.1:8090` (admin su `/_/`, dove vanno creati gli utenti).

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

### Collection PocketBase

| Collection | Campi principali |
|------------|------------------|
| `Question` | `subject`, `topic`, `content`, `options` (JSON), `correct_answer`, `bloom_level`, `document`, `page_from`, `page_to`, `owner` |
| `Document` | `title`, `subject`, `topic`, `file`, `text`, `owner` |
| `Test`     | `description`, `subject`, `topic`, `questions` (relation multipla), `owner` |
| `Feedback` | `test`, `export_format`, `sus_answers`, `sus_score`, `open_answers`, `owner` |

Il tipo di domanda non è un campo a sé: si ricava da `options` (vuoto = aperta, `Vero`/`Falso` = vero/falso, altrimenti risposta multipla).

### Modelli AI

I modelli usati per la generazione e per la classificazione Bloom sono configurati in `src/lib/aiModels.js`: è l'unico file da modificare per cambiarli. Ogni posto è una lista `[principale, riserve…]` e OpenRouter passa alla riserva se il modello principale non risponde.

---

## Tecnologie utilizzate

| Scopo | Libreria |
|-------|----------|
| Frontend | React 19 + Vite |
| Routing | React Router DOM v7 |
| Backend / DB | PocketBase |
| Icone | lucide-react |
| Stile | CSS inline + tema in `src/styles/theme.js` |
| AI | OpenRouter API |
| Lettura PDF | pdfjs-dist + Tesseract.js (OCR) |
| Export Word | docx |
| Export PDF | jsPDF (font DejaVu Sans incluso) |
| Archivi zip | fflate |

---

## Struttura del codice

```
src/
  lib/          logica: generazione (generateQuestions.js), classificazione Bloom (classifyBloom.js),
                estrazione testo, esportazione, doppioni, notazione matematica, questionario SUS
  components/
    dashboard/  schermata Domande e relative modali
    documents/  schermata Documenti e upload
    tests/      elenco test, editor, esportazione, questionario SUS
    common/     componenti condivisi (sidebar, paginazione, editor risposte, …)
  styles/       palette, font e stili Bloom
public/prompts/ prompt per la classificazione Bloom
pocketbase/     migration delle collection
scripts/        script di supporto (regole di sicurezza, dati di prova)
```

---

## Flussi d'uso tipici

**Generare domande da un documento**
1. Schermata *Documenti* → carica un PDF
2. Sulla riga del documento → **Genera domande**
3. Scegli quante domande di ciascun tipo generare → **Genera**
4. Rivedi, modifica se serve, seleziona quelle da tenere → **Salva**

**Classificare le domande con Bloom**
- Dal dettaglio di una domanda → **Classifica**, oppure seleziona più domande → **Classifica**
- Tre modelli AI votano in parallelo; il livello più votato viene salvato

**Creare un test ed esportarlo**
1. Schermata *Test* → **Nuovo test**
2. **Aggiungi domande** dall'archivio, riordinale e salva
3. Dal test → **Esporta**, scegli formato e opzioni, poi **Esporta**

---

## Note

- L'estrazione del testo da PDF scansionati (OCR) può richiedere qualche secondo per pagina
- Le librerie di esportazione vengono caricate solo al primo export, che può essere leggermente più lento
