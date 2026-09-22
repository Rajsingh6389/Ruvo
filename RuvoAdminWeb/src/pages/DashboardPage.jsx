import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { request } from '../api';
import { useAuth } from '../context/AuthContext';

export const DashboardPage = ({ stats, loading, onRefresh }) => {
  const { token } = useAuth();
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState(null);
  const [resetError, setResetError] = useState(null);
  const [confirmModal, setConfirmModal] = useState(false);

  const handleResetSystem = async () => {
    setResetting(true);
    setResetMessage(null);
    setResetError(null);
    try {
      const res = await request('/api/admin/reset-system', token, { method: 'POST' });
      setResetMessage('System reset successful! All test registrations have been wiped cleanly. Admin 8630820486 preserved.');
      setConfirmModal(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      setResetError(err.message || 'Failed to reset system.');
    } finally {
      setResetting(false);
    }
  };

  if (loading && !stats) {
    return <div style={{ padding: 20, textAlign: 'center', color: '#64748B' }}>Loading system metrics...</div>;
  }

  const s = stats || {};

  return (
    <div>
      {resetMessage && (
        <div style={{
          backgroundColor: '#ECFDF5',
          border: '1px solid #10B981',
          color: '#065F46',
          padding: '14px 20px',
          borderRadius: 12,
          marginBottom: 20,
          fontWeight: 600,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>✅ {resetMessage}</span>
          <button onClick={() => setResetMessage(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 800, color: '#065F46' }}>✕</button>
        </div>
      )}

      {resetError && (
        <div style={{
          backgroundColor: '#FEF2F2',
          border: '1px solid #EF4444',
          color: '#991B1B',
          padding: '14px 20px',
          borderRadius: 12,
          marginBottom: 20,
          fontWeight: 600,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>❌ {resetError}</span>
          <button onClick={() => setResetError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 800, color: '#991B1B' }}>✕</button>
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Total Platform Revenue</span>
          <span className="stat-value" style={{ color: '#173F35' }}>
            ₹{s.totalRevenue ? Number(s.totalRevenue).toLocaleString('en-IN') : '0'}
          </span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Pending Approvals</span>
          <span className="stat-value" style={{ color: '#D97706' }}>
            {(s.pendingShops || 0) + (s.pendingPartners || 0)}
          </span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Active Shops</span>
          <span className="stat-value">{s.totalShops || 0}</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Delivery Partners</span>
          <span className="stat-value">{s.totalPartners || 0}</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Registered Customers</span>
          <span className="stat-value">{s.totalUsers || 0}</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Total Orders</span>
          <span className="stat-value">{s.totalOrders || 0}</span>
        </div>
      </div>

      {((s.pendingShops || 0) > 0 || (s.pendingPartners || 0) > 0) && (
        <div
          style={{
            backgroundColor: '#FFFBEB',
            border: '1px solid #FDE68A',
            borderRadius: 16,
            padding: 20,
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#92400E' }}>
              Action Needed: Pending Onboarding Approvals
            </h3>
            <p style={{ fontSize: 13, color: '#B45309', marginTop: 4 }}>
              {s.pendingShops || 0} shops and {s.pendingPartners || 0} delivery partners waiting for verification.
            </p>
          </div>
          <Link
            to="/approvals"
            style={{
              padding: '10px 18px',
              backgroundColor: '#D97706',
              color: '#FFF',
              borderRadius: 10,
              textDecoration: 'none',
              fontWeight: 800,
              fontSize: 13,
            }}
          >
            Review Approvals
          </Link>
        </div>
      )}

      <div className="panel" style={{ marginBottom: 24 }}>
        <div className="panel-header">
          <h2>System Health & Status</h2>
        </div>
        <div style={{ padding: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div style={{ padding: 16, borderRadius: 12, backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#64748B' }}>Spring Backend</span>
            <div style={{ fontSize: 16, fontWeight: 800, color: stats ? '#059669' : '#DC2626', marginTop: 6 }}>
              {stats ? '🟢 Operational' : '🔴 Unreachable'}
            </div>
          </div>
          <div style={{ padding: 16, borderRadius: 12, backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#64748B' }}>Razorpay Bank Gate</span>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#059669', marginTop: 6 }}>🟢 Active & Gated</div>
          </div>
          <div style={{ padding: 16, borderRadius: 12, backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#64748B' }}>Cashfree Gateway</span>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#D97706', marginTop: 6 }}>🟡 Check Payments Tab</div>
          </div>
          <div style={{ padding: 16, borderRadius: 12, backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#64748B' }}>Image Storage</span>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#D97706', marginTop: 6 }}>🟡 Check Products Tab</div>
          </div>
        </div>
      </div>

      {/* Fresh Registration & System Clean Reset Tools */}
      <div className="panel" style={{ border: '1px solid #FCA5A5' }}>
        <div className="panel-header" style={{ backgroundColor: '#FEF2F2' }}>
          <h2 style={{ color: '#991B1B' }}>⚙️ Fresh Registration & System Clean Reset</h2>
        </div>
        <div style={{ padding: 24 }}>
          <p style={{ color: '#4B5563', fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
            Use this tool to completely wipe all dummy/test shop registrations, partner profiles, orders, and non-admin accounts.
            This gives you a <strong>100% fresh slate</strong> to register real shops on <strong>RuVo Shop</strong>, real riders on <strong>RuVo Partner</strong>, and real customers on <strong>RuVo Mobile</strong>.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => setConfirmModal(true)}
              disabled={resetting}
              style={{
                backgroundColor: '#DC2626',
                color: '#FFF',
                border: 'none',
                padding: '12px 24px',
                borderRadius: 10,
                fontWeight: 800,
                fontSize: 14,
                cursor: resetting ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 8px rgba(220, 38, 38, 0.25)'
              }}
            >
              {resetting ? '⏳ Resetting System...' : '🗑️ Wipe Data & Start Fresh Registration'}
            </button>
            <span style={{ fontSize: 13, color: '#6B7280' }}>
              🛡️ Admin account (<code>8630820486</code>) and pricing configs are safely preserved.
            </span>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 20
        }}>
          <div style={{
            backgroundColor: '#FFF',
            borderRadius: 16,
            padding: 30,
            maxWidth: 520,
            width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
          }}>
            <h3 style={{ fontSize: 20, fontWeight: 900, color: '#991B1B', marginBottom: 12 }}>
              ⚠️ Confirm Fresh System Reset
            </h3>
            <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.6, marginBottom: 16 }}>
              This action will permanently delete:
            </p>
            <ul style={{ fontSize: 13, color: '#4B5563', paddingLeft: 20, marginBottom: 20, lineHeight: 1.8 }}>
              <li>All registered <strong>Shops, Products & Seller Bank Accounts</strong></li>
              <li>All <strong>Delivery Partner Profiles, Vehicles & KYC Documents</strong></li>
              <li>All <strong>Orders, Payments, Settlements & Deliveries</strong></li>
              <li>All <strong>Non-admin User & Auth accounts</strong></li>
            </ul>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#059669', marginBottom: 24 }}>
              ✅ Your Admin login (<code>8630820486 / Raj@9125</code>) will remain intact.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                onClick={() => setConfirmModal(false)}
                disabled={resetting}
                style={{
                  padding: '10px 18px',
                  backgroundColor: '#E5E7EB',
                  color: '#374151',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleResetSystem}
                disabled={resetting}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#DC2626',
                  color: '#FFF',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 800,
                  cursor: resetting ? 'not-allowed' : 'pointer'
                }}
              >
                {resetting ? 'Wiping...' : 'Yes, Reset Everything Fresh'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
