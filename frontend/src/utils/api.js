import axios from 'axios';

axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const api = {
  // Auth
  login: (email, password) => axios.post(`${API_BASE}/auth/login`, { email, password }),
  registerCustomer: (data) => axios.post(`${API_BASE}/auth/register`, data),
  
  // Requests
  getRequests: (params) => axios.get(`${API_BASE}/requests`, { params }),
  getRequest: (id) => axios.get(`${API_BASE}/requests/${id}`),
  createRequest: (data) => axios.post(`${API_BASE}/requests`, data),
  updateRequest: (id, data) => axios.put(`${API_BASE}/requests/${id}`, data),
  cancelRequest: (id, data) => axios.post(`${API_BASE}/requests/${id}/cancel`, data),
  addRequestNote: (id, data) => axios.post(`${API_BASE}/requests/${id}/add-note`, data),
  getOpenRequests: () => axios.get(`${API_BASE}/requests/open/list`),
  assignRequestToMe: (id, data) => axios.post(`${API_BASE}/requests/${id}/assign-to-me`, data),
  
  // Quotations
  getQuotations: (params) => axios.get(`${API_BASE}/quotations`, { params }),
  getQuotation: (id) => axios.get(`${API_BASE}/quotations/${id}`),
  createQuotation: (data) => axios.post(`${API_BASE}/quotations`, data),
  updateQuotation: (id, data) => axios.put(`${API_BASE}/quotations/${id}`, data),
  publishQuotation: (id, data) => axios.post(`${API_BASE}/quotations/${id}/publish`, data),
  acceptQuotation: (id, data) => axios.post(`${API_BASE}/quotations/${id}/accept`, data),
  downloadProformaInvoice: (id) => `${API_BASE}/quotations/${id}/download-proforma`,
  
  // Invoices
  getInvoices: (params) => axios.get(`${API_BASE}/invoices`, { params }),
  getInvoice: (id) => axios.get(`${API_BASE}/invoices/${id}`),
  downloadInvoice: (id) => `${API_BASE}/invoices/${id}/download`,
  
  // Payments
  getPayments: (params) => axios.get(`${API_BASE}/payments`, { params }),
  getPayment: (id) => axios.get(`${API_BASE}/payments/${id}`),
  markPaymentReceived: (id, data) => axios.put(`${API_BASE}/payments/${id}/mark-received`, data),
  verifyPayment: (id, data) => axios.put(`${API_BASE}/payments/${id}/verify`, data),
  
  // Activities
  getActivities: (params) => axios.get(`${API_BASE}/activities`, { params }),
  createActivity: (data) => axios.post(`${API_BASE}/activities`, data),
  
  // Catalog
  getCatalog: (params) => axios.get(`${API_BASE}/catalog`, { params }),
  createCatalogItem: (data) => axios.post(`${API_BASE}/catalog`, data),
  
  // Notifications
  getNotifications: (userId, unreadOnly) => axios.get(`${API_BASE}/notifications`, { params: { user_id: userId, unread_only: unreadOnly } }),
  markNotificationRead: (id) => axios.put(`${API_BASE}/notifications/${id}/read`),
  createNotification: (data) => axios.post(`${API_BASE}/notifications`, data),
  
  // Leave Management
  getLeaves: (params) => axios.get(`${API_BASE}/leaves`, { params }),
  getMyLeaves: (userId) => axios.get(`${API_BASE}/leaves/my-leaves`, { params: { user_id: userId } }),
  createLeave: (data) => axios.post(`${API_BASE}/leaves`, data),
  cancelLeave: (id) => axios.delete(`${API_BASE}/leaves/${id}`),
  getAvailableBackups: (role, startDate, endDate, excludeUserId) => axios.get(`${API_BASE}/leaves/available-backups`, { 
    params: { role, start_date: startDate, end_date: endDate, exclude_user_id: excludeUserId } 
  }),
  getDelegatedRequests: (userId) => axios.get(`${API_BASE}/requests/delegated`, { params: { user_id: userId } }),
  
  // Admin
  getAllSalespeople: () => axios.get(`${API_BASE}/admin/salespeople`),
  toggleCostBreakupPermission: (userId, canSee) => axios.put(`${API_BASE}/admin/salespeople/${userId}/cost-breakup-permission`, { can_see_cost_breakup: canSee }),
  
  // Dashboard
  getDashboardStats: (role) => axios.get(`${API_BASE}/dashboard/stats`, { params: { role } }),
  
  // Seed
  seedData: () => axios.post(`${API_BASE}/seed`),
  
  // Upload
  uploadFile: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return axios.post(`${API_BASE}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
};