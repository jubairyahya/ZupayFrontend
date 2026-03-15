import axios from 'axios';
import { Platform } from 'react-native';

const BASE_URL = Platform.OS === 'web'
  ? 'http://localhost:8080/api'
  : Platform.OS === 'android'
  ? 'http://10.0.2.2:8080/api'
  : 'http://192.168.1.203:8080/api';

export const API_URLS = {
  AUTH: {
    REGISTER: `${BASE_URL}/auth/register`,
    LOGIN: `${BASE_URL}/auth/login`,
    LOGOUT: `${BASE_URL}/auth/logout`,
    PROFILE: `${BASE_URL}/auth/profile`,
    LINK_BANK: `${BASE_URL}/auth/link-bank`,
    FIND_USER: (id) => `${BASE_URL}/auth/user/${id}`,
    REFRESH: `${BASE_URL}/auth/refresh`,
  },
  TRANSACTION: {
    SEND: `${BASE_URL}/transaction/send`,
    HISTORY: `${BASE_URL}/transaction/history`,
  },
};

// Axios instance with base config
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Add token to every request automatically
export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

export default api;