// services/api.ts
import axios, { AxiosError } from "axios";
import { getToken, clearToken } from "./auth";

/** Base por defecto si no viene del .env */
const DEFAULT_API_BASE = process.env.REACT_APP_API_URL || "http://localhost:3000/api";

/** Instancia única de Axios para toda la app */
export const api = axios.create({
  baseURL: DEFAULT_API_BASE,
  withCredentials: true,
  headers: {
    Accept: "application/json",
    // No fijamos "Content-Type" aquí para no romper FormData; lo seteamos en el request si hace falta.
  },
});

/** Determina si una URL (relativa o absoluta) cae bajo /auth/* */
const isAuthRoute = (url?: string): boolean => {
  if (!url) return false;
  try {
    // Si es relativa, la resolvemos contra baseURL
    const u = new URL(url, api.defaults.baseURL || DEFAULT_API_BASE);
    return u.pathname.startsWith("/auth");
  } catch {
    // Fallback simple si URL no válida
    return url.startsWith("/auth");
  }
};

/** Interceptor de REQUEST: agrega Authorization salvo rutas /auth/* y cuida Content-Type */
api.interceptors.request.use((config) => {
  // Asegurar headers como objeto mutable
  config.headers = config.headers ?? {};

  // Establecer Content-Type solo cuando NO sea FormData y no esté ya definido
  const isFormData = typeof FormData !== "undefined" && config.data instanceof FormData;
  if (!isFormData && !config.headers["Content-Type"]) {
    config.headers["Content-Type"] = "application/json";
  }

  // Token en todas las rutas menos /auth/*
  const token = getToken();
  const authRoute = isAuthRoute(config.url);
  if (token && !authRoute) {
    (config.headers as any).Authorization = `Bearer ${token}`;
  } else if (authRoute && (config.headers as any).Authorization) {
    delete (config.headers as any).Authorization;
  }

  return config;
});

/** Interceptor de RESPONSE: manejo global de 401 */
api.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    const status = err?.response?.status;
    if (status === 401) {
      // Token inválido/expirado → limpiar y redirigir a login
      clearToken();
      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        window.location.assign("/login");
      }
    }
    return Promise.reject(err);
  }
);

/** (Opcional) cambiar baseURL en runtime si lo necesitas */
export const setApiBaseURL = (baseURL: string) => {
  api.defaults.baseURL = baseURL;
};

export default api;
