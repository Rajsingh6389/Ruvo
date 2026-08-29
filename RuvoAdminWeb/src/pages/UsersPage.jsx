import React, { useState } from 'react';
import { request } from '../api';
import { useAuth } from '../context/AuthContext';

export const UsersPage = ({ users, onRefresh }) => {
  const { token } = useAuth();
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');

  const toggleUserStatus = async (userId) => {
    setBusyId(`user-${userId}`);
    try {
      await request(`/api/admin/users/${userId}/toggle-status`, token, { method: 'POST' });
      onRefresh();
    } catch (err) {
      setError(err.message || 'Could not toggle user status');
    } finally {
      setBusyId('');
    }
  };

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.mobileNumber?.includes(q) ||
      u.role?.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      {error && (
        <div style={{ padding: 12, backgroundColor: '#FEF2F2', color: '#DC2626', borderRadius: 10, marginBottom: 16, fontWeight: 600 }}>
          {error}
          <button onClick={() => setError('')} style={{ marginLeft: 12, background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontWeight: 700 }}>×</button>
        </div>
      )}
      <div className="panel">
      <div className="panel-header">
        <h2>Registered Accounts ({filtered.length})</h2>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, phone, or role..."
          style={{
            padding: '8px 14px',
            borderRadius: 8,
            border: '1px solid #CBD5E1',
            fontSize: 13,
            width: 280,
          }}
        />
      </div>

      <div className="table-responsive">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>User Name</th>
              <th>Mobile</th>
              <th>Role</th>
              <th>Status</th>
              <th>Joined Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: '#64748B' }}>
                  No accounts matching search.
                </td>
              </tr>
            ) : (
              filtered.map((u) => (
                <tr key={u.id}>
                  <td>#{u.id}</td>
                  <td>
                    <strong>{u.name}</strong>
                  </td>
                  <td>{u.mobileNumber || 'N/A'}</td>
                  <td>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        padding: '4px 8px',
                        borderRadius: 6,
                        backgroundColor: u.role === 'ADMIN' ? '#EFF6FF' : u.role === 'SHOP_OWNER' ? '#FFFBEB' : '#F1F5F9',
                        color: u.role === 'ADMIN' ? '#2563EB' : u.role === 'SHOP_OWNER' ? '#D97706' : '#475569',
                      }}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${u.status === 'APPROVED' ? 'badge-approved' : 'badge-blocked'}`}>
                      {u.status || 'ACTIVE'}
                    </span>
                  </td>
                  <td>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}</td>
                  <td>
                    <button
                      className="action-btn btn-toggle"
                      disabled={busyId === `user-${u.id}`}
                      onClick={() => toggleUserStatus(u.id)}
                    >
                      {u.status === 'BLOCKED' ? 'Unlock Account' : 'Lock Account'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      </div>
    </div>
  );
};
