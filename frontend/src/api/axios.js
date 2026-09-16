import axios from "axios";

const api = axios.create({
  baseURL: "/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("jansuvidha_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// If the token is missing/expired/invalid, the backend returns 401.
// Clear it and send the user back to /login instead of leaving stale
// screens showing errors indefinitely (spec section 16).
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && window.location.pathname !== "/login") {
      localStorage.removeItem("jansuvidha_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
