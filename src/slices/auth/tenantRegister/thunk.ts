// --- CAMBIO 1: Importamos nuestra API real en lugar del 'fakebackend' ---
import { api } from '../../../services/api'; 

import {
  registerTenantSuccessful,
  registerTenantFailed,
} from './reducer';


export const registerTenant = (tenantData: any) => async (dispatch: any) => {
  try {
    const response = await api.post("/auth/register-tenant", tenantData);
    dispatch(registerTenantSuccessful(response.data));
  } catch (error: any) {
    const errorMessage = error.response?.data?.error || "Ocurrió un error inesperado en el registro.";
    
   
    
    dispatch(registerTenantFailed(errorMessage));
  }
};