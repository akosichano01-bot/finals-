import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import toast from 'react-hot-toast'

export default function Payments() {
  const { user } = useAuth()
  const [payments, setPayments] = useState([])
  const [bills, setBills] = useState([])
  const [loading, setLoading] = useState(true)
  const [pendingPaymentId, setPendingPaymentId] = useState(null)
  const [verifying, setVerifying] = useState(false)

  const isTenant = user?.role === 'tenant'

  useEffect(() => {
    fetchPayments()
    if (isTenant) fetchUnpaidBills()
  }, [])

  const fetchPayments = async () => {
    try {
      const response = await api.get('/payments')
      setPayments(response.data.payments)
    } catch (error) {
      toast.error('Failed to load payments')
    } finally {
      setLoading(false)
    }
  }

  const fetchUnpaidBills = async () => {
    try {
      const response = await api.get('/bills?status=unpaid')
      setBills(response.data.bills || [])
    } catch (error) {
      console.error('Failed to load bills')
    }
  }

  const handlePayWithPayMongo = async (bill) => {
    try {
      const res = await api.post('/payments/paymongo-create', { bill_id: bill.id })
      setPendingPaymentId(res.data.payment_id)
      window.open(res.data.checkout_url, '_blank', 'noopener,noreferrer')
      toast.success('Checkout opened in new tab. After paying, click "Confirm payment received" below.')
      fetchPayments()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create payment link')
    }
  }

  const handleVerifyPayment = async () => {
    if (!pendingPaymentId) return
    setVerifying(true)
    try {
      const res = await api.get(`/payments/verify/${pendingPaymentId}`)
      if (res.data.confirmed) {
        toast.success('Payment confirmed.')
        setPendingPaymentId(null)
        fetchPayments()
        fetchUnpaidBills()
      } else {
        toast(res.data.message || 'Payment not yet received. Complete payment in the checkout tab and try again.', { icon: 'ℹ️' })
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Verification failed')
    } finally {
      setVerifying(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center py-24 text-slate-500">Loading payments...</div>

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-8">Payments</h1>

      {isTenant && (
        <>
          {bills.length > 0 && (
            <div className="card p-5 mb-6 bg-amber-50/50 border-amber-200">
              <h2 className="font-semibold text-amber-900 mb-3">Unpaid rent</h2>
              <div className="space-y-3">
                {bills.map((bill) => (
                  <div key={bill.id} className="flex justify-between items-center bg-white p-4 rounded-lg border border-amber-100">
                    <div>
                      <div className="font-medium text-gray-900">{bill.type}</div>
                      <div className="text-sm text-gray-500">Due: {new Date(bill.due_date).toLocaleDateString()}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-semibold text-gray-900">₱{bill.amount?.toLocaleString()}</span>
                      <button
                        onClick={() => handlePayWithPayMongo(bill)}
                        className="btn-primary text-sm"
                      >
                        Pay with PayMongo
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pendingPaymentId && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-6">
              <p className="text-indigo-900 font-medium mb-2">Did you complete payment in the checkout tab?</p>
              <button
                onClick={handleVerifyPayment}
                disabled={verifying}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg font-medium"
              >
                {verifying ? 'Checking...' : 'Confirm payment received'}
              </button>
            </div>
          )}

          <p className="text-sm text-gray-500 mb-4">Rent is paid via PayMongo. After payment is confirmed, the bill will be marked paid.</p>
        </>
      )}

      <div className="table-wrap">
        <table className="min-w-full divide-y divide-slate-100">
          <thead>
            <tr>
              {!isTenant && <th className="table-th">Tenant</th>}
              <th className="table-th">Bill Type</th>
              <th className="table-th">Amount</th>
              <th className="table-th">Method</th>
              <th className="table-th">Status</th>
              <th className="table-th">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {payments.map((payment) => (
              <tr key={payment.id} className="hover:bg-slate-50/50">
                {!isTenant && (
                  <td className="table-td"><span className="font-medium text-slate-900">{payment.tenant_name}</span>{payment.unit_number && <div className="text-xs text-slate-500">{payment.unit_number}</div>}</td>
                )}
                <td className="table-td font-medium text-slate-900">{payment.bill_type}</td>
                <td className="table-td font-semibold text-slate-900">₱{payment.amount?.toLocaleString()}</td>
                <td className="table-td text-slate-600">{(payment.payment_method || 'paymongo').toUpperCase()}</td>
                <td className="table-td"><span className={`badge ${payment.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : payment.status === 'failed' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>{payment.status}</span></td>
                <td className="table-td text-slate-600">{new Date(payment.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
