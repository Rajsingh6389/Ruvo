import React from 'react';

export const PaymentsPage = ({ payments }) => {
  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Razorpay & Gateway Transactions ({payments.length})</h2>
      </div>

      <div className="table-responsive">
        <table>
          <thead>
            <tr>
              <th>TXN ID</th>
              <th>ORDER ID</th>
              <th>AMOUNT</th>
              <th>PAYMENT GATEWAY</th>
              <th>STATUS</th>
              <th>TIMESTAMP</th>
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
                  <td>{p.gateway || 'RAZORPAY'}</td>
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
    </div >
  );
};
