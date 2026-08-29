import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const AdminLayout = ({ onRefresh, loading }) => {
  const { logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const getPageInfo = () => {
    switch (location.pathname) {
      case '/':
      case '/dashboard':
        return { title: 'Dashboard', sub: 'System overview & real-time metrics' };
      case '/approvals':
        return { title: 'Approvals', sub: 'Review pending shop & partner registrations' };
      case '/users':
        return { title: 'User Management', sub: 'Registered customer accounts & status' };
      case '/shops':
        return { title: 'Shops Directory', sub: 'Registered shopkeepers & onboarding state' };
      case '/drivers':
        return { title: 'Driver Partners', sub: 'Verified riders & delivery profiles' };
      case '/orders':
        return { title: 'Orders Log', sub: 'Ecosystem orders & real-time status' };
      case '/products':
        return { title: 'Product Catalog', sub: 'All products listed across shopkeepers' };
      case '/payments':
        return { title: 'Payments', sub: 'Cashfree & payment gateway logs' };
      case '/settlements':
        return { title: 'Settlements', sub: 'Financial payouts for shops & riders' };
      case '/refunds':
        return { title: 'Refunds', sub: 'Customer refund requests & processing' };
      case '/help':
        return { title: 'Help & Support', sub: 'Customer tickets & feedback' };
      default:
        return { title: 'RuVo Admin', sub: 'Operations portal' };
    }
  };

  const pageInfo = getPageInfo();

  return (
    <div className="admin-shell">
      {/* Sidebar Overlay for mobile */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 90,
          }}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="brand-badge">R</div>
          <div>
            <div className="brand-title">RuVo</div>
            <div className="brand-sub">ADMIN PORTAL</div>
          </div>
        </div>

        <nav className="nav-list">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setMobileOpen(false)}
          >
            📊 Dashboard
          </NavLink>
          <NavLink
            to="/approvals"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setMobileOpen(false)}
          >
            ✅ Approvals
          </NavLink>
          <NavLink
            to="/shops"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setMobileOpen(false)}
          >
            🏪 Shops
          </NavLink>
          <NavLink
            to="/users"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setMobileOpen(false)}
          >
            👥 Users
          </NavLink>
          <NavLink
            to="/drivers"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setMobileOpen(false)}
          >
            🛵 Driver Partners
          </NavLink>
          <NavLink
            to="/orders"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setMobileOpen(false)}
          >
            📦 Orders
          </NavLink>
          <NavLink
            to="/products"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setMobileOpen(false)}
          >
            🛍️ Products
          </NavLink>
          <NavLink
            to="/payments"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setMobileOpen(false)}
          >
            💳 Payments
          </NavLink>
          <NavLink
            to="/settlements"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setMobileOpen(false)}
          >
            💰 Settlements
          </NavLink>
          <NavLink
            to="/refunds"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setMobileOpen(false)}
          >
            🔄 Refunds
          </NavLink>
          <NavLink
            to="/help"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setMobileOpen(false)}
          >
            🎫 Help & Support
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <button className="signout-btn" onClick={logout}>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main-wrapper">
        <header className="top-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button className="menu-toggle" onClick={() => setMobileOpen(!mobileOpen)}>
              ☰
            </button>
            <div className="page-title-group">
              <h1>{pageInfo.title}</h1>
              <p>{pageInfo.sub}</p>
            </div>
          </div>

          <div className="top-bar-right">
            <button className="refresh-btn" onClick={onRefresh} disabled={loading}>
              {loading ? 'Refreshing...' : '🔄 Refresh Data'}
            </button>
          </div>
        </header>

        <main className="content-container">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
