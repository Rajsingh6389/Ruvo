import React, { useState } from 'react';
import { request } from '../api';
import { useAuth } from '../context/AuthContext';

export const AuthPage = () => {
  const { login } = useAuth();
  const [mobileNumber, setMobileNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const formatMobile = (value) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length === 10) return `+91${digits}`;
    if (digits.startsWith('91') && digits.length === 12) return `+${digits}`;
    return '';
  };

  const sendOtp = async () => {
    const mobile = formatMobile(mobileNumber);
    if (!mobile) {
      setError('Enter a valid 10-digit admin mobile number.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await request('/auth/send-otp', null, {
        method: 'POST',
        body: JSON.stringify({ mobileNumber: mobile }),
      });
      setStep(2);
    } catch (err) {
      setError(err.message || 'Could not send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    const mobile = formatMobile(mobileNumber);
    if (otpCode.trim().length !== 6) {
      setError('Enter the 6-digit OTP.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const body = await request('/auth/verify-otp', null, {
        method: 'POST',
        body: JSON.stringify({ mobileNumber: mobile, otpCode: otpCode.trim() }),
      });
      if (body?.role !== 'ADMIN') {
        throw new Error('This account does not have ADMIN privileges.');
      }
      login(body.accessToken);
    } catch (err) {
      setError(err.message || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#173F35',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          backgroundColor: '#FFFFFF',
          borderRadius: 20,
          padding: 36,
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div
            style={{
              width: 54,
              height: 54,
              backgroundColor: '#F2A93B',
              color: '#173F35',
              fontWeight: 900,
              fontSize: 28,
              borderRadius: 14,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
            }}
          >
            R
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0F172A' }}>RuVo Admin</h2>
          <p style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
            Sign in with registered admin phone number
          </p>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: '#FEF2F2',
              border: '1px solid #FCA5A5',
              color: '#DC2626',
              padding: 12,
              borderRadius: 10,
              fontSize: 13,
              marginBottom: 20,
              fontWeight: 600,
            }}
          >
            {error}
          </div>
        )}

        {step === 1 ? (
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 700,
                color: '#475569',
                marginBottom: 8,
              }}
            >
              Mobile Number
            </label>
            <input
              type="tel"
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
              placeholder="10-digit phone number"
              style={{
                width: '100%',
                padding: 14,
                borderRadius: 10,
                border: '1.5px solid #CBD5E1',
                fontSize: 15,
                marginBottom: 20,
                outline: 'none',
              }}
            />
            <button
              onClick={sendOtp}
              disabled={loading}
              style={{
                width: '100%',
                padding: 14,
                backgroundColor: '#173F35',
                color: '#FFF',
                border: 'none',
                borderRadius: 10,
                fontWeight: 800,
                fontSize: 15,
                cursor: 'pointer',
              }}
            >
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </button>
          </div>
        ) : (
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 700,
                color: '#475569',
                marginBottom: 8,
              }}
            >
              Enter 6-Digit OTP
            </label>
            <input
              type="text"
              maxLength={6}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              style={{
                width: '100%',
                padding: 14,
                borderRadius: 10,
                border: '1.5px solid #173F35',
                fontSize: 22,
                letterSpacing: 8,
                textAlign: 'center',
                fontWeight: 800,
                marginBottom: 20,
                outline: 'none',
              }}
            />
            <button
              onClick={verifyOtp}
              disabled={loading}
              style={{
                width: '100%',
                padding: 14,
                backgroundColor: '#173F35',
                color: '#FFF',
                border: 'none',
                borderRadius: 10,
                fontWeight: 800,
                fontSize: 15,
                cursor: 'pointer',
                marginBottom: 12,
              }}
            >
              {loading ? 'Verifying...' : 'Verify & Open Portal'}
            </button>
            <button
              onClick={() => setStep(1)}
              style={{
                width: '100%',
                padding: 10,
                backgroundColor: 'transparent',
                color: '#64748B',
                border: 'none',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Change Phone Number
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
