import { DEFAULT_EMBEDDING_DIMENSION } from './embedding.provider.js';

function qdrantConfig() {
  const endpoint = process.env.QDRANT_CLUSTER_ENDPOINT?.replace(/\/$/, '');
  const apiKey = process.env.QDRANT_API_KEY;
  const collection = process.env.QDRANT_COLLECTION || 'tooprep_questions';
  const dimension = Number(process.env.GEMINI_EMBEDDING_DIMENSION || DEFAULT_EMBEDDING_DIMENSION);
  if (!endpoint || !apiKey) {
    const error = new Error('QDRANT_CLUSTER_ENDPOINT and QDRANT_API_KEY must be configured');
    error.statusCode = 503;
    throw error;
  }
  return { endpoint, apiKey, collection, dimension };
}

async function request(path, init = {}) {
  const { endpoint, apiKey } = qdrantConfig();
  const response = await fetch(`${endpoint}${path}`, { ...init, headers: { 'api-key': apiKey, 'content-type': 'application/json', ...(init.headers || {}) } });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    const error = new Error(`Qdrant request failed (${response.status}): ${body || response.statusText}`);
    error.statusCode = response.status;
    throw error;
  }
  return response.status === 204 ? null : response.json();
}

let collectionReady;

export async function ensureQuestionCollection() {
  if (!collectionReady) {
    collectionReady = (async () => {
      const { collection, dimension, endpoint, apiKey } = qdrantConfig();
      const exists = await fetch(`${endpoint}/collections/${encodeURIComponent(collection)}`, { headers: { 'api-key': apiKey } });
      if (exists.ok) return;
      if (exists.status !== 404) {
        const body = await exists.text().catch(() => '');
        throw new Error(`Qdrant collection check failed (${exists.status}): ${body || exists.statusText}`);
      }
      try {
        await request(`/collections/${encodeURIComponent(collection)}`, { method: 'PUT', body: JSON.stringify({ vectors: { size: dimension, distance: 'Cosine' } }) });
      } catch (error) {
        if (error.statusCode !== 409) throw error;
      }
    })();
  }
  try { await collectionReady; } catch (error) { collectionReady = undefined; throw error; }
}

export async function upsertQuestionVector({ pointId, vector, payload }) {
  await ensureQuestionCollection();
  const { collection } = qdrantConfig();
  return request(`/collections/${encodeURIComponent(collection)}/points?wait=true`, { method: 'PUT', body: JSON.stringify({ points: [{ id: pointId, vector, payload }] }) });
}
