import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { storeQuestionImage } from './content.storage.js';
import { logger } from '../../platform/logger.js';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXTRACTOR_SCRIPT = path.resolve(__dirname, 'pdf-diagram-extractor.py');

/**
 * Extracts, crops, and uploads all diagrams and figures from a PDF document to Supabase Storage CDN.
 * @param {string} pdfPath - Absolute or relative path to source PDF.
 * @param {Object} [options]
 * @param {number} [options.dpi=300] - Image rendering DPI.
 * @param {number} [options.minSize=15] - Minimum size in points for a drawing cluster.
 * @returns {Promise<Record<number, { stem?: string, options?: Record<string, string> }>>}
 */
export async function extractPdfDiagrams(pdfPath, options = {}) {
  const resolvedPdf = path.resolve(pdfPath);
  const tempDir = path.join(os.tmpdir(), `tooprep_diagrams_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);

  try {
    await fs.mkdir(tempDir, { recursive: true });

    logger.info('diagram.extractor.start', { pdfPath: resolvedPdf, tempDir });
    const { stdout, stderr } = await execFileAsync('python', [
      EXTRACTOR_SCRIPT,
      resolvedPdf,
      '--output-dir', tempDir,
      '--dpi', String(options.dpi || 300),
      '--min-size', String(options.minSize || 15)
    ], { maxBuffer: 10 * 1024 * 1024 });

    if (stderr && stderr.trim().length > 0) {
      logger.warn('diagram.extractor.python_stderr', { stderr: stderr.slice(0, 300) });
    }

    const result = JSON.parse(stdout.trim());
    if (!result.success || !result.diagrams) {
      logger.warn('diagram.extractor.no_diagrams_or_failed', { error: result.error });
      return {};
    }

    const uploadedManifest = {};
    const rawDiagrams = result.diagrams;

    for (const [qStr, data] of Object.entries(rawDiagrams)) {
      const qNum = parseInt(qStr, 10);
      uploadedManifest[qNum] = { stem: null, options: {} };

      // 1. Upload stem diagram if present
      if (data.stem && data.stem.path) {
        try {
          const imgBuffer = await fs.readFile(data.stem.path);
          const uploaded = await storeQuestionImage({
            buffer: imgBuffer,
            mimetype: 'image/png',
            originalname: data.stem.filename || `q${qNum}_stem.png`
          });
          uploadedManifest[qNum].stem = uploaded.url;
        } catch (uploadErr) {
          logger.warn('diagram.upload.stem_failed', { qNum, error: uploadErr.message });
        }
      }

      // 2. Upload option diagrams if present
      if (data.options && typeof data.options === 'object') {
        for (const [optKey, optData] of Object.entries(data.options)) {
          if (optData && optData.path) {
            try {
              const optBuffer = await fs.readFile(optData.path);
              const uploaded = await storeQuestionImage({
                buffer: optBuffer,
                mimetype: 'image/png',
                originalname: optData.filename || `q${qNum}_opt_${optKey}.png`
              });
              uploadedManifest[qNum].options[optKey] = uploaded.url;
            } catch (uploadErr) {
              logger.warn('diagram.upload.opt_failed', { qNum, optKey, error: uploadErr.message });
            }
          }
        }
      }

      // Clean up entry if nothing was uploaded
      if (!uploadedManifest[qNum].stem && Object.keys(uploadedManifest[qNum].options).length === 0) {
        delete uploadedManifest[qNum];
      }
    }

    logger.info('diagram.extractor.completed', {
      total_questions_with_diagrams: Object.keys(uploadedManifest).length
    });

    return uploadedManifest;
  } catch (err) {
    logger.error('diagram.extractor.failed', { pdfPath, error: err.message });
    return {};
  } finally {
    // Cleanup temporary files
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {}
  }
}
