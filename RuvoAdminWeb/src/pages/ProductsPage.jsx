import React, { useState } from 'react';

export const ProductsPage = ({ products }) => {
  const [search, setSearch] = useState('');

  const filtered = products.filter(
    (p) =>
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Ecosystem Product Catalog ({filtered.length})</h2>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products..."
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
              <th>Product ID</th>
              <th>Product Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>Unit / Stock</th>
              <th>Shop ID</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: '#64748B' }}>
                  No products found.
                </td>
              </tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.id}>
                  <td>#{p.id}</td>
                  <td>
                    <strong>{p.name}</strong>
                  </td>
                  <td>{p.category || 'General'}</td>
                  <td>
                    <strong>₹{p.price}</strong>
                  </td>
                  <td>
                    {p.quantity ? `${p.quantity} ${p.unit || ''}` : p.stockQuantity ?? 'Available'}
                  </td>
                  <td>#{p.shopId}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
