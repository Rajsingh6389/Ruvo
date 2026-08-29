import React, { useState } from 'react';
import { request } from '../api';
import { useAuth } from '../context/AuthContext';

export const HelpTicketsPage = ({ tickets: initialTickets = [], onRefresh }) => {
  const { token } = useAuth();
  const [tickets, setTickets] = useState(initialTickets);
  const [search, setSearch] = useState('');
  const [respondingTo, setRespondingTo] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [error, setError] = useState('');

  const sendResponse = async (ticketId) => {
    if (!token || !responseText.trim()) return;
    setError('');
    try {
      await request(`/api/help/${ticketId}/respond`, token, {
        method: 'POST',
        body: JSON.stringify({ response: responseText.trim() }),
      });
      setTickets(prev => prev.map(t =>
        t.id === ticketId ? { ...t, status: 'IN_PROGRESS', adminResponse: responseText.trim() } : t
      ));
      setRespondingTo(null);
      setResponseText('');
      onRefresh?.();
    } catch (e) {
      setError(e.message);
    }
  };

  const priorityColor = (p) => {
    if (p === 'URGENT') return '#DC2626';
    if (p === 'HIGH') return '#EA580C';
    if (p === 'MEDIUM') return '#D97706';
    return '#6B7280';
  };

  const statusColor = (s) => {
    if (s === 'OPEN') return { bg: '#DBEAFE', text: '#1E40AF' };
    if (s === 'IN_PROGRESS') return { bg: '#FEF3C7', text: '#92400E' };
    if (s === 'RESOLVED') return { bg: '#D1FAE5', text: '#065F46' };
    if (s === 'CLOSED') return { bg: '#F3F4F6', text: '#374151' };
    return { bg: '#F3F4F6', text: '#374151' };
  };

  const filtered = tickets.filter(t =>
    !search ||
    String(t.id).includes(search) ||
    (t.subject || '').toLowerCase().includes(search.toLowerCase()) ||
    (t.category || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0, color: '#1F2937' }}>Help & Support Tickets</h2>
        <span style={{ color: '#6B7280', fontSize: 14 }}>{filtered.length} tickets</span>
      </div>

      {error && (
        <div style={{ padding: 12, background: '#FEE2E2', color: '#991B1B', borderRadius: 8, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <input
        type="text"
        placeholder="Search by ticket ID, subject, or category..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{
          width: '100%', padding: '10px 14px', border: '1px solid #D1D5DB',
          borderRadius: 8, marginBottom: 16, fontSize: 14, boxSizing: 'border-box',
        }}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32, color: '#9CA3AF' }}>No tickets found</div>
        ) : filtered.map(t => {
          const sc = statusColor(t.status);
          return (
            <div key={t.id} style={{
              border: '1px solid #E5E7EB', borderRadius: 12, padding: 16,
              background: '#FFF',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <span style={{ fontWeight: 700, color: '#1F2937', fontSize: 15 }}>#{t.id} — {t.subject || 'No subject'}</span>
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 600, color: priorityColor(t.priority),
                    }}>{t.priority || 'MEDIUM'}</span>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '1px 8px', borderRadius: 10,
                      background: sc.bg, color: sc.text,
                    }}>{t.status || 'OPEN'}</span>
                    <span style={{ fontSize: 11, color: '#6B7280' }}>{t.category || 'GENERAL'}</span>
                  </div>
                </div>
                <span style={{ fontSize: 12, color: '#9CA3AF' }}>
                  {t.createdAt ? new Date(t.createdAt).toLocaleString() : '-'}
                </span>
              </div>

              <p style={{ color: '#374151', fontSize: 13, margin: '8px 0', lineHeight: 1.5 }}>
                {t.description || t.message || 'No description provided.'}
              </p>

              {t.adminResponse && (
                <div style={{
                  background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8,
                  padding: 10, marginTop: 8,
                }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#065F46' }}>Admin Response:</span>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#374151' }}>{t.adminResponse}</p>
                </div>
              )}

              {respondingTo === t.id ? (
                <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    value={responseText}
                    onChange={e => setResponseText(e.target.value)}
                    placeholder="Type your response..."
                    style={{
                      flex: 1, padding: '8px 12px', border: '1px solid #D1D5DB',
                      borderRadius: 8, fontSize: 13,
                    }}
                  />
                  <button
                    onClick={() => sendResponse(t.id)}
                    style={{
                      padding: '8px 16px', borderRadius: 8, border: 'none',
                      background: '#059669', color: '#FFF', fontSize: 13, cursor: 'pointer',
                    }}
                  >Send</button>
                  <button
                    onClick={() => { setRespondingTo(null); setResponseText(''); }}
                    style={{
                      padding: '8px 16px', borderRadius: 8, border: '1px solid #D1D5DB',
                      background: '#FFF', color: '#374151', fontSize: 13, cursor: 'pointer',
                    }}
                  >Cancel</button>
                </div>
              ) : (
                <button
                  onClick={() => setRespondingTo(t.id)}
                  style={{
                    marginTop: 8, padding: '6px 14px', borderRadius: 6, border: '1px solid #D1D5DB',
                    background: '#FFF', color: '#374151', fontSize: 12, cursor: 'pointer',
                  }}
                >Respond</button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
