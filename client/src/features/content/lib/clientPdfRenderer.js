import '@/shared/lib/polyfills.js';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
}

let cachedDoc = null;
let cachedDocKey = null;

/**
 * Loads a PDF document from an ArrayBuffer, File, or Blob URL.
 */
export async function loadPdfDocument(source, cacheKey = '') {
  if (cacheKey && cachedDocKey === cacheKey && cachedDoc) {
    return cachedDoc;
  }

  let data;
  if (source instanceof File || source instanceof Blob) {
    data = await source.arrayBuffer();
  } else if (source instanceof ArrayBuffer) {
    data = source;
  } else if (typeof source === 'string') {
    // URL
    const loadingTask = pdfjsLib.getDocument(source);
    const doc = await loadingTask.promise;
    if (cacheKey) {
      cachedDoc = doc;
      cachedDocKey = cacheKey;
    }
    return doc;
  }

  const loadingTask = pdfjsLib.getDocument({ data });
  const doc = await loadingTask.promise;
  if (cacheKey) {
    cachedDoc = doc;
    cachedDocKey = cacheKey;
  }
  return doc;
}

/**
 * Renders a single page of a PDF document to a data URL PNG.
 */
export async function renderPdfPageToDataUrl(pdfDoc, pageNum, scale = 1.5) {
  const safePageNum = Math.max(1, Math.min(pageNum, pdfDoc.numPages));
  const page = await pdfDoc.getPage(safePageNum);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const ctx = canvas.getContext('2d');

  await page.render({
    canvasContext: ctx,
    viewport
  }).promise;

  return {
    dataUrl: canvas.toDataURL('image/png'),
    width: viewport.width,
    height: viewport.height,
    numPages: pdfDoc.numPages
  };
}

/**
 * Crops a normalized rectangle [x, y, w, h] from an image dataUrl.
 * Coordinates are 0..1 relative to the full image.
 */
export async function cropImageByRelativeCoords(sourceDataUrl, { x, y, w, h }) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const sx = Math.max(0, Math.floor(x * img.naturalWidth));
        const sy = Math.max(0, Math.floor(y * img.naturalHeight));
        const sw = Math.min(img.naturalWidth - sx, Math.ceil(w * img.naturalWidth));
        const sh = Math.min(img.naturalHeight - sy, Math.ceil(h * img.naturalHeight));

        if (sw <= 0 || sh <= 0) {
          return reject(new Error('Invalid crop dimensions'));
        }

        const canvas = document.createElement('canvas');
        canvas.width = sw;
        canvas.height = sh;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error('Failed to load image for cropping'));
    img.src = sourceDataUrl;
  });
}
