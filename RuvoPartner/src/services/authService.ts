import { api, unwrap } from './api';

export interface AuthToken {
  accessToken: string;
  tokenType: string;
  userId: number | string;
  role: string;
}

export const authService = {
  sendOtp: async (mobileNumber: string) => {
    return api('/api/auth/otp/send', null, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobileNumber }),
    });
  },
  verifyOtp: async (mobileNumber: string, otpCode: string, role: string) => {
    return unwrap<AuthToken>(await api('/api/auth/otp/verify', null, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobileNumber, otpCode, role }),
    }));
  },
};
