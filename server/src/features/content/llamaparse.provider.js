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
 * Uses premium_speed tier + gpt-4o vision for best math/diagram extraction.
 */
export async function createLlamaParseJob({ bytes, filename }, onProgress = null) {
  const tier = process.env.LLAMA_PARSE_TIER || 'premium_speed';
  const file = new File([bytes], filename, { type: 'application/pdf' });

  if (onProgress) onProgress({
    step: 'llamaparse_submit',
    message: `Submitting "${filename}" to LlamaParse (${tier} tier) with GPT-4o vision…`
  });

  const jobConfig = {
    tier,
    version: 'latest',
    // Exam-paper-specific parsing hints for JEE format
    parsing_instruction:
      'This is a JEE (Joint Entrance Exam) Physics/Chemistry/Mathematics question paper. ' +
      'Questions are numbered Q.1 through Q.90. Extract all mathematical equations as valid KaTeX LaTeX. ' +
      'Preserve ALL options (A), (B), (C), (D). Each answer key is at the end in an ANSWERS section.',
    extract_charts: true,
    skip_diagonal_text: true,
    continuous_mode: false,
    upload_file: file
  };

  // Use GPT-4o multimodal if API key is available (best for chemistry diagrams)
  if (process.env.OPENAI_API_KEY) {
    jobConfig.vendor_multimodal_model_name = process.env.LLAMA_PARSE_MODEL || 'openai-gpt-4o';
    jobConfig.vendor_multimodal_api_key = process.env.OPENAI_API_KEY;
  }

  return client().parsing.create(jobConfig);
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
      usage: result.job.usage
    }
  });

  return {
    provider: 'LLAMA_PARSE',
    provider_job_id: providerJobId,
    provider_status: result.job.status,
    markdown: result.markdown_full || pages.filter(page => page.markdown).map(page => page.markdown).join('\n\n'),
    text: result.text_full || null,
    pages,
    usage: result.job.usage || null,
    parsed_at: new Date()
  };
}
