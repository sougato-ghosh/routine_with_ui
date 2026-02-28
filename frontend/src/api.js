import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add a request interceptor to include the access token in all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add a response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const res = await axios.post(`${API_BASE_URL}/refresh`, { refresh_token: refreshToken });
          if (res.status === 200) {
            localStorage.setItem('access_token', res.data.access_token);
            localStorage.setItem('refresh_token', res.data.refresh_token);
            api.defaults.headers.common['Authorization'] = `Bearer ${res.data.access_token}`;
            return api(originalRequest);
          }
        } catch (refreshError) {
          // If refresh token is also invalid, logout the user
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export const login = (username, password) => api.post('/login', { username, password });
export const register = (username, password) => api.post('/register', { username, password });
export const logout = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
};

export const getOverview = () => api.get('/overview');
export const getData = (tableName) => api.get(`/data/${tableName}`);
export const updateData = (tableName, data) => api.post(`/data/${tableName}`, data);
export const validateData = () => api.get('/validate');
export const runScheduler = () => api.post('/run-scheduler');
export const getSchedules = () => api.get('/schedules');
export const getSchedule = (id) => api.get(`/schedules/${id}`);
export const deleteSchedule = (id) => api.delete(`/schedules/${id}`);
export const deleteAllSchedules = () => api.delete('/schedules');
export const viewSchedule = (scheduleId, type, id) => api.get(`/schedules/${scheduleId}/view`, { params: { type, id } });

// Database-specific endpoints
export const getSettings = () => api.get('/settings');
export const updateSettings = (data) => api.post('/settings', data);
export const exportCSV = async (tableName) => {
    const token = localStorage.getItem('access_token');
    const response = await api.get(`/export/${tableName}`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${tableName}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
};
export const importCSV = (tableName, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/import/${tableName}`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
};

export default api;
