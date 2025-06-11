const API_BASE = '';

function logout() {
  // Usunięcie tokenu z localStorage
  localStorage.removeItem('access_token');

  // Opcjonalnie możesz usunąć też inne dane, jeśli potrzebujesz
  // localStorage.clear();

  // Przekierowanie na stronę logowania
  window.location.href = '/login';  // dostosuj URL jeśli masz inny
}

function getAuthHeaders() {
  return {
    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
  };
}

async function fetchWithAuth(url) {
  const res = await fetch(url, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  return res.json();
}

function buildHeaders(extraHeaders = {}) {
  return {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
    ...extraHeaders,
  };
}

async function get(endpoint) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'GET',
    headers: buildHeaders(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GET ${endpoint} failed: ${error}`);
  }

  return response.json();
}

async function post(endpoint, data) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`POST ${endpoint} failed: ${error}`);
  }

  return response.json();
}

async function put(endpoint, data) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'PUT',
    headers: buildHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`PUT ${endpoint} failed: ${error}`);
  }

  return response.json();
}

async function del(endpoint) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'DELETE',
    headers: buildHeaders(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DELETE ${endpoint} failed: ${error}`);
  }

  return true;
}

export { logout, getAuthHeaders, fetchWithAuth, post, put, del, get };
