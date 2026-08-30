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
  return new LlamaCloud({ apiKey: getApiKey(), maxRetries: 2, timeout: 60_000 });
}

export async function createLlamaParseJob({ bytes, filename }) {
  const file = new File([bytes], filename, { type: 'application/pdf' });
  return client().parsing.create({
    tier: process.env.LLAMA_PARSE_TIER || 'cost_effective',
    version: 'latest',
    upload_file: file
  });
}

/** Wait for an existing external job, avoiding a second paid parse on retry. */
export async function getLlamaParseResult(providerJobId) {
  const result = await client().parsing.waitForCompletion(
    providerJobId,
    { expand: ['text', 'markdown', 'items', 'usage'] },
    { timeout: 10 * 60_000 }
  );

  const pages = (result.markdown?.pages || []).map(page => ({
    page_number: page.page_number,
    success: page.success,
    markdown: page.success ? page.markdown : null,
    error: page.success ? null : page.error
  }));

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
