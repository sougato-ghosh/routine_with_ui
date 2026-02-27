import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
});

export const getOverview = () => api.get('/overview');
export const getData = (filename) => api.get(`/data/${filename}`);
export const updateData = (filename, data) => api.post(`/data/${filename}`, data);
export const validateData = () => api.get('/validate');
export const runScheduler = () => api.post('/run-scheduler');
export const getSchedules = () => api.get('/schedules');
export const getScheduleItems = (scheduleId) => api.get(`/schedules/${scheduleId}/items`);
export const viewSchedule = (scheduleId, type, id) => api.get(`/schedules/${scheduleId}/view`, { params: { type, id } });
export const deleteSchedule = (scheduleId) => api.delete(`/schedules/${scheduleId}`);

// Database-specific endpoints
export const getSettings = () => api.get('/settings');
export const updateSettings = (data) => api.post('/settings', data);
export const exportCSV = (filename) => {
    window.open(`${API_BASE_URL}/export/${filename}`, '_blank');
};
export const importCSV = (filename, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/import/${filename}`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
};

export default api;
