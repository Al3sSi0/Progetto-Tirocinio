import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).href;

export async function extractTextFromPdf(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map(item => item.str).join(' ') + '\n';
  }
  return { text, pdf, numPages: pdf.numPages };
}

export async function extractTextWithOCR(file, onProgress) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    if (onProgress) onProgress(i, pdf.numPages);
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    const { data: { text: pageText } } = await Tesseract.recognize(canvas, 'ita+eng');
    text += pageText + '\n';
  }
  return text;
}

export async function extractText(file, onProgress) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext === 'txt') {
    return await file.text();
  }
  if (ext === 'pdf') {
    const { text } = await extractTextFromPdf(file);
    if (text.trim().length >= 80) return text;
    if (onProgress) onProgress('ocr', 1, 1);
    return await extractTextWithOCR(file, (cur, tot) => {
      if (onProgress) onProgress('ocr', cur, tot);
    });
  }
  return '';
}
