// src/slices/auth/login/thunk.ts

// Helpers existentes
import { getFirebaseBackend } from "../../../helpers/firebase_helper";
import { postFakeLogin } from "../../../helpers/fakebackend_helper";

// Helpers de la API y Token
import { api } from "../../../services/api";
import { setToken, clearToken } from "../../../services/auth";

// Acciones del Reducer
import {
  loginSuccess,
  logoutUserSuccess,
  apiError,
  reset_login_flag,
} from "./reducer";

type NavigateFn = (path: string) => void;

// =================================================================
// FUNCIÓN LOGINUSER (MODIFICADA)
// =================================================================
export const loginUser =
  (user: { email: string; password: string }, navigate: NavigateFn) =>
  async (dispatch: any) => {
    try {
      let data: any = null;
      // --- CAMBIO 1: Declaramos una variable para guardar el estado de la configuración ---
      let setup_complete = true; // Por defecto, asumimos que la configuración está completa

      if (process.env.REACT_APP_DEFAULTAUTH === "firebase") {
        const fireBaseBackend: any = getFirebaseBackend();
        data = await fireBaseBackend.loginUser(user.email, user.password);
        
      } else if (process.env.REACT_APP_DEFAULTAUTH === "jwt") {
        const res = await api.post("/auth/login", {
          email: user.email,
          password: user.password,
        });

        if (!res?.data?.token) {
          throw new Error("La respuesta de la API no incluyó un token.");
        }

        // Guarda token para toda la app
        setToken(res.data.token);

        // --- CAMBIO 2: Capturamos el valor de 'setup_complete' desde la respuesta de la API ---
        setup_complete = res.data.setup_complete;

        const authUser = {
          message: "Login Successful",
          token: res.data.token,
          user: res.data.user || { email: user.email },
          setup_complete: setup_complete
        };
        sessionStorage.setItem("authUser", JSON.stringify(authUser));

        data = authUser;
      } else if (process.env.REACT_APP_DEFAULTAUTH === "fake") {
        const finallogin: any = await postFakeLogin({
          email: user.email,
          password: user.password,
        });
        if (finallogin?.status !== "success") {
          throw finallogin || new Error("Login fake fallido");
        }
        data = finallogin.data;
        sessionStorage.setItem("authUser", JSON.stringify(data));
      } else {
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

      // Éxito: actualiza store
      dispatch(loginSuccess(data));
      
      // --- CAMBIO 3: Usamos una lógica condicional para la navegación ---
      if (navigate) {
        if (setup_complete === false) {
          navigate("/settings"); // Si la configuración no está completa, va a Settings
        } else {
          navigate("/dashboard"); // Si está completa, va al Dashboard
        }
      }

    } catch (error: any) {
      const msg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "No se pudo iniciar sesión.";
      dispatch(apiError(msg));
    }
  };

// =================================================================
// OTRAS FUNCIONES (SIN CAMBIOS)
// =================================================================

export const logoutUser = () => async (dispatch: any) => {
  try {
    sessionStorage.removeItem("authUser");
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