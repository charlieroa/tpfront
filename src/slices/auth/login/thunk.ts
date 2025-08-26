// src/slices/auth/login/thunk.ts

// Helpers existentes (si sigues usando Firebase en otros entornos)
import { getFirebaseBackend } from "../../../helpers/firebase_helper";
// Legacy fake (solo si usas el modo "fake")
import { postFakeLogin } from "../../../helpers/fakebackend_helper";

// ✅ NUEVO: instancia única y helpers de token
import { api } from "../../../services/api";
import { setToken, clearToken } from "../../../services/auth";

import {
  loginSuccess,
  logoutUserSuccess,
  apiError,
  reset_login_flag,
} from "./reducer";

type NavigateFn = (path: string) => void;

export const loginUser =
  (user: { email: string; password: string }, navigate: NavigateFn) =>
  async (dispatch: any) => {
    try {
      let data: any = null;

      if (process.env.REACT_APP_DEFAULTAUTH === "firebase") {
        const fireBaseBackend: any = getFirebaseBackend();
        data = await fireBaseBackend.loginUser(user.email, user.password);
        // Si usas Firebase, maneja token según tu implementación
        // setToken(fireBaseToken)
        // sessionStorage.setItem("authUser", JSON.stringify(data));
      } else if (process.env.REACT_APP_DEFAULTAUTH === "jwt") {
        // ✅ Login real contra tu backend
        const res = await api.post("/auth/login", {
          email: user.email,
          password: user.password,
        });

        if (!res?.data?.token) {
          throw new Error("La respuesta de la API no incluyó un token.");
        }

        // Guarda token para toda la app
        setToken(res.data.token);

        // (Compat) guarda una mínima info en sessionStorage si el resto del template la usa
        const authUser = {
          message: "Login Successful",
          token: res.data.token,
          user: res.data.user || { email: user.email },
        };
        sessionStorage.setItem("authUser", JSON.stringify(authUser));

        data = authUser;
      } else if (process.env.REACT_APP_DEFAULTAUTH === "fake") {
        // Modo demo
        const finallogin: any = await postFakeLogin({
          email: user.email,
          password: user.password,
        });
        if (finallogin?.status !== "success") {
          throw finallogin || new Error("Login fake fallido");
        }
        data = finallogin.data;
        // Si tu fake devuelve algo tipo { token }, podrías setToken(data.token)
        sessionStorage.setItem("authUser", JSON.stringify(data));
      } else {
        // Fallback a fake si no está configurado DEFAULTAUTH
        const finallogin: any = await postFakeLogin({
          email: user.email,
          password: user.password,
        });
        if (finallogin?.status !== "success") {
          throw finallogin || new Error("Login fake fallido");
        }
        data = finallogin.data;
        sessionStorage.setItem("authUser", JSON.stringify(data));
      }

      // Éxito: actualiza store y navega
      dispatch(loginSuccess(data));
      navigate ? navigate("/dashboard") : (window.location.href = "/dashboard");
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "No se pudo iniciar sesión.";
      dispatch(apiError(msg));
    }
  };

export const logoutUser = () => async (dispatch: any) => {
  try {
    // Limpia compat
    sessionStorage.removeItem("authUser");
    // ✅ Limpia token real
    clearToken();

    if (process.env.REACT_APP_DEFAULTAUTH === "firebase") {
      const fireBaseBackend: any = getFirebaseBackend();
      await fireBaseBackend.logout();
    }
    dispatch(logoutUserSuccess(true));
    window.location.assign("/login");
  } catch (error: any) {
    dispatch(apiError(error?.message || error));
  }
};

export const socialLogin =
  (type: any, navigate: NavigateFn) => async (dispatch: any) => {
    try {
      if (process.env.REACT_APP_DEFAULTAUTH === "firebase") {
        const fireBaseBackend: any = getFirebaseBackend();
        const response = await fireBaseBackend.socialLoginUser(type);
        sessionStorage.setItem("authUser", JSON.stringify(response));
        dispatch(loginSuccess(response));
        navigate ? navigate("/dashboard") : (window.location.href = "/dashboard");
      } else {
        // Si no usas Firebase, indica que no está configurado
        throw new Error("Social login no está configurado en este entorno.");
      }
    } catch (error: any) {
      const msg = error?.message || "No se pudo iniciar sesión con social login.";
      dispatch(apiError(msg));
    }
  };

export const resetLoginFlag = () => async (dispatch: any) => {
  try {
    return dispatch(reset_login_flag());
  } catch (error: any) {
    dispatch(apiError(error?.message || error));
  }
};
