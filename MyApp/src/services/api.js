import axios from 'axios';


const BASE_URL = 'https://zupay-api.onrender.com/api';
export const API_URLS = {
  AUTH: {
    REGISTER: `${BASE_URL}/auth/register`,
    LOGIN:    `${BASE_URL}/auth/login`,
    LOGOUT:   `${BASE_URL}/auth/logout`,
    PROFILE:  `${BASE_URL}/auth/profile`,
    LINK_BANK:`${BASE_URL}/auth/link-bank`,
    FIND_USER:(id) => `${BASE_URL}/auth/user/${id}`,
    REFRESH:  `${BASE_URL}/auth/refresh`,
  },
  TRANSACTION: {
    SEND:    `${BASE_URL}/transaction/send`,
    HISTORY: `${BASE_URL}/transaction/history`,
  },
};

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 
    'Content-Type': 'application/json',
    'X-Client': 'mobile' 
  },
  withCredentials: true,  
});

let getTokenFn = null;

export const registerTokenGetter = (fn) => {
  getTokenFn = fn;
};

api.interceptors.request.use((config) => {
  const token = getTokenFn ? getTokenFn() : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  console.log('REQUEST HEADERS:', token ? 'HAS TOKEN' : 'NO TOKEN');
  return config;
});

export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

export default api;