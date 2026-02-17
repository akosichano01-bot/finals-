import React, { useEffect, useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const Payments = () => {
  const { user: authUser } = useAuth();
  const user = authUser || JSON.parse(localStorage.getItem('user') || '{}');

  const [payments, setPayments] = useState([]);
  const [unpaidBills, setUnpaidBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingId, setProcessingId] = useState(null); // Tracking specific bill being paid

  const isTenant = user?.role === 'tenant';

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const paymentsRes = await api.get('/payments');
      setPayments(Array.isArray(paymentsRes.data) ? paymentsRes.data : []);

      if (isTenant) {
        const billsRes = await api.get('/bills/my-unpaid');
        setUnpaidBills(Array.isArray(billsRes.data) ? billsRes.data : []);
      } else {
        setUnpaidBills([]);
      }

      setError(null);
    } catch (err) {
      console.error('Fetch error:', err);
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
      } else {
        setError('Failed to load payment data.');
      }
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, [isTenant]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePayNow = async (billId) => {
    try {
      setProcessingId(billId);
      const res = await api.post('/payments/paymongo-create', { bill_id: billId });

      if (res.data?.checkout_url) {
        window.location.href = res.data.checkout_url;
      } else {
        toast.error('Could not create payment link.');
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Could not create payment link.';
      toast.error(message);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading && payments.length === 0) {
    return (
      <div className="p-10 text-center bg-slate-50 min-h-screen text-slate-700">
        <div className="animate-spin inline-block w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mb-4"></div>
        <p>Loading your payment records...</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-slate-50 min-h-screen text-slate-900">
      {/* SECTION 1: UNPAID BILLS (Tenant View) */}
      {isTenant && (
        <div className="mb-10">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Bills to Pay</h2>
            <span className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-full border border-amber-100">
              {unpaidBills.length} Pending
            </span>
          </div>

          {unpaidBills.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {unpaidBills.map((bill) => (
                <div key={bill.id} className="card p-5 hover:shadow-lg transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{bill.type}</p>
                      <p className="text-2xl font-bold text-slate-900">₱{Number(bill.amount).toLocaleString()}</p>
                    </div>
                    <div className="text-right text-[11px] text-slate-500">
                      <p className="uppercase tracking-wide">Due Date</p>
                      <p className="font-semibold text-slate-800">{new Date(bill.due_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handlePayNow(bill.id)}
                    disabled={processingId !== null}
                    className="btn-primary w-full disabled:opacity-60"
                  >
                    {processingId === bill.id ? 'Generating link...' : 'Pay Now'}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="card p-6 text-center text-slate-500">
              No unpaid bills. You're all caught up!
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: PAYMENT HISTORY */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Payment History</h1>
        <button onClick={fetchData} className="text-sm text-slate-500 hover:text-slate-900 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
          Refresh
        </button>
      </div>
      
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl mb-6 flex items-center gap-3">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path></svg>
          {error}
        </div>
      )}

      <div className="overflow-hidden bg-white rounded-2xl shadow-sm border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
                <th className="p-3 font-semibold text-center">Tenant</th>
                <th className="p-3 font-semibold text-center">Bill Type</th>
                <th className="p-3 font-semibold text-center">Amount</th>
                <th className="p-3 font-semibold text-center">Status</th>
                <th className="p-3 font-semibold text-center">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.length > 0 ? (
                payments.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-50/40 transition-colors group"
                  >
                    <td className="p-3 text-center">
                      <div className="font-medium text-slate-900">{p.tenant_name || 'System User'}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{p.transaction_id}</div>
                    </td>
                    <td className="p-3 text-xs font-medium text-slate-500 uppercase text-center">{p.bill_type}</td>
                    <td className="p-3 text-center">
                      <span className="text-emerald-600 font-bold tracking-tight">₱{Number(p.amount).toLocaleString()}</span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                        p.status === 'completed' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                          : 'bg-amber-50 text-amber-700 border border-amber-100'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="p-3 text-center text-slate-500 text-xs">
                      {new Date(p.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="p-20 text-center">
                    <div className="flex flex-col items-center opacity-60">
                      <svg className="w-16 h-16 mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                      <p className="text-sm font-semibold text-slate-400">No payment records found.</p>
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
