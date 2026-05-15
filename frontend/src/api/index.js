import api from './axios'

// ── Auth ──────────────────────────────────────
export const authApi = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  profile: () => api.get('/auth/profile'),
}

// ── Users ─────────────────────────────────────
export const usersApi = {
  list: (params) => api.get('/users', { params }),
  get: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  toggleStatus: (id) => api.patch(`/users/${id}/status`),
}

// ── Roles ─────────────────────────────────────
export const rolesApi = {
  list: () => api.get('/roles'),
  create: (data) => api.post('/roles', data),
  update: (id, data) => api.put(`/roles/${id}`, data),
  delete: (id) => api.delete(`/roles/${id}`),
}

// ── PII Types ─────────────────────────────────
export const piiTypesApi = {
  list: (params) => api.get('/pii-types', { params }),
  get: (id) => api.get(`/pii-types/${id}`),
  create: (data) => api.post('/pii-types', data),
  update: (id, data) => api.put(`/pii-types/${id}`, data),
  delete: (id) => api.delete(`/pii-types/${id}`),
}

// ── Tokenization Methods ──────────────────────
export const methodsApi = {
  list: (params) => api.get('/tokenization-methods', { params }),
  get: (id) => api.get(`/tokenization-methods/${id}`),
  create: (data) => api.post('/tokenization-methods', data),
  update: (id, data) => api.put(`/tokenization-methods/${id}`, data),
  delete: (id) => api.delete(`/tokenization-methods/${id}`),
}

// ── Tokenization Rules ────────────────────────
export const rulesApi = {
  list: (params) => api.get('/tokenization-rules', { params }),
  get: (id) => api.get(`/tokenization-rules/${id}`),
  create: (data) => api.post('/tokenization-rules', data),
  update: (id, data) => api.put(`/tokenization-rules/${id}`, data),
  delete: (id) => api.delete(`/tokenization-rules/${id}`),
}

// ── Tweaks ────────────────────────────────────
export const tweaksApi = {
  list: (params) => api.get('/tweaks', { params }),
  get: (id) => api.get(`/tweaks/${id}`),
  create: (data) => api.post('/tweaks', data),
  update: (id, data) => api.put(`/tweaks/${id}`, data),
  delete: (id) => api.delete(`/tweaks/${id}`),
}

// ── Tokenization (Core) ───────────────────────
export const tokenizationApi = {
  tokenize: (data) => api.post('/tokenization/tokenize', data),
  batch: (data) => api.post('/tokenization/batch', data),
  detokenize: (data) => api.post('/tokenization/detokenize', data),
  results: (params) => api.get('/tokenization/results', { params }),
  stats: () => api.get('/tokenization/stats'),
  deleteResult: (id) => api.delete(`/tokenization/results/${id}`),
  clearResults: () => api.delete('/tokenization/results'),
}

// ── Jobs ──────────────────────────────────────
export const jobsApi = {
  list: (params) => api.get('/jobs', { params }),
  get: (id) => api.get(`/jobs/${id}`),
}

// ── Audit Logs ────────────────────────────────
export const auditApi = {
  list: (params) => api.get('/audit-logs', { params }),
  write: (data) => api.post('/audit-logs/write', data),
  modules: () => api.get('/audit-logs/modules'),
  activities: () => api.get('/audit-logs/activities'),
  archive: () => api.post('/audit-logs/archive'),
  archives: () => api.get('/audit-logs/archives'),
}

// ── Settings ──────────────────────────────────
export const settingsApi = {
  list: () => api.get('/settings'),
  update: (id, data) => api.put(`/settings/${id}`, data),
}
