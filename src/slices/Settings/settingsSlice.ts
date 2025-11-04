import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { api } from "../../services/api";
import { jwtDecode } from "jwt-decode";
import { getToken } from "../../services/auth";

// ✅ Tipos
interface TenantSettings {
  id?: string;
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo_url?: string;
  iva_rate?: number;
  admin_fee_percent?: number;
  working_hours?: Record<string, string | null>;
  products_for_staff_enabled?: boolean;
  admin_fee_enabled?: boolean;
  loans_to_staff_enabled?: boolean;
  allow_past_appointments?: boolean;
  created_at?: string;
  updated_at?: string;
}

interface SettingsState {
  progress: number;
  isComplete: boolean;
  data: TenantSettings | null;
  loaded: boolean;
  loading: boolean;
  error: string | null;
}

// Helper para obtener tenantId del token
const getTenantIdFromToken = (): string | null => {
  try {
    const token = getToken();
    if (!token) return null;
    const decoded: any = jwtDecode(token);
    return decoded?.user?.tenant_id || decoded?.tenant_id || null;
  } catch {
    return null;
  }
};

// ✅ Thunk para cargar settings del tenant
export const fetchTenantSettings = createAsyncThunk(
  'settings/fetchTenantSettings',
  async (_, { rejectWithValue }) => {
    try {
      const tenantId = getTenantIdFromToken();
      if (!tenantId) throw new Error('No se encontró tenant_id en el token');
      
      const { data } = await api.get(`/tenants/${tenantId}`);
      return data;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || error?.message || 'Error al cargar configuración');
    }
  }
);

// Estado inicial
const initialProgress = Number(localStorage.getItem('setupProgress') || 0);

const initialState: SettingsState = {
  progress: initialProgress,
  isComplete: initialProgress === 100,
  data: null,
  loaded: false,
  loading: false,
  error: null,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setSetupProgress(state, action: PayloadAction<number>) {
      const newProgress = action.payload;
      state.progress = newProgress;
      state.isComplete = newProgress === 100;
      localStorage.setItem('setupProgress', String(newProgress));
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTenantSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTenantSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.loaded = true;
        state.data = action.payload;
        state.error = null;
      })
      .addCase(fetchTenantSettings.rejected, (state, action) => {
        state.loading = false;
        state.loaded = false;
        state.error = action.payload as string;
      });
  },
});

export const { setSetupProgress } = settingsSlice.actions;

// ✅ Selectores CORREGIDOS (defensivos)
export const selectIsSetupComplete = (state: any) => {
  const settingsState = state.Settings || state.settings || {};
  return settingsState.isComplete ?? false;
};

export const selectTenantSettings = (state: any) => {
  const settingsState = state.Settings || state.settings || {};
  return settingsState.data ?? null;
};

export const selectSettingsLoaded = (state: any) => {
  const settingsState = state.Settings || state.settings || {};
  return settingsState.loaded ?? false;
};

export default settingsSlice.reducer;