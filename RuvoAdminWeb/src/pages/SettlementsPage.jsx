import React from 'react';

export const SettlementsPage = ({ settlements }) => {
  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Ecosystem Payouts & Settlements ({settlements.length})</h2>
      </div>

      <div className="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Settlement ID</th>
              <th>Recipient Type</th>
              <th>Recipient ID</th>
              <th>Amount Payout</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {settlements.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: '#64748B' }}>
                  No payout settlements logged yet.
                </td>
              </tr>
            ) : (
              settlements.map((s) => (
                <tr key={s.id}>
                  <td>#{s.id}</td>
                  <td>{s.partnerProfile ? 'DRIVER PARTNER' : 'SHOP OWNER'}</td>
                  <td>#{s.partnerProfile?.id || s.shopId || 'N/A'}</td>
                  <td>
                    <strong>₹{s.amount}</strong>
                  </td>
                  <td>
                    <span className={`badge ${s.status === 'COMPLETED' ? 'badge-approved' : 'badge-pending'}`}>
                      {s.status}
                    </span>
                  </td>
                  <td>{s.createdAt ? new Date(s.createdAt).toLocaleString() : 'N/A'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
