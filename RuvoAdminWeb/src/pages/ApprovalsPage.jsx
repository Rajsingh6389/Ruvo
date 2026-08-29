import React, { useState } from 'react';
import { request } from '../api';
import { useAuth } from '../context/AuthContext';

export const ApprovalsPage = ({ shops, partners, onRefresh }) => {
  const { token } = useAuth();
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [rejectModal, setRejectModal] = useState(null); // { type: 'shop'|'partner', id, name }
  const [rejectReason, setRejectReason] = useState('');

  const pendingShops = shops.filter((s) => !s.approved && !s.isApproved);
  const pendingPartners = partners.filter((p) => p.verificationStatus === 'UNDER_REVIEW' || p.status === 'UNDER_REVIEW');

  const perform = async (key, actionFn, successMsg) => {
    setBusyId(key);
    setError('');
    setNotice('');
    try {
      await actionFn();
      setNotice(successMsg);
      onRefresh();
    } catch (err) {
      setError(err.message || 'Operation failed');
    } finally {
      setBusyId('');
    }
  };

  const approveShop = (id) =>
    perform(`shop-${id}-approve`, () => request(`/api/shops/${id}/approve`, token, { method: 'POST' }), 'Shop approved successfully!');

  const rejectShop = (id, name) => {
    setRejectModal({ type: 'shop', id, name });
    setRejectReason('');
  };

  const confirmReject = async () => {
    if (!rejectModal) return;
    const { type, id, name } = rejectModal;
    setRejectModal(null);

    if (type === 'shop') {
      perform(`shop-${id}-reject`, () => request(`/api/shops/${id}/reject`, token, { method: 'DELETE' }), 'Shop application rejected.');
    } else {
      perform(
        `partner-${id}-reject`,
        () => request(`/api/admin/partners/${id}/reject`, token, { method: 'POST', body: JSON.stringify({ reason: rejectReason.trim() || 'No reason provided' }) }),
        'Delivery partner rejected.'
      );
    }
  };

  const approvePartner = (id) =>
    perform(`partner-${id}-approve`, () => request(`/api/admin/partners/${id}/approve`, token, { method: 'POST' }), 'Delivery partner approved!');

  const rejectPartner = (id, name) => {
    setRejectModal({ type: 'partner', id, name });
    setRejectReason('');
  };

  return (
    <div>
      {error && (
        <div style={{ padding: 12, backgroundColor: '#FEF2F2', color: '#DC2626', borderRadius: 10, marginBottom: 16, fontWeight: 600 }}>
          {error}
        </div>
      )}
      {notice && (
        <div style={{ padding: 12, backgroundColor: '#ECFDF5', color: '#059669', borderRadius: 10, marginBottom: 16, fontWeight: 600 }}>
          {notice}
        </div>
      )}

      {/* Pending Shops Panel */}
      <div className="panel">
        <div className="panel-header">
          <h2>Pending Shop Registrations ({pendingShops.length})</h2>
        </div>
        <div className="table-responsive">
          {pendingShops.length === 0 ? (
            <div style={{ padding: 24, textTransform: 'uppercase', fontSize: 12, color: '#64748B', fontWeight: 700 }}>
              No pending shop applications.
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Shop Name</th>
                  <th>Owner Phone</th>
                  <th>Category</th>
                  <th>Address</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingShops.map((shop) => (
                  <tr key={shop.id}>
                    <td>
                      <strong>{shop.name}</strong>
                      <div style={{ fontSize: 11, color: '#64748B' }}>#{shop.id}</div>
                    </td>
                    <td>{shop.phone || 'N/A'}</td>
                    <td>{shop.category || 'General'}</td>
                    <td>{shop.address || 'N/A'}</td>
                    <td>
                      <button
                        className="action-btn btn-approve"
                        disabled={busyId === `shop-${shop.id}-approve`}
                        onClick={() => approveShop(shop.id)}
                      >
                        Approve
                      </button>
                      <button
                        className="action-btn btn-reject"
                        disabled={busyId === `shop-${shop.id}-reject`}
                        onClick={() => rejectShop(shop.id, shop.name)}
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Pending Partners Panel */}
      <div className="panel">
        <div className="panel-header">
          <h2>Pending Delivery Partner KYCs ({pendingPartners.length})</h2>
        </div>
        <div className="table-responsive">
          {pendingPartners.length === 0 ? (
            <div style={{ padding: 24, textTransform: 'uppercase', fontSize: 12, color: '#64748B', fontWeight: 700 }}>
              No pending driver partner applications.
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Partner Name</th>
                  <th>Phone Number</th>
                  <th>KYC Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingPartners.map((partner) => (
                  <tr key={partner.partnerId || partner.id}>
                    <td>
                      <strong>{partner.name || `Partner #${partner.partnerId || partner.id}`}</strong>
                    </td>
                    <td>{partner.mobileNumber || 'N/A'}</td>
                    <td>
                      <span className="badge badge-pending">UNDER REVIEW</span>
                    </td>
                    <td>
                      <button
                        className="action-btn btn-approve"
                        disabled={busyId === `partner-${partner.partnerId || partner.id}-approve`}
                        onClick={() => approvePartner(partner.partnerId || partner.id)}
                      >
                        Approve
                      </button>
                      <button
                        className="action-btn btn-reject"
                        disabled={busyId === `partner-${partner.partnerId || partner.id}-reject`}
                        onClick={() => rejectPartner(partner.partnerId || partner.id, partner.name)}
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Reject Confirmation Modal */}
      {rejectModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            background: '#FFF', borderRadius: 16, padding: 24, maxWidth: 420, width: '90%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          }}>
            <h3 style={{ margin: '0 0 8px', color: '#1F2937' }}>
              Reject {rejectModal.type === 'shop' ? 'Shop' : 'Partner'} Application
            </h3>
            <p style={{ color: '#6B7280', fontSize: 14, margin: '0 0 16px' }}>
              Are you sure you want to reject <strong>{rejectModal.name}</strong>?
            </p>
            {rejectModal.type === 'partner' && (
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Reason for rejection (optional)..."
                rows={3}
                style={{
                  width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB',
                  borderRadius: 8, fontSize: 14, resize: 'vertical', marginBottom: 16,
                  boxSizing: 'border-box',
                }}
              />
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setRejectModal(null)}
                style={{
                  padding: '8px 20px', borderRadius: 8, border: '1px solid #D1D5DB',
                  background: '#FFF', color: '#374151', fontSize: 14, cursor: 'pointer',
                }}
              >Cancel</button>
              <button
                onClick={confirmReject}
                style={{
                  padding: '8px 20px', borderRadius: 8, border: 'none',
                  background: '#DC2626', color: '#FFF', fontSize: 14, cursor: 'pointer', fontWeight: 600,
                }}
              >Confirm Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
