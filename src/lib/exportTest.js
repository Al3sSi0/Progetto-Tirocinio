import { questionType } from './questionTypes';
import { prettifyQuestion } from './mathText';
import dejavuRegularUrl from '../assets/fonts/DejaVuSans.ttf?url';
import dejavuBoldUrl from '../assets/fonts/DejaVuSans-Bold.ttf?url';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
export const MAX_VERSIONS = 10;

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function safeFilename(name) {
  return (name || 'test').replace(/[^a-z0-9_\-]/gi, '_').replace(/_+/g, '_').slice(0, 80);
}

function escapeXml(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const cleanOptions = q => (Array.isArray(q.options) ? q.options.filter(o => o?.trim()) : []);
const subtitleOf = test => [test.subject, test.topic].filter(Boolean).join(' — ');
export const versionLabel = i => `Fila ${LETTERS[i] || i + 1}`;

// ── Versioni mescolate (file di una verifica) ─────────────────────────────────

function shuffled(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Le Vero/Falso restano sempre nell'ordine Vero, Falso; le aperte non hanno opzioni.
function shuffleVersion(questions, shuffleQuestions, shuffleAnswers) {
  const list = shuffleQuestions ? shuffled(questions) : questions;
  if (!shuffleAnswers) return list;
  return list.map(q => (questionType(q) === 'multiple' ? { ...q, options: shuffled(cleanOptions(q)) } : q));
}

const signature = qs => qs.map(q => `${q.id}:${cleanOptions(q).join('|')}`).join('#');

// Restituisce `count` versioni [{ label, questions }]; se possibile due versioni non sono mai identiche.
export function makeVersions(questions, { count = 1, shuffleQuestions = false, shuffleAnswers = false } = {}) {
  const seen = new Set();
  return Array.from({ length: count }, (_, i) => {
    let qs = shuffleVersion(questions, shuffleQuestions, shuffleAnswers);
    for (let tries = 0; tries < 30 && seen.has(signature(qs)) && (shuffleQuestions || shuffleAnswers); tries++) {
      qs = shuffleVersion(questions, shuffleQuestions, shuffleAnswers);
    }
    seen.add(signature(qs));
    return { label: count > 1 ? versionLabel(i) : '', questions: qs };
  });
}

// Riga delle correzioni per una domanda: "B) testo", "Vero", oppure la risposta attesa.
// Senza lettere (Moodle mescola le risposte) resta solo il testo della risposta corretta.
function keyAnswer(q, letters = true) {
  const type = questionType(q);
  if (type === 'open') {
    const expected = q.correct_answer?.trim();
    if (!letters) return expected || 'domanda aperta, nessuna risposta attesa';
    return expected ? `Aperta — risposta attesa: ${expected}` : 'Aperta';
  }
  if (type === 'truefalse') return /^(vero|true)$/i.test((q.correct_answer || '').trim()) ? 'Vero' : 'Falso';
  const idx = cleanOptions(q).indexOf(q.correct_answer);
  if (idx < 0) return '—';
  return letters ? `${LETTERS[idx] || idx + 1}) ${q.correct_answer}` : q.correct_answer;
}

// ── Moodle XML ────────────────────────────────────────────────────────────────

function moodleXmlFile(test, questions) {
  const lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<quiz>'];

  // Tipo Moodle secondo il tipo di domanda: multichoice, truefalse, essay (aperta, con la risposta attesa per chi corregge).
  const MOODLE_TYPES = { multiple: 'multichoice', truefalse: 'truefalse', open: 'essay' };

  questions.forEach((q, idx) => {
    const options = Array.isArray(q.options) ? q.options : [];
    const type = questionType(q);
    lines.push(`  <question type="${MOODLE_TYPES[type]}">`);
    lines.push(`    <name><text>${escapeXml(`Q${idx + 1}: ${(q.content || '').slice(0, 60)}`)}</text></name>`);
    lines.push('    <questiontext format="html">');
    lines.push(`      <text><![CDATA[${q.content || ''}]]></text>`);
    lines.push('    </questiontext>');

    if (type === 'truefalse') {
      const isTrue = /^(vero|true)$/i.test((q.correct_answer || '').trim());
      lines.push(`    <answer fraction="${isTrue ? 100 : 0}" format="moodle_auto_format"><text>true</text><feedback><text></text></feedback></answer>`);
      lines.push(`    <answer fraction="${isTrue ? 0 : 100}" format="moodle_auto_format"><text>false</text><feedback><text></text></feedback></answer>`);
      lines.push('  </question>');
      return;
    }
    if (type === 'open') {
      lines.push('    <defaultgrade>1</defaultgrade>');
      lines.push('    <responseformat>editor</responseformat>');
      lines.push('    <responserequired>1</responserequired>');
      lines.push('    <responsefieldlines>10</responsefieldlines>');
      lines.push(`    <graderinfo format="html"><text><![CDATA[${q.correct_answer || ''}]]></text></graderinfo>`);
      lines.push('  </question>');
      return;
    }

    lines.push('    <shuffleanswers>1</shuffleanswers>');
    lines.push('    <single>true</single>');
    lines.push('    <answernumbering>abc</answernumbering>');

    options.filter(o => o?.trim()).forEach(opt => {
      const fraction = opt === q.correct_answer ? 100 : 0;
      lines.push(`    <answer fraction="${fraction}" format="html">`);
      lines.push(`      <text><![CDATA[${opt}]]></text>`);
      lines.push('      <feedback format="html"><text></text></feedback>');
      lines.push('    </answer>');
    });

    lines.push('  </question>');
  });

  lines.push('</quiz>');

  return {
    blob: new Blob([lines.join('\n')], { type: 'application/xml;charset=utf-8' }),
    filename: `${safeFilename(test.description)}_moodle.xml`,
  };
}

// ── Word (.docx) ──────────────────────────────────────────────────────────────

async function wordFile(test, questions, label, filename) {
  const { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Packer } = await import('docx');

  const children = [
    new Paragraph({
      children: [new TextRun({ text: test.description || 'Test', bold: true, size: 36 })],
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
    }),
  ];

  const subtitle = [subtitleOf(test), label].filter(Boolean).join(' · ');
  if (subtitle) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: subtitle, color: '7A7060', size: 20 })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 480 },
      })
    );
  } else {
    children.push(new Paragraph({ text: '', spacing: { after: 240 } }));
  }

  questions.forEach((q, idx) => {
    const options = cleanOptions(q);

    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${idx + 1}. `, bold: true, size: 24 }),
          new TextRun({ text: q.content || '—', size: 24 }),
        ],
        spacing: { before: 320, after: 120 },
      })
    );

    // Domanda aperta: righe vuote per scrivere la risposta.
    if (options.length === 0) {
      for (let i = 0; i < 4; i++) {
        children.push(new Paragraph({ children: [new TextRun({ text: '_'.repeat(80), color: 'B8AD9A', size: 22 })], indent: { left: 480 }, spacing: { after: 160 } }));
      }
    }

    options.forEach((opt, oi) => {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: `${LETTERS[oi] || oi + 1}) ${opt}`, color: '1C2B1D', size: 22 })],
          indent: { left: 480 },
          spacing: { after: 80 },
        })
      );
    });
  });

  const doc = new Document({ sections: [{ children }] });
  return { blob: await Packer.toBlob(doc), filename };
}

// Correzioni Word: una sezione (pagina) per fila. withText: riporta anche il testo della domanda
// (per Moodle, dove ordine di domande e risposte cambia per ogni studente).
async function wordKeyFile(test, versions, filename, withText = false) {
  const { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Packer } = await import('docx');

  const sections = versions.map(v => ({
    children: [
      new Paragraph({
        children: [new TextRun({ text: `Correzioni — ${test.description || 'Test'}`, bold: true, size: 32 })],
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
      }),
      new Paragraph({
        children: [new TextRun({ text: [subtitleOf(test), v.label].filter(Boolean).join(' · ') || ' ', color: '7A7060', size: 20 })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 360 },
      }),
      ...v.questions.flatMap((q, idx) => withText
        ? [
            new Paragraph({
              children: [
                new TextRun({ text: `${idx + 1}. `, bold: true, size: 22 }),
                new TextRun({ text: q.content || '—', bold: true, size: 22 }),
              ],
              spacing: { before: 200, after: 60 },
            }),
            new Paragraph({
              children: [new TextRun({ text: `Risposta: ${keyAnswer(q, false)}`, size: 22 })],
              indent: { left: 480 },
            }),
          ]
        : [new Paragraph({
            children: [
              new TextRun({ text: `${idx + 1}. `, bold: true, size: 22 }),
              new TextRun({ text: keyAnswer(q), size: 22 }),
            ],
            spacing: { after: 100 },
          })]),
    ],
  }));

  return { blob: await Packer.toBlob(new Document({ sections })), filename };
}

// ── PDF ───────────────────────────────────────────────────────────────────────

// Helvetica di jsPDF conosce solo i caratteri occidentali di base: con simboli come ≤ √ π → la riga
// esce con i caratteri staccati e sbagliati. DejaVu Sans copre anche matematica e greco;
// i file (~1,4 MB) si scaricano solo alla prima esportazione PDF.
const PDF_FONT = 'DejaVuSans';
let pdfFonts = null;

function toBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

function loadPdfFonts() {
  pdfFonts ??= Promise.all([dejavuRegularUrl, dejavuBoldUrl].map(async url => {
    const res = await fetch(url);
    if (!res.ok) throw new Error('impossibile caricare il font del PDF');
    return toBase64(await res.arrayBuffer());
  })).catch(e => { pdfFonts = null; throw e; });
  return pdfFonts;
}

async function newPdf() {
  const [{ jsPDF }, [regular, bold]] = await Promise.all([import('jspdf'), loadPdfFonts()]);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  doc.addFileToVFS('DejaVuSans.ttf', regular);
  doc.addFont('DejaVuSans.ttf', PDF_FONT, 'normal');
  doc.addFileToVFS('DejaVuSans-Bold.ttf', bold);
  doc.addFont('DejaVuSans-Bold.ttf', PDF_FONT, 'bold');
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 20;
  const pdf = { doc, pageW, margin, contentW: pageW - margin * 2, y: margin };

  pdf.checkPage = needed => {
    if (pdf.y + needed > pageH - margin) { doc.addPage(); pdf.y = margin; }
  };

  // Titolo centrato + sottotitolo grigio (materia — argomento · Fila A).
  pdf.header = (title, subtitle) => {
    doc.setFont(PDF_FONT, 'bold');
    doc.setFontSize(18);
    const titleLines = doc.splitTextToSize(title, pdf.contentW);
    doc.text(titleLines, pageW / 2, pdf.y, { align: 'center' });
    pdf.y += titleLines.length * 8 + 4;

    if (subtitle) {
      doc.setFont(PDF_FONT, 'normal');
      doc.setFontSize(11);
      doc.setTextColor(120, 112, 96);
      doc.text(subtitle, pageW / 2, pdf.y, { align: 'center' });
      pdf.y += 8;
      doc.setTextColor(0, 0, 0);
    }
    pdf.y += 6;
  };

  return pdf;
}

async function pdfFile(test, questions, label, filename) {
  const pdf = await newPdf();
  const { doc, pageW, margin, contentW } = pdf;
  pdf.header(test.description || 'Test', [subtitleOf(test), label].filter(Boolean).join(' · '));

  questions.forEach((q, idx) => {
    const options = cleanOptions(q);

    doc.setFont(PDF_FONT, 'bold');
    doc.setFontSize(12);
    const qLines = doc.splitTextToSize(`${idx + 1}. ${q.content || '—'}`, contentW);
    const answerLines = options.length === 0 ? 4 : 0; // domanda aperta: righe per la risposta
    pdf.checkPage(qLines.length * 6.5 + options.length * 7 + answerLines * 9 + 8);
    doc.text(qLines, margin, pdf.y);
    pdf.y += qLines.length * 6.5 + 2;

    doc.setFont(PDF_FONT, 'normal');
    doc.setFontSize(11);
    options.forEach((opt, oi) => {
      const optLines = doc.splitTextToSize(`${LETTERS[oi] || oi + 1}) ${opt}`, contentW - 10);
      doc.text(optLines, margin + 8, pdf.y);
      pdf.y += optLines.length * 5.5 + 1.5;
    });

    if (answerLines) {
      doc.setDrawColor(184, 173, 154);
      for (let i = 0; i < answerLines; i++) {
        pdf.y += 8;
        doc.line(margin + 8, pdf.y, pageW - margin, pdf.y);
      }
      pdf.y += 3;
    }

    pdf.y += 5;
  });

  return { blob: doc.output('blob'), filename };
}

// Correzioni PDF: una pagina (o più) per fila. withText come in wordKeyFile.
async function pdfKeyFile(test, versions, filename, withText = false) {
  const pdf = await newPdf();
  const { doc, margin, contentW } = pdf;

  versions.forEach((v, vi) => {
    if (vi > 0) { doc.addPage(); pdf.y = margin; }
    pdf.header(`Correzioni — ${test.description || 'Test'}`, [subtitleOf(test), v.label].filter(Boolean).join(' · '));
    doc.setFontSize(11);
    v.questions.forEach((q, idx) => {
      if (!withText) {
        doc.setFont(PDF_FONT, 'normal');
        const lines = doc.splitTextToSize(`${idx + 1}.  ${keyAnswer(q)}`, contentW);
        pdf.checkPage(lines.length * 5.5 + 2);
        doc.text(lines, margin, pdf.y);
        pdf.y += lines.length * 5.5 + 2;
        return;
      }
      doc.setFont(PDF_FONT, 'bold');
      const qLines = doc.splitTextToSize(`${idx + 1}. ${q.content || '—'}`, contentW);
      doc.setFont(PDF_FONT, 'normal');
      const aLines = doc.splitTextToSize(`Risposta: ${keyAnswer(q, false)}`, contentW - 8);
      pdf.checkPage((qLines.length + aLines.length) * 5.5 + 6);
      doc.setFont(PDF_FONT, 'bold');
      doc.text(qLines, margin, pdf.y);
      pdf.y += qLines.length * 5.5 + 1;
      doc.setFont(PDF_FONT, 'normal');
      doc.text(aLines, margin + 8, pdf.y);
      pdf.y += aLines.length * 5.5 + 4;
    });
  });

  return { blob: doc.output('blob'), filename };
}

// ── Aiken (.txt) ──────────────────────────────────────────────────────────────

// Aiken supporta solo domande a scelta: le domande aperte vengono escluse (la modale di esportazione lo segnala).
const withoutOpen = questions => questions.filter(q => questionType(q) !== 'open');

function aikenFile(test, questions, label, filename) {
  const lines = [];
  questions = withoutOpen(questions);

  questions.forEach((q, idx) => {
    const options = cleanOptions(q);
    const correctIdx = options.indexOf(q.correct_answer);
    const correctLetter = correctIdx >= 0 ? (LETTERS[correctIdx] || 'A') : 'A';

    lines.push(q.content || '—');
    options.forEach((opt, oi) => lines.push(`${LETTERS[oi] || oi + 1}) ${opt}`));
    lines.push(`ANSWER: ${correctLetter}`);
    if (idx < questions.length - 1) lines.push('');
  });

  return {
    blob: new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' }),
    filename,
  };
}

// ── Esportazione ──────────────────────────────────────────────────────────────

// Moodle XML: Moodle mescola da sé domande e risposte, quindi un solo file, niente versioni.
// Word, PDF e Aiken: mescolamento, divisione in file (Fila A, B…) e correzioni.
export const PLATFORM_FORMATS = ['moodle'];
const EXT = { word: 'docx', pdf: 'pdf', aiken: 'txt', moodle: 'xml' };

// Le correzioni di Word e PDF hanno lo stesso formato del test; per Moodle XML e Aiken si sceglie (keyFormat).
const keyFormatOf = (format, keyFormat) => (format === 'word' || format === 'pdf' ? format : keyFormat === 'word' ? 'word' : 'pdf');

// Nomi dei file che verranno creati, per il riepilogo nella modale.
export function plannedFiles(test, format, { versions = 1, answerKey = false, keyFormat = 'pdf' } = {}) {
  const base = safeFilename(test.description);
  const suffix = format === 'aiken' ? '_aiken' : '';
  let files;
  if (format === 'moodle') files = [`${base}_moodle.xml`];
  else if (versions > 1) files = Array.from({ length: versions }, (_, i) => `${base}${suffix}_fila_${LETTERS[i] || i + 1}.${EXT[format]}`);
  else files = [`${base}${suffix}.${EXT[format]}`];
  if (answerKey) files.push(`${base}_correzioni.${EXT[keyFormatOf(format, keyFormat)]}`);
  return { files, zip: files.length > 1 ? `${base}_${format === 'word' || format === 'pdf' ? 'verifica' : format}.zip` : null };
}

// settings: { answerKey, versions, shuffleQuestions, shuffleAnswers, keyFormat }
//   versions/shuffle* ignorati per Moodle XML; keyFormat ('pdf' | 'word') solo per Moodle XML e Aiken.
// Più file → un unico .zip, perché i browser bloccano i download multipli.
export async function exportTest(test, questions, format, settings = {}) {
  const { files: names, zip } = plannedFiles(test, format, settings);
  questions = questions.map(prettifyQuestion); // a^{2n} → a²ⁿ, \geq → ≥, …
  const files = [];

  const isMoodle = format === 'moodle';
  const versions = isMoodle
    ? [{ label: '', questions }]
    : makeVersions(questions, {
        count: settings.versions || 1,
        shuffleQuestions: settings.shuffleQuestions,
        shuffleAnswers: settings.shuffleAnswers,
      });

  if (isMoodle) files.push(moodleXmlFile(test, questions));
  else {
    const build = { word: wordFile, pdf: pdfFile, aiken: aikenFile }[format];
    for (const [i, v] of versions.entries()) files.push(await build(test, v.questions, v.label, names[i]));
  }

  if (settings.answerKey) {
    const buildKey = keyFormatOf(format, settings.keyFormat) === 'word' ? wordKeyFile : pdfKeyFile;
    // Moodle e Aiken finiscono in Moodle, che può rimescolare: le correzioni riportano il testo di domande e risposte.
    // Aiken esclude le aperte: le correzioni elencano solo le domande presenti nel file.
    const keyVersions = format === 'aiken' ? versions.map(v => ({ ...v, questions: withoutOpen(v.questions) })) : versions;
    files.push(await buildKey(test, keyVersions, names[names.length - 1], format === 'moodle' || format === 'aiken'));
  }

  if (!zip) { downloadBlob(files[0].blob, files[0].filename); return; }

  const { zipSync } = await import('fflate');
  const entries = {};
  for (const f of files) entries[f.filename] = [new Uint8Array(await f.blob.arrayBuffer()), { level: 0 }];
  downloadBlob(new Blob([zipSync(entries)], { type: 'application/zip' }), zip);
}
