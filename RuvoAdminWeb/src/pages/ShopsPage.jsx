import React, { useState } from 'react';

export const ShopsPage = ({ shops }) => {
  const [search, setSearch] = useState('');

  const filtered = shops.filter(
    (s) =>
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.category?.toLowerCase().includes(search.toLowerCase()) ||
      s.address?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Registered Shops ({filtered.length})</h2>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search shop name, category..."
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
              <th>Shop Name</th>
              <th>Category</th>
              <th>Phone</th>
              <th>Address</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: '#64748B' }}>
                  No shops found.
                </td>
              </tr>
            ) : (
              filtered.map((shop) => (
                <tr key={shop.id}>
                  <td>#{shop.id}</td>
                  <td>
                    <strong>{shop.name}</strong>
                  </td>
                  <td>{shop.category || 'General Store'}</td>
                  <td>{shop.phone || 'N/A'}</td>
                  <td>{shop.address || 'N/A'}</td>
                  <td>
                    <span className={`badge ${(shop.approved || shop.isApproved) ? 'badge-approved' : 'badge-pending'}`}>
                      {(shop.approved || shop.isApproved) ? 'APPROVED' : 'PENDING'}
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
