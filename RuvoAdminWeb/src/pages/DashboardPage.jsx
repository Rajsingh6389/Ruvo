import React from 'react';
import { Link } from 'react-router-dom';

export const DashboardPage = ({ stats, loading }) => {
  if (loading && !stats) {
    return <div style={{ padding: 20, textAlign: 'center', color: '#64748B' }}>Loading system metrics...</div>;
  }

  const s = stats || {};

  return (
    <div>
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

      <div className="panel">
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
            <span style={{ fontSize: 12, fontWeight: 700, color: '#64748B' }}>Cashfree Gateway</span>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#D97706', marginTop: 6 }}>🟡 Check Payments Tab</div>
          </div>
          <div style={{ padding: 16, borderRadius: 12, backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#64748B' }}>Image Storage</span>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#D97706', marginTop: 6 }}>🟡 Check Products Tab</div>
          </div>
        </div>
      </div>
    </div>
  );
};
