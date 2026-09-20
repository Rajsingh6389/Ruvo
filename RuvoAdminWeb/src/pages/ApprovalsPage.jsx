import React, { useState } from 'react';
import { request, API_BASE_URL } from '../api';
import { useAuth } from '../context/AuthContext';

const resolveImg = (url) => {
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  let cleanUrl = url.replace(/\\/g, '/');
  if (cleanUrl.startsWith('/')) cleanUrl = cleanUrl.substring(1);
  return `${API_BASE_URL}/${cleanUrl}`;
};

export const ApprovalsPage = ({ shops, partners, onRefresh }) => {
  const { token } = useAuth();
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [rejectModal, setRejectModal] = useState(null); // { type: 'shop'|'partner', id, name }
  const [rejectReason, setRejectReason] = useState('');
  const [viewModal, setViewModal] = useState(null); // { type: 'shop'|'partner', data }

  const pendingShops = shops.filter((s) => s.approved === false || s.isApproved === false);
  const pendingPartners = partners.filter(
    (p) => p.verificationStatus === 'UNDER_REVIEW' || p.status === 'UNDER_REVIEW'
  );

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

  const isPdf = (url) => url && (url.toLowerCase().endsWith('.pdf') || url.toLowerCase().includes('.pdf'));

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
                  <th>Documents & Details</th>
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
                        onClick={() => setViewModal({ type: 'shop', data: shop })}
                        style={{
                          padding: '6px 12px', borderRadius: 6, border: '1px solid #3B82F6',
                          background: '#EFF6FF', color: '#1D4ED8', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        📄 View Documents
                      </button>
                    </td>
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
                  <th>Documents & Details</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingPartners.map((partner) => {
                  const partnerId = partner.partnerId || partner.id;
                  return (
                    <tr key={partnerId}>
                      <td>
                        <strong>{partner.name || `Partner #${partnerId}`}</strong>
                      </td>
                      <td>{partner.mobileNumber || partner.phone || 'N/A'}</td>
                      <td>
                        <span className="badge badge-pending">UNDER REVIEW</span>
                      </td>
                      <td>
                        <button
                          onClick={() => setViewModal({ type: 'partner', data: partner })}
                          style={{
                            padding: '6px 12px', borderRadius: 6, border: '1px solid #3B82F6',
                            background: '#EFF6FF', color: '#1D4ED8', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                          }}
                        >
                          📄 View Documents
                        </button>
                      </td>
                      <td>
                        <button
                          className="action-btn btn-approve"
                          disabled={busyId === `partner-${partnerId}-approve`}
                          onClick={() => approvePartner(partnerId)}
                        >
                          Approve
                        </button>
                        <button
                          className="action-btn btn-reject"
                          disabled={busyId === `partner-${partnerId}-reject`}
                          onClick={() => rejectPartner(partnerId, partner.name)}
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* View Documents & Details Modal */}
      {viewModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 20,
        }}>
          <div style={{
            background: '#FFFFFF', borderRadius: 16, maxWidth: 680, width: '100%', maxHeight: '90vh',
            overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #E2E8F0',
          }}>
            {/* Header */}
            <div style={{
              padding: '18px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex',
              alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC',
              borderTopLeftRadius: 16, borderTopRightRadius: 16,
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, color: '#0F172A', fontWeight: 700 }}>
                  {viewModal.type === 'shop' ? '🏬 Shop Onboarding Documents' : '🛵 Partner Verification Documents'}
                </h3>
                <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>
                  {viewModal.data.name || `ID #${viewModal.data.id}`} • Review all uploaded files before approval
                </div>
              </div>
              <button
                onClick={() => setViewModal(null)}
                style={{
                  background: 'none', border: 'none', fontSize: 22, color: '#64748B', cursor: 'pointer',
                  width: 32, height: 32, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >×</button>
            </div>

            <div style={{ padding: 24 }}>
              {/* Aadhaar Verification Details */}
              <div style={{ marginBottom: 24, padding: 16, borderRadius: 12, border: '1px solid #E2E8F0', backgroundColor: '#FAF5FF' }}>
                <h4 style={{ margin: '0 0 12px', fontSize: 14, color: '#6B21A8', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>
                  📇 Aadhaar Verification
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div>
                    <span style={{ fontSize: 12, color: '#64748B', display: 'block' }}>Aadhaar Number</span>
                    <strong style={{ fontSize: 15, color: '#1E1B4B' }}>
                      {viewModal.data.aadhaarNumber || viewModal.data.kyc?.identityDocumentNumber || 'Not Uploaded'}
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: 12, color: '#64748B', display: 'block' }}>Name on Aadhaar</span>
                    <strong style={{ fontSize: 15, color: '#1E1B4B' }}>
                      {viewModal.data.aadhaarName || viewModal.data.kyc?.fullName || viewModal.data.name || 'N/A'}
                    </strong>
                  </div>
                </div>

                {/* Aadhaar Front & Back Documents */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  {/* Front Doc */}
                  <div style={{ background: '#FFF', padding: 10, borderRadius: 8, border: '1px solid #E9D5FF', textAlign: 'center' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#581C87', marginBottom: 8 }}>Aadhaar Front Photo / PDF</div>
                    {viewModal.data.aadhaarFrontUrl ? (
                      isPdf(viewModal.data.aadhaarFrontUrl) ? (
                        <a href={viewModal.data.aadhaarFrontUrl} target="_blank" rel="noopener noreferrer" style={{
                          display: 'inline-block', padding: '10px 14px', background: '#FEF2F2', color: '#DC2626',
                          borderRadius: 6, fontWeight: 700, fontSize: 13, textDecoration: 'none', border: '1px solid #FCA5A5',
                        }}>
                          📄 View Front PDF Document
                        </a>
                      ) : (
                        <a href={resolveImg(viewModal.data.aadhaarFrontUrl)} target="_blank" rel="noopener noreferrer">
                          <img src={resolveImg(viewModal.data.aadhaarFrontUrl)} alt="Aadhaar Front" style={{ width: '100%', height: 110, objectFit: 'cover', borderRadius: 6, border: '1px solid #CBD5E1' }} />
                        </a>
                      )
                    ) : (
                      <div style={{ padding: 24, fontSize: 12, color: '#94A3B8', fontStyle: 'italic' }}>No Front Document</div>
                    )}
                  </div>

                  {/* Back Doc */}
                  <div style={{ background: '#FFF', padding: 10, borderRadius: 8, border: '1px solid #E9D5FF', textAlign: 'center' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#581C87', marginBottom: 8 }}>Aadhaar Back Photo / PDF</div>
                    {viewModal.data.aadhaarBackUrl ? (
                      isPdf(viewModal.data.aadhaarBackUrl) ? (
                        <a href={viewModal.data.aadhaarBackUrl} target="_blank" rel="noopener noreferrer" style={{
                          display: 'inline-block', padding: '10px 14px', background: '#FEF2F2', color: '#DC2626',
                          borderRadius: 6, fontWeight: 700, fontSize: 13, textDecoration: 'none', border: '1px solid #FCA5A5',
                        }}>
                          📄 View Back PDF Document
                        </a>
                      ) : (
                        <a href={resolveImg(viewModal.data.aadhaarBackUrl)} target="_blank" rel="noopener noreferrer">
                          <img src={resolveImg(viewModal.data.aadhaarBackUrl)} alt="Aadhaar Back" style={{ width: '100%', height: 110, objectFit: 'cover', borderRadius: 6, border: '1px solid #CBD5E1' }} />
                        </a>
                      )
                    ) : (
                      <div style={{ padding: 24, fontSize: 12, color: '#94A3B8', fontStyle: 'italic' }}>No Back Document</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bank Account Details */}
              <div style={{ marginBottom: 24, padding: 16, borderRadius: 12, border: '1px solid #E2E8F0', backgroundColor: '#F0FDF4' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h4 style={{ margin: 0, fontSize: 14, color: '#166534', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>
                    💳 Bank & Settlement Account Details
                  </h4>
                  <div style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 8px', backgroundColor: '#DCFCE7', color: '#15803D', borderRadius: 6, fontSize: 12, fontWeight: 700, border: '1px solid #BBF7D0' }}>
                    ✅ Razorpay Verified
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div>
                    <span style={{ fontSize: 12, color: '#64748B', display: 'block' }}>Bank Account Number</span>
                    <strong style={{ fontSize: 14, color: '#14532D' }}>
                      {viewModal.data.bankAccountNumber || 'Pending Onboarding'}
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: 12, color: '#64748B', display: 'block' }}>IFSC Code</span>
                    <strong style={{ fontSize: 14, color: '#14532D' }}>
                      {viewModal.data.ifscCode || 'N/A'}
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: 12, color: '#64748B', display: 'block' }}>UPI ID</span>
                    <strong style={{ fontSize: 14, color: '#14532D' }}>
                      {viewModal.data.upiId || 'N/A'}
                    </strong>
                  </div>
                </div>
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed #BBF7D0', fontSize: 12, color: '#15803D' }}>
                  <strong>Razorpay Route Status: </strong>
                  {viewModal.data.razorpayAccountId ? (
                    <span style={{ fontWeight: 600 }}>{viewModal.data.razorpayAccountId}</span>
                  ) : (
                    <span style={{ color: '#D97706', fontWeight: 600 }}>Will be created automatically upon Admin Approval</span>
                  )}
                </div>
              </div>

              {/* Additional Details (Logo/Banner for Shops, Vehicle for Partners) */}
              {viewModal.type === 'shop' ? (
                <div style={{ padding: 16, borderRadius: 12, border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: 14, color: '#334155', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>
                    🖼️ Shop Logo & Banner Images
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 16, alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: 12, color: '#64748B', display: 'block', marginBottom: 4 }}>Logo</span>
                      {viewModal.data.logoUrl ? (
                        <img src={resolveImg(viewModal.data.logoUrl)} alt="Logo" style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8, border: '1px solid #CBD5E1' }} />
                      ) : (
                        <div style={{ width: 100, height: 100, backgroundColor: '#E2E8F0', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#64748B' }}>No Logo</div>
                      )}
                    </div>
                    <div>
                      <span style={{ fontSize: 12, color: '#64748B', display: 'block', marginBottom: 4 }}>Banner</span>
                      {viewModal.data.bannerUrl ? (
                        <img src={resolveImg(viewModal.data.bannerUrl)} alt="Banner" style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 8, border: '1px solid #CBD5E1' }} />
                      ) : (
                        <div style={{ width: '100%', height: 100, backgroundColor: '#E2E8F0', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#64748B' }}>No Banner</div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ padding: 16, borderRadius: 12, border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: 14, color: '#334155', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>
                    🛵 Vehicle & Delivery Details
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <span style={{ fontSize: 12, color: '#64748B', display: 'block' }}>Vehicle Type</span>
                      <strong style={{ fontSize: 14, color: '#1E293B' }}>{viewModal.data.vehicle?.vehicleType || 'Two-Wheeler'}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: 12, color: '#64748B', display: 'block' }}>Vehicle Number</span>
                      <strong style={{ fontSize: 14, color: '#1E293B' }}>{viewModal.data.vehicle?.vehicleNumber || 'N/A'}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div style={{
              padding: '16px 24px', borderTop: '1px solid #E2E8F0', backgroundColor: '#F8FAFC',
              display: 'flex', gap: 12, justifyContent: 'flex-end', borderBottomLeftRadius: 16, borderBottomRightRadius: 16,
            }}>
              <button
                onClick={() => setViewModal(null)}
                style={{
                  padding: '10px 20px', borderRadius: 8, border: '1px solid #CBD5E1',
                  background: '#FFF', color: '#475569', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}
              >Close</button>
              <button
                onClick={() => {
                  const id = viewModal.type === 'shop' ? viewModal.data.id : (viewModal.data.partnerId || viewModal.data.id);
                  setViewModal(null);
                  if (viewModal.type === 'shop') rejectShop(id, viewModal.data.name);
                  else rejectPartner(id, viewModal.data.name);
                }}
                style={{
                  padding: '10px 20px', borderRadius: 8, border: 'none',
                  background: '#EF4444', color: '#FFF', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                }}
              >Reject</button>
              <button
                onClick={() => {
                  const id = viewModal.type === 'shop' ? viewModal.data.id : (viewModal.data.partnerId || viewModal.data.id);
                  setViewModal(null);
                  if (viewModal.type === 'shop') approveShop(id);
                  else approvePartner(id);
                }}
                style={{
                  padding: '10px 20px', borderRadius: 8, border: 'none',
                  background: '#10B981', color: '#FFF', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                }}
              >Approve & Create Razorpay Account</button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Confirmation Modal */}
      {rejectModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200,
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

