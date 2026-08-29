import React, { useState } from 'react';

export const DriversPage = ({ partners }) => {
  const [search, setSearch] = useState('');

  const filtered = partners.filter(
    (p) =>
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.mobileNumber?.includes(search) ||
      p.verificationStatus?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Delivery Partners ({filtered.length})</h2>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search partner name, phone..."
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
              <th>Partner Name</th>
              <th>Mobile</th>
              <th>KYC Status</th>
              <th>Availability</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: '#64748B' }}>
                  No driver partners found.
                </td>
              </tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.partnerId || p.id}>
                  <td>#{p.partnerId || p.id}</td>
                  <td>
                    <strong>{p.name || `Rider #${p.partnerId || p.id}`}</strong>
                  </td>
                  <td>{p.mobileNumber || 'N/A'}</td>
                  <td>
                    <span
                      className={`badge ${
                        p.verificationStatus === 'APPROVED' ? 'badge-approved' : 'badge-pending'
                      }`}
                    >
                      {p.verificationStatus || 'APPROVED'}
                    </span>
                  </td>
                  <td>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: p.isAvailable ? '#059669' : '#64748B',
                      }}
                    >
                      {p.isAvailable ? '🟢 Online' : '⚪ Offline'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
