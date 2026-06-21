// Auriz — Cliente HTTP para o Cloudflare Worker
const _API_URL = 'https://auriz-api.rodrigopalmezano10.workers.dev';

window.API = {
  get URL() { return _API_URL; },

  getToken() {
    return localStorage.getItem('auriz_token') ?? null;
  },

  setToken(token) {
    if (token) localStorage.setItem('auriz_token', token);
    else localStorage.removeItem('auriz_token');
  },

  async fetch(path, options = {}) {
    const token = this.getToken();
    const resp = await fetch(_API_URL + path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
        ...(options.headers ?? {}),
      },
    });

    if (resp.status === 401) {
      this.setToken(null);
      throw new Error('Sessão expirada. Faça login novamente.');
    }

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(data.error ?? 'Erro na requisição.');
    return data;
  },
};
