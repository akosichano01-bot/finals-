import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Payments = () => {
  const [payments, setPayments] = useState([]); 
  const [unpaidBills, setUnpaidBills] = useState([]); // Para sa Pay Now feature ng tenant
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Kunin ang user role mula sa localStorage o auth state
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isTenant = user.role === 'tenant';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      // Sabay na kunin ang payments at (kung tenant) ang unpaid bills
      const paymentsRes = await axios.get('/api/payments', { headers });
      setPayments(Array.isArray(paymentsRes.data) ? paymentsRes.data : []);

      if (isTenant) {
        const billsRes = await axios.get('/api/bills/my-unpaid', { headers });
        setUnpaidBills(Array.isArray(billsRes.data) ? billsRes.data : []);
      }

      setError(null);
    } catch (err) {
      console.error("Fetch error:", err);
      if (err.response?.status === 401) {
        setError("Session expired. Please login again.");
      } else {
        setError("Failed to load data.");
      }
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  // --- PAYMONGO REDIRECT ---
  const handlePayNow = async (billId) => {
    try {
      setIsProcessing(true);
      const token = localStorage.getItem('token');
      
      // Tatawagin ang backend route na ginawa natin
      const res = await axios.post('/api/payments/paymongo-create', 
        { bill_id: billId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.checkout_url) {
        window.location.href = res.data.checkout_url; // I-redirect sa PayMongo checkout
      }
    } catch (err) {
      alert("Could not create payment link. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-white">Loading...</div>;

  return (
    <div className="p-6 bg-[#1a1c23] min-h-screen text-white">
      {/* SECTION 1: UNPAID BILLS (Lilitaw lang sa Tenant) */}
      {isTenant && unpaidBills.length > 0 && (
        <div className="mb-10">
          <h2 className="text-xl font-bold mb-4 text-yellow-400">Bills to Pay</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {unpaidBills.map((bill) => (
              <div key={bill.id} className="bg-[#24262d] p-4 rounded-xl border border-yellow-500/30 flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-400">{bill.type} - {new Date(bill.due_date).toLocaleDateString()}</p>
                  <p className="text-lg font-bold">₱{Number(bill.amount).toLocaleString()}</p>
                </div>
                <button 
                  onClick={() => handlePayNow(bill.id)}
                  disabled={isProcessing}
                  className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 px-4 rounded-lg transition disabled:opacity-50"
                >
                  {isProcessing ? "Processing..." : "Pay Now"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 2: PAYMENT HISTORY */}
      <h1 className="text-2xl font-bold mb-6">Payment History</h1>
      
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
            {payments.length > 0 ? (
              payments.map((p) => (
                <tr key={p.id} className="border-b border-gray-800 hover:bg-gray-700/30">
                  <td className="p-4">{p.tenant_name || 'N/A'}</td>
                  <td className="p-4 text-xs text-gray-400 uppercase">{p.bill_type}</td>
                  <td className="p-4 text-green-400 font-semibold">₱{Number(p.amount).toLocaleString()}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs ${p.status === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="p-4 text-gray-400">{new Date(p.created_at).toLocaleDateString()}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="p-12 text-center text-gray-500">No payment records found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Payments;
