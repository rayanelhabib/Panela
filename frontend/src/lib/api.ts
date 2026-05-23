import axios from "axios";

// Create a configured Axios instance
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

// Add a request interceptor to inject the JWT token and handle dynamic host rewriting for LAN connections
api.interceptors.request.use(
  (config) => {
    // We only access window and localStorage on the client side
    if (typeof window !== "undefined") {
      const host = window.location.hostname;
      // If we are accessing via a custom network IP/domain, rewrite localhost to that host
      if (config.baseURL === "http://localhost:8080/api/v1" && host !== "localhost" && host !== "127.0.0.1") {
        config.baseURL = `http://${host}:8080/api/v1`;
      }

      const token = localStorage.getItem("panella_token");
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for global error handling (e.g., redirect to login on 401)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      // Clear token and redirect to login if unauthorized
      localStorage.removeItem("panella_token");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);
