import React from 'react';

export const PaymentsPage = ({ payments }) => {
  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Cashfree & Gateway Transactions ({payments.length})</h2>
      </div>

      <div className="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Txn ID</th>
              <th>Order ID</th>
              <th>Amount</th>
              <th>Payment Gateway</th>
              <th>Status</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: '#64748B' }}>
                  No online gateway transaction logs recorded yet.
                </td>
              </tr>
            ) : (
              payments.map((p) => (
                <tr key={p.id}>
                  <td>#{p.id}</td>
                  <td>#{p.orderId}</td>
                  <td>
                    <strong>₹{p.amount}</strong>
                  </td>
                  <td>{p.gateway || 'CASHFREE'}</td>
                  <td>
                    <span className={`badge ${p.status === 'SUCCESS' ? 'badge-approved' : 'badge-pending'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td>{p.createdAt ? new Date(p.createdAt).toLocaleString() : 'N/A'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
