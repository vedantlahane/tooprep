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

export async function request(method, path, body = null, retries = 2) {
  const isFormData = body instanceof FormData;
  const headers = await getAuthHeaders(!isFormData);
  const options = { method, headers };
  if (body) options.body = isFormData ? body : JSON.stringify(body);

  let attempt = 0;
  while (true) {
    try {
      const res = await fetch(`${API_BASE}${path}`, options);
      
      // Handle Render free-tier spinning up (502, 503, 504) on idempotent GET requests
      if ((res.status === 502 || res.status === 503 || res.status === 504) && attempt < retries && method === 'GET') {
        attempt++;
        console.warn(`[API] Backend warming up (${res.status}). Retrying in 2s (attempt ${attempt}/${retries})...`);
        await new Promise((r) => setTimeout(r, 2000));
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
      // Retry transient network failures on GET during backend cold-starts
      if (attempt < retries && method === 'GET' && (err.name === 'TypeError' || err.message.includes('fetch'))) {
        attempt++;
        console.warn(`[API] Transient network error on ${path}. Retrying in 2s (attempt ${attempt}/${retries})...`);
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      throw err;
    }
  }
}
