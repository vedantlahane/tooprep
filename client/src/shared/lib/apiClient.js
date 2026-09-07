import { supabase } from './supabase';

const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';

async function getAuthHeaders(includeContentType = true) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }
  return includeContentType
    ? { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` }
    : { 'Authorization': `Bearer ${session.access_token}` };
}

export async function request(method, path, body = null, retries = 5) {
  const isFormData = body instanceof FormData;
  const headers = await getAuthHeaders(!isFormData);
  const options = { method, headers };
  if (body) options.body = isFormData ? body : JSON.stringify(body);

  let attempt = 0;
  const maxColdRetries = 6; // Ample budget for Render free tier container spin-up (45-60s)

  while (true) {
    try {
      const res = await fetch(`${API_BASE}${path}`, options);
      
      // Handle Render free-tier spinning up (408, 502, 503, 504) on idempotent GET requests
      if ((res.status === 408 || res.status === 502 || res.status === 503 || res.status === 504) && attempt < maxColdRetries && method === 'GET') {
        attempt++;
        const backoffMs = Math.min(2000 + attempt * 1500, 7500);
        console.warn(`[API] Backend waking from cold sleep (${res.status}) on ${path}. Retrying in ${backoffMs / 1000}s (attempt ${attempt}/${maxColdRetries})...`);
        await new Promise((r) => setTimeout(r, backoffMs));
        continue;
      }

      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
        return data;
      } else {
        if (!res.ok) {
          throw new Error(`Server returned ${res.status} ${res.statusText}. Ensure backend is running and endpoint exists.`);
        }
        return await res.text();
      }
    } catch (err) {
      // Retry transient network connection errors during container boot
      if (attempt < maxColdRetries && method === 'GET' && (err.name === 'TypeError' || err.message.includes('fetch'))) {
        attempt++;
        const backoffMs = Math.min(2000 + attempt * 1500, 7500);
        console.warn(`[API] Connection waiting for backend wake-up on ${path}. Retrying in ${backoffMs / 1000}s (attempt ${attempt}/${maxColdRetries})...`);
        await new Promise((r) => setTimeout(r, backoffMs));
        continue;
      }
      throw err;
    }
  }
}
