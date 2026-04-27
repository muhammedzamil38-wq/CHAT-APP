import axios from 'axios';

const getBaseURL = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  
  // In development (localhost), we usually use port 5000 for the backend
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return `http://${window.location.hostname}:5000`;
  }
  
  // In production, if served from the same host, use the origin
  return window.location.origin;
};

export const api = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If unauthorized, redirect to login unless it's already the login route
    if (error.response?.status === 401 && window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
