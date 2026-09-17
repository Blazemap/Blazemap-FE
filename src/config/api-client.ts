import axios from "axios";

export const apiClient = axios.create({
  adapter: "fetch",
  withCredentials: true,
  timeout: 20_000,
  headers: { Accept: "application/json" },
  responseType: "json",
  transitional: { silentJSONParsing: false },
  fetchOptions: { cache: "no-store", redirect: "error" },
});

apiClient.interceptors.request.use((config) => {
  const configured: unknown = import.meta.env.VITE_API_URL || import.meta.env.VITE_AUTH_URL;
  if (!configured) return config;
  if (typeof configured !== "string" || /[\s\\?#]/.test(configured)) throw new Error("Invalid API configuration");
  const url = new URL(configured);
  if (url.username || url.password || !["/", "/api", "/api/", "/api/auth", "/api/auth/"].includes(url.pathname) ||
    (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)))) throw new Error("Invalid API configuration");
  config.baseURL = url.origin;
  return config;
});
