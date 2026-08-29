import React, { useState } from 'react';

export const OrdersPage = ({ orders }) => {
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filtered = orders.filter((o) => (statusFilter === 'ALL' ? true : o.status === statusFilter));

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Ecosystem Orders ({filtered.length})</h2>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: '8px 14px',
            borderRadius: 8,
            border: '1px solid #CBD5E1',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <option value="ALL">All Statuses</option>
          <option value="PENDING">PENDING</option>
          <option value="ACCEPTED">ACCEPTED</option>
          <option value="ASSIGNED">ASSIGNED</option>
          <option value="PICKED_UP">PICKED_UP</option>
          <option value="DELIVERED">DELIVERED</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>
      </div>

      <div className="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Shop ID</th>
              <th>Total Amount</th>
              <th>Payment Mode</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: '#64748B' }}>
                  No orders found.
                </td>
              </tr>
            ) : (
              filtered.map((o) => (
                <tr key={o.id}>
                  <td>
                    <strong>#{o.id}</strong>
                  </td>
                  <td>{o.userId || 'Customer'}</td>
                  <td>#{o.shopId}</td>
                  <td>
                    <strong>₹{o.totalPrice}</strong>
                  </td>
                  <td>{o.paymentMethod || 'COD'}</td>
                  <td>
                    <span
                      className={`badge ${
                        o.status === 'DELIVERED'
                          ? 'badge-delivered'
                          : o.status === 'CANCELLED'
                          ? 'badge-rejected'
                          : 'badge-assigned'
                      }`}
                    >
                      {o.status}
                    </span>
                  </td>
                  <td>{o.createdAt ? new Date(o.createdAt).toLocaleString() : 'N/A'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
