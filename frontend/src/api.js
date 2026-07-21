import axios from 'axios';

const api = axios.create({
  baseURL: 'https://planify-tgoq.onrender.com/api/',
});

const PUBLIC_ENDPOINTS = ['register/', 'token/', 'token/refresh/'];

api.interceptors.request.use((config) => {
  const isPublic = PUBLIC_ENDPOINTS.some((path) => config.url?.includes(path));

  if (!isPublic) {
    const token = localStorage.getItem('access');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh');

      if (refreshToken) {
        try {
          const { data } = await axios.post(
            `${api.defaults.baseURL}token/refresh/`,
            { refresh: refreshToken }
          );
          localStorage.setItem('access', data.access);
          originalRequest.headers.Authorization = `Bearer ${data.access}`;
          return api(originalRequest);
        } catch (refreshError) {
          localStorage.removeItem('access');
          localStorage.removeItem('refresh');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      } else {
        localStorage.removeItem('access');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;