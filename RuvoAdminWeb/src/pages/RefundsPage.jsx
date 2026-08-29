import React, { useState } from 'react';
import { request } from '../api';
import { useAuth } from '../context/AuthContext';

export const RefundsPage = ({ refunds: initialRefunds = [], onRefresh }) => {
  const { token } = useAuth();
  const [refunds, setRefunds] = useState(initialRefunds);
  const [search, setSearch] = useState('');
  const [processing, setProcessing] = useState(null);
  const [error, setError] = useState('');

  const processRefund = async (refundId, action) => {
    if (!token) return;
    setProcessing(refundId);
    setError('');
    try {
      await request(`/api/refunds/${refundId}/process`, token, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      onRefresh?.();
      setRefunds(prev => prev.map(r =>
        r.id === refundId ? { ...r, status: action === 'approve' ? 'APPROVED' : 'REJECTED' } : r
      ));
    } catch (e) {
      setError(e.message);
    } finally {
      setProcessing(null);
    }
  };

  const filtered = refunds.filter(r =>
    !search ||
    String(r.orderId).includes(search) ||
    String(r.userId).includes(search) ||
    (r.reason || '').toLowerCase().includes(search.toLowerCase())
  );

  const statusColor = (s) => {
    if (s === 'PENDING') return { bg: '#FEF3C7', text: '#92400E' };
    if (s === 'APPROVED' || s === 'REFUNDED') return { bg: '#D1FAE5', text: '#065F46' };
    if (s === 'REJECTED') return { bg: '#FEE2E2', text: '#991B1B' };
    return { bg: '#F3F4F6', text: '#374151' };
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0, color: '#1F2937' }}>Refund Management</h2>
        <span style={{ color: '#6B7280', fontSize: 14 }}>{filtered.length} refunds</span>
      </div>

      {error && (
        <div style={{ padding: 12, background: '#FEE2E2', color: '#991B1B', borderRadius: 8, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <input
        type="text"
        placeholder="Search by order ID, user ID, or reason..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{
          width: '100%', padding: '10px 14px', border: '1px solid #D1D5DB',
          borderRadius: 8, marginBottom: 16, fontSize: 14, boxSizing: 'border-box',
        }}
      />

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #E5E7EB' }}>
              <th style={{ textAlign: 'left', padding: '10px 12px', color: '#6B7280', fontSize: 12, fontWeight: 600 }}>ID</th>
              <th style={{ textAlign: 'left', padding: '10px 12px', color: '#6B7280', fontSize: 12, fontWeight: 600 }}>ORDER</th>
              <th style={{ textAlign: 'left', padding: '10px 12px', color: '#6B7280', fontSize: 12, fontWeight: 600 }}>USER</th>
              <th style={{ textAlign: 'left', padding: '10px 12px', color: '#6B7280', fontSize: 12, fontWeight: 600 }}>AMOUNT</th>
              <th style={{ textAlign: 'left', padding: '10px 12px', color: '#6B7280', fontSize: 12, fontWeight: 600 }}>REASON</th>
              <th style={{ textAlign: 'left', padding: '10px 12px', color: '#6B7280', fontSize: 12, fontWeight: 600 }}>STATUS</th>
              <th style={{ textAlign: 'left', padding: '10px 12px', color: '#6B7280', fontSize: 12, fontWeight: 600 }}>DATE</th>
              <th style={{ textAlign: 'left', padding: '10px 12px', color: '#6B7280', fontSize: 12, fontWeight: 600 }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: '#9CA3AF' }}>No refunds found</td></tr>
            ) : filtered.map(r => {
              const sc = statusColor(r.status);
              return (
                <tr key={r.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <td style={{ padding: '10px 12px', fontSize: 13 }}>#{r.id}</td>
                  <td style={{ padding: '10px 12px', fontSize: 13 }}>#{r.orderId}</td>
                  <td style={{ padding: '10px 12px', fontSize: 13 }}>{r.userId}</td>
                  <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 600 }}>₹{r.refundAmount || r.amount || 0}</td>
                  <td style={{ padding: '10px 12px', fontSize: 13 }}>{r.reason || '-'}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{
                      display: 'inline-block', padding: '2px 10px', borderRadius: 12,
                      fontSize: 11, fontWeight: 600, background: sc.bg, color: sc.text,
                    }}>{r.status}</span>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 13, color: '#6B7280' }}>
                    {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '-'}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    {r.status === 'PENDING' && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          disabled={processing === r.id}
                          onClick={() => processRefund(r.id, 'approve')}
                          style={{
                            padding: '4px 12px', borderRadius: 6, border: 'none',
                            background: '#059669', color: '#FFF', fontSize: 12, cursor: 'pointer',
                            opacity: processing === r.id ? 0.5 : 1,
                          }}
                        >Approve</button>
                        <button
                          disabled={processing === r.id}
                          onClick={() => processRefund(r.id, 'reject')}
                          style={{
                            padding: '4px 12px', borderRadius: 6, border: 'none',
                            background: '#DC2626', color: '#FFF', fontSize: 12, cursor: 'pointer',
                            opacity: processing === r.id ? 0.5 : 1,
                          }}
                        >Reject</button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
