import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT token from localStorage on every request
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Track whether a refresh is already in progress to avoid parallel refresh calls
let isRefreshing = false;
let refreshQueue = []; // requests waiting for the new token

const processQueue = (error, token = null) => {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  refreshQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      typeof window !== "undefined" &&
      !originalRequest._retry  
    ) {
      const token = localStorage.getItem("token");

      // No token at all — not logged in, go to login
      if (!token) {
        window.location.href = "/login";
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Call the /refresh endpoint with the expired token to get a new one
        const res = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/refresh`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const newToken = res.data?.access_token || res.data?.token;
        if (!newToken) throw new Error("No token in refresh response");

        localStorage.setItem("token", newToken);
        api.defaults.headers.common.Authorization = `Bearer ${newToken}`;

        // Unblock any queued requests with the new token
        processQueue(null, newToken);

        // Retry the original request that triggered the 401
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);

      } catch (refreshError) {
        // Refresh failed — token is truly dead, clear and redirect
        processQueue(refreshError, null);
        localStorage.removeItem("token");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;