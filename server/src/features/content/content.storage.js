import { createHash } from 'node:crypto';
import { supabaseAdmin } from '../../lib/supabase.js';

export const CONTENT_SOURCE_BUCKET = 'source-pdfs';
const MAX_PDF_BYTES = 50 * 1024 * 1024;

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
