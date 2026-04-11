import axios from 'axios';
import { Platform } from 'react-native';

export const BASE_URL = 'http://localhost:5000/api';

const getToken = async () => {
  if (Platform.OS === 'web') return localStorage.getItem('token');
  const SecureStore = await import('expo-secure-store');
  return SecureStore.getItemAsync('token');
};

const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Auth ──────────────────────────────────────────────────────────────────
export const register  = (data) => api.post('/auth/register', data);
export const login     = (data) => api.post('/auth/login', data);
export const seedUsers = ()     => api.post('/auth/seed');

// ── Citizen (authenticated) ───────────────────────────────────────────────
export const submitReport = (formData) =>
  api.post('/citizen/report', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
export const getMyReports = () => api.get('/citizen/my-reports');
export const getMyScore   = () => api.get('/citizen/my-score');
export const getMyFee     = () => api.get('/fee/me');                          // ← THÊM
export const createPayment = (reportId) => api.post('/payment/create', { reportId }); // ← THÊM

// ── Guest report (no auth token needed) ───────────────────────────────────
export const submitGuestReport = (formData) =>
  api.post('/citizen/guest-report', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

// ── OTP (public, no auth) ─────────────────────────────────────────────────
export const sendOtp   = (contact)       => api.post('/citizen/send-otp',   { contact });
export const verifyOtp = (contact, code) => api.post('/citizen/verify-otp', { contact, code });

// ── Collector ─────────────────────────────────────────────────────────────
export const getCollectorReports = () => api.get('/collector/reports');
export const verifyReport = (reportId)  => api.post('/collector/verify-report', { reportId });
export const submitWeight = (data)      => api.post('/collector/submit-weight', data);

// ── Admin ─────────────────────────────────────────────────────────────────
export const getAllReports     = (params)                  => api.get('/admin/all-reports', { params });
export const getDashboardStats = ()                        => api.get('/admin/dashboard-stats');
export const analyzeReport     = (reportId)                => api.post('/admin/analyze-report', { reportId });
export const approveReport     = (reportId)                => api.post('/admin/approve-report', { reportId });
export const rejectReport      = (reportId, reason)        => api.post('/admin/reject-report', { reportId, reason });
export const adjustScore       = (citizenId, delta, reason) => api.post('/admin/adjust-score', { citizenId, delta, reason });
export const getCitizens       = ()                        => api.get('/admin/citizens');
export const calculateFee      = (citizenId)               => api.post('/admin/calculate-fee', { citizenId });

export default api;