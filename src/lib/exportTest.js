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

// ── Moodle XML ────────────────────────────────────────────────────────────────

export function exportMoodleXml(test, questions) {
  const lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<quiz>'];

  questions.forEach((q, idx) => {
    const options = Array.isArray(q.options) ? q.options : [];
    lines.push('  <question type="multichoice">');
    lines.push(`    <name><text>${escapeXml(`Q${idx + 1}: ${(q.content || '').slice(0, 60)}`)}</text></name>`);
    lines.push('    <questiontext format="html">');
    lines.push(`      <text><![CDATA[${q.content || ''}]]></text>`);
    lines.push('    </questiontext>');
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

  const blob = new Blob([lines.join('\n')], { type: 'application/xml;charset=utf-8' });
  downloadBlob(blob, `${safeFilename(test.description)}_moodle.xml`);
}

// ── Word (.docx) ──────────────────────────────────────────────────────────────

export async function exportWord(test, questions) {
  const { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Packer } = await import('docx');

  const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

  const children = [
    new Paragraph({
      children: [new TextRun({ text: test.description || 'Test', bold: true, size: 36 })],
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
    }),
  ];

  if (test.subject || test.topic) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: [test.subject, test.topic].filter(Boolean).join(' — '),
            color: '7A7060',
            size: 20,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 480 },
      })
    );
  } else {
    children.push(new Paragraph({ text: '', spacing: { after: 240 } }));
  }

  questions.forEach((q, idx) => {
    const options = Array.isArray(q.options) ? q.options.filter(o => o?.trim()) : [];

    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${idx + 1}. `, bold: true, size: 24 }),
          new TextRun({ text: q.content || '—', size: 24 }),
        ],
        spacing: { before: 320, after: 120 },
      })
    );

    options.forEach((opt, oi) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${LETTERS[oi] || oi + 1}) ${opt}`,
              color: '1C2B1D',
              size: 22,
            }),
          ],
          indent: { left: 480 },
          spacing: { after: 80 },
        })
      );
    });
  });

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `${safeFilename(test.description)}.docx`);
}

// ── PDF ───────────────────────────────────────────────────────────────────────

export async function exportPdf(test, questions) {
  const { jsPDF } = await import('jspdf');
  const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentW = pageW - margin * 2;
  let y = margin;

  function checkPage(needed) {
    if (y + needed > pageH - margin) { doc.addPage(); y = margin; }
  }

  // Titolo
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  const titleLines = doc.splitTextToSize(test.description || 'Test', contentW);
  doc.text(titleLines, pageW / 2, y, { align: 'center' });
  y += titleLines.length * 8 + 4;

  // Materia / argomento
  if (test.subject || test.topic) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(120, 112, 96);
    const subtitle = [test.subject, test.topic].filter(Boolean).join(' — ');
    doc.text(subtitle, pageW / 2, y, { align: 'center' });
    y += 8;
    doc.setTextColor(0, 0, 0);
  }
  y += 6;

  questions.forEach((q, idx) => {
    const options = Array.isArray(q.options) ? q.options.filter(o => o?.trim()) : [];

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    const qLines = doc.splitTextToSize(`${idx + 1}. ${q.content || '—'}`, contentW);
    checkPage(qLines.length * 6.5 + options.length * 7 + 8);
    doc.text(qLines, margin, y);
    y += qLines.length * 6.5 + 2;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    options.forEach((opt, oi) => {
      const optLines = doc.splitTextToSize(`${LETTERS[oi] || oi + 1}) ${opt}`, contentW - 10);
      doc.text(optLines, margin + 8, y);
      y += optLines.length * 5.5 + 1.5;
    });

    y += 5;
  });

  doc.save(`${safeFilename(test.description)}.pdf`);
}

// ── Aiken (.txt) ──────────────────────────────────────────────────────────────

export function exportAiken(test, questions) {
  const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
  const lines = [];

  questions.forEach((q, idx) => {
    const options = Array.isArray(q.options) ? q.options.filter(o => o?.trim()) : [];
    const correctIdx = options.indexOf(q.correct_answer);
    const correctLetter = correctIdx >= 0 ? (LETTERS[correctIdx] || 'A') : 'A';

    lines.push(q.content || '—');
    options.forEach((opt, oi) => lines.push(`${LETTERS[oi] || oi + 1}) ${opt}`));
    lines.push(`ANSWER: ${correctLetter}`);
    if (idx < questions.length - 1) lines.push('');
  });

  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  downloadBlob(blob, `${safeFilename(test.description)}_aiken.txt`);
}
