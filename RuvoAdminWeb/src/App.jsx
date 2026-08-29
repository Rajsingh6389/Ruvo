import React, { useCallback, useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { request } from './api';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AdminLayout } from './components/AdminLayout';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { ApprovalsPage } from './pages/ApprovalsPage';
import { UsersPage } from './pages/UsersPage';
import { ShopsPage } from './pages/ShopsPage';
import { DriversPage } from './pages/DriversPage';
import { OrdersPage } from './pages/OrdersPage';
import { ProductsPage } from './pages/ProductsPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { SettlementsPage } from './pages/SettlementsPage';
import { RefundsPage } from './pages/RefundsPage';
import { HelpTicketsPage } from './pages/HelpTicketsPage';
import './index.css';

const AdminApp = () => {
  const { token, isAuthenticated } = useAuth();

  const [stats, setStats] = useState(null);
  const [shops, setShops] = useState([]);
  const [partners, setPartners] = useState([]);
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [
        statsData,
        shopsData,
        partnersData,
        usersData,
        ordersData,
        productsData,
        paymentsData,
        settlementsData,
        refundsData,
        ticketsData,
      ] = await Promise.allSettled([
        request('/api/admin/stats', token),
        request('/api/admin/shops', token).catch(() => request('/api/shops/pending', token)),
        request('/api/admin/partners', token).catch(() => request('/api/admin/partners/pending', token)),
        request('/api/admin/users', token),
        request('/api/admin/orders', token),
        request('/api/admin/products', token),
        request('/api/admin/payments', token),
        request('/api/admin/settlements', token),
        request('/api/refunds/pending', token).catch(() => []),
        request('/api/help/open', token).catch(() => []),
      ]);

      if (statsData.status === 'fulfilled') setStats(statsData.value);
      if (shopsData.status === 'fulfilled') setShops(Array.isArray(shopsData.value) ? shopsData.value : []);
      if (partnersData.status === 'fulfilled') setPartners(Array.isArray(partnersData.value) ? partnersData.value : []);
      if (usersData.status === 'fulfilled') setUsers(Array.isArray(usersData.value) ? usersData.value : []);
      if (ordersData.status === 'fulfilled') setOrders(Array.isArray(ordersData.value) ? ordersData.value : []);
      if (productsData.status === 'fulfilled') setProducts(Array.isArray(productsData.value) ? productsData.value : []);
      if (paymentsData.status === 'fulfilled') setPayments(Array.isArray(paymentsData.value) ? paymentsData.value : []);
      if (settlementsData.status === 'fulfilled') setSettlements(Array.isArray(settlementsData.value) ? settlementsData.value : []);
      if (refundsData.status === 'fulfilled') setRefunds(Array.isArray(refundsData.value) ? refundsData.value : []);
      if (ticketsData.status === 'fulfilled') setTickets(Array.isArray(ticketsData.value) ? ticketsData.value : []);
    } catch (e) {
      console.error('Failed to load admin data:', e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return (
    <ErrorBoundary>
      <Routes>
        <Route element={<AdminLayout onRefresh={loadData} loading={loading} />}>
          <Route index element={<DashboardPage stats={stats} loading={loading} />} />
          <Route
            path="approvals"
            element={<ApprovalsPage shops={shops} partners={partners} onRefresh={loadData} />}
          />
          <Route path="users" element={<UsersPage users={users} onRefresh={loadData} />} />
          <Route path="shops" element={<ShopsPage shops={shops} />} />
          <Route path="drivers" element={<DriversPage partners={partners} />} />
          <Route path="orders" element={<OrdersPage orders={orders} />} />
          <Route path="products" element={<ProductsPage products={products} />} />
          <Route path="payments" element={<PaymentsPage payments={payments} />} />
          <Route path="settlements" element={<SettlementsPage settlements={settlements} />} />
          <Route path="refunds" element={<RefundsPage refunds={refunds} onRefresh={loadData} />} />
          <Route path="help" element={<HelpTicketsPage tickets={tickets} onRefresh={loadData} />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
};

const NotFoundPage = () => (
  <div style={{ textAlign: 'center', padding: '60px 20px' }}>
    <div style={{ fontSize: 48, marginBottom: 16 }}>404</div>
    <h2 style={{ color: '#1F2937', margin: '0 0 8px' }}>Page Not Found</h2>
    <p style={{ color: '#6B7280' }}>The page you're looking for doesn't exist.</p>
  </div>
);

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AdminApp />
      </BrowserRouter>
    </AuthProvider>
  );
}
