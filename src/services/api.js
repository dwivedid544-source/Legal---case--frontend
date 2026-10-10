function normalizeBaseUrl(url) {
  if (!url) return '';
  return String(url).replace(/\/+$/, '');
}

export const API_BASE_URL = normalizeBaseUrl(
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
);

function buildQuery(params) {
  if (!params) return '';
  if (typeof params === 'string') return params.startsWith('?') ? params : `?${params}`;
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

const requestCache = new Map();
const CACHE_DURATION = 4000;

/**
 * Reusable fetch helper for API requests
 */
async function request(endpoint, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const isFormData = options.body instanceof FormData;
  const cacheKey = `${method}:${endpoint}`;

  // 1. Check cache for GET requests
  if (method === 'GET' && !options.signal) { // Don't cache if there's a custom abort signal for safety
    const cached = requestCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
      return cached.promise;
    }
  } else if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    // Automatically invalidate cache after mutations
    requestCache.clear();
  }

  const promise = (async () => {
    const token = localStorage.getItem('vktori_token');
    
    const headers = {
      ...options.headers,
    };
    if (!isFormData) {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers,
    };

    if (!isFormData && config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    const contentType = response.headers.get('content-type') || '';
    const isBinary = options.responseType === 'blob' || 
      contentType.includes('application/pdf') || 
      contentType.includes('application/octet-stream') || 
      contentType.includes('application/zip');

    if (isBinary) {
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Download failed');
      }
      const blob = await response.blob();
      const headers = {};
      response.headers.forEach((val, key) => { headers[key] = val; });
      return { data: blob, headers };
    }

    const text = await response.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        const error = new Error(
          response.ok
            ? 'Invalid response from server'
            : (text.slice(0, 120) || `Request failed (${response.status})`)
        );
        error.status = response.status;
        throw error;
      }
    }

    if (!response.ok) {
      const msg = (data && data.message) || `Request failed (${response.status})`;
      const error = new Error(msg);
      error.status = response.status;
      if (data && typeof data === 'object') {
        Object.assign(error, data);
      }
      throw error;
    }

    if (data && data.success === false) {
      const error = new Error(data.message || 'Request failed');
      error.status = response.status;
      if (data && typeof data === 'object') {
        Object.assign(error, data);
      }
      throw error;
    }

    return data;
  })();

  // Store the promise in the cache if GET
  if (method === 'GET' && !options.signal) {
    requestCache.set(cacheKey, { promise, timestamp: Date.now() });
  }

  try {
    return await promise;
  } catch (err) {
    if (method === 'GET' && !options.signal) {
      requestCache.delete(cacheKey);
    }
    if (err.name === 'AbortError') {
      throw err; // Allow abort errors to propagate normally
    }
    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      const wrapped = new Error(`Cannot reach the server. Is the API running at ${API_BASE_URL}?`);
      wrapped.cause = err;
      throw wrapped;
    }
    throw err;
  }
}

async function requestBlob(endpoint, options = {}) {
  const token = localStorage.getItem('vktori_token');
  const headers = {
    ...options.headers,
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const config = {
    ...options,
    headers,
  };
  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  if (!response.ok) {
    let msg = `Request failed (${response.status})`;
    try {
      const errJson = await response.json();
      msg = errJson?.message || msg;
    } catch {
      // ignore JSON parse errors for binary responses
    }
    const error = new Error(msg);
    error.status = response.status;
    throw error;
  }
  const blob = await response.blob();
  return {
    blob,
    filename: response.headers.get('x-filename') || null,
    contentType: response.headers.get('content-type') || null,
  };
}

export const authAPI = {
  login: (credentials) => request('/auth/login', {
    method: 'POST',
    body: {
      ...credentials,
      email: typeof credentials?.email === 'string' ? credentials.email.trim() : credentials?.email,
    },
  }),
  getMe: () => request('/auth/me'),
  changePassword: (body) => request('/auth/change-password', {
    method: 'PATCH',
    body,
  }),
  // Phase 2A Passwordless Magic Link methods
  requestMagicLink: (email) => request('/auth/request-magic-link', {
    method: 'POST',
    body: { email }
  }),
  verifyMagicLink: (token) => request('/auth/verify-magic-link', {
    method: 'POST',
    body: { token }
  }),
  verifyInvite: (token) => request('/auth/verify-invite', {
    method: 'POST',
    body: { token }
  }),
};

export const dashboardAPI = {
  admin: () => request('/dashboard/admin'),
  lawyer: () => request('/dashboard/lawyer'),
  client: () => request('/dashboard/client'),
};

export const leadsAPI = {
  list: (params) => request(`/leads${buildQuery(params)}`),
  get: (id) => request(`/leads/${id}`),
  /** Public (no auth). Website Book Consultation form. */
  publicConsultation: (body) => request('/leads/public/consultation', { method: 'POST', body }),
  /** Public (no auth). Website Transmittal of Inquiry form. */
  publicInquiry: (body) => request('/leads/public/inquiry', { method: 'POST', body }),
  create: (body) => request('/leads', { method: 'POST', body }),
  update: (id, body) => request(`/leads/${id}`, { method: 'PUT', body }),
  remove: (id) => request(`/leads/${id}`, { method: 'DELETE' }),
  convert: (id) => request(`/leads/${id}/convert`, { method: 'POST', body: {} }),
};

export const clientsAPI = {
  list: (params) => request(`/clients${buildQuery(params)}`),
  get: (id) => request(`/clients/${id}`),
  create: (body) => request('/clients', { method: 'POST', body }),
  update: (id, body) => request(`/clients/${id}`, { method: 'PUT', body }),
  remove: (id) => request(`/clients/${id}`, { method: 'DELETE' }),
  delete: (id) => request(`/clients/${id}`, { method: 'DELETE' }),
  sendPortalInvite: (id) => request(`/clients/${id}/invite`, { method: 'POST', body: {} }),
};

export const contactsAPI = {
  list: (params) => request(`/contacts${buildQuery(params)}`),
  search: (q) => request(`/contacts/search${buildQuery({ q })}`),
  get: (id) => request(`/contacts/${id}`),
  create: (body) => request('/contacts', { method: 'POST', body }),
  update: (id, body) => request(`/contacts/${id}`, { method: 'PUT', body }),
  remove: (id) => request(`/contacts/${id}`, { method: 'DELETE' }),
  revealSensitive: (id, field) => request(`/contacts/${id}/reveal-sensitive`, { method: 'POST', body: { field } }),
};

export const relationshipsAPI = {
  listForMatter: (matterId, params) => request(`/matters/${matterId}/relationships${buildQuery(params)}`),
  create: (matterId, body) => request(`/matters/${matterId}/relationships`, { method: 'POST', body }),
  update: (id, body) => request(`/relationships/${id}`, { method: 'PUT', body }),
  remove: (id) => request(`/relationships/${id}`, { method: 'DELETE' }),
};

export const settlementAPI = {
  getForMatter: (matterId) => request(`/matters/${matterId}/settlement`),
  saveForMatter: (matterId, body) => request(`/matters/${matterId}/settlement`, { method: 'POST', body }),
  update: (id, body) => request(`/settlement/${id}`, { method: 'PUT', body }),
  remove: (id) => request(`/settlement/${id}`, { method: 'DELETE' }),
};

export const mattersAPI = {
  list: (params) => request(`/matters${buildQuery(params)}`),
  get: (id) => request(`/matters/${id}`),
  create: (body) => request('/matters', { method: 'POST', body }),
  update: (id, body) => request(`/matters/${id}`, { method: 'PUT', body }),
  remove: (id) => request(`/matters/${id}`, { method: 'DELETE' }),
  getTimeline: (id, params) => request(`/matters/${id}/timeline${buildQuery(params)}`),
  addTimelineEvent: (id, body) => request(`/matters/${id}/timeline`, { method: 'POST', body }),
  updateTimelineEvent: (id, eventId, body) => request(`/matters/${id}/timeline/${eventId}`, { method: 'PUT', body }),
  deleteTimelineEvent: (id, eventId) => request(`/matters/${id}/timeline/${eventId}`, { method: 'DELETE' }),
};

export const activitiesAPI = {
  list: (params) => request(`/activities${buildQuery(params)}`),
  get: (id) => request(`/activities/${id}`),
  create: (body) => request('/activities', { method: 'POST', body }),
  update: (id, body) => request(`/activities/${id}`, { method: 'PUT', body }),
  remove: (id) => request(`/activities/${id}`, { method: 'DELETE' }),
};

export const documentsAPI = {
  list: (params) => request(`/documents${buildQuery(params)}`),
  get: (id) => request(`/documents/${id}`),
  download: (id) => requestBlob(`/documents/${id}/download`),
  create: (body) => request('/documents', { method: 'POST', body }),
  createBulk: (body) => request('/documents/bulk', { method: 'POST', body }),
  update: (id, body) => request(`/documents/${id}`, { method: 'PUT', body }),
  remove: (id) => request(`/documents/${id}`, { method: 'DELETE' }),
};

export const communicationsAPI = {
  list: (params) => request(`/communications${buildQuery(params)}`),
  listForMatter: (matterId, params) => request(`/matters/${matterId}/communications${buildQuery(params)}`),
  get: (id) => request(`/communications/${id}`),
  getThread: (id) => request(`/communications/thread/${id}`),
  create: (matterIdOrBody, body) => {
    if (typeof matterIdOrBody === 'object' && matterIdOrBody !== null) {
      const mId = matterIdOrBody.matter_id || matterIdOrBody.matterId;
      if (mId) {
        return request(`/matters/${mId}/communications`, { method: 'POST', body: matterIdOrBody });
      }
      return request('/communications', { method: 'POST', body: matterIdOrBody });
    }
    if (matterIdOrBody) {
      return request(`/matters/${matterIdOrBody}/communications`, { method: 'POST', body: body || {} });
    }
    return request('/communications', { method: 'POST', body: body || {} });
  },
  reply: (body) => request('/communications/reply', { method: 'POST', body }),
  markRead: (id) => request(`/communications/${id}/read`, { method: 'PATCH' }),
  markMatterRead: (matterId) => request(`/communications/matter/${matterId}/read`, { method: 'PATCH' }),
  update: (id, body) => request(`/communications/${id}`, { method: 'PUT', body }),
  remove: (id) => request(`/communications/${id}`, { method: 'DELETE' }),
};

export const billingAPI = {
  listInvoices: (params) => request(`/billing${buildQuery(params)}`),
  getInvoice: (id) => request(`/billing/${id}`),
  /** Authenticated PDF (use blob; do not open API URL directly). */
  downloadInvoicePdf: (id) => requestBlob(`/billing/${id}/pdf`),
  createInvoice: (body) => request('/billing', { method: 'POST', body }),
  payInvoice: (id, body) => request(`/billing/${id}/pay`, { method: 'POST', body }),
  sendInvoice: (id) => request(`/billing/${id}/send`, { method: 'POST' }),
  updateInvoice: (id, body) => request(`/billing/${id}`, { method: 'PUT', body }),
  removeInvoice: (id) => request(`/billing/${id}`, { method: 'DELETE' }),
  
  // Trust Accounts
  listTrustAccounts: () => request('/billing/trust-accounts'),
  getTrustTransactions: (id) => request(`/billing/trust-accounts/${id}/transactions`),
  depositTrust: (body) => request('/billing/trust-accounts/deposit', { method: 'POST', body }),
  applyTrustToInvoice: (body) => request('/billing/trust-accounts/apply', { method: 'POST', body }),

  // Rate Cards & Financial Rollups
  getImmigrationRateCard: () => request('/billing/rate-card/immigration'),
  getRollups: () => request('/billing/rollups'),
};

export const expensesAPI = {
  list: (params) => request(`/expenses${buildQuery(params)}`),
  create: (body) => request('/expenses', { method: 'POST', body }),
  remove: (id) => request(`/expenses/${id}`, { method: 'DELETE' }),
};

export const draftsAPI = {
  list: (params) => request(`/drafts${buildQuery(params)}`),
  get: (id) => request(`/drafts/${id}`),
  create: (body) => request('/drafts', { method: 'POST', body }),
  update: (id, body) => request(`/drafts/${id}`, { method: 'PUT', body }),
  remove: (id) => request(`/drafts/${id}`, { method: 'DELETE' }),
  sign: (id, body) => request(`/drafts/${id}/sign`, { method: 'POST', body }),
  downloadPdf: (id) => requestBlob(`/drafts/${id}/pdf`),
  sendForSignature: (id, body) => request(`/drafts/${id}/send-signature`, { method: 'POST', body }),
  getSignatureRequest: (token) => request(`/drafts/signature-request/${token}`),
  completeSignature: (token, body) => request(`/drafts/signature-request/${token}/sign`, { method: 'POST', body }),
};

export const tasksAPI = {
  list: (params) => request(`/tasks${buildQuery(params)}`),
  listForMatter: (matterId, params) => request(`/matters/${matterId}/tasks${buildQuery(params)}`),
  get: (id) => request(`/tasks/${id}`),
  create: (matterIdOrBody, body) => {
    if (typeof matterIdOrBody === 'object') return request('/tasks', { method: 'POST', body: matterIdOrBody });
    return request(`/matters/${matterIdOrBody}/tasks`, { method: 'POST', body });
  },
  update: (id, body) => request(`/tasks/${id}`, { method: 'PUT', body }),
  complete: (id) => request(`/tasks/${id}`, { method: 'PUT', body: { status: 'Completed' } }),
  reopen: (id) => request(`/tasks/${id}`, { method: 'PUT', body: { status: 'Pending' } }),
  remove: (id) => request(`/tasks/${id}`, { method: 'DELETE' }),
};

export const templatesAPI = {
  list: (params) => request(`/templates${buildQuery(params)}`),
  get: (id) => request(`/templates/${id}`),
  create: (body) => request('/templates', { method: 'POST', body }),
  update: (id, body) => request(`/templates/${id}`, { method: 'PUT', body }),
  remove: (id) => request(`/templates/${id}`, { method: 'DELETE' }),
  cloneToMatter: (body) => request('/templates/clone', { method: 'POST', body }),
  duplicate: (id) => request(`/templates/${id}/duplicate`, { method: 'POST', body: {} }),
};

export const documentCategoriesAPI = {
  list: (params) => request(`/settings/document-categories${buildQuery(params)}`),
  create: (body) => request('/settings/document-categories', { method: 'POST', body }),
  update: (id, body) => request(`/settings/document-categories/${id}`, { method: 'PUT', body }),
  remove: (id) => request(`/settings/document-categories/${id}`, { method: 'DELETE' }),
};

export const marketingAPI = {
  overview: () => request('/marketing/overview'),
  sources: () => request('/marketing/sources'),
  getSocialLinks: () => request('/public/social-links'),
  updateSocialLinks: (links) => request('/admin/social-links', { method: 'PUT', body: links }),
};

export const usersAPI = {
  list: () => request('/users'),
  get: (id) => request(`/users/${id}`),
  create: (body) => request('/users', { method: 'POST', body }),
  update: (id, body) => request(`/users/${id}`, { method: 'PUT', body }),
  resetPassword: (id, body) => request(`/users/${id}/reset-password`, { method: 'PATCH', body }),
  remove: (id) => request(`/users/${id}`, { method: 'DELETE' }),
};

export const conflictsAPI = {
  check: (body) => request('/conflicts/check', { method: 'POST', body }),
  list: () => request('/conflicts'),
};

export const timersAPI = {
  start: (matter_id) => request('/timers/start', { method: 'POST', body: { matter_id } }),
  stop: (id) => request(`/timers/${id}/stop`, { method: 'POST' }),
  active: () => request('/timers/active'),
  list: (params) => request(`/timers${buildQuery(params)}`),
};

export const reportsAPI = {
  generate: (body) => request('/reports/generate', { method: 'POST', body }),
  list: () => request('/reports'),
  get: (id) => request(`/reports/${id}`),
  download: (id) => request(`/reports/${id}/download`, { method: 'GET', responseType: 'blob' }),
  marketing: () => request('/reports/marketing'),
};

export const calendarAPI = {
  list: (params) => request(`/calendar${buildQuery(params)}`),
  create: (data) => request('/calendar', { method: 'POST', body: data }),
  update: (id, data) => request(`/calendar/${id}`, { method: 'PUT', body: data }),
  remove: (id) => request(`/calendar/${id}`, { method: 'DELETE' }),
  acknowledge: (id) => request(`/calendar/${id}/acknowledge`, { method: 'PUT' }),
  getOutlookStatus: () => request('/calendar/outlook/status'),
  disconnectOutlook: () => request('/calendar/outlook/disconnect', { method: 'POST', body: {} }),
  getTitanStatus: () => request('/calendar/titan/status'),
  verifyTitan: () => request('/calendar/titan/verify'),
  syncTitan: () => request('/calendar/titan/sync', { method: 'POST', body: {} }),
  listCategories: (params) => request(`/calendar/categories${buildQuery(params)}`),
  createCategory: (data) => request('/calendar/categories', { method: 'POST', body: data }),
  updateCategory: (id, data) => request(`/calendar/categories/${id}`, { method: 'PUT', body: data }),
  removeCategory: (id) => request(`/calendar/categories/${id}`, { method: 'DELETE' }),
};

export const notificationsAPI = {
  list: () => request('/notifications'),
  markRead: (id) => request(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllRead: () => request('/notifications/read-all', { method: 'PATCH' }),
  unreadCount: () => request('/notifications/unread-count'),
  clearAll: () => request('/notifications', { method: 'DELETE' }),
  remove: (id) => request(`/notifications/${id}`, { method: 'DELETE' }),
};

export const searchAPI = {
  global: (q) => request(`/search?q=${encodeURIComponent(q)}`),
};

const api = {
  request,
  auth: authAPI,
  search: searchAPI,
  dashboard: dashboardAPI,
  leads: leadsAPI,
  clients: clientsAPI,
  contacts: contactsAPI,
  relationships: relationshipsAPI,
  settlement: settlementAPI,
  matters: mattersAPI,
  activities: activitiesAPI,
  documents: documentsAPI,
  documentCategories: documentCategoriesAPI,
  communications: communicationsAPI,
  billing: billingAPI,
  drafts: draftsAPI,
  templates: templatesAPI,
  tasks: tasksAPI,
  marketing: marketingAPI,
  users: usersAPI,
  conflicts: conflictsAPI,
  timers: timersAPI,
  reports: reportsAPI,
  calendar: calendarAPI,
  notifications: notificationsAPI,
  titanEmail: {
    getAccounts: () => request('/titan-email/accounts'),
    addAccount: (data) => request('/titan-email/accounts', { method: 'POST', body: data }),
    deleteAccount: (id) => request(`/titan-email/accounts/${id}`, { method: 'DELETE' }),
  },
  folders: {
    list: (params) => request('/folders', { params }),
    create: (data) => request('/folders', { method: 'POST', body: data }),
  },
  settings: {
    get: () => request('/settings'),
    update: (data) => request('/settings', { method: 'PUT', body: data }),
    getCompanyProfile: () => request('/settings/company-profile'),
    updateCompanyProfile: (data) => request('/settings/company-profile', { method: 'PUT', body: data }),
    intakeModules: {
      list: () => request('/settings/intake-modules'),
      listEnabled: () => request('/settings/intake-modules/enabled'),
      create: (data) => request('/settings/intake-modules', { method: 'POST', body: data }),
      update: (id, data) => request(`/settings/intake-modules/${id}`, { method: 'PUT', body: data }),
      remove: (id) => request(`/settings/intake-modules/${id}`, { method: 'DELETE' }),
      reorder: (modules) => request('/settings/intake-modules/reorder', { method: 'PUT', body: { modules } }),
    },
    uploadLogo: (formData) => {
      const token = localStorage.getItem('vktori_token');
      return fetch(`${API_BASE_URL}/settings/company-profile/logo`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      }).then(r => r.json());
    },
    uploadLetterhead: (formData) => {
      const token = localStorage.getItem('vktori_token');
      return fetch(`${API_BASE_URL}/settings/company-profile/letterhead`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      }).then(r => r.json());
    },
    removeLogo: () => {
      const token = localStorage.getItem('vktori_token');
      return fetch(`${API_BASE_URL}/settings/company-profile/logo`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(r => r.json());
    },
    removeLetterhead: () => {
      const token = localStorage.getItem('vktori_token');
      return fetch(`${API_BASE_URL}/settings/company-profile/letterhead`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(r => r.json());
    },
    exportFirmData: () => request('/settings/export-firm-data'),
    runBackup: () => request('/settings/run-backup', { method: 'POST' }),
  },
  practiceAreas: {
    list: (params) => request(`/settings/practice-areas${buildQuery(params)}`),
    create: (data) => request('/settings/practice-areas', { method: 'POST', body: data }),
    update: (id, data) => request(`/settings/practice-areas/${id}`, { method: 'PUT', body: data }),
    remove: (id) => request(`/settings/practice-areas/${id}`, { method: 'DELETE' }),
  },
  customFields: {
    list: (params) => request(`/settings/custom-fields${buildQuery(params)}`),
    create: (data) => request('/settings/custom-fields', { method: 'POST', body: data }),
    update: (id, data) => request(`/settings/custom-fields/${id}`, { method: 'PUT', body: data }),
    remove: (id) => request(`/settings/custom-fields/${id}`, { method: 'DELETE' }),
  },
  courtForms: {
    // Templates
    listTemplates: (params) => request(`/court-forms/templates${buildQuery(params)}`),
    getTemplate: (id) => request(`/court-forms/templates/${id}`),
    uploadTemplate: (formData) => {
      const token = localStorage.getItem('vktori_token');
      return fetch(`${API_BASE_URL}/court-forms/templates/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      }).then(r => r.json());
    },
    saveMappings: (id, mappings) => request(`/court-forms/templates/${id}/mappings`, { method: 'POST', body: { mappings } }),
    deleteTemplate: (id) => request(`/court-forms/templates/${id}`, { method: 'DELETE' }),
    // Prefill
    prefill: (matter_id) => request(`/court-forms/prefill?matter_id=${matter_id}`),
    // Drafts
    listDrafts: (params) => request(`/court-forms/drafts${buildQuery(params)}`),
    createDraft: (data) => request('/court-forms/drafts', { method: 'POST', body: data }),
    updateDraft: (id, data) => request(`/court-forms/drafts/${id}`, { method: 'PUT', body: data }),
    deleteDraft: (id) => request(`/court-forms/drafts/${id}`, { method: 'DELETE' }),
    // PDF Generation & Template Download (returns a Blob)
    generatePdf: (draftId, data) => request(`/court-forms/generate/${draftId}`, { method: 'POST', body: data, responseType: 'blob' }),
    downloadTemplateOriginal: (templateId) => request(`/court-forms/templates/${templateId}/download`, { responseType: 'blob' }),
    // Form Filing Packages (Bundles)
    listPackages: () => request('/court-forms/packages'),
    generatePackage: (package_id, matter_id, selected_forms) => request('/court-forms/generate-package', { method: 'POST', body: { package_id, matter_id, selected_forms } }),
  },
  teamChat: {
    getMessages: (params) => request(`/team-chat/messages${buildQuery(params)}`),
    sendMessage: (body) => request('/team-chat/messages', { method: 'POST', body }),
    deleteMessage: (id) => request(`/team-chat/messages/${id}`, { method: 'DELETE' }),
    getChannels: () => request('/team-chat/channels'),
    getMembers: () => request('/team-chat/members'),
  },
  expenses: expensesAPI,
  reports: {
    list: (params) => request(`/reports${buildQuery(params)}`),
    generate: (data) => request('/reports/generate', { method: 'POST', body: data }),
    marketing: () => request('/reports/marketing'),
    getMarketing: () => request('/reports/marketing'),
    getReferrals: () => request('/reports/referrals'),
    getById: (id) => request(`/reports/${id}`),
    download: (id) => request(`/reports/${id}/download`, { responseType: 'blob' }),
  },
  esign: {
    createRequest: (data) => request('/esign/requests', { method: 'POST', body: data }),
    getRequests: (params) => request(`/esign/requests${buildQuery(params)}`),
    signNative: (id, signatureDataUrl) => request(`/esign/requests/${id}/sign`, { method: 'POST', body: { signature_data_url: signatureDataUrl } }),
  },
  physicalMail: {
    sendMail: (data) => request('/physical-mail/send', { method: 'POST', body: data }),
    getDispatches: (params) => request(`/physical-mail/dispatches${buildQuery(params)}`),
  },
  courtEFiling: {
    submitFiling: (data) => request('/court-efiling/submit', { method: 'POST', body: data }),
    getSubmissions: (params) => request(`/court-efiling/submissions${buildQuery(params)}`),
  },
  ai: {
    chat: (payload) => request('/ai/chat', { method: 'POST', body: payload }),
    getStatus: () => request('/ai/status'),
    getContext: (matterId) => request(`/ai/context/${matterId}`),
  }
};

export { api };
export default api;
