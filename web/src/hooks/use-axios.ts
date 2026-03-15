import axios, { AxiosError } from 'axios';

import { handleApiError } from '@/utils/error-handler';

const baseURL = import.meta.env.PUBLIC_BASE_URL;

const useAxios = axios.create({
  baseURL,
  withCredentials: true, // Enable sending cookies with requests
});

// Add a response interceptor for global error handling
useAxios.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // Process the error but don't show toasts here - let components handle UI feedback
    const errorResponse = handleApiError(error);

    // Handle 401 (Unauthorized) and 403 (Forbidden) errors globally
    if (errorResponse.statusCode === 401 || errorResponse.statusCode === 403) {
      console.error(
        `${errorResponse.statusCode === 401 ? 'Unauthorized' : 'Forbidden'} error detected`,
      );
      // Let the app's auth context handle redirects
      // The session will be invalidated and user will be redirected by AuthWrapper
    }

    return Promise.reject(errorResponse); // Return standardized error object
  },
);

export { useAxios };
