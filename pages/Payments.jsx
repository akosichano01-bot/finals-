import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Payments = () => {
  // Napaka-importante: Initialize as empty array []
  const [payments, setPayments] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        setLoading(true);
        const res = await axios.get('/api/payments');
        // Siguraduhin na array ang ise-set para hindi mag-crash ang .map()
        setPayments(Array.isArray(res.data) ? res.data : []);
        setError(null);
      } catch (err) {
        console.error("Fetch error:", err);
        setError("Failed to load payments.");
        setPayments([]); // Fallback sa empty array para safe ang UI
      } finally {
        setLoading(false);
      }
    };
    fetchPayments();
  }, []);

  if (loading) return <div className="p-10 text-center text-white">Loading payments...</div>;

  return (
    <div className="p-6 bg-[#1a1c23] min-h-screen text-white">
      <h1 className="text-2xl font-bold mb-6">Payment History</h1>
      
      {/* Lalabas lang ito kung talagang nag-error ang API call */}
      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-100 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      <div className="overflow-x-auto bg-[#24262d] rounded-xl shadow-lg">
        <table className="w-full text-left">
          <thead>
            <tr className="text-gray-400 border-b border-gray-700">
              <th className="p-4">Tenant</th>
              <th className="p-4">Bill Type</th>
              <th className="p-4">Amount</th>
              <th className="p-4">Status</th>
              <th className="p-4">Date</th>
            </tr>
          </thead>
          <tbody>
            {/* Safety check: map lang kung may laman */}
            {payments && payments.length > 0 ? (
              payments.map((p) => (
                <tr key={p.id} className="border-b border-gray-800 hover:bg-gray-700/30 transition">
                  <td className="p-4">{p.tenant_name || 'N/A'}</td>
                  <td className="p-4 uppercase text-xs text-gray-400">{p.bill_type || 'Manual'}</td>
                  <td className="p-4 font-semibold text-green-400">₱{Number(p.amount).toLocaleString()}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${p.status === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="p-4 text-gray-400">{new Date(p.created_at).toLocaleDateString()}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="p-12 text-center text-gray-500">
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
