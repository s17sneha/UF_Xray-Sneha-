// Simple API utility functions (no auth)
// Determine API base URL. Prefer REACT_APP_API_URL, fallback to localhost in dev,
// and to Render API in production (e.g., GitHub Pages) if not provided.
export const API_BASE_URL = (() => {
  const envBase = process.env.REACT_APP_API_URL && process.env.REACT_APP_API_URL.trim();
  if (envBase) return envBase;
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost') return 'http://localhost:5000';
    // Default production API (Render)
    return 'https://uf-xray-api.onrender.com';
  }
  return '';
})();

const makeRequest = async (method, url, data = null, isFormData = false) => {
  const headers = { 'Accept': 'application/json' };
  if (!isFormData) headers['Content-Type'] = 'application/json';

  const config = { method, headers };
  if (data) config.body = isFormData ? data : JSON.stringify(data);

  const base = API_BASE_URL || '';
  const res = await fetch(`${base}${url}`, config);
  let body = null;
  try {
    body = await res.json();
  } catch (_) {
    body = null;
  }
  if (!res.ok) {
    const msg = body?.message || `${method} ${url} failed with ${res.status}`;
    throw new Error(msg);
  }
  return { data: body };
};

export const api = {
  get: (url) => makeRequest('GET', url),
  post: (url, data, isFormData = false) => makeRequest('POST', url, data, isFormData),
  delete: (url) => makeRequest('DELETE', url),
};

// Chatbot helper
export async function askCyberChat(message, history = []) {
  const payload = {
    message,
    history: Array.isArray(history)
      ? history.map((m) => ({ role: m.role, content: m.content }))
      : []
  };
  const res = await fetch(`${API_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.message || `POST /api/chat failed with ${res.status}`;
    const err = new Error(msg);
    // Attach a shape similar to axios error for existing error handlers
    err.response = { status: res.status, data };
    throw err;
  }
  return data;
}

// Loaded
