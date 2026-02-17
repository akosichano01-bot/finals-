import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const Payments = () => {
  const [payments, setPayments] = useState([]); 
  const [unpaidBills, setUnpaidBills] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingId, setProcessingId] = useState(null); // Tracking specific bill being paid

  // Get user info safely
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isTenant = user.role === 'tenant';

  // Function wrapped in useCallback to prevent unnecessary re-renders
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      // API calls
      const paymentsRes = await axios.get('/api/payments', { headers });
      setPayments(Array.isArray(paymentsRes.data) ? paymentsRes.data : []);

      if (isTenant) {
        // Calling the new endpoint we added to the backend
        const billsRes = await axios.get('/api/bills/my-unpaid', { headers });
        setUnpaidBills(Array.isArray(billsRes.data) ? billsRes.data : []);
      }

      setError(null);
    } catch (err) {
      console.error("Fetch error:", err);
      if (err.response?.status === 401) {
        setError("Session expired. Please login again.");
      } else {
        setError("Failed to load payment data.");
      }
      setPayments([]); // Safety fallback
    } finally {
      setLoading(false);
    }
  }, [isTenant]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePayNow = async (billId) => {
    try {
      setProcessingId(billId); // Start loading for this specific button
      const token = localStorage.getItem('token');
      
      const res = await axios.post('/api/payments/paymongo-create', 
        { bill_id: billId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.checkout_url) {
        // Redirect to PayMongo
        window.location.href = res.data.checkout_url; 
      }
    } catch (err) {
      console.error("Payment error:", err);
      alert(err.response?.data?.message || "Could not create payment link.");
    } finally {
      setProcessingId(null);
    }
  };

  if (loading && payments.length === 0) {
    return (
      <div className="p-10 text-center text-white bg-[#1a1c23] min-h-screen">
        <div className="animate-spin inline-block w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full mb-4"></div>
        <p>Loading your financial records...</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-[#1a1c23] min-h-screen text-white">
      {/* SECTION 1: UNPAID BILLS (Tenant View) */}
      {isTenant && (
        <div className="mb-10">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-yellow-400">Bills to Pay</h2>
            <span className="text-xs bg-yellow-500/10 text-yellow-500 px-2 py-1 rounded">
              {unpaidBills.length} Pending
            </span>
          </div>

          {unpaidBills.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {unpaidBills.map((bill) => (
                <div key={bill.id} className="bg-[#24262d] p-5 rounded-xl border border-gray-700 hover:border-yellow-500/50 transition shadow-lg">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-500">{bill.type}</p>
                      <p className="text-2xl font-black text-white">₱{Number(bill.amount).toLocaleString()}</p>
                    </div>
                    <div className="text-right text-xs text-gray-400">
                      <p>Due Date</p>
                      <p className="font-bold text-gray-200">{new Date(bill.due_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handlePayNow(bill.id)}
                    disabled={processingId !== null}
                    className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-600 text-black font-bold py-3 rounded-lg transition-all flex justify-center items-center gap-2"
                  >
                    {processingId === bill.id ? (
                      <span className="animate-pulse">Generating Link...</span>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>
                        Pay Now
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-[#24262d]/50 p-6 rounded-xl border border-dashed border-gray-700 text-center text-gray-500">
              No unpaid bills. You're all caught up!
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: PAYMENT HISTORY */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Payment History</h1>
        <button onClick={fetchData} className="text-sm text-gray-400 hover:text-white flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
          Refresh
        </button>
      </div>
      
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl mb-6 flex items-center gap-3">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path></svg>
          {error}
        </div>
      )}

      <div className="overflow-hidden bg-[#24262d] rounded-xl shadow-2xl border border-gray-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-800/50 text-gray-400 text-xs uppercase tracking-wider">
                <th className="p-4 font-semibold">Tenant</th>
                <th className="p-4 font-semibold">Bill Type</th>
                <th className="p-4 font-semibold">Amount</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {payments.length > 0 ? (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-700/20 transition-colors group">
                    <td className="p-4">
                      <div className="font-medium text-gray-200">{p.tenant_name || 'System User'}</div>
                      <div className="text-[10px] text-gray-500 font-mono">{p.transaction_id}</div>
                    </td>
                    <td className="p-4 text-xs font-medium text-gray-400 uppercase">{p.bill_type}</td>
                    <td className="p-4">
                      <span className="text-green-400 font-bold tracking-tight">₱{Number(p.amount).toLocaleString()}</span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                        p.status === 'completed' 
                          ? 'bg-green-500/10 text-green-500 border border-green-500/20' 
                          : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="p-4 text-right text-gray-500 text-sm">
                      {new Date(p.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="p-20 text-center">
                    <div className="flex flex-col items-center opacity-20">
                      <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                      <p className="text-xl font-bold">No payment records found.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Payments;
