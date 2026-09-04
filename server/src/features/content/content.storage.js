import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { supabaseAdmin } from '../../lib/supabase.js';

export const CONTENT_SOURCE_BUCKET = 'source-pdfs';
export const QUESTION_IMAGES_BUCKET = 'question-images';
const MAX_PDF_BYTES = 50 * 1024 * 1024;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOCAL_UPLOADS_DIR = path.resolve(__dirname, '../../../public/uploads/questions');

// Ensure local directory exists
if (!fs.existsSync(LOCAL_UPLOADS_DIR)) {
  fs.mkdirSync(LOCAL_UPLOADS_DIR, { recursive: true });
}

export function assertPdfUpload(file) {
  if (!file || !Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
    const error = new Error('A PDF file is required');
    error.statusCode = 400;
    throw error;
  }
  if (file.buffer.length > MAX_PDF_BYTES) {
    const error = new Error('PDF exceeds the 50 MB upload limit');
    error.statusCode = 413;
    throw error;
  }
  if (file.mimetype !== 'application/pdf' || !file.buffer.subarray(0, 5).equals(Buffer.from('%PDF-'))) {
    const error = new Error('Only valid PDF files are accepted');
    error.statusCode = 400;
    throw error;
  }
}

export async function storeSourcePdf(file) {
  assertPdfUpload(file);
  const sha256 = createHash('sha256').update(file.buffer).digest('hex');
  const storagePath = `sources/${sha256}.pdf`;
  const { error } = await supabaseAdmin.storage
    .from(CONTENT_SOURCE_BUCKET)
    .upload(storagePath, file.buffer, {
      contentType: 'application/pdf',
      upsert: true,
      cacheControl: '31536000'
    });
  if (error) throw new Error(`Unable to store source PDF: ${error.message}`);
  return { storagePath, sha256, sizeBytes: file.buffer.length, filename: file.originalname };
}

export async function downloadSourcePdf(storagePath) {
  const { data, error } = await supabaseAdmin.storage.from(CONTENT_SOURCE_BUCKET).download(storagePath);
  if (error) throw new Error(`Unable to download source PDF: ${error.message}`);
  return Buffer.from(await data.arrayBuffer());
}

/**
 * Stores a question diagram/image either to Supabase Storage (public bucket) or local static directory.
 * @param {Object} options
 * @param {Buffer} options.buffer
 * @param {string} options.mimetype
 * @param {string} [options.originalname]
 * @returns {Promise<{ url: string, filename: string, sizeBytes: number }>}
 */
export async function storeQuestionImage({ buffer, mimetype = 'image/png', originalname = 'diagram.png' }) {
  if (!buffer || buffer.length === 0) {
    const err = new Error('Image data is required');
    err.statusCode = 400;
    throw err;
  }
  if (buffer.length > MAX_IMAGE_BYTES) {
    const err = new Error('Image exceeds 10 MB limit');
    err.statusCode = 413;
    throw err;
  }

  const ext = originalname.split('.').pop() || (mimetype.includes('jpeg') ? 'jpg' : 'png');
  const filename = `diag_${Date.now()}_${randomBytes(4).toString('hex')}.${ext}`;
  const storagePath = `diagrams/${filename}`;

  // 1. Try uploading to Supabase Storage public bucket
  try {
    const { error: uploadError } = await supabaseAdmin.storage
      .from(QUESTION_IMAGES_BUCKET)
      .upload(storagePath, buffer, {
        contentType: mimetype,
        upsert: true,
        cacheControl: '31536000'
      });

    if (!uploadError) {
      const { data: urlData } = supabaseAdmin.storage
        .from(QUESTION_IMAGES_BUCKET)
        .getPublicUrl(storagePath);

      if (urlData?.publicUrl) {
        return {
          url: urlData.publicUrl,
          storagePath,
          filename,
          sizeBytes: buffer.length
        };
      }
    } else {
      console.warn('[storeQuestionImage] Supabase upload warning:', uploadError.message);
    }
  } catch (err) {
    console.warn('[storeQuestionImage] Supabase storage exception:', err.message);
  }

  // 2. Fallback to local static disk only if Supabase upload failed
  try {
    const localFilePath = path.join(LOCAL_UPLOADS_DIR, filename);
    fs.writeFileSync(localFilePath, buffer);
    return {
      url: `/uploads/questions/${filename}`,
      storagePath: `local/${filename}`,
      filename,
      sizeBytes: buffer.length
    };
  } catch (err) {
    console.error('[storeQuestionImage] Local write error:', err.message);
    throw err;
  }
}
