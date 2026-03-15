import { AxiosRequestConfig } from 'axios';

import { useAxios as axios } from '@/hooks/use-axios';
import { handleApiError } from '@/utils/error-handler';

export const apiClient = {
  get: async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    try {
      const res = await axios.get(url, config);
      return res.data;
    } catch (err) {
      throw handleApiError(err);
    }
  },
  post: async <T>(url: string, data: unknown): Promise<T> => {
    try {
      const res = await axios.post(url, data);
      return res.data;
    } catch (err) {
      throw handleApiError(err);
    }
  },
  put: async <T>(url: string, data: unknown): Promise<T> => {
    try {
      const res = await axios.put(url, data);
      return res.data;
    } catch (err) {
      throw handleApiError(err);
    }
  },
  patch: async <T>(url: string, data: unknown): Promise<T> => {
    try {
      const res = await axios.patch(url, data);
      return res.data;
    } catch (err) {
      throw handleApiError(err);
    }
  },
  delete: async <T>(url: string): Promise<T> => {
    try {
      const res = await axios.delete(url);
      return res.data;
    } catch (err) {
      throw handleApiError(err);
    }
  },
};
