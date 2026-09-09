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
 * Robustly crops a region from an image dataUrl.
 * Supports:
 *  - Normalized coordinates: { x, y, w, h } where values are 0..1
 *  - Normalized coordinates: { x0, y0, x1, y1 } where values are 0..1
 *  - Absolute point coordinates: { x0, y0, x1, y1, w, h } (e.g. PDF points)
 *  - Pixel coordinates: { x, y, w, h } or { x0, y0, x1, y1 }
 *  - Optional { pageWidth, pageHeight } to scale points to natural dimensions
 */
export async function cropImageByRelativeCoords(sourceDataUrl, coords) {
  if (!sourceDataUrl) {
    throw new Error('Source image data URL is required for cropping');
  }
  if (!coords || typeof coords !== 'object') {
    throw new Error('Crop coordinates are required');
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const nw = img.naturalWidth;
        const nh = img.naturalHeight;

        if (!nw || !nh) {
          return reject(new Error('Source image has invalid or zero dimensions'));
        }

        let sx, sy, sw, sh;

        // Case 1: Normalized { x, y, w, h } (0 <= val <= 1)
        if (
          coords.x != null && coords.y != null && coords.w != null && coords.h != null &&
          coords.x <= 1 && coords.y <= 1 && coords.w <= 1 && coords.h <= 1
        ) {
          sx = Math.max(0, Math.floor(coords.x * nw));
          sy = Math.max(0, Math.floor(coords.y * nh));
          sw = Math.min(nw - sx, Math.ceil(coords.w * nw));
          sh = Math.min(nh - sy, Math.ceil(coords.h * nh));
        }
        // Case 2: Normalized { x0, y0, x1, y1 } (0 <= val <= 1)
        else if (
          coords.x0 != null && coords.y0 != null &&
          (coords.x1 != null || coords.w != null) &&
          (coords.y1 != null || coords.h != null) &&
          coords.x0 <= 1 && coords.y0 <= 1
        ) {
          const x0 = coords.x0;
          const y0 = coords.y0;
          const x1 = coords.x1 != null ? coords.x1 : (x0 + coords.w);
          const y1 = coords.y1 != null ? coords.y1 : (y0 + coords.h);

          sx = Math.max(0, Math.floor(x0 * nw));
          sy = Math.max(0, Math.floor(y0 * nh));
          sw = Math.min(nw - sx, Math.ceil((x1 - x0) * nw));
          sh = Math.min(nh - sy, Math.ceil((y1 - y0) * nh));
        }
        // Case 3: Absolute PDF points { x0, y0, x1, y1, w, h }
        else if (coords.x0 != null && coords.y0 != null) {
          const x0 = coords.x0;
          const y0 = coords.y0;
          const x1 = coords.x1 != null ? coords.x1 : (x0 + (coords.w || 0));
          const y1 = coords.y1 != null ? coords.y1 : (y0 + (coords.h || 0));

          // Base dimensions for conversion (e.g. modal width/height or standard PDF page points)
          const refW = coords.pageWidth || coords.width || 595.3;
          const refH = coords.pageHeight || coords.height || 841.9;

          if (coords.isPixelCoords || (coords.pageWidth === nw && coords.pageHeight === nh)) {
            sx = Math.max(0, Math.min(nw - 1, Math.floor(x0)));
            sy = Math.max(0, Math.min(nh - 1, Math.floor(y0)));
            sw = Math.max(1, Math.min(nw - sx, Math.ceil(x1 - x0)));
            sh = Math.max(1, Math.min(nh - sy, Math.ceil(y1 - y0)));
          } else {
            // Convert from PDF points / ref dimensions to natural image pixels
            const relX0 = Math.max(0, Math.min(1, x0 / refW));
            const relY0 = Math.max(0, Math.min(1, y0 / refH));
            const relW = Math.max(0, Math.min(1 - relX0, (x1 - x0) / refW));
            const relH = Math.max(0, Math.min(1 - relY0, (y1 - y0) / refH));

            sx = Math.max(0, Math.floor(relX0 * nw));
            sy = Math.max(0, Math.floor(relY0 * nh));
            sw = Math.min(nw - sx, Math.ceil(relW * nw));
            sh = Math.min(nh - sy, Math.ceil(relH * nh));
          }
        }
        // Case 4: Pixel coordinates { x, y, w, h }
        else if (coords.x != null && coords.y != null && coords.w != null && coords.h != null) {
          sx = Math.max(0, Math.min(nw - 1, Math.floor(coords.x)));
          sy = Math.max(0, Math.min(nh - 1, Math.floor(coords.y)));
          sw = Math.max(1, Math.min(nw - sx, Math.ceil(coords.w)));
          sh = Math.max(1, Math.min(nh - sy, Math.ceil(coords.h)));
        } else {
          return reject(new Error('Invalid crop coordinates: missing required coordinate fields'));
        }

        // Validate computed dimensions
        if (isNaN(sx) || isNaN(sy) || isNaN(sw) || isNaN(sh) || sw <= 0 || sh <= 0) {
          return reject(new Error(`Invalid computed crop bounds: [sx=${sx}, sy=${sy}, sw=${sw}, sh=${sh}]`));
        }

        const canvas = document.createElement('canvas');
        canvas.width = sw;
        canvas.height = sh;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Failed to obtain 2D canvas context'));
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

        const outDataUrl = canvas.toDataURL('image/png');
        if (!outDataUrl || !outDataUrl.startsWith('data:image/png;base64,')) {
          return reject(new Error('Canvas generated invalid data URL format'));
        }

        resolve(outDataUrl);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => reject(new Error('Failed to load image for cropping'));
    img.src = sourceDataUrl;
  });
}
