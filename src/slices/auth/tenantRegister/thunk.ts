import {
  registerTenantSuccessful,
  registerTenantFailed,
} from './reducer';

import { postRegisterTenantAdmin } from '../../../helpers/fakebackend_helper';

export const registerTenant = (data: any) => async (dispatch: any) => {
  try {
    const response = await postRegisterTenantAdmin(data);
    dispatch(registerTenantSuccessful(response));
  } catch (error) {
    dispatch(registerTenantFailed(error));
  }
};