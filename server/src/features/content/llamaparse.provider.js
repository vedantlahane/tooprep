import LlamaCloud from '@llamaindex/llama-cloud';

function getApiKey() {
  const apiKey = process.env.LLAMA_CLOUD_API_KEY;
  if (!apiKey || apiKey === 'your-llama-cloud-api-key-here') {
    const error = new Error('LlamaParse is not configured. Set LLAMA_CLOUD_API_KEY before running the worker.');
    error.statusCode = 503;
    throw error;
  }
  return apiKey;
}

function client() {
  return new LlamaCloud({ apiKey: getApiKey(), maxRetries: 2, timeout: 120_000 });
}

/**
 * Submit a PDF to LlamaParse for multimodal OCR parsing.
 *
 * Valid tiers (as of LlamaParse API v2.4):
 *   fast | cost_effective | agentic | agentic_plus
 *
 * NOTE: parsing_instruction, extract_charts, skip_diagonal_text,
 * continuous_mode, and vendor_multimodal_* are NOT supported by the
 * @llamaindex/llama-cloud Node SDK and will cause a 400 validation error.
 * Only tier, version, and upload_file are safe to pass via this SDK.
 */
export async function createLlamaParseJob({ bytes, filename }, onProgress = null) {
  // Valid tiers: fast | cost_effective | agentic | agentic_plus
  // agentic uses an LLM agent for better parsing of complex math/diagram papers
  const tier = process.env.LLAMA_PARSE_TIER || 'agentic';
  const file = new File([bytes], filename, { type: 'application/pdf' });

  if (onProgress) onProgress({
    step: 'llamaparse_submit',
    message: `Submitting "${filename}" to LlamaParse (${tier} tier)…`
  });

  return client().parsing.create({
    tier,
    version: 'latest',
    upload_file: file
  });
}

/**
 * Wait for an existing external LlamaParse job to finish and return structured page data.
 * Avoids a second paid parse call on job retry runs.
 */
export async function getLlamaParseResult(providerJobId, onProgress = null) {
  if (onProgress) onProgress({
    step: 'llamaparse_poll',
    message: `Waiting for LlamaParse job ${providerJobId} to complete (may take 1–3 min for complex exam papers)…`
  });

  const result = await client().parsing.waitForCompletion(
    providerJobId,
    { expand: ['text', 'markdown', 'items', 'usage'] },
    { timeout: 15 * 60_000 } // 15 min max for long papers
  );

  const pages = (result.markdown?.pages || []).map(page => ({
    page_number: page.page_number,
    success: page.success,
    markdown: page.success ? page.markdown : null,
    error: page.success ? null : page.error
  }));

  if (onProgress) onProgress({
    step: 'llamaparse_complete',
    message: `LlamaParse complete: ${pages.filter(p => p.success).length}/${pages.length} pages parsed successfully.`,
    detail: {
      total_pages: pages.length,
      successful_pages: pages.filter(p => p.success).length,
      usage: result.job?.usage
    }
  });

  return {
    provider: 'LLAMA_PARSE',
    provider_job_id: providerJobId,
    provider_status: result.job?.status,
    markdown: result.markdown_full || pages.filter(p => p.markdown).map(p => p.markdown).join('\n\n'),
    text: result.text_full || null,
    pages,
    usage: result.job?.usage || null,
    parsed_at: new Date()
  };
}
