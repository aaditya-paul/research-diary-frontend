import axios from 'axios';
import type { Entry, EntryCreate, EntryUpdate, ReportGenerateResponse, Report, ReportCreate } from '../types';

const api = axios.create({
  baseURL: '/api',
});

export const entryApi = {
  getAll: async (): Promise<Entry[]> => {
    const response = await api.get<Entry[]>('/entries');
    return response.data;
  },

  getById: async (id: number): Promise<Entry> => {
    const response = await api.get<Entry>(`/entries/${id}`);
    return response.data;
  },

  create: async (entry: EntryCreate): Promise<Entry> => {
    const response = await api.post<Entry>('/entries', entry);
    return response.data;
  },

  update: async (id: number, entry: EntryUpdate): Promise<Entry> => {
    const response = await api.put<Entry>(`/entries/${id}`, entry);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/entries/${id}`);
  },
};

export const reportApi = {
  generateSuggestions: async (entryIds: number[], reportType: string): Promise<ReportGenerateResponse> => {
    const response = await api.post<ReportGenerateResponse>('/report/generate', {
      entry_ids: entryIds,
      report_type: reportType,
    });
    return response.data;
  },

  create: async (report: ReportCreate): Promise<Report> => {
    const response = await api.post<Report>('/report', report);
    return response.data;
  },

  getAll: async (): Promise<Report[]> => {
    const response = await api.get<Report[]>('/reports');
    return response.data;
  },

  getById: async (id: number): Promise<Report> => {
    const response = await api.get<Report>(`/reports/${id}`);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/reports/${id}`);
  },
};

export const exportApi = {
  markdown: async (reportId: number): Promise<{ content: string; filename: string }> => {
    const response = await api.get<{ content: string; filename: string }>(`/export/markdown/${reportId}`);
    return response.data;
  },

  html: async (reportId: number): Promise<{ content: string; filename: string }> => {
    const response = await api.get<{ content: string; filename: string }>(`/export/html/${reportId}`);
    return response.data;
  },

  pdf: async (reportId: number): Promise<{ content: string; filename: string }> => {
    const response = await api.get<{ content: string; filename: string }>(`/export/pdf/${reportId}`);
    return response.data;
  },
};

export default api;
