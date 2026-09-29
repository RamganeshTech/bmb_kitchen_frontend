// src/lib/api.ts
import axios from 'axios';
// import { getToken } from './tokenManager';
import { store } from '../features/store/store';
import { logout } from '../features/slices/authSlice';
// import { store } from '../features/store/store';
// import { logout } from '../features/slices/authSlice';

export const Api = axios.create({
  baseURL: import.meta.env.VITE_APP_BASE_API || 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});


// // Intercept requests to inject the Auth token from MEMORY automatically
// Api.interceptors.request.use(
//   (config) => {
//     // Fetch token from secure in-memory storage
//     const token = getToken();

//     if (token && config.headers) {
//       config.headers.Authorization = `Bearer ${token}`;
//     }
//     return config;
//   },
//   (error) => {
//     return Promise.reject(error);
//   }
// );


// // Interceptor to handle global 401 Unauthorized errors
// Api.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     if (error.response?.status === 401) {
//       // Token expired or invalid -> force logout
//       store.dispatch(logout());
//       window.location.href = '/login'; 
//     }
//     return Promise.reject(error);
//   }
// );



// ----------------------------------------------------------------------
// REQUEST INTERCEPTOR: The Pre-Flight Gatekeeper
// ----------------------------------------------------------------------
Api.interceptors.request.use(
  (config) => {
    // const token = getToken();

    // // 🛑 THE FIX: If we are trying to check authentication, but we have NO token,
    // // cancel the request immediately. Do not wake up the network.
    // if (!token && config.url?.includes('/api/user/isauthenticated')) {
    //   return Promise.reject(new axios.Cancel("No token found. Skipping auth verification."));
    // }

    // if (token && config.headers) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ----------------------------------------------------------------------
// RESPONSE INTERCEPTOR: The 401 Handler
// ----------------------------------------------------------------------
Api.interceptors.response.use(
  (response) => response,
  (error) => {
    // // 1. If we cancelled the request manually above, just pass the error down silently.
    // if (axios.isCancel(error)) {
    //   return Promise.reject(error);
    // }

    // 2. Handle standard 401 Unauthorized errors
    if (error.response?.status === 401) {
      const originalRequestUrl = error.config?.url || '';

      // 🛑 CRITICAL FIX: Do NOT force a global logout/reload if the failing request 
      // was the `/isauthenticated` check itself. Let the useAuthCheck hook handle 
      // the failure gracefully. Otherwise, you get an infinite reload loop.
      if (!originalRequestUrl.includes('/api/user/isauthenticated')) {
        // console.warn(`🚨 A rogue API call to ${originalRequestUrl} failed with 401 and wiped Redux!`);
        store.dispatch(logout());

        // Optional: If you use React Router, it's better to let the protected 
        // routes redirect naturally, but window.location works as a hard reset.
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);