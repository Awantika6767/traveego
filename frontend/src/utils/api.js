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
  
   // Customers
  searchCustomers: (query) => axios.get(`${API_BASE}/customers/search`, { params: { query } }),
  quickCreateCustomer: (data) => axios.post(`${API_BASE}/customers/quick-create`, data),
  
  // Requests
  getRequests: () => axios.get(`${API_BASE}/requests`),
  getRequest: (id) => axios.get(`${API_BASE}/requests/${id}`),
  createRequest: (data) => axios.post(`${API_BASE}/requests`, data),
  updateRequest: (id, data) => axios.put(`${API_BASE}/requests/${id}`, data),
  cancelRequest: (id, data) => axios.post(`${API_BASE}/requests/${id}/cancel`, data),
  reopenRequest: (id, data) => axios.post(`${API_BASE}/requests/${id}/reopen`, data),
  addRequestNote: (id, data) => axios.post(`${API_BASE}/requests/${id}/add-note`, data),
  getOpenRequests: () => axios.get(`${API_BASE}/requests/open/list`),
  assignRequestToMe: (id) => axios.post(`${API_BASE}/requests/${id}/assign-to-me`),
  validateRequest: (id) => axios.post(`${API_BASE}/requests/${id}/validate`),
  
  // Quotations
  getQuotations: (id) => axios.get(`${API_BASE}/quotations/${id}`),
  getQuotation: (id) => axios.get(`${API_BASE}/quotations/${id}`),
  createQuotation: (data) => axios.post(`${API_BASE}/quotations`, data),
  updateQuotation: (id, data) => axios.put(`${API_BASE}/quotations/${id}`, data),
  publishQuotation: (id, data) => axios.post(`${API_BASE}/quotations/${id}/publish`, data),
  acceptQuotation: (id) => axios.post(`${API_BASE}/quotations/${id}/accept`),
  payRemainingInvoice: (id) => axios.post(`${API_BASE}/invoices/${id}/full-payment`),
  downloadProformaInvoice: (id) => `${API_BASE}/quotations/${id}/download-proforma`,
  generateDetailedPDF: (quotationData) => axios.post(`${API_BASE}/generate-pdf`, quotationData, { responseType: 'blob' }),
  getCostBreakup: (id) => axios.get(`${API_BASE}/quotations/${id}/cost-breakup`),
  downloadQuotationPDF: (id) => `${API_BASE}/quotations/${id}/pdf`,

  // Invoices
  getInvoice: (params) => axios.get(`${API_BASE}/invoice`, { params }),
  // getInvoice: (id) => axios.get(`${API_BASE}/invoices/${id}`),
  downloadInvoice: (id) => `${API_BASE}/invoices/${id}/download`,
  getPendingInvoiceQuotations: () => axios.get(`${API_BASE}/quotations/pending-invoice`),
  createInvoiceFromQuotation: (data) => axios.post(`${API_BASE}/invoices/create-from-quotation`, data),
  createPaymentBreakup: (invoiceId, data) => axios.post(`${API_BASE}/invoices/${invoiceId}/payment-breakup`, data),
  getPaymentBreakup: (invoiceId) => axios.get(`${API_BASE}/invoices/${invoiceId}/payment-breakup`),
  
  // Payments
  getPayments: (params) => axios.get(`${API_BASE}/payments`, { params }),
  getPayment: (id) => axios.get(`${API_BASE}/payments/${id}`),
  createPayment: (data) => axios.post(`${API_BASE}/payments`, data),
  uploadPaymentProof: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return axios.post(`${API_BASE}/payments/upload-proof`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  markPaymentReceived: (id, data) => axios.put(`${API_BASE}/payments/${id}/mark-received`, data),
  verifyPayment: (id, data) => axios.put(`${API_BASE}/payments/${id}/verify`, data),
  verifyPaymentByAccountant: (paymentId) => axios.put(`${API_BASE}/payments/${paymentId}/verify-by-accountant`),
  verifyPaymentByOperations: (paymentId) => axios.put(`${API_BASE}/payments/${paymentId}/verify-by-operations`),
  
  // Payment Allocations
  getPaymentAllocations: (invoiceId) => axios.get(`${API_BASE}/invoices/${invoiceId}/payment-allocations`),
  
  // Alerts & Overdue
  getOverdueBreakups: () => axios.get(`${API_BASE}/payment-breakups/overdue`),
  getOverdueCount: () => axios.get(`${API_BASE}/alerts/overdue-count`),
  
  // Activities
  getActivities: (params) => axios.get(`${API_BASE}/activities`, { params }),
  createActivity: (data) => axios.post(`${API_BASE}/activities`, data),
  
  // Catalog
  getCatalog: (params) => axios.get(`${API_BASE}/catalog`, { params }),
  createCatalogItem: (data) => axios.post(`${API_BASE}/catalog`, data),
  
  // Notifications
  getNotifications: (unreadOnly) => axios.get(`${API_BASE}/notifications`, { params: { unread_only: unreadOnly } }),
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
  getDelegatedRequests: () => axios.get(`${API_BASE}/requests/delegated`),
  
  // Admin
  getAllSalespeople: () => axios.get(`${API_BASE}/admin/salespeople`),
  toggleCostBreakupPermission: (userId, canSee) => axios.put(`${API_BASE}/admin/salespeople/${userId}/cost-breakup-permission`, { can_see_cost_breakup: canSee }),
  getAdminSettings: () => axios.get(`${API_BASE}/admin/settings`),
  updateAdminSettings: (data) => axios.post(`${API_BASE}/admin/settings`, data),

   
  // User Management (Admin)
  getAllUsers: (role) => axios.get(`${API_BASE}/admin/users`, { params: { role } }),
  getUser: (userId) => axios.get(`${API_BASE}/admin/users/${userId}`),
  createUser: (data) => axios.post(`${API_BASE}/admin/users`, data),
  updateUser: (userId, data) => axios.put(`${API_BASE}/admin/users/${userId}`, data),
  deleteUser: (userId) => axios.delete(`${API_BASE}/admin/users/${userId}`),
  resetUserPassword: (userId) => axios.put(`${API_BASE}/admin/users/${userId}/reset-password`),
  
  // Dashboard
  getDashboardStats: () => axios.get(`${API_BASE}/dashboard/stats`),
  
  // Seed
  seedData: () => axios.post(`${API_BASE}/seed`),
  
  // Upload
  uploadFile: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return axios.post(`${API_BASE}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  // Messages/Chat
  sendMessage: (requestId, data) => axios.post(`${API_BASE}/requests/${requestId}/messages`, data),
  getMessages: (requestId, page = 1, limit = 10) => 
    axios.get(`${API_BASE}/requests/${requestId}/messages`, { 
      params: { page, limit } 
    }).then(res => res.data),

  //Quotation Builder
  createQuotation: (data) => axios.post(`${API_BASE}/quotations`, data),
  
  // Admin Performance Dashboard
  getSalesPerformance: () => axios.get(`${API_BASE}/admin/performance/sales`),
  getOperationsPerformance: () => axios.get(`${API_BASE}/admin/performance/operations`),
  getPerformanceRequests: () => axios.get(`${API_BASE}/admin/performance/requests`),
  completeRequest: (data) => axios.post(`${API_BASE}/admin/performance/complete-request`, data),
  addTeamMember: (data) => axios.post(`${API_BASE}/admin/performance/add-member`, data),
  removeTeamMember: (memberId) => axios.delete(`${API_BASE}/admin/performance/remove-member/${memberId}`),
};