import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
});

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
export const exportCSV = (tableName) => {
    window.open(`${API_BASE_URL}/export/${tableName}`, '_blank');
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
