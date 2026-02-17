import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Payments = () => {
  // Sinisiguradong array ang initial state para hindi mag-crash ang .map()
  const [payments, setPayments] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        setLoading(true);
        // Siguraduhin na ang API route ay tama
        const response = await axios.get('/api/payments');
        
        // I-verify kung array ang natanggap
        setPayments(Array.isArray(response.data) ? response.data : []);
        setError(null);
      } catch (err) {
        console.error('Fetch error:', err);
        setError('Failed to load payments.');
        setPayments([]); // Fallback sa empty array
      } finally {
        setLoading(false);
      }
    };
    fetchPayments();
  }, []);

  if (loading) return <div className="p-10 text-center">Loading payments...</div>;

  return (
    <div className="p-6 bg-gray-900 min-h-screen text-white">
      <h1 className="text-2xl font-bold mb-6">Payment History</h1>
      
      {error && <div className="bg-red-500 p-3 rounded mb-4">{error}</div>}

      <div className="overflow-x-auto bg-gray-800 rounded-lg shadow">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-700">
              <th className="p-4 border-b border-gray-600">Tenant</th>
              <th className="p-4 border-b border-gray-600">Bill Type</th>
              <th className="p-4 border-b border-gray-600">Amount</th>
              <th className="p-4 border-b border-gray-600">Status</th>
              <th className="p-4 border-b border-gray-600">Date</th>
            </tr>
          </thead>
          <tbody>
            {/* Safety check: map() lang kung may laman ang array */}
            {payments && payments.length > 0 ? (
              payments.map((p) => (
                <tr key={p.id} className="hover:bg-gray-750">
                  <td className="p-4 border-b border-gray-700">{p.tenant_name || 'N/A'}</td>
                  <td className="p-4 border-b border-gray-700">{p.bill_type || 'Manual'}</td>
                  <td className="p-4 border-b border-gray-700">₱{Number(p.amount).toLocaleString()}</td>
                  <td className="p-4 border-b border-gray-700">
                    <span className={`px-2 py-1 rounded text-sm ${p.status === 'completed' ? 'bg-green-600' : 'bg-yellow-600'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="p-4 border-b border-gray-700">{new Date(p.created_at).toLocaleDateString()}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="p-10 text-center text-gray-400">
                  No payment records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Payments;
