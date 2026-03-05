import api from '@/services/api';

export const exportProjectsPdf = (params?: Record<string, any>) =>
    api.get('/export/projects/pdf', { params, responseType: 'blob' });

export const exportProjectsExcel = (params?: Record<string, any>) =>
    api.get('/export/projects/excel', { params, responseType: 'blob' });

export const exportProjectsCsv = (params?: Record<string, any>) =>
    api.get('/export/projects/csv', { params, responseType: 'blob' });

export const downloadBlob = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
};
